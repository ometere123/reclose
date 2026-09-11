# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""IncentiveVault - R1 economic settlement (C2, Implementation Specification Section 33/CLAUDE.md
Section 19). Economically SEPARATE from target-control authority: this contract has ZERO target
authority, no generic execute, and never grants or receives assurance-controller status. It reads
the Kernel's authoritative FINAL incident outcome (get_incident_final_outcome) purely to decide
settlement - it is never itself a source of truth about what happened, only about what economic
consequence follows from what the Kernel has already recorded.

Ordinary good-faith REJECTED/UNDETERMINED reports are never truth-slashed merely for being wrong
or uncertain (CLAUDE.md Section 19) - the bond is always returned in full for those outcomes; only
CONFIRMED pays the additional bounty, bounded by the target's own funded pool.
"""

import genlayer as gl

DECISION_OUTCOME_CONFIRMED = gl.u8(1)
DECISION_OUTCOME_REJECTED = gl.u8(2)
DECISION_OUTCOME_UNDETERMINED = gl.u8(3)


def _valid_identifier(value: str, max_len: int, allow_empty: bool = False) -> bool:
    if value is None or not isinstance(value, str):
        return False
    if len(value) == 0:
        return allow_empty
    if len(value) > max_len:
        return False
    for ch in value:
        if not (ch.isalnum() or ch in "_.:-"):
            return False
        if ord(ch) > 127:
            return False
    return True


@gl.storage.allow
class BondRecord:
    bond_id: str
    reporter: gl.Address
    target_id: str
    policy_key: str
    policy_version: gl.u32
    rule_id: str
    reporter_nonce: gl.u64
    incident_id: str
    amount: gl.u256
    opened_at: gl.u64
    settled: bool
    claimable_amount: gl.u256
    claim_submitted: bool


class IncentiveVault(gl.contract.Contract):
    kernel: gl.Address
    judge: gl.Address
    module_version: gl.u32

    bonds: gl.storage.TreeMap[str, BondRecord]
    # Per-target bounty pool, funded independently of any bond (Section 33).
    target_pools: gl.storage.TreeMap[str, gl.u256]

    def __init__(self, kernel_address: gl.Address, judge_address: gl.Address, module_version: gl.u32) -> None:
        self.kernel = gl.Address(kernel_address)
        self.judge = gl.Address(judge_address)
        self._require(int(module_version) != 0, "E_VLT_000: module_version must be non-zero")
        self.module_version = module_version

    def _require(self, condition: bool, message: str) -> None:
        if not condition:
            raise gl.vm.UserError(message)

    @gl.public.view
    def get_module_type(self) -> str:
        return "INCENTIVE_VAULT"

    @gl.public.view
    def get_kernel(self) -> gl.Address:
        return self.kernel

    @gl.public.view
    def get_judge(self) -> gl.Address:
        return self.judge

    # -- Bonds (Section 33) ----------------------------------------------------------------

    @gl.public.write.payable
    def open_bond(
        self, bond_id: str, target_id: str, policy_key: str, policy_version: gl.u32,
        rule_id: str, reporter_nonce: gl.u64, incident_id: str,
    ) -> None:
        """Zero-bond policies work: gl.message.value may be 0. Only the configured Judge may open
        a bond - a Reporter never calls the Vault directly, closing the path where a caller could
        fabricate a bond record for an incident that was never actually judged."""
        self._require(gl.message.sender_address == self.judge, "E_VLT_001: UNAUTHORIZED_CALLER: only the configured Judge may open a bond")
        self._require(_valid_identifier(bond_id, 96), "E_VLT_002: invalid bond_id")
        self._require(bond_id not in self.bonds, "E_VLT_003: DUPLICATE_BOND: bond_id already exists")
        self._require(_valid_identifier(target_id, 96), "E_VLT_002: invalid target_id")
        self._require(_valid_identifier(policy_key, 96), "E_VLT_002: invalid policy_key")
        self._require(_valid_identifier(rule_id, 64), "E_VLT_002: invalid rule_id")
        self._require(_valid_identifier(incident_id, 96), "E_VLT_002: invalid incident_id")

        record = BondRecord()
        record.bond_id = bond_id
        record.reporter = gl.message.sender_address
        record.target_id = target_id
        record.policy_key = policy_key
        record.policy_version = policy_version
        record.rule_id = rule_id
        record.reporter_nonce = reporter_nonce
        record.incident_id = incident_id
        record.amount = gl.u256(int(gl.message.value))
        record.opened_at = self._tx_time_seconds()
        record.settled = False
        record.claimable_amount = gl.u256(0)
        record.claim_submitted = False
        self.bonds[bond_id] = record

    @gl.public.write.payable
    def fund_target_pool(self, target_id: str) -> None:
        """Anyone may top up a target's bounty pool - independent of any specific bond/incident."""
        self._require(_valid_identifier(target_id, 96), "E_VLT_002: invalid target_id")
        current = int(self.target_pools[target_id]) if target_id in self.target_pools else 0
        self.target_pools[target_id] = gl.u256(current + int(gl.message.value))

    @gl.public.view
    def get_target_pool_balance(self, target_id: str) -> gl.u256:
        return self.target_pools[target_id] if target_id in self.target_pools else gl.u256(0)

    @gl.public.write
    def settle_bond(self, bond_id: str, confirmed_bounty: gl.u256) -> None:
        """Reads the Kernel's AUTHORITATIVE final incident outcome - the Vault is never itself the
        source of truth. CONFIRMED: bond returned + bounty (bounded by the target's funded pool
        and the caller-supplied confirmed_bounty ceiling, which the caller must derive from the
        active PolicyRuleRecord.confirmed_bounty - the Vault does not read policy state itself, to
        avoid becoming a second policy engine). REJECTED/UNDETERMINED: bond returned only - never
        truth-slashed for being wrong or uncertain (CLAUDE.md Section 19)."""
        self._require(bond_id in self.bonds, "E_VLT_004: UNKNOWN_BOND")
        bond = self.bonds[bond_id]
        self._require(not bond.settled, "E_VLT_005: ALREADY_SETTLED")

        outcome = gl.contract.get_at(self.kernel).view().get_incident_final_outcome(bond.incident_id)
        self._require(int(outcome) != 0, "E_VLT_006: INCIDENT_NOT_FINAL: Kernel has not recorded a final outcome yet")

        claimable = int(bond.amount)
        if int(outcome) == int(DECISION_OUTCOME_CONFIRMED):
            pool_key = bond.target_id
            available = int(self.target_pools[pool_key]) if pool_key in self.target_pools else 0
            bounty = min(int(confirmed_bounty), available)
            if bounty > 0:
                self.target_pools[pool_key] = gl.u256(available - bounty)
            claimable += bounty
        # REJECTED / UNDETERMINED: claimable stays exactly the bond amount - no slashing, no bounty.

        bond.settled = True
        bond.claimable_amount = gl.u256(claimable)
        self.bonds[bond_id] = bond

    @gl.public.write
    def claim(self, bond_id: str) -> None:
        """FINAL only (settle_bond already requires a final Kernel outcome before this can be
        claimed). Caller must be the original Reporter. Claim once - never blindly retried; a
        failed value transfer requires a fresh claim() call, not an automatic resend, so no
        duplicate economic effect can occur even if the underlying transfer fails."""
        self._require(bond_id in self.bonds, "E_VLT_004: UNKNOWN_BOND")
        bond = self.bonds[bond_id]
        self._require(bond.settled, "E_VLT_007: NOT_SETTLED")
        self._require(not bond.claim_submitted, "E_VLT_008: ALREADY_CLAIMED")
        self._require(gl.message.sender_address == bond.reporter, "E_VLT_001: UNAUTHORIZED_CALLER: only the original Reporter may claim")

        bond.claim_submitted = True
        self.bonds[bond_id] = bond

        # KNOWN LIMITATION (Section 35 will attempt live verification): this dispatch assumes the
        # Reporter address either implements fulfill_vault_claim(bond_id) or that GenVM delivers
        # `value` to a plain EOA recipient regardless of the attempted method call. Neither has
        # been live-proven yet - see release-evidence/r1/c2/ for the outcome once attempted. The
        # accounting above (claim_submitted/claimable_amount) is authoritative and safe regardless
        # of how the value-transfer wire mechanics resolve: a failed transfer never re-credits or
        # re-triggers this path (claim_submitted is already permanently set), so no double-payment
        # can occur even if the dispatch below turns out to require a different mechanism.
        if int(bond.claimable_amount) > 0:
            reporter_contract = gl.contract.get_at(bond.reporter)
            reporter_contract.emit(value=int(bond.claimable_amount), on="finalized").fulfill_vault_claim(bond_id)

    @gl.public.write
    def reclaim_unused_bond(self, bond_id: str) -> None:
        """Bounded safety valve: if a bond was opened but the corresponding incident somehow never
        reaches a final outcome (Judge/Kernel path failure), the ORIGINAL reporter may reclaim
        their own bond amount after a long fixed grace period - never anyone else's funds, never
        before the grace period, and never more than the original bond amount."""
        self._require(bond_id in self.bonds, "E_VLT_004: UNKNOWN_BOND")
        bond = self.bonds[bond_id]
        self._require(not bond.settled, "E_VLT_005: ALREADY_SETTLED")
        self._require(not bond.claim_submitted, "E_VLT_008: ALREADY_CLAIMED")
        self._require(gl.message.sender_address == bond.reporter, "E_VLT_001: UNAUTHORIZED_CALLER: only the original Reporter may reclaim")
        grace_period_seconds = 7 * 24 * 60 * 60
        self._require(int(self._tx_time_seconds()) >= int(bond.opened_at) + grace_period_seconds, "E_VLT_009: GRACE_PERIOD_NOT_ELAPSED")

        bond.settled = True
        bond.claimable_amount = bond.amount
        bond.claim_submitted = True
        self.bonds[bond_id] = bond
        if int(bond.amount) > 0:
            reporter_contract = gl.contract.get_at(bond.reporter)
            reporter_contract.emit(value=int(bond.amount), on="finalized").fulfill_vault_claim(bond_id)

    @gl.public.view
    def get_bond_claimable_amount(self, bond_id: str) -> gl.u256:
        return self.bonds[bond_id].claimable_amount if bond_id in self.bonds else gl.u256(0)

    @gl.public.view
    def is_bond_settled(self, bond_id: str) -> bool:
        return self.bonds[bond_id].settled if bond_id in self.bonds else False

    def _tx_time_seconds(self) -> gl.u64:
        import datetime
        dt = datetime.datetime.now(datetime.timezone.utc)
        return gl.u64(int(dt.timestamp()))
