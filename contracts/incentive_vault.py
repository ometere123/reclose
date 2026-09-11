# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""IncentiveVault - isolated Reporter-bond and target-bounty accounting for Reclose R1.

A2 remediation:
- Reporter opens their own bond directly; the Judge is never mis-recorded as Reporter.
- Bond amount is read from immutable Kernel policy economics and must match exactly.
- `settle_bond` has no caller-controlled bounty argument. Confirmed bounty is read from the same
  immutable policy version/rule that the bond committed to.
- EOA payout uses the documented finalized EVM-interface `emit_transfer` path.
- Payout submission is tracked separately from settlement; no blind value resend is permitted.
- Grace-period reclaim is allowed only while the Kernel still has no final incident outcome.
"""

import datetime
import genlayer as gl

DECISION_OUTCOME_CONFIRMED = gl.u8(1)
DECISION_OUTCOME_REJECTED = gl.u8(2)
DECISION_OUTCOME_UNDETERMINED = gl.u8(3)

PAYOUT_NONE = gl.u8(0)
PAYOUT_SUBMITTED = gl.u8(1)
# GenLayer external value transfer has no callback in R1; final recipient success must be checked
# from its child/external transaction by the SDK/tracker. The Vault therefore never fabricates a
# PAYOUT_CONFIRMED storage state.


def _valid_identifier(value: str, max_len: int, allow_empty: bool = False) -> bool:
    if value is None or not isinstance(value, str):
        return False
    if len(value) == 0:
        return allow_empty
    if len(value) > max_len:
        return False
    for ch in value:
        if not (ch.isalnum() or ch in "_.:-") or ord(ch) > 127:
            return False
    return True


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


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
    consumed: bool
    settled: bool
    claimable_amount: gl.u256
    payout_status: gl.u8


class IncentiveVault(gl.contract.Contract):
    kernel: gl.Address
    judge: gl.Address
    module_version: gl.u32

    bonds: gl.storage.TreeMap[str, BondRecord]
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

    def _policy_economics(self, policy_key: str, policy_version: gl.u32, rule_id: str) -> tuple:
        header = gl.contract.get_at(self.kernel).view().get_policy_header(policy_key)
        # Kernel get_policy_header returns (version, manifest_hash, sealed, active,
        # human_override_enabled). A bond may settle after the policy is superseded, so active is
        # not required; immutable version identity is.
        self._require(int(header[0]) == int(policy_version), "E_VLT_POLICY: policy version mismatch")
        report_bond, confirmed_bounty = gl.contract.get_at(self.kernel).view().get_policy_rule_economics(policy_key, rule_id)
        return (report_bond, confirmed_bounty)

    @gl.public.write.payable
    def open_bond(
        self, bond_id: str, target_id: str, policy_key: str, policy_version: gl.u32,
        rule_id: str, reporter_nonce: gl.u64, incident_id: str,
    ) -> None:
        """Reporter opens their own bond before Judge submission.

        The record is bound to the deterministic incident identity and immutable policy economics.
        Exact amount is required: overpayment is rejected instead of trapping accidental GEN.
        """
        self._require(_valid_identifier(bond_id, 96), "E_VLT_002: invalid bond_id")
        self._require(bond_id not in self.bonds, "E_VLT_003: DUPLICATE_BOND")
        self._require(_valid_identifier(target_id, 96), "E_VLT_002: invalid target_id")
        self._require(_valid_identifier(policy_key, 96), "E_VLT_002: invalid policy_key")
        self._require(_valid_identifier(rule_id, 64), "E_VLT_002: invalid rule_id")
        self._require(_valid_identifier(incident_id, 160), "E_VLT_002: invalid incident_id")
        report_bond, _confirmed_bounty = self._policy_economics(policy_key, policy_version, rule_id)
        self._require(int(report_bond) > 0, "E_VLT_010: ZERO_BOND_RULE: do not create a Vault bond for a zero-bond policy")
        self._require(int(gl.message.value) == int(report_bond), "E_VLT_011: BOND_AMOUNT_MISMATCH")

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
        record.consumed = False
        record.settled = False
        record.claimable_amount = gl.u256(0)
        record.payout_status = PAYOUT_NONE
        self.bonds[bond_id] = record

    @gl.public.view
    def verify_open_bond(
        self, bond_id: str, reporter: gl.Address, target_id: str, policy_key: str,
        policy_version: gl.u32, rule_id: str, reporter_nonce: gl.u64, incident_id: str,
        expected_amount: gl.u256,
    ) -> bool:
        if bond_id not in self.bonds:
            return False
        bond = self.bonds[bond_id]
        reporter = gl.Address(reporter)
        return (
            not bond.settled
            and not bond.consumed
            and bond.reporter == reporter
            and bond.target_id == target_id
            and bond.policy_key == policy_key
            and int(bond.policy_version) == int(policy_version)
            and bond.rule_id == rule_id
            and int(bond.reporter_nonce) == int(reporter_nonce)
            and bond.incident_id == incident_id
            and int(bond.amount) == int(expected_amount)
        )

    @gl.public.write
    def mark_bond_consumed(self, bond_id: str, incident_id: str) -> None:
        self._require(gl.message.sender_address == self.judge, "E_VLT_001: only configured Judge may consume bond")
        self._require(bond_id in self.bonds, "E_VLT_004: UNKNOWN_BOND")
        bond = self.bonds[bond_id]
        self._require(not bond.settled and not bond.consumed, "E_VLT_012: BOND_ALREADY_CONSUMED")
        self._require(bond.incident_id == incident_id, "E_VLT_013: INCIDENT_BINDING_MISMATCH")
        bond.consumed = True
        self.bonds[bond_id] = bond

    @gl.public.write.payable
    def fund_target_pool(self, target_id: str) -> None:
        self._require(_valid_identifier(target_id, 96), "E_VLT_002: invalid target_id")
        self._require(int(gl.message.value) > 0, "E_VLT_014: funding value must be non-zero")
        current = int(self.target_pools[target_id]) if target_id in self.target_pools else 0
        self.target_pools[target_id] = gl.u256(current + int(gl.message.value))

    @gl.public.view
    def get_target_pool_balance(self, target_id: str) -> gl.u256:
        return self.target_pools[target_id] if target_id in self.target_pools else gl.u256(0)

    @gl.public.write
    def settle_bond(self, bond_id: str) -> None:
        """Permissionless settlement with zero caller-controlled economics."""
        self._require(bond_id in self.bonds, "E_VLT_004: UNKNOWN_BOND")
        bond = self.bonds[bond_id]
        self._require(not bond.settled, "E_VLT_005: ALREADY_SETTLED")
        outcome = gl.contract.get_at(self.kernel).view().get_incident_final_outcome(bond.incident_id)
        self._require(int(outcome) in (
            int(DECISION_OUTCOME_CONFIRMED), int(DECISION_OUTCOME_REJECTED), int(DECISION_OUTCOME_UNDETERMINED)
        ), "E_VLT_006: INCIDENT_NOT_FINAL")
        _report_bond, confirmed_bounty = self._policy_economics(bond.policy_key, bond.policy_version, bond.rule_id)

        claimable = int(bond.amount)
        if int(outcome) == int(DECISION_OUTCOME_CONFIRMED):
            available = int(self.target_pools[bond.target_id]) if bond.target_id in self.target_pools else 0
            bounty = min(int(confirmed_bounty), available)
            if bounty > 0:
                self.target_pools[bond.target_id] = gl.u256(available - bounty)
            claimable += bounty
        # REJECTED / UNDETERMINED: original bond only, never truth-slashed.
        bond.settled = True
        bond.claimable_amount = gl.u256(claimable)
        self.bonds[bond_id] = bond

    @gl.public.write
    def claim(self, bond_id: str) -> None:
        """Submit exactly one finalized external GEN transfer to the original Reporter.

        The value is deducted into the external message when emitted. If the external child fails,
        GenLayer does not automatically return it, therefore this contract deliberately provides
        no blind retry path. SDK/action-trace code must expose the external child result.
        """
        self._require(bond_id in self.bonds, "E_VLT_004: UNKNOWN_BOND")
        bond = self.bonds[bond_id]
        self._require(bond.settled, "E_VLT_007: NOT_SETTLED")
        self._require(int(bond.payout_status) == int(PAYOUT_NONE), "E_VLT_008: PAYOUT_ALREADY_SUBMITTED")
        self._require(gl.message.sender_address == bond.reporter, "E_VLT_001: only original Reporter may claim")
        self._require(int(bond.claimable_amount) > 0, "E_VLT_015: NOTHING_CLAIMABLE")
        bond.payout_status = PAYOUT_SUBMITTED
        self.bonds[bond_id] = bond
        _Recipient(bond.reporter).emit_transfer(value=bond.claimable_amount)

    @gl.public.write
    def reclaim_unused_bond(self, bond_id: str) -> None:
        """Reclaim an orphaned bond only after grace period AND only while Kernel has no final outcome."""
        self._require(bond_id in self.bonds, "E_VLT_004: UNKNOWN_BOND")
        bond = self.bonds[bond_id]
        self._require(not bond.settled, "E_VLT_005: ALREADY_SETTLED")
        self._require(int(bond.payout_status) == int(PAYOUT_NONE), "E_VLT_008: PAYOUT_ALREADY_SUBMITTED")
        self._require(gl.message.sender_address == bond.reporter, "E_VLT_001: only original Reporter may reclaim")
        grace_period_seconds = 7 * 24 * 60 * 60
        self._require(int(self._tx_time_seconds()) >= int(bond.opened_at) + grace_period_seconds, "E_VLT_009: GRACE_PERIOD_NOT_ELAPSED")
        final_outcome = gl.contract.get_at(self.kernel).view().get_incident_final_outcome(bond.incident_id)
        self._require(int(final_outcome) == 0, "E_VLT_016: INCIDENT_ALREADY_FINAL: use normal settlement")
        bond.settled = True
        bond.claimable_amount = bond.amount
        bond.payout_status = PAYOUT_SUBMITTED
        self.bonds[bond_id] = bond
        _Recipient(bond.reporter).emit_transfer(value=bond.amount)

    @gl.public.view
    def get_bond_claimable_amount(self, bond_id: str) -> gl.u256:
        return self.bonds[bond_id].claimable_amount if bond_id in self.bonds else gl.u256(0)

    @gl.public.view
    def is_bond_settled(self, bond_id: str) -> bool:
        return self.bonds[bond_id].settled if bond_id in self.bonds else False

    @gl.public.view
    def get_bond_payout_status(self, bond_id: str) -> gl.u8:
        return self.bonds[bond_id].payout_status if bond_id in self.bonds else PAYOUT_NONE

    @gl.public.view
    def get_bond_reporter(self, bond_id: str) -> gl.Address:
        return self.bonds[bond_id].reporter if bond_id in self.bonds else gl.Address("0x" + "0" * 40)

    def _tx_time_seconds(self) -> gl.u64:
        # Existing Direct Mode behavior relies on deterministic VM-warped datetime.
        dt = datetime.datetime.now(datetime.timezone.utc)
        return gl.u64(int(dt.timestamp()))
