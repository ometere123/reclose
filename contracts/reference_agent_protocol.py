# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""ReferenceAgentProtocol - the canonical R1 demonstration target (C1).

Implements Implementation Specification Sections 45-49. A real controlled economic system: it
spends GEN treasury value on a primary/fallback provider pair, and its available actions are
narrowed and gated entirely by the AssuranceKernel's typed `apply_assurance_action` interface -
there is no generic `execute(bytes)`-style bypass, and the LLM/Judge that produced the underlying
decision never gains a path to arbitrary calldata (CLAUDE.md Section 7 invariants 2-3; TM-AUTH-003/
TM-AUTH-009).

This contract is a Target Adapter, not part of the Kernel: it independently validates its own
resource/bounds on every action rather than trusting the Kernel's dispatch blindly (Implementation
Specification Section 48 "Target validates resource and bounds independently of Kernel"), and it
never receives target-control authority beyond what apply_assurance_action's narrow interface
grants (CLAUDE.md Section 19: economic actors here are never given assurance authority; the
reverse - assurance authority is granted to the Kernel by THIS contract, not the other way round).
"""

import genlayer as gl

ASSURANCE_STATE_NORMAL = gl.u8(0)
ASSURANCE_STATE_MONITORED = gl.u8(1)
ASSURANCE_STATE_RESTRICTED = gl.u8(2)
ASSURANCE_STATE_SAFE_MODE = gl.u8(3)
ASSURANCE_STATE_PAUSED = gl.u8(4)
ASSURANCE_STATE_RECOVERY = gl.u8(5)
VALID_ASSURANCE_STATES = {0, 1, 2, 3, 4, 5}

ACTION_NO_ACTION = gl.u8(0)
ACTION_ALERT = gl.u8(1)
ACTION_MONITOR = gl.u8(2)
ACTION_RESTRICT = gl.u8(3)
ACTION_THROTTLE = gl.u8(4)
ACTION_REVOKE_CAPABILITY = gl.u8(5)
ACTION_REROUTE = gl.u8(6)
ACTION_ENTER_SAFE_MODE = gl.u8(7)
ACTION_PAUSE = gl.u8(8)
ACTION_ENTER_RECOVERY = gl.u8(9)
ACTION_RESTORE = gl.u8(10)

DECISION_STAGE_PROVISIONAL = gl.u8(1)
DECISION_STAGE_FINAL = gl.u8(2)

# Provisional-safe subset this target accepts at PROVISIONAL stage - EXACTLY
# {MONITOR, RESTRICT, REVOKE_CAPABILITY, ENTER_SAFE_MODE} per the C1-FINAL owner directive Section 4
# (A1-H13: this set previously disagreed with the Kernel's own PROVISIONAL_SAFE_ACTIONS - it
# included THROTTLE, which is no longer provisional-safe, and omitted ENTER_SAFE_MODE, which is).
# PAUSE/ENTER_RECOVERY/RESTORE can never be PROVISIONAL regardless of what the Kernel claims to send.
PROVISIONAL_SAFE_ACTIONS = {int(ACTION_MONITOR), int(ACTION_RESTRICT), int(ACTION_REVOKE_CAPABILITY), int(ACTION_ENTER_SAFE_MODE)}

RESOURCE_PROVIDER_A = "provider_a"
RESOURCE_PROVIDER_B = "provider_b"

PROVIDER_NONE = gl.u8(0)
PROVIDER_A = gl.u8(1)
PROVIDER_B = gl.u8(2)


class ReferenceAgentProtocol(gl.contract.Contract):
    owner: gl.Address
    authorized_agent: gl.Address
    kernel: gl.Address
    assurance_controller_set: bool
    target_id: str

    provider_a: gl.Address
    provider_b: gl.Address
    provider_a_enabled: bool
    provider_b_enabled: bool
    # Owner-level authority revocation for a provider - independent of, and narrower than, the
    # Kernel's own restriction mechanism (CLAUDE.md Section 49 emergency owner controls).
    provider_a_revoked: bool
    provider_b_revoked: bool

    per_request_limit: gl.u256
    safe_mode_limit: gl.u256

    state: gl.u8
    human_override_enabled: bool
    authority_revoked: bool

    # Replay protection for Kernel-dispatched actions (CLAUDE.md Section 7 invariant 8).
    processed_action_ids: gl.storage.TreeMap[str, bool]
    # Replay protection for purchase requests (idempotent request_ref).
    processed_requests: gl.storage.TreeMap[str, bool]

    # C1-FINAL Section 17: bounded audit log for owner emergency controls - every entry tagged
    # HUMAN_OVERRIDE so it's unambiguous which state changes came from direct owner action rather
    # than the Kernel's own authenticated decision pipeline.
    override_audit_sequence: gl.u64
    override_audit_records: gl.storage.TreeMap[gl.u64, str]

    def __init__(
        self,
        authorized_agent: gl.Address,
        target_id: str,
        provider_a: gl.Address,
        provider_b: gl.Address,
        per_request_limit: gl.u256,
        safe_mode_limit: gl.u256,
        human_override_enabled: bool,
    ) -> None:
        # Address-typed constructor parameters arrive as raw bytes over the wire (real
        # transaction calldata is never a live Address object) - wrap defensively rather than
        # assume the caller already constructed one.
        self.owner = gl.message.sender_address
        self.authorized_agent = gl.Address(authorized_agent)
        self.target_id = target_id
        self.provider_a = gl.Address(provider_a)
        self.provider_b = gl.Address(provider_b)
        self.provider_a_enabled = True
        self.provider_b_enabled = True
        self.provider_a_revoked = False
        self.provider_b_revoked = False
        self.per_request_limit = per_request_limit
        self.safe_mode_limit = safe_mode_limit
        self.state = ASSURANCE_STATE_NORMAL
        self.human_override_enabled = human_override_enabled
        self.authority_revoked = False
        self.assurance_controller_set = False
        self.override_audit_sequence = gl.u64(0)

    # -- Kernel handshake (Implementation Specification Section 20) ----------------------------

    @gl.public.write
    def set_assurance_controller(self, kernel_address: gl.Address) -> None:
        self._require(gl.message.sender_address == self.owner, "E_AGT_001: UNAUTHORIZED_CALLER: only owner may set the controller")
        self._require(not self.assurance_controller_set, "E_AGT_001: CONTROLLER_ALREADY_SET")
        self.kernel = gl.Address(kernel_address)
        self.assurance_controller_set = True
        self._override_audit("CONTROLLER_INSTALLATION")

    @gl.public.view
    def get_owner(self) -> gl.Address:
        return self.owner

    @gl.public.view
    def get_assurance_controller(self) -> gl.Address:
        return self.kernel if self.assurance_controller_set else gl.Address("0x" + "0" * 40)

    @gl.public.view
    def get_assurance_owner(self) -> gl.Address:
        """C1-FINAL Section 6 (A1-H15): alias of get_owner() using the canonical registration-
        handshake view name the Kernel's register_target() checks against."""
        return self.owner

    @gl.public.view
    def get_assurance_target_id(self) -> str:
        """C1-FINAL Section 6 (A1-H15): the target's own record of its registered target_id, so
        the Kernel can independently verify the caller-supplied target_id argument actually
        matches what this target believes its identity is - not just trust the argument."""
        return self.target_id

    @gl.public.view
    def is_assurance_authority_revoked(self) -> bool:
        """C1-FINAL Section 6/7 (A1-H15/A1-H18): live-checkable revocation flag. The Kernel must
        check this before registering a target AND before processing any new decision that could
        create effects (Section 7) - a target that revoked Reclose must never have a new Kernel
        effect land on it."""
        return self.authority_revoked

    @gl.public.view
    def get_state(self) -> gl.u8:
        return self.state

    @gl.public.view
    def supports_assurance_action(self, action_type: gl.u8, resource_id: str) -> bool:
        """C1-FINAL Section 10: the Kernel calls this BEFORE sealing a policy, so a policy whose
        effects the target will deterministically reject can never be constructed in the first
        place - failing at policy-construction time, not silently at decision-execution time.
        This reference target implements exactly MONITOR/RESTRICT/REVOKE_CAPABILITY/
        ENTER_SAFE_MODE/PAUSE/ENTER_RECOVERY/RESTORE (see apply_assurance_action's own dispatch);
        THROTTLE/REROUTE/ALERT/NO_ACTION are NOT target-executable here (ALERT/NO_ACTION remain
        Kernel-local semantics only, per the owner directive)."""
        a = int(action_type)
        if a in (int(ACTION_MONITOR), int(ACTION_ENTER_SAFE_MODE), int(ACTION_PAUSE), int(ACTION_ENTER_RECOVERY)):
            return resource_id == ""
        if a in (int(ACTION_RESTRICT), int(ACTION_REVOKE_CAPABILITY)):
            return resource_id in (RESOURCE_PROVIDER_A, RESOURCE_PROVIDER_B)
        if a == int(ACTION_RESTORE):
            return resource_id in (RESOURCE_PROVIDER_A, RESOURCE_PROVIDER_B, "")
        return False

    # -- Internal helpers -------------------------------------------------------------------

    def _require(self, condition: bool, message: str) -> None:
        if not condition:
            raise gl.vm.UserError(message)

    def _override_audit(self, action: str) -> None:
        """C1-FINAL Section 17: append a HUMAN_OVERRIDE-tagged audit entry. Bounded/append-only,
        exposed via get_override_audit_count/get_override_audit_entry."""
        seq = int(self.override_audit_sequence)
        self.override_audit_records[gl.u64(seq)] = f"HUMAN_OVERRIDE action={action} caller={gl.message.sender_address.as_hex}"
        self.override_audit_sequence = gl.u64(seq + 1)

    def _state_priority_rank(self, state: gl.u8) -> int:
        """C1-FINAL Section 13/19 (A1-H19): explicit security priority, NOT raw enum-number
        comparison. The raw AssuranceState enum values (RECOVERY=5 is numerically highest) do NOT
        match severity order - RECOVERY is semantically WEAKER than RESTRICTED/SAFE_MODE/PAUSED.
        Mirrors the Kernel's own _recompute_target_state priority exactly: PAUSED > SAFE_MODE >
        RESTRICTED > RECOVERY > MONITORED > NORMAL."""
        s = int(state)
        if s == int(ASSURANCE_STATE_PAUSED):
            return 5
        if s == int(ASSURANCE_STATE_SAFE_MODE):
            return 4
        if s == int(ASSURANCE_STATE_RESTRICTED):
            return 3
        if s == int(ASSURANCE_STATE_RECOVERY):
            return 2
        if s == int(ASSURANCE_STATE_MONITORED):
            return 1
        return 0  # NORMAL

    def _raise_state(self, candidate: gl.u8) -> None:
        """Only ever moves state UP in priority rank, never down - a weaker incoming action can
        never silently overwrite (and thereby weaken) a stronger already-active state."""
        if self._state_priority_rank(candidate) > self._state_priority_rank(self.state):
            self.state = candidate

    def _require_kernel(self) -> None:
        self._require(self.assurance_controller_set, "E_AGT_001: NO_CONTROLLER: assurance controller not set")
        self._require(gl.message.sender_address == self.kernel, "E_AGT_007: UNAUTHORIZED_CALLER: only the Kernel may apply assurance actions")
        self._require(not self.authority_revoked, "E_AGT_010: AUTHORITY_REVOKED")

    # -- Kernel-dispatched typed action interface (Section 48) --------------------------------
    # No generic execute(bytes)-style method exists anywhere on this contract (TM-AUTH-009).

    @gl.public.write
    def apply_assurance_action(
        self,
        action_id: str,
        incident_id: str,
        policy_key: str,
        action_type: gl.u8,
        resource_id: str,
        param_u256: gl.u256,
        param_str: str,
        decision_stage: gl.u8,
    ) -> None:
        # C1R Section 12 defense-in-depth: this target independently validates every field of the
        # Kernel's dispatch rather than trusting it blindly - it is the final backstop against a
        # Kernel bug, not merely a passive executor.
        self._require_kernel()
        self._require(len(incident_id) > 0, "E_AGT_008: INVALID_INCIDENT_ID")
        self._require(len(policy_key) > 0, "E_AGT_008: INVALID_POLICY_KEY")
        self._require(int(decision_stage) in (int(DECISION_STAGE_PROVISIONAL), int(DECISION_STAGE_FINAL)), "E_AGT_008: INVALID_DECISION_STAGE")

        if action_id in self.processed_action_ids:
            return  # duplicate action ID -> no-op (Section 48) - the real idempotency boundary.
        self.processed_action_ids[action_id] = True

        # Target independently validates resource and bounds (Section 48) - it does not simply
        # trust that the Kernel's dispatch is well-formed.
        self._require(
            resource_id in (RESOURCE_PROVIDER_A, RESOURCE_PROVIDER_B, ""),
            "E_AGT_009: UNSUPPORTED_RESOURCE: not a resource this target recognizes",
        )

        is_provisional = int(decision_stage) == int(DECISION_STAGE_PROVISIONAL)
        if is_provisional:
            self._require(int(action_type) in PROVISIONAL_SAFE_ACTIONS, "E_AGT_008: PROVISIONAL_NOT_SAFE: this action may never be applied provisionally")
            # PAUSE/ENTER_RECOVERY/RESTORE are already excluded from PROVISIONAL_SAFE_ACTIONS, but
            # assert explicitly per Section 12's exact required checks.
            self._require(int(action_type) != int(ACTION_PAUSE), "E_AGT_008: PROVISIONAL_PAUSE_FORBIDDEN")
            self._require(int(action_type) != int(ACTION_ENTER_RECOVERY), "E_AGT_008: PROVISIONAL_ENTER_RECOVERY_FORBIDDEN")
            self._require(int(action_type) != int(ACTION_RESTORE), "E_AGT_008: PROVISIONAL_RESTORE_FORBIDDEN")

        if int(action_type) == int(ACTION_MONITOR):
            self._require(int(param_u256) == 0 and param_str == "", "E_AGT_008: UNUSED_PARAMETER: MONITOR takes no parameters")
            self._raise_state(ASSURANCE_STATE_MONITORED)
        elif int(action_type) == int(ACTION_RESTRICT):
            self._require(int(param_u256) == 0 and param_str == "", "E_AGT_008: UNUSED_PARAMETER")
            self._raise_state(ASSURANCE_STATE_RESTRICTED)
        elif int(action_type) == int(ACTION_REVOKE_CAPABILITY):
            self._require(int(param_u256) == 0 and param_str == "", "E_AGT_008: UNUSED_PARAMETER")
            if resource_id == RESOURCE_PROVIDER_A:
                self.provider_a_enabled = False
            elif resource_id == RESOURCE_PROVIDER_B:
                self.provider_b_enabled = False
            self._raise_state(ASSURANCE_STATE_RESTRICTED)
        elif int(action_type) == int(ACTION_ENTER_SAFE_MODE):
            self._require(int(param_u256) == 0 and param_str == "", "E_AGT_008: UNUSED_PARAMETER")
            self._raise_state(ASSURANCE_STATE_SAFE_MODE)
        elif int(action_type) == int(ACTION_PAUSE):
            self._require(int(param_u256) == 0 and param_str == "", "E_AGT_008: UNUSED_PARAMETER")
            self._raise_state(ASSURANCE_STATE_PAUSED)
        elif int(action_type) == int(ACTION_ENTER_RECOVERY):
            self._require(int(param_u256) == 0 and param_str == "", "E_AGT_008: UNUSED_PARAMETER")
            self._raise_state(ASSURANCE_STATE_RECOVERY)
        elif int(action_type) == int(ACTION_RESTORE):
            # C1R Section 11: RESTORE is FINAL-only; already enforced above for PROVISIONAL. The
            # only C1R action that intentionally uses param_u256 is this one, carrying the exact
            # recomputed AssuranceState the Kernel wants this target to hold after release.
            self._require(int(param_u256) in VALID_ASSURANCE_STATES, "E_AGT_008: INVALID_RESTORE_STATE: param_u256 must be a valid AssuranceState value")
            if resource_id == RESOURCE_PROVIDER_A:
                # Owner-level revocation is authoritative and is NOT cleared by a Kernel RESTORE -
                # the Kernel only ever tells us its aggregate restriction count for this resource
                # reached zero, never that owner-level policy should be overridden.
                if not self.provider_a_revoked:
                    self.provider_a_enabled = True
            elif resource_id == RESOURCE_PROVIDER_B:
                if not self.provider_b_revoked:
                    self.provider_b_enabled = True
            else:
                # Empty resource_id: target-wide state reconciliation only, bounded to the
                # Kernel-computed value - never arbitrary.
                self.state = gl.u8(int(param_u256))
        else:
            raise gl.vm.UserError("E_AGT_008: UNSUPPORTED_ACTION")

    # -- AUTO provider selection (Section 46) --------------------------------------------------

    def _select_provider(self) -> gl.u8:
        state = int(self.state)
        a_available = self.provider_a_enabled and not self.provider_a_revoked
        b_available = self.provider_b_enabled and not self.provider_b_revoked

        if state == int(ASSURANCE_STATE_PAUSED):
            return PROVIDER_NONE
        if state == int(ASSURANCE_STATE_NORMAL):
            if a_available:
                return PROVIDER_A
            if b_available:
                return PROVIDER_B
            return PROVIDER_NONE
        if state == int(ASSURANCE_STATE_RESTRICTED) or state == int(ASSURANCE_STATE_MONITORED):
            # "Any owner+assurance-enabled approved provider" - A preferred, B as the approved
            # fallback, both still gated by their own enabled/revoked flags.
            if a_available:
                return PROVIDER_A
            if b_available:
                return PROVIDER_B
            return PROVIDER_NONE
        if state == int(ASSURANCE_STATE_SAFE_MODE):
            return PROVIDER_B if b_available else PROVIDER_NONE
        if state == int(ASSURANCE_STATE_RECOVERY):
            return PROVIDER_B if b_available else PROVIDER_NONE
        return PROVIDER_NONE

    @gl.public.view
    def get_effective_provider(self) -> gl.u8:
        return self._select_provider()

    # -- Treasury (Section 18): the target owns a real prefunded GEN treasury ------------------
    #
    # Primary-source finding (exact pinned py-lib-genlayer-std runner, genlayer/contract/__init__.py
    # Contract.balance property -> wasi.get_self_balance()): a GenVM contract has its own tracked
    # native-token balance, independent of any single caller's transaction value. Proxy.emit(value=..)
    # for a cross-contract write TRANSFERS that amount FROM THIS CONTRACT's own balance to the
    # callee - it is not merely re-forwarding whatever the immediate caller happened to send. The
    # prior C1/C1R implementation used `gl.message.value` (the caller-supplied amount) only to
    # DECIDE how much to forward - which is misleading: it reads as caller-value-forwarding while
    # actually spending the contract's own balance underneath. This is corrected below to be an
    # explicit, honest autonomous-treasury model: fund_treasury() accumulates balance separately
    # from any purchase call, and purchase_service(request_ref, amount) takes NO caller-supplied
    # value at all - it spends purely from self.balance, checked explicitly before any dispatch.

    @gl.public.write.payable
    def fund_treasury(self) -> None:
        """Anyone may top up the treasury - a real payable call. On real GenVM a payable call's
        value is expected to credit the receiving contract's own tracked native balance (the same
        `wasi.get_self_balance()` the pinned Contract.balance accessor reads), consistent with how
        Proxy.emit(value=...) spends FROM that same balance on an outbound call - no explicit
        bookkeeping is written here because none should be needed. NOTE (honest Direct Mode
        limitation, not a contract defect): genlayer-test 0.30.0rc2's Direct Mode VMContext only
        credits `_balances` via the harness's own `direct_vm.deal(address, amount)` helper - a
        payable call's `gl.message.value` is NOT automatically added to `_balances` in the
        simulator, confirmed by direct inspection of gltest/direct/vm.py and wasi_mock.py. Direct
        Mode tests therefore use `direct_vm.deal(...)` to set up a funded treasury for testing;
        this does not by itself prove the real chain's auto-crediting behavior, which requires a
        live 61997 proof to fully confirm (see known-limitations)."""
        pass

    @gl.public.view
    def get_treasury_balance(self) -> gl.u256:
        return self.balance

    # -- purchase_service (Section 18/47) ------------------------------------------------------

    @gl.public.write
    def purchase_service(self, request_ref: str, amount: gl.u256) -> None:
        self._require(
            gl.message.sender_address == self.owner or gl.message.sender_address == self.authorized_agent,
            "E_AGT_001: UNAUTHORIZED_CALLER: only owner or authorized agent may purchase service",
        )
        self._require(int(self.state) != int(ASSURANCE_STATE_PAUSED), "E_AGT_002: PAUSED: target rejects purchases while paused")
        self._require(request_ref not in self.processed_requests, "E_AGT_006: DUPLICATE_REQUEST: request_ref already processed")
        self._require(int(amount) > 0, "E_AGT_003: LIMIT_EXCEEDED: amount must be non-zero")

        limit = self.safe_mode_limit if int(self.state) == int(ASSURANCE_STATE_SAFE_MODE) else self.per_request_limit
        self._require(int(amount) <= int(limit), "E_AGT_003: LIMIT_EXCEEDED: amount exceeds the per-request/safe-mode limit")
        self._require(int(amount) <= int(self.balance), "E_AGT_003: LIMIT_EXCEEDED: amount exceeds available treasury balance")

        provider_choice = self._select_provider()
        self._require(int(provider_choice) != int(PROVIDER_NONE), "E_AGT_005: NO_PROVIDER_AVAILABLE")

        # Recorded BEFORE the child dispatch (Section 18: "record pending spend state before the
        # child message in a way that does not falsely claim provider success" - marking the
        # request_ref processed here is the idempotency boundary; it does NOT claim the provider's
        # fulfill() succeeded, only that this exact spend was authorized and attempted once. GenVM
        # gives no synchronous child-completion signal to the caller here (see the note below);
        # richer reconciliation of provider-side failure is explicitly deferred to C3's transaction
        # tracker, per the owner directive's own fallback clause for this exact situation.
        self.processed_requests[request_ref] = True
        provider_address = self.provider_a if int(provider_choice) == int(PROVIDER_A) else self.provider_b
        provider_contract = gl.contract.get_at(provider_address)
        provider_contract.emit(value=amount, on="finalized").fulfill(request_ref)

    # -- Emergency owner controls (Section 49) -------------------------------------------------

    @gl.public.write
    def owner_emergency_pause(self) -> None:
        self._require(gl.message.sender_address == self.owner, "E_AGT_001: UNAUTHORIZED_CALLER")
        self.state = ASSURANCE_STATE_PAUSED
        self._override_audit("OWNER_EMERGENCY_PAUSE")

    @gl.public.write
    def revoke_assurance_controller(self) -> None:
        self._require(gl.message.sender_address == self.owner, "E_AGT_001: UNAUTHORIZED_CALLER")
        self.authority_revoked = True
        self._override_audit("CONTROLLER_REVOCATION")

    @gl.public.write
    def owner_restore(self) -> None:
        self._require(gl.message.sender_address == self.owner, "E_AGT_001: UNAUTHORIZED_CALLER")
        self._require(self.human_override_enabled, "E_AGT_010: HUMAN_OVERRIDE_DISABLED: this target does not permit direct owner restoration")
        self.state = ASSURANCE_STATE_NORMAL
        self.provider_a_enabled = True
        self.provider_b_enabled = True
        self._override_audit("OWNER_RESTORE")

    @gl.public.write
    def owner_revoke_provider(self, resource_id: str) -> None:
        """C1-FINAL Section 17/49: owner-level provider revocation - sovereign, independent of and
        narrower than the Kernel's own REVOKE_CAPABILITY restriction mechanism. NOT cleared by a
        Kernel RESTORE (see apply_assurance_action's RESTORE branch)."""
        self._require(gl.message.sender_address == self.owner, "E_AGT_001: UNAUTHORIZED_CALLER")
        self._require(resource_id in (RESOURCE_PROVIDER_A, RESOURCE_PROVIDER_B), "E_AGT_009: UNSUPPORTED_RESOURCE")
        if resource_id == RESOURCE_PROVIDER_A:
            self.provider_a_revoked = True
            self.provider_a_enabled = False
        else:
            self.provider_b_revoked = True
            self.provider_b_enabled = False
        self._override_audit(f"OWNER_PROVIDER_REVOCATION resource_id={resource_id}")

    @gl.public.write
    def owner_restore_provider(self, resource_id: str) -> None:
        self._require(gl.message.sender_address == self.owner, "E_AGT_001: UNAUTHORIZED_CALLER")
        self._require(self.human_override_enabled, "E_AGT_010: HUMAN_OVERRIDE_DISABLED: this target does not permit direct owner restoration")
        self._require(resource_id in (RESOURCE_PROVIDER_A, RESOURCE_PROVIDER_B), "E_AGT_009: UNSUPPORTED_RESOURCE")
        if resource_id == RESOURCE_PROVIDER_A:
            self.provider_a_revoked = False
            self.provider_a_enabled = True
        else:
            self.provider_b_revoked = False
            self.provider_b_enabled = True
        self._override_audit(f"OWNER_PROVIDER_RESTORE resource_id={resource_id}")

    @gl.public.view
    def get_override_audit_count(self) -> gl.u64:
        return self.override_audit_sequence

    @gl.public.view
    def get_override_audit_entry(self, index: gl.u64) -> str:
        key = gl.u64(int(index))
        return self.override_audit_records[key] if key in self.override_audit_records else ""
