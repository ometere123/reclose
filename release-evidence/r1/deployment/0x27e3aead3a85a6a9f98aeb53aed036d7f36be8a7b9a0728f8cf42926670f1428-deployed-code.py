# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""AssuranceKernel - the deterministic, immutable root of trust for Reclose R1 (C1R hardening).

Implements Implementation Specification Sections 16-29, as corrected by the C1R hardening
instruction (owner-supplied external findings A1-H01..A1-H12 against the prior C1 submission,
audit target 82421aa - see docs/execution/Audit Register.md). This contract has no web access, no
LLM call, no arbitrary external call, and no upgrader - it is immutable once deployed (CLAUDE.md
Section 12 / Section 7 invariant 5). It never contains open-ended judgment: GenLayer/the Judge
determines the judgment; this Kernel enforces the boundary that judgment is allowed to act within
(CLAUDE.md Section 6's permanent principle).

Security invariants enforced here (CLAUDE.md Section 7, cross-referenced to Threat Model IDs):
  1. no action without active delegated policy                  -> TM-AUTH-001
  2. no action outside the finite allowed action set             -> TM-AUTH-002
  3. no arbitrary AI-generated calldata                          -> TM-AUTH-003
  4. no autonomous authority expansion                           -> TM-AUTH-004, TM-AUTH-010
  5. immutable constitutional Kernel                             -> (no upgrader method exists)
  8. duplicate delivery cannot duplicate economic/effect impact  -> TM-AUTH-*, replay protection
  9. stale policy cannot silently create new authority effects   -> TM-AUTH-006
 10. resolving Incident A cannot remove Incident B's restriction -> TM-REC-001, TM-REC-008
 11. recovery cannot restore more authority than policy permits  -> TM-REC-006

C1R hardening summary (findings closed here - see docs/execution/audit-packets/A1-attempt-2/
findings-closure.md for the full finding-by-finding proof):
  A1-H02: security timestamps now come ONLY from `_tx_time_seconds()`, which reads GenLayer's own
    deterministic message-context timestamp (`gl.message.datetime` - verified against the exact
    pinned genlayer-test 0.30.0rc2 Direct Mode runtime by direct inspection: it is a message-level
    ISO8601 UTC string set by the VM/consensus context, not a caller-suppliable calldata field).
    No public method accepts a caller-supplied `now` anymore.
  A1-H03: authority expansion is now a conservative structural-subset comparator
    (_classify_expansion), not a rule/effect count comparison.
  A1-H04: disable_action/disable_resource overlays are checked in _apply_restriction before any
    restriction is created or effect dispatched.
  A1-H05: EffectRecord is now bound to an exact rule_id; _effects_for_rule only returns effects
    belonging to the triggering rule.
  A1-H06: provisional_allowed is checked before any provisional effect is applied.
  A1-H01/A1-H07: apply_remediation_decision/apply_recovery_validation are no longer independent
    public entry points - all semantic judgement enters through authenticated receive_decision(),
    routed by PolicyRuleRecord.rule_kind.
  A1-H09: identifiers/hashes are validated via shared helpers; composite keys use one canonical
    length-prefixed encoding (_ck) everywhere, not raw delimiter concatenation.
  A1-H11: receive_decision binds policy_key/policy_version/policy_hash/rule_id/judge/judge_version
    and rejects any mismatch as STALE_POLICY/WRONG_JUDGE/WRONG_JUDGE_VERSION.
  A1-H08 (live cross-contract proof) is addressed by the C1R deployment evidence, not by this file.
"""

import datetime

import genlayer as gl

ASSURANCE_STATE_NORMAL = gl.u8(0)
ASSURANCE_STATE_MONITORED = gl.u8(1)
ASSURANCE_STATE_RESTRICTED = gl.u8(2)
ASSURANCE_STATE_SAFE_MODE = gl.u8(3)
ASSURANCE_STATE_PAUSED = gl.u8(4)
ASSURANCE_STATE_RECOVERY = gl.u8(5)

DECISION_OUTCOME_NONE = gl.u8(0)
DECISION_OUTCOME_CONFIRMED = gl.u8(1)
DECISION_OUTCOME_REJECTED = gl.u8(2)
DECISION_OUTCOME_UNDETERMINED = gl.u8(3)

DECISION_STAGE_NONE = gl.u8(0)
DECISION_STAGE_PROVISIONAL = gl.u8(1)
DECISION_STAGE_FINAL = gl.u8(2)

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

SUPPORTED_ACTIONS = {
    ACTION_NO_ACTION,
    ACTION_ALERT,
    ACTION_MONITOR,
    ACTION_RESTRICT,
    ACTION_THROTTLE,
    ACTION_REVOKE_CAPABILITY,
    ACTION_REROUTE,
    ACTION_ENTER_SAFE_MODE,
    ACTION_PAUSE,
    ACTION_ENTER_RECOVERY,
    ACTION_RESTORE,
}

PROVISIONAL_SAFE_ACTIONS = {
    ACTION_MONITOR,
    ACTION_RESTRICT,
    ACTION_REVOKE_CAPABILITY,
    ACTION_ENTER_SAFE_MODE,
}

RESOURCE_SCOPED_ACTIONS = {ACTION_RESTRICT, ACTION_THROTTLE, ACTION_REVOKE_CAPABILITY, ACTION_REROUTE}
TARGET_WIDE_ACTIONS = {ACTION_MONITOR, ACTION_ENTER_SAFE_MODE, ACTION_PAUSE, ACTION_ENTER_RECOVERY, ACTION_RESTORE}

MAX_EFFECTS_PER_DECISION = 4
# target_id may be 96 chars; canonical incident identity appends ':0x<40hex>:<u64 decimal>'.
MAX_INCIDENT_ID_CHARS = 160

RULE_KIND_INCIDENT = gl.u8(1)
RULE_KIND_REMEDIATION = gl.u8(2)
RULE_KIND_RECOVERY_VALIDATION = gl.u8(3)
VALID_RULE_KINDS = {RULE_KIND_INCIDENT, RULE_KIND_REMEDIATION, RULE_KIND_RECOVERY_VALIDATION}

RELEASE_AT_REMEDIATION_CONFIRMED = gl.u8(1)
RELEASE_AT_RECOVERY_VALIDATED = gl.u8(2)
RELEASE_AT_POLICY_REPLACEMENT = gl.u8(3)
VALID_RELEASE_PHASES = {RELEASE_AT_REMEDIATION_CONFIRMED, RELEASE_AT_RECOVERY_VALIDATED, RELEASE_AT_POLICY_REPLACEMENT}

INCIDENT_STATUS_OPEN = gl.u8(0)
INCIDENT_STATUS_PROVISIONAL_APPLIED = gl.u8(1)
INCIDENT_STATUS_FINAL_CONFIRMED = gl.u8(2)
INCIDENT_STATUS_RECOVERY = gl.u8(3)
INCIDENT_STATUS_CLOSED = gl.u8(4)

_ID_ALLOWED_EXTRA = set("_.:-")


def _valid_identifier(value: str, max_len: int, allow_empty: bool = False) -> bool:
    if value == "":
        return allow_empty
    if len(value) > max_len:
        return False
    for ch in value:
        o = ord(ch)
        is_alnum = (48 <= o <= 57) or (65 <= o <= 90) or (97 <= o <= 122)
        if not is_alnum and ch not in _ID_ALLOWED_EXTRA:
            return False
    return True


def _valid_hash(value: str) -> bool:
    if len(value) != 66 or not value.startswith("0x"):
        return False
    hexpart = value[2:]
    for ch in hexpart:
        o = ord(ch)
        if not ((48 <= o <= 57) or (97 <= o <= 102)):
            return False
    return True


def _normalize_hash_arg(value) -> str:
    if isinstance(value, str):
        return value
    try:
        as_int = int(value)
    except (TypeError, ValueError):
        return value
    if as_int < 0 or as_int >= (1 << 256):
        return value
    return "0x" + format(as_int, "064x")


def _normalize_str_arg(value):
    if isinstance(value, str):
        return value
    if value == 0:
        return ""
    return value


def _ck(*parts: str) -> str:
    out = []
    for p in parts:
        out.append(f"{len(p)}:{p}")
    return "".join(out)


@gl.storage.allow
class TargetRecord:
    target_address: gl.Address
    cached_owner: gl.Address
    state: gl.u8
    active_policy_key: str
    registered_at: gl.u64
    policy_generation: gl.u32
    authority_revoked: bool
    human_override_enabled: bool


@gl.storage.allow
class PolicyHeader:
    policy_key: str
    target_id: str
    version: gl.u32
    manifest_hash: str
    creator: gl.Address
    created_at: gl.u64
    sealed_at: gl.u64
    activation_not_before: gl.u64
    activated_at: gl.u64
    sealed: bool
    active: bool
    superseded: bool
    rule_count: gl.u16
    resource_count: gl.u16
    effect_count: gl.u16
    human_override_enabled: bool


@gl.storage.allow
class PolicyRuleRecord:
    rule_id: str
    judge: gl.Address
    judge_version: gl.u32
    rule_kind: gl.u8
    provisional_allowed: bool
    report_bond: gl.u256
    confirmed_bounty: gl.u256
    enabled: bool


@gl.storage.allow
class EffectRecord:
    rule_id: str
    action_type: gl.u8
    resource_id: str
    param_u256: gl.u256
    param_str: str
    release_phase: gl.u8
    enabled: bool


@gl.storage.allow
class RestrictionRecord:
    restriction_id: str
    incident_id: str
    target_id: str
    rule_id: str
    effect_index: gl.u16
    action_type: gl.u8
    resource_id: str
    release_phase: gl.u8
    active: bool


@gl.storage.allow
class ActionDispatchRecord:
    action_id: str
    target_id: str
    incident_id: str
    policy_key: str
    action_type: gl.u8
    resource_id: str
    param_u256: gl.u256
    param_str: str
    dispatch_attempts: gl.u32


@gl.storage.allow
class IncidentRecord:
    incident_id: str
    parent_incident_id: str
    target_id: str
    policy_key: str
    policy_version: gl.u32
    policy_hash: str
    rule_id: str
    resource_id: str
    reporter: gl.Address
    judge: gl.Address
    evidence_hash: str
    condition_code: str
    provisional_outcome: gl.u8
    final_outcome: gl.u8
    status: gl.u8
    restriction_count: gl.u32
    created_at: gl.u64
    closed_at: gl.u64


class AssuranceKernel(gl.contract.Contract):
    protocol_schema_version: gl.u16
    minimum_policy_delay_seconds: gl.u64

    target_ids: gl.storage.DynArray[str]
    targets: gl.storage.TreeMap[str, TargetRecord]
    policy_headers: gl.storage.TreeMap[str, PolicyHeader]
    policy_rules: gl.storage.TreeMap[str, PolicyRuleRecord]
    policy_resources: gl.storage.TreeMap[str, str]
    policy_effects: gl.storage.TreeMap[str, EffectRecord]
    owner_action_disabled: gl.storage.TreeMap[str, bool]
    owner_resource_disabled: gl.storage.TreeMap[str, bool]
    incidents: gl.storage.TreeMap[str, IncidentRecord]
    restrictions: gl.storage.TreeMap[str, RestrictionRecord]
    resource_restriction_counts: gl.storage.TreeMap[str, gl.u32]
    state_restriction_counts: gl.storage.TreeMap[str, gl.u32]
    recovery_incident_counts: gl.storage.TreeMap[str, gl.u32]
    policy_replacement_hold_count: gl.storage.TreeMap[str, gl.u32]
    policy_replacement_hold_incidents: gl.storage.TreeMap[str, str]
    processed_decisions: gl.storage.TreeMap[str, str]
    processed_action_dispatch_count: gl.storage.TreeMap[str, gl.u32]
    action_dispatch_records: gl.storage.TreeMap[str, ActionDispatchRecord]
    audit_sequence: gl.u64
    audit_records: gl.storage.TreeMap[gl.u64, str]
    # A2-remediation: target -> incident reverse index, so an off-chain caller (the SDK's
    # getAssuranceState()) can enumerate a target's incidents and their restrictions WITHOUT
    # needing to already know every incident_id in advance. Purely additive - does not change
    # any existing state machine, only records what receive_decision already creates.
    target_incident_count: gl.storage.TreeMap[str, gl.u32]
    target_incident_at: gl.storage.TreeMap[str, str]

    def __init__(self, protocol_schema_version: gl.u16, minimum_policy_delay_seconds: gl.u64) -> None:
        self.protocol_schema_version = protocol_schema_version
        self.minimum_policy_delay_seconds = minimum_policy_delay_seconds
        self.audit_sequence = gl.u64(0)

    def _audit(self, entry: str) -> None:
        seq = self.audit_sequence
        self.audit_records[seq] = entry
        self.audit_sequence = gl.u64(int(seq) + 1)

    def _require(self, condition: bool, message: str) -> None:
        if not condition:
            raise gl.vm.UserError(message)

    def _tx_time_seconds(self) -> gl.u64:
        dt = datetime.datetime.now(datetime.timezone.utc)
        return gl.u64(int(dt.timestamp()))

    def _live_owner(self, target_address: gl.Address) -> gl.Address:
        return gl.contract.get_at(target_address).view().get_owner()

    def _require_live_owner(self, target_id: str, target: TargetRecord) -> None:
        live_owner = self._live_owner(target.target_address)
        self._require(gl.message.sender_address == live_owner, "E_KRN_003: UNAUTHORIZED_CALLER: not the live target owner")

    def _require_live_controller_active(self, target_id: str, target: TargetRecord) -> None:
        target_view = gl.contract.get_at(target.target_address)
        controller = target_view.view().get_assurance_controller()
        self._require(controller == gl.message.contract_address, "E_KRN_018: target controller revoked - target does not recognize this Kernel as controller")
        revoked = target_view.view().is_assurance_authority_revoked()
        self._require(not revoked, "E_KRN_018: target controller revoked - target reports assurance authority revoked")

    @gl.public.write
    def register_target(self, target_id: str, target_address: gl.Address, human_override_enabled: bool) -> None:
        target_address = gl.Address(target_address)
        self._require(_valid_identifier(target_id, 96), "E_KRN_001: INVALID_TARGET_ID")
        self._require(target_id not in self.targets, "E_KRN_002: DUPLICATE_TARGET: target_id already registered")
        target_view = gl.contract.get_at(target_address)
        reported_owner = target_view.view().get_assurance_owner()
        self._require(gl.message.sender_address == reported_owner, "E_KRN_003: UNAUTHORIZED_CALLER: caller is not target owner")
        controller = target_view.view().get_assurance_controller()
        self._require(controller == gl.message.contract_address, "E_KRN_004: TARGET_HANDSHAKE_FAILED: target does not recognize this Kernel as controller")
        reported_target_id = target_view.view().get_assurance_target_id()
        self._require(reported_target_id == target_id, "E_KRN_004: TARGET_ID_MISMATCH: target's own reported target_id does not match the registration argument")
        reported_revoked = target_view.view().is_assurance_authority_revoked()
        self._require(not reported_revoked, "E_KRN_004: TARGET_ALREADY_REVOKED: target reports assurance authority already revoked")
        record = TargetRecord()
        record.target_address = target_address
        record.cached_owner = reported_owner
        record.state = ASSURANCE_STATE_NORMAL
        record.active_policy_key = ""
        record.registered_at = self._tx_time_seconds()
        record.policy_generation = gl.u32(0)
        record.authority_revoked = False
        record.human_override_enabled = human_override_enabled
        self.targets[target_id] = record
        self.target_ids.append(target_id)
        self._audit(f"REGISTER_TARGET target_id={target_id}")

    @gl.public.write
    def begin_policy(self, target_id: str, policy_key: str, manifest_hash: str) -> None:
        manifest_hash = _normalize_hash_arg(manifest_hash)
        self._require(_valid_identifier(policy_key, 96), "INVALID_POLICY_KEY")
        self._require(_valid_hash(manifest_hash), "INVALID_MANIFEST_HASH")
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        self._require(policy_key not in self.policy_headers, "E_KRN_005: DUPLICATE_POLICY: policy_key already exists")
        prior_version = gl.u32(0)
        for pk in self._policy_keys_for_target(target_id):
            hdr = self.policy_headers[pk]
            if int(hdr.version) > int(prior_version):
                prior_version = hdr.version
        header = PolicyHeader()
        header.policy_key = policy_key
        header.target_id = target_id
        header.version = gl.u32(int(prior_version) + 1)
        header.manifest_hash = manifest_hash
        header.creator = gl.message.sender_address
        header.created_at = self._tx_time_seconds()
        header.sealed_at = gl.u64(0)
        header.activation_not_before = gl.u64(0)
        header.activated_at = gl.u64(0)
        header.sealed = False
        header.active = False
        header.superseded = False
        header.rule_count = gl.u16(0)
        header.resource_count = gl.u16(0)
        header.effect_count = gl.u16(0)
        header.human_override_enabled = target.human_override_enabled
        self.policy_headers[policy_key] = header
        self._audit(f"BEGIN_POLICY policy_key={policy_key} target_id={target_id} version={header.version}")

    def _policy_keys_for_target(self, target_id: str) -> list[str]:
        keys: list[str] = []
        for pk in self.policy_headers.keys():
            if self.policy_headers[pk].target_id == target_id:
                keys.append(pk)
        return keys

    @gl.public.write
    def add_policy_resource(self, policy_key: str, resource_id: str) -> None:
        self._require(_valid_identifier(resource_id, 64), "INVALID_RESOURCE_ID")
        header = self.policy_headers[policy_key]
        target = self.targets[header.target_id]
        self._require_live_owner(header.target_id, target)
        self._require(not header.sealed, "E_KRN_006: SEALED_POLICY: cannot mutate a sealed policy")
        for i in range(int(header.resource_count)):
            if self.policy_resources[_ck(policy_key, str(i))] == resource_id:
                raise gl.vm.UserError("E_KRN_005: DUPLICATE_RESOURCE: resource_id already registered on this policy")
        idx = int(header.resource_count)
        self.policy_resources[_ck(policy_key, str(idx))] = resource_id
        header.resource_count = gl.u16(idx + 1)
        self.policy_headers[policy_key] = header

    @gl.public.write
    def add_policy_rule(self, policy_key: str, rule_id: str, judge: gl.Address, judge_version: gl.u32, rule_kind: gl.u8, provisional_allowed: bool, report_bond: gl.u256, confirmed_bounty: gl.u256) -> None:
        judge = gl.Address(judge)
        self._require(_valid_identifier(rule_id, 64), "INVALID_RULE_ID")
        self._require(int(judge_version) != 0, "E_KRN_005: INVALID_JUDGE_VERSION: judge_version must be non-zero for R1")
        self._require(rule_kind in VALID_RULE_KINDS, "INVALID_RULE_KIND")
        header = self.policy_headers[policy_key]
        target = self.targets[header.target_id]
        self._require_live_owner(header.target_id, target)
        self._require(not header.sealed, "E_KRN_006: SEALED_POLICY: cannot mutate a sealed policy")
        for i in range(int(header.rule_count)):
            if self.policy_rules[_ck(policy_key, str(i))].rule_id == rule_id:
                raise gl.vm.UserError("E_KRN_005: DUPLICATE_RULE_ID: rule_id already registered on this policy")
        rule = PolicyRuleRecord()
        rule.rule_id = rule_id
        rule.judge = judge
        rule.judge_version = judge_version
        rule.rule_kind = rule_kind
        rule.provisional_allowed = provisional_allowed
        rule.report_bond = report_bond
        rule.confirmed_bounty = confirmed_bounty
        rule.enabled = True
        idx = int(header.rule_count)
        self.policy_rules[_ck(policy_key, str(idx))] = rule
        header.rule_count = gl.u16(idx + 1)
        self.policy_headers[policy_key] = header

    def _effect_count_for_rule(self, policy_key: str, header: PolicyHeader, rule_id: str) -> int:
        count = 0
        for i in range(int(header.effect_count)):
            key = _ck(policy_key, str(i))
            if key in self.policy_effects and self.policy_effects[key].rule_id == rule_id and self.policy_effects[key].enabled:
                count += 1
        return count

    @gl.public.write
    def add_policy_effect(self, policy_key: str, rule_id: str, action_type: gl.u8, resource_id: str, param_u256: gl.u256, param_str: str, release_phase: gl.u8) -> None:
        resource_id = _normalize_str_arg(resource_id)
        param_str = _normalize_str_arg(param_str)
        self._require(_valid_identifier(resource_id, 64, allow_empty=True), "INVALID_RESOURCE_ID")
        header = self.policy_headers[policy_key]
        target = self.targets[header.target_id]
        self._require_live_owner(header.target_id, target)
        self._require(not header.sealed, "E_KRN_006: SEALED_POLICY: cannot mutate a sealed policy")
        rule = self._find_rule(policy_key, rule_id, header)
        self._require(rule is not None, "UNKNOWN_RULE: rule_id not registered on this policy")
        self._require(action_type in SUPPORTED_ACTIONS, "E_KRN_013: UNSUPPORTED_ACTION: action_type not in Kernel-v1 action set")
        self._require(release_phase in VALID_RELEASE_PHASES, "E_KRN_005: INVALID_RELEASE_PHASE")
        self._require(int(release_phase) != int(RELEASE_AT_POLICY_REPLACEMENT), "E_KRN_005: RESERVED_RELEASE_PHASE: RELEASE_AT_POLICY_REPLACEMENT is Kernel-internal only")
        if action_type in RESOURCE_SCOPED_ACTIONS:
            self._require(resource_id != "", "E_KRN_013: RESOURCE_REQUIRED: this action type requires a non-empty resource_id")
            found = False
            for i in range(int(header.resource_count)):
                if self.policy_resources[_ck(policy_key, str(i))] == resource_id:
                    found = True
                    break
            self._require(found, "E_KRN_013: UNREGISTERED_RESOURCE: resource_id not registered on this policy")
        existing_for_rule = self._effect_count_for_rule(policy_key, header, rule_id)
        self._require(existing_for_rule < MAX_EFFECTS_PER_DECISION, "E_KRN_005: TOO_MANY_EFFECTS: this rule already has MAX_EFFECTS_PER_DECISION enabled effects")
        for i in range(int(header.effect_count)):
            key = _ck(policy_key, str(i))
            if key not in self.policy_effects:
                continue
            e = self.policy_effects[key]
            if e.enabled and e.rule_id == rule_id and int(e.action_type) == int(action_type) and e.resource_id == resource_id:
                raise gl.vm.UserError("E_KRN_005: DUPLICATE_EFFECT: an identical enabled effect already exists for this rule")
        effect = EffectRecord()
        effect.rule_id = rule_id
        effect.action_type = action_type
        effect.resource_id = resource_id
        effect.param_u256 = param_u256
        effect.param_str = param_str
        effect.release_phase = release_phase
        effect.enabled = True
        idx = int(header.effect_count)
        self.policy_effects[_ck(policy_key, str(idx))] = effect
        header.effect_count = gl.u16(idx + 1)
        self.policy_headers[policy_key] = header

    @gl.public.write
    def seal_policy(self, policy_key: str) -> None:
        header = self.policy_headers[policy_key]
        target = self.targets[header.target_id]
        self._require_live_owner(header.target_id, target)
        self._require(not header.sealed, "E_KRN_006: ALREADY_SEALED")
        self._require_target_supports_all_effects(policy_key, header, target)
        header.sealed = True
        header.sealed_at = self._tx_time_seconds()
        is_expansion = self._classify_expansion(target, header)
        header.activation_not_before = header.sealed_at if not is_expansion else gl.u64(int(header.sealed_at) + int(self.minimum_policy_delay_seconds))
        self.policy_headers[policy_key] = header
        self._audit(f"SEAL_POLICY policy_key={policy_key} is_expansion={is_expansion}")

    def _require_target_supports_all_effects(self, policy_key: str, header: PolicyHeader, target: TargetRecord) -> None:
        target_view = gl.contract.get_at(target.target_address)
        for i in range(int(header.effect_count)):
            key = _ck(policy_key, str(i))
            if key not in self.policy_effects:
                continue
            effect = self.policy_effects[key]
            if not effect.enabled or int(effect.action_type) in (int(ACTION_ALERT), int(ACTION_NO_ACTION)):
                continue
            supported = target_view.view().supports_assurance_action(effect.action_type, effect.resource_id)
            self._require(supported, f"E_KRN_013: TARGET_DOES_NOT_SUPPORT_EFFECT: action_type={int(effect.action_type)} resource_id={effect.resource_id}")

    def _rule_identity_map(self, policy_key: str, header: PolicyHeader) -> dict:
        out = {}
        for i in range(int(header.rule_count)):
            key = _ck(policy_key, str(i))
            if key not in self.policy_rules:
                continue
            r = self.policy_rules[key]
            if not r.enabled:
                continue
            identity = (r.rule_id, r.judge.as_hex, int(r.judge_version), int(r.rule_kind), r.provisional_allowed, str(r.report_bond))
            out[identity] = int(r.confirmed_bounty)
        return out

    def _effect_tuples(self, policy_key: str, header: PolicyHeader) -> set:
        out = set()
        for i in range(int(header.effect_count)):
            key = _ck(policy_key, str(i))
            if key not in self.policy_effects:
                continue
            e = self.policy_effects[key]
            if e.enabled:
                out.add((e.rule_id, int(e.action_type), e.resource_id, str(e.param_u256), e.param_str, int(e.release_phase)))
        return out

    def _classify_expansion(self, target: TargetRecord, new_header: PolicyHeader) -> bool:
        active_key = target.active_policy_key
        if active_key == "" or active_key not in self.policy_headers:
            return len(self._rule_identity_map(new_header.policy_key, new_header)) > 0 or len(self._effect_tuples(new_header.policy_key, new_header)) > 0
        old_header = self.policy_headers[active_key]
        new_rules = self._rule_identity_map(new_header.policy_key, new_header)
        old_rules = self._rule_identity_map(active_key, old_header)
        for identity, new_bounty in new_rules.items():
            if identity not in old_rules or new_bounty > old_rules[identity]:
                return True
        if not self._effect_tuples(new_header.policy_key, new_header).issubset(self._effect_tuples(active_key, old_header)):
            return True
        if new_header.human_override_enabled and not old_header.human_override_enabled:
            return True
        return False

    @gl.public.view
    def get_policy_security_diff_is_expansion(self, target_id: str, policy_key: str) -> bool:
        return self._classify_expansion(self.targets[target_id], self.policy_headers[policy_key])

    def _maybe_clear_overlays_on_expansion(self, target_id: str, policy_key: str, header: PolicyHeader) -> None:
        for i in range(int(header.effect_count)):
            key = _ck(policy_key, str(i))
            if key not in self.policy_effects:
                continue
            e = self.policy_effects[key]
            if not e.enabled:
                continue
            akey = _ck(target_id, str(int(e.action_type)))
            if akey in self.owner_action_disabled:
                del self.owner_action_disabled[akey]
            if e.resource_id != "":
                rkey = _ck(target_id, e.resource_id)
                if rkey in self.owner_resource_disabled:
                    del self.owner_resource_disabled[rkey]

    @gl.public.write
    def activate_policy(self, policy_key: str) -> None:
        header = self.policy_headers[policy_key]
        target_id = header.target_id
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        self._require(header.sealed, "E_KRN_006: NOT_SEALED: cannot activate an unsealed policy")
        self._require(not header.active, "E_KRN_006: ALREADY_ACTIVE")
        is_expansion = self._classify_expansion(target, header)
        now = self._tx_time_seconds()
        if is_expansion:
            required_not_before = int(header.sealed_at) + int(self.minimum_policy_delay_seconds)
            self._require(int(now) >= required_not_before, "E_KRN_007: TIMELOCK_NOT_ELAPSED: authority expansion requires the configured delay from seal time")
            self._require_live_controller_active(target_id, target)
        active_key = target.active_policy_key
        if active_key != "" and active_key in self.policy_headers:
            prior = self.policy_headers[active_key]
            prior.active = False
            prior.superseded = True
            self.policy_headers[active_key] = prior
        header.active = True
        header.activated_at = now
        self.policy_headers[policy_key] = header
        if is_expansion:
            self._maybe_clear_overlays_on_expansion(target_id, policy_key, header)
        target.active_policy_key = policy_key
        target.policy_generation = gl.u32(int(target.policy_generation) + 1)
        self.targets[target_id] = target
        self._release_policy_replacement_holds(target_id)
        self._audit(f"ACTIVATE_POLICY policy_key={policy_key} target_id={target_id} expansion={is_expansion}")

    @gl.public.write
    def disable_action(self, target_id: str, action_type: gl.u8) -> None:
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        self.owner_action_disabled[_ck(target_id, str(int(action_type)))] = True
        self._audit(f"DISABLE_ACTION target_id={target_id} action_type={int(action_type)}")

    @gl.public.write
    def disable_resource(self, target_id: str, resource_id: str) -> None:
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        self.owner_resource_disabled[_ck(target_id, resource_id)] = True
        self._audit(f"DISABLE_RESOURCE target_id={target_id} resource_id={resource_id}")

    def _is_action_disabled(self, target_id: str, action_type: gl.u8) -> bool:
        return _ck(target_id, str(int(action_type))) in self.owner_action_disabled

    def _is_resource_disabled(self, target_id: str, resource_id: str) -> bool:
        return False if resource_id == "" else _ck(target_id, resource_id) in self.owner_resource_disabled

    @gl.public.write
    def revoke_authority(self, target_id: str) -> None:
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        target.authority_revoked = True
        self.targets[target_id] = target
        self._audit(f"REVOKE_AUTHORITY target_id={target_id}")

    def _find_rule(self, policy_key: str, rule_id: str, header: PolicyHeader) -> PolicyRuleRecord | None:
        for i in range(int(header.rule_count)):
            key = _ck(policy_key, str(i))
            if key in self.policy_rules and self.policy_rules[key].rule_id == rule_id:
                return self.policy_rules[key]
        return None

    def _effects_for_rule(self, policy_key: str, header: PolicyHeader, rule_id: str) -> list[tuple]:
        out: list[tuple] = []
        for i in range(int(header.effect_count)):
            key = _ck(policy_key, str(i))
            if key in self.policy_effects:
                effect = self.policy_effects[key]
                if effect.enabled and effect.rule_id == rule_id:
                    out.append((i, effect))
        return out[:MAX_EFFECTS_PER_DECISION]

    @gl.public.write
    def receive_decision(self, incident_id: str, parent_incident_id: str, target_id: str, policy_key: str, policy_version: gl.u32, policy_hash: str, rule_id: str, resource_id: str, reporter: gl.Address, evidence_hash: str, outcome: gl.u8, condition_code: str, decision_stage: gl.u8, judge_version: gl.u32) -> None:
        """Legacy compatibility entrypoint. IncidentJudgeV1 uses stage-specific methods."""
        self._receive_decision(
            incident_id, parent_incident_id, target_id, policy_key, policy_version,
            policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome,
            condition_code, decision_stage, judge_version,
        )

    @gl.public.write
    def receive_provisional_decision(self, incident_id: str, parent_incident_id: str, target_id: str, policy_key: str, policy_version: gl.u32, policy_hash: str, rule_id: str, resource_id: str, reporter: gl.Address, evidence_hash: str, outcome: gl.u8, condition_code: str, judge_version: gl.u32) -> None:
        """Apply the authenticated decision through the accepted/provisional lifecycle."""
        self._receive_decision(
            incident_id, parent_incident_id, target_id, policy_key, policy_version,
            policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome,
            condition_code, DECISION_STAGE_PROVISIONAL, judge_version,
        )

    @gl.public.write
    def receive_final_decision(self, incident_id: str, parent_incident_id: str, target_id: str, policy_key: str, policy_version: gl.u32, policy_hash: str, rule_id: str, resource_id: str, reporter: gl.Address, evidence_hash: str, outcome: gl.u8, condition_code: str, judge_version: gl.u32) -> None:
        """Apply the authenticated decision through the finalized lifecycle."""
        self._receive_decision(
            incident_id, parent_incident_id, target_id, policy_key, policy_version,
            policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome,
            condition_code, DECISION_STAGE_FINAL, judge_version,
        )

    def _receive_decision(self, incident_id: str, parent_incident_id: str, target_id: str, policy_key: str, policy_version: gl.u32, policy_hash: str, rule_id: str, resource_id: str, reporter: gl.Address, evidence_hash: str, outcome: gl.u8, condition_code: str, decision_stage: gl.u8, judge_version: gl.u32) -> None:
        reporter = gl.Address(reporter)
        policy_hash = _normalize_hash_arg(policy_hash)
        evidence_hash = _normalize_hash_arg(evidence_hash)
        parent_incident_id = _normalize_str_arg(parent_incident_id)
        resource_id = _normalize_str_arg(resource_id)
        self._require(_valid_identifier(incident_id, MAX_INCIDENT_ID_CHARS), "INVALID_INCIDENT_ID")
        self._require(_valid_identifier(parent_incident_id, MAX_INCIDENT_ID_CHARS, allow_empty=True), "INVALID_PARENT_INCIDENT_ID")
        self._require(_valid_identifier(rule_id, 64), "INVALID_RULE_ID")
        self._require(_valid_identifier(condition_code, 64), "INVALID_CONDITION_CODE")
        self._require(_valid_identifier(resource_id, 64, allow_empty=True), "INVALID_RESOURCE_ID")
        self._require(_valid_hash(policy_hash), "INVALID_POLICY_HASH")
        self._require(_valid_hash(evidence_hash), "INVALID_EVIDENCE_HASH")
        self._require(int(decision_stage) in (int(DECISION_STAGE_PROVISIONAL), int(DECISION_STAGE_FINAL)), "INVALID_DECISION_STAGE")
        self._require(int(outcome) in (int(DECISION_OUTCOME_CONFIRMED), int(DECISION_OUTCOME_REJECTED), int(DECISION_OUTCOME_UNDETERMINED)), "E_KRN_016: INVALID_OUTCOME")
        target = self.targets[target_id]
        self._require(target.active_policy_key != "", "E_KRN_008: INACTIVE_POLICY: no active policy for target")
        self._require(not target.authority_revoked, "E_KRN_010: AUTHORITY_REVOKED")
        self._require_live_controller_active(target_id, target)
        header = self.policy_headers[target.active_policy_key]
        self._require(policy_key == target.active_policy_key, "E_KRN_009: STALE_POLICY: decision references a superseded policy_key")
        self._require(int(policy_version) == int(header.version), "E_KRN_009: STALE_POLICY_VERSION: decision references a stale policy_version")
        self._require(policy_hash == header.manifest_hash, "E_KRN_009: STALE_POLICY_HASH: decision references a mismatched policy_hash")
        rule = self._find_rule(policy_key, rule_id, header)
        self._require(rule is not None, "E_KRN_013: UNKNOWN_RULE: rule_id not registered on active policy")
        self._require(rule.enabled, "RULE_DISABLED")
        self._require(gl.message.sender_address == rule.judge, "E_KRN_011: WRONG_JUDGE: sender is not the configured Judge for this rule")
        self._require(int(judge_version) == int(rule.judge_version), "E_KRN_012: WRONG_JUDGE_VERSION: judge_version does not match the configured rule")
        decision_key = _ck(incident_id, str(int(decision_stage)))
        fingerprint = _ck(incident_id, parent_incident_id, target_id, policy_key, str(int(policy_version)), policy_hash, rule_id, resource_id, reporter.as_hex, evidence_hash, str(int(outcome)), condition_code, str(int(decision_stage)), str(int(judge_version)))
        if decision_key in self.processed_decisions:
            existing_fingerprint = self.processed_decisions[decision_key]
            if existing_fingerprint == fingerprint:
                return
            raise gl.vm.UserError("E_KRN_015: CONFLICTING_DECISION: a different decision already exists for this incident/stage")
        self.processed_decisions[decision_key] = fingerprint
        incident = self.incidents[incident_id] if incident_id in self.incidents else None
        if int(rule.rule_kind) == int(RULE_KIND_INCIDENT):
            self._require(parent_incident_id == "", "E_KRN_017: UNEXPECTED_PARENT: an INCIDENT rule decision must not carry a parent_incident_id")
            if incident is None:
                incident = IncidentRecord()
                incident.incident_id = incident_id
                incident.parent_incident_id = ""
                incident.target_id = target_id
                incident.policy_key = policy_key
                incident.policy_version = header.version
                incident.policy_hash = policy_hash
                incident.rule_id = rule_id
                incident.resource_id = resource_id
                incident.reporter = reporter
                incident.judge = rule.judge
                incident.evidence_hash = evidence_hash
                incident.condition_code = condition_code
                incident.provisional_outcome = DECISION_OUTCOME_NONE
                incident.final_outcome = DECISION_OUTCOME_NONE
                incident.status = INCIDENT_STATUS_OPEN
                incident.restriction_count = gl.u32(0)
                incident.created_at = self._tx_time_seconds()
                incident.closed_at = gl.u64(0)
                # A2-remediation: record this NEW incident in the target's reverse index so
                # get_target_incident_count/get_target_incident_at can enumerate it later -
                # additive only, never touched for an already-existing incident.
                t_idx = int(self.target_incident_count[target_id]) if target_id in self.target_incident_count else 0
                self.target_incident_at[_ck(target_id, str(t_idx))] = incident_id
                self.target_incident_count[target_id] = gl.u32(t_idx + 1)
            if int(decision_stage) == int(DECISION_STAGE_PROVISIONAL):
                self._apply_provisional(incident, rule, outcome, policy_key, header)
            else:
                self._apply_final_incident(incident, rule, outcome, policy_key, header)
            self.incidents[incident_id] = incident
        elif int(rule.rule_kind) == int(RULE_KIND_REMEDIATION):
            self._require(int(decision_stage) == int(DECISION_STAGE_FINAL), "REMEDIATION_MUST_BE_FINAL")
            self._require(parent_incident_id != "", "E_KRN_017: PARENT_REQUIRED: remediation decisions require parent_incident_id")
            self._require(parent_incident_id in self.incidents, "E_KRN_017: UNKNOWN_PARENT_INCIDENT")
            parent = self.incidents[parent_incident_id]
            self._require(parent.target_id == target_id and parent.policy_key == policy_key, "E_KRN_017: PARENT_LINEAGE_MISMATCH")
            self._require(int(parent.status) == int(INCIDENT_STATUS_FINAL_CONFIRMED), "E_KRN_017: PARENT_NOT_REMEDIATION_ELIGIBLE")
            self._apply_remediation(parent, outcome)
            self.incidents[parent_incident_id] = parent
        elif int(rule.rule_kind) == int(RULE_KIND_RECOVERY_VALIDATION):
            self._require(int(decision_stage) == int(DECISION_STAGE_FINAL), "RECOVERY_VALIDATION_MUST_BE_FINAL")
            self._require(parent_incident_id != "", "E_KRN_017: PARENT_REQUIRED: recovery validation decisions require parent_incident_id")
            self._require(parent_incident_id in self.incidents, "E_KRN_017: UNKNOWN_PARENT_INCIDENT")
            parent = self.incidents[parent_incident_id]
            self._require(parent.target_id == target_id and parent.policy_key == policy_key, "E_KRN_017: PARENT_LINEAGE_MISMATCH")
            self._require(int(parent.status) == int(INCIDENT_STATUS_RECOVERY), "E_KRN_017: PARENT_NOT_IN_RECOVERY")
            self._apply_recovery_validation(parent, outcome)
            self.incidents[parent_incident_id] = parent
        else:
            raise gl.vm.UserError("UNSUPPORTED_RULE_KIND")
        self._audit(f"RECEIVE_DECISION incident_id={incident_id} stage={int(decision_stage)} outcome={int(outcome)} rule_kind={int(rule.rule_kind)}")

    def _apply_provisional(self, incident: IncidentRecord, rule: PolicyRuleRecord, outcome: gl.u8, policy_key: str, header: PolicyHeader) -> None:
        incident.provisional_outcome = outcome
        if int(outcome) != int(DECISION_OUTCOME_CONFIRMED) or not rule.provisional_allowed:
            return
        effects = self._effects_for_rule(policy_key, header, rule.rule_id)
        applied_any = False
        for idx, effect in effects:
            if int(effect.action_type) not in PROVISIONAL_SAFE_ACTIONS:
                continue
            if self._apply_restriction(incident, rule.rule_id, idx, effect, DECISION_STAGE_PROVISIONAL):
                applied_any = True
        if applied_any:
            incident.status = INCIDENT_STATUS_PROVISIONAL_APPLIED

    def _track_policy_replacement_hold(self, target_id: str, incident_id: str) -> None:
        idx = int(self.policy_replacement_hold_count[target_id]) if target_id in self.policy_replacement_hold_count else 0
        self.policy_replacement_hold_incidents[_ck(target_id, str(idx))] = incident_id
        self.policy_replacement_hold_count[target_id] = gl.u32(idx + 1)

    def _release_policy_replacement_holds(self, target_id: str) -> None:
        count = int(self.policy_replacement_hold_count[target_id]) if target_id in self.policy_replacement_hold_count else 0
        for i in range(count):
            key = _ck(target_id, str(i))
            if key in self.policy_replacement_hold_incidents:
                incident_id = self.policy_replacement_hold_incidents[key]
                if incident_id in self.incidents:
                    self._release_restrictions_by_phase(self.incidents[incident_id], RELEASE_AT_POLICY_REPLACEMENT)
        self.policy_replacement_hold_count[target_id] = gl.u32(0)

    def _apply_final_incident(self, incident: IncidentRecord, rule: PolicyRuleRecord, outcome: gl.u8, policy_key: str, header: PolicyHeader) -> None:
        incident.final_outcome = outcome
        if int(outcome) == int(DECISION_OUTCOME_CONFIRMED):
            for idx, effect in self._effects_for_rule(policy_key, header, rule.rule_id):
                self._apply_restriction(incident, rule.rule_id, idx, effect, DECISION_STAGE_FINAL)
            incident.status = INCIDENT_STATUS_FINAL_CONFIRMED
        elif int(outcome) == int(DECISION_OUTCOME_REJECTED):
            self._release_all_restrictions(incident)
            incident.status = INCIDENT_STATUS_CLOSED
            incident.closed_at = self._tx_time_seconds()
        elif int(outcome) == int(DECISION_OUTCOME_UNDETERMINED):
            self._release_all_restrictions(incident)
            monitor_effect = EffectRecord()
            monitor_effect.rule_id = rule.rule_id
            monitor_effect.action_type = ACTION_MONITOR
            monitor_effect.resource_id = ""
            monitor_effect.param_u256 = gl.u256(0)
            monitor_effect.param_str = ""
            monitor_effect.release_phase = RELEASE_AT_POLICY_REPLACEMENT
            monitor_effect.enabled = True
            self._apply_restriction(incident, rule.rule_id, gl.u16(0xFFFF), monitor_effect, DECISION_STAGE_FINAL)
            incident.status = INCIDENT_STATUS_CLOSED
            incident.closed_at = self._tx_time_seconds()
            self._track_policy_replacement_hold(incident.target_id, incident.incident_id)
        else:
            raise gl.vm.UserError("E_KRN_016: INVALID_OUTCOME")

    def _apply_remediation(self, parent: IncidentRecord, outcome: gl.u8) -> None:
        if int(outcome) == int(DECISION_OUTCOME_CONFIRMED):
            released_resources, _ = self._release_restrictions_mutate_only(parent, RELEASE_AT_REMEDIATION_CONFIRMED)
            parent.status = INCIDENT_STATUS_RECOVERY
            key = _ck(parent.target_id)
            cur = int(self.recovery_incident_counts[key]) if key in self.recovery_incident_counts else 0
            self.recovery_incident_counts[key] = gl.u32(cur + 1)
            new_state = self._recompute_target_state(parent.target_id)
            for resource_id in released_resources:
                self._dispatch_restore(parent.target_id, parent.incident_id, parent.policy_key, resource_id, gl.u256(0))
            self._dispatch_restore(parent.target_id, parent.incident_id, parent.policy_key, "", gl.u256(int(new_state)))

    def _apply_recovery_validation(self, parent: IncidentRecord, outcome: gl.u8) -> None:
        if int(outcome) == int(DECISION_OUTCOME_CONFIRMED):
            released_resources, _ = self._release_restrictions_mutate_only(parent, RELEASE_AT_RECOVERY_VALIDATED)
            parent.status = INCIDENT_STATUS_CLOSED
            parent.closed_at = self._tx_time_seconds()
            key = _ck(parent.target_id)
            cur = int(self.recovery_incident_counts[key]) if key in self.recovery_incident_counts else 0
            self.recovery_incident_counts[key] = gl.u32(max(0, cur - 1))
            new_state = self._recompute_target_state(parent.target_id)
            for resource_id in released_resources:
                self._dispatch_restore(parent.target_id, parent.incident_id, parent.policy_key, resource_id, gl.u256(0))
            self._dispatch_restore(parent.target_id, parent.incident_id, parent.policy_key, "", gl.u256(int(new_state)))

    def _apply_restriction(self, incident: IncidentRecord, rule_id: str, effect_index, effect: EffectRecord, decision_stage: gl.u8) -> bool:
        target_id = incident.target_id
        target = self.targets[target_id]
        if self._is_action_disabled(target_id, effect.action_type) or self._is_resource_disabled(target_id, effect.resource_id):
            return False
        existing_id = None
        for i in range(int(incident.restriction_count)):
            rid = _ck(incident.incident_id, str(i))
            if rid in self.restrictions:
                rec = self.restrictions[rid]
                if rec.active and rec.rule_id == rule_id and int(rec.action_type) == int(effect.action_type) and rec.resource_id == effect.resource_id:
                    existing_id = rid
                    break
        if existing_id is None:
            idx = int(incident.restriction_count)
            restriction_id = _ck(incident.incident_id, str(idx))
            rec = RestrictionRecord()
            rec.restriction_id = restriction_id
            rec.incident_id = incident.incident_id
            rec.target_id = target_id
            rec.rule_id = rule_id
            rec.effect_index = gl.u16(int(effect_index) if isinstance(effect_index, int) else 0xFFFF)
            rec.action_type = effect.action_type
            rec.resource_id = effect.resource_id
            rec.release_phase = effect.release_phase
            rec.active = True
            self.restrictions[restriction_id] = rec
            incident.restriction_count = gl.u32(idx + 1)
            required_state = self._required_state_for_action(effect.action_type)
            if int(required_state) != int(ASSURANCE_STATE_NORMAL):
                skey = _ck(target_id, str(int(required_state)))
                cur = int(self.state_restriction_counts[skey]) if skey in self.state_restriction_counts else 0
                self.state_restriction_counts[skey] = gl.u32(cur + 1)
            if effect.resource_id != "":
                rkey = _ck(target.target_address.as_hex, effect.resource_id)
                cur = int(self.resource_restriction_counts[rkey]) if rkey in self.resource_restriction_counts else 0
                self.resource_restriction_counts[rkey] = gl.u32(cur + 1)
            self._recompute_target_state(target_id)
        self._dispatch_action(target_id, incident.incident_id, incident.policy_key, effect.action_type, effect.resource_id, effect.param_u256, effect.param_str, decision_stage)
        return True

    def _required_state_for_action(self, action_type: gl.u8) -> gl.u8:
        a = int(action_type)
        if a == int(ACTION_PAUSE): return ASSURANCE_STATE_PAUSED
        if a == int(ACTION_ENTER_SAFE_MODE): return ASSURANCE_STATE_SAFE_MODE
        if a in (int(ACTION_RESTRICT), int(ACTION_REVOKE_CAPABILITY), int(ACTION_THROTTLE), int(ACTION_REROUTE)): return ASSURANCE_STATE_RESTRICTED
        if a == int(ACTION_MONITOR): return ASSURANCE_STATE_MONITORED
        return ASSURANCE_STATE_NORMAL

    def _release_restrictions_by_phase(self, incident: IncidentRecord, release_phase: gl.u8) -> None:
        released_resources, any_released = self._release_restrictions_mutate_only(incident, release_phase)
        self._reconcile_and_dispatch(incident, released_resources, any_released)

    def _release_all_restrictions(self, incident: IncidentRecord) -> None:
        released_resources, any_released = self._release_restrictions_mutate_only(incident, None)
        self._reconcile_and_dispatch(incident, released_resources, any_released)

    def _reconcile_and_dispatch(self, incident: IncidentRecord, released_resources: list, any_released: bool) -> None:
        if not any_released:
            return
        new_state = self._recompute_target_state(incident.target_id)
        for resource_id in released_resources:
            self._dispatch_restore(incident.target_id, incident.incident_id, incident.policy_key, resource_id, gl.u256(0))
        self._dispatch_restore(incident.target_id, incident.incident_id, incident.policy_key, "", gl.u256(int(new_state)))

    def _release_restrictions_mutate_only(self, incident: IncidentRecord, only_phase) -> tuple:
        target_id = incident.target_id
        target = self.targets[target_id]
        released_resources: list[str] = []
        any_released = False
        for i in range(int(incident.restriction_count)):
            rid = _ck(incident.incident_id, str(i))
            if rid not in self.restrictions:
                continue
            rec = self.restrictions[rid]
            if not rec.active or (only_phase is not None and int(rec.release_phase) != int(only_phase)):
                continue
            rec.active = False
            self.restrictions[rid] = rec
            any_released = True
            required_state = self._required_state_for_action(rec.action_type)
            if int(required_state) != int(ASSURANCE_STATE_NORMAL):
                skey = _ck(target_id, str(int(required_state)))
                cur = int(self.state_restriction_counts[skey]) if skey in self.state_restriction_counts else 0
                self.state_restriction_counts[skey] = gl.u32(max(0, cur - 1))
            if rec.resource_id != "":
                rkey = _ck(target.target_address.as_hex, rec.resource_id)
                cur = int(self.resource_restriction_counts[rkey]) if rkey in self.resource_restriction_counts else 0
                new_count = max(0, cur - 1)
                self.resource_restriction_counts[rkey] = gl.u32(new_count)
                if new_count == 0:
                    released_resources.append(rec.resource_id)
        return released_resources, any_released

    def _recompute_target_state(self, target_id: str) -> gl.u8:
        def count(state: gl.u8) -> int:
            key = _ck(target_id, str(int(state)))
            return int(self.state_restriction_counts[key]) if key in self.state_restriction_counts else 0
        if count(ASSURANCE_STATE_PAUSED) > 0:
            new_state = ASSURANCE_STATE_PAUSED
        elif count(ASSURANCE_STATE_SAFE_MODE) > 0:
            new_state = ASSURANCE_STATE_SAFE_MODE
        elif count(ASSURANCE_STATE_RESTRICTED) > 0:
            new_state = ASSURANCE_STATE_RESTRICTED
        else:
            rkey = _ck(target_id)
            recovery_count = int(self.recovery_incident_counts[rkey]) if rkey in self.recovery_incident_counts else 0
            if recovery_count > 0:
                new_state = ASSURANCE_STATE_RECOVERY
            elif count(ASSURANCE_STATE_MONITORED) > 0:
                new_state = ASSURANCE_STATE_MONITORED
            else:
                new_state = ASSURANCE_STATE_NORMAL
        target = self.targets[target_id]
        target.state = new_state
        self.targets[target_id] = target
        return new_state

    def _dispatch_action(self, target_id: str, incident_id: str, policy_key: str, action_type: gl.u8, resource_id: str, param_u256: gl.u256, param_str: str, decision_stage: gl.u8) -> None:
        target = self.targets[target_id]
        action_id = _ck(incident_id, policy_key, str(int(action_type)), resource_id)
        attempt_key = _ck(action_id, "attempts")
        attempts = int(self.processed_action_dispatch_count[attempt_key]) if attempt_key in self.processed_action_dispatch_count else 0
        self.processed_action_dispatch_count[attempt_key] = gl.u32(attempts + 1)
        if int(decision_stage) == int(DECISION_STAGE_FINAL):
            record = ActionDispatchRecord()
            record.action_id = action_id
            record.target_id = target_id
            record.incident_id = incident_id
            record.policy_key = policy_key
            record.action_type = action_type
            record.resource_id = resource_id
            record.param_u256 = param_u256
            record.param_str = param_str
            record.dispatch_attempts = gl.u32(attempts + 1)
            self.action_dispatch_records[action_id] = record
        # The pinned py-genlayer runner exposes the executor ABI phases as
        # "decided" and "finalized". "accepted" is not a valid EmitInternalMessage
        # wire value and fails in wasi.gl_call before child dispatch.
        on = "decided" if int(decision_stage) == int(DECISION_STAGE_PROVISIONAL) else "finalized"
        gl.contract.get_at(target.target_address).emit(on=on).apply_assurance_action(action_id, incident_id, policy_key, int(action_type), resource_id, param_u256, param_str, int(decision_stage))

    def _restriction_still_active(self, incident: IncidentRecord, action_type: gl.u8, resource_id: str) -> bool:
        for i in range(int(incident.restriction_count)):
            rid = _ck(incident.incident_id, str(i))
            if rid in self.restrictions:
                rec = self.restrictions[rid]
                if rec.active and int(rec.action_type) == int(action_type) and rec.resource_id == resource_id:
                    return True
        return False

    @gl.public.write
    def redispatch_final_action(self, action_id: str) -> None:
        self._require(action_id in self.action_dispatch_records, "E_KRN_019: UNKNOWN_ACTION_ID")
        record = self.action_dispatch_records[action_id]
        target = self.targets[record.target_id]
        self._require_live_controller_active(record.target_id, target)
        incident = self.incidents[record.incident_id] if record.incident_id in self.incidents else None
        action = int(record.action_type)
        if action in (int(ACTION_RESTRICT), int(ACTION_THROTTLE), int(ACTION_REVOKE_CAPABILITY), int(ACTION_REROUTE), int(ACTION_MONITOR), int(ACTION_ENTER_SAFE_MODE), int(ACTION_PAUSE)):
            self._require(incident is not None, "E_KRN_019: UNKNOWN_INCIDENT")
            self._require(self._restriction_still_active(incident, record.action_type, record.resource_id), "E_KRN_019: RESTRICTION_NO_LONGER_ACTIVE")
        elif action == int(ACTION_ENTER_RECOVERY):
            self._require(incident is not None, "E_KRN_019: UNKNOWN_INCIDENT")
            self._require(
                int(incident.status) == int(INCIDENT_STATUS_RECOVERY),
                "E_KRN_019: INCIDENT_NOT_IN_RECOVERY"
            )
        elif action == int(ACTION_RESTORE):
            if record.resource_id != "":
                rkey = _ck(target.target_address.as_hex, record.resource_id)
                current_count = int(self.resource_restriction_counts[rkey]) if rkey in self.resource_restriction_counts else 0
                self._require(current_count == 0, "E_KRN_019: RESOURCE_STILL_RESTRICTED")
            else:
                current_state = self._recompute_target_state(record.target_id)
                self._require(int(current_state) == int(record.param_u256), "E_KRN_019: STALE_DESIRED_STATE")
        self._dispatch_action(record.target_id, record.incident_id, record.policy_key, record.action_type, record.resource_id, record.param_u256, record.param_str, DECISION_STAGE_FINAL)

    def _dispatch_restore(self, target_id: str, incident_id: str, policy_key: str, resource_id: str, param_u256: gl.u256) -> None:
        self._dispatch_action(target_id, incident_id, policy_key, ACTION_RESTORE, resource_id, param_u256, "", DECISION_STAGE_FINAL)

    @gl.public.view
    def get_target_state(self, target_id: str) -> gl.u8:
        return self.targets[target_id].state

    @gl.public.view
    def get_target_details(self, target_id: str) -> tuple:
        if target_id not in self.targets:
            return (gl.Address("0x" + "0" * 40), gl.Address("0x" + "0" * 40), gl.u8(0), "", gl.u64(0), gl.u32(0), False, False)
        t = self.targets[target_id]
        return (t.target_address, t.cached_owner, t.state, t.active_policy_key, t.registered_at, t.policy_generation, t.authority_revoked, t.human_override_enabled)

    @gl.public.view
    def get_active_policy_key(self, target_id: str) -> str:
        return self.targets[target_id].active_policy_key

    @gl.public.view
    def get_resource_restriction_count(self, target_address: gl.Address, resource_id: str) -> gl.u32:
        target_address = gl.Address(target_address)
        key = _ck(target_address.as_hex, resource_id)
        return self.resource_restriction_counts[key] if key in self.resource_restriction_counts else gl.u32(0)

    @gl.public.view
    def is_authority_revoked(self, target_id: str) -> bool:
        return self.targets[target_id].authority_revoked

    @gl.public.view
    def get_incident_status(self, incident_id: str) -> gl.u8:
        return self.incidents[incident_id].status

    @gl.public.view
    def get_target_policy_identity(self, target_id: str) -> tuple:
        target = self.targets[target_id]
        if target.active_policy_key == "" or target.active_policy_key not in self.policy_headers:
            return ("", gl.u32(0), "")
        header = self.policy_headers[target.active_policy_key]
        return (target.active_policy_key, header.version, header.manifest_hash)

    @gl.public.view
    def get_policy_header(self, policy_key: str) -> tuple:
        header = self.policy_headers[policy_key]
        return (header.version, header.manifest_hash, header.sealed, header.active, header.human_override_enabled)

    @gl.public.view
    def get_policy_rule(self, policy_key: str, rule_id: str) -> tuple:
        header = self.policy_headers[policy_key]
        rule = self._find_rule(policy_key, rule_id, header)
        if rule is None:
            return (gl.Address("0x" + "0" * 40), gl.u32(0), gl.u8(0), False, False)
        return (rule.judge, rule.judge_version, rule.rule_kind, rule.provisional_allowed, rule.enabled)

    @gl.public.view
    def get_policy_rule_economics(self, policy_key: str, rule_id: str) -> tuple:
        header = self.policy_headers[policy_key]
        rule = self._find_rule(policy_key, rule_id, header)
        if rule is None:
            return (gl.u256(0), gl.u256(0))
        return (rule.report_bond, rule.confirmed_bounty)

    @gl.public.view
    def is_policy_resource(self, policy_key: str, resource_id: str) -> bool:
        header = self.policy_headers[policy_key]
        for i in range(int(header.resource_count)):
            key = _ck(policy_key, str(i))
            if key in self.policy_resources and self.policy_resources[key] == resource_id:
                return True
        return False

    @gl.public.view
    def get_incident_summary(self, incident_id: str) -> tuple:
        if incident_id not in self.incidents:
            return ("", "", "", gl.u8(0))
        incident = self.incidents[incident_id]
        return (incident.target_id, incident.policy_key, incident.rule_id, incident.status)

    @gl.public.view
    def get_incident_detail(self, incident_id: str) -> tuple:
        if incident_id not in self.incidents:
            return ("", "", gl.u32(0), "", "", gl.Address("0x" + "0" * 40), gl.Address("0x" + "0" * 40), "", "", gl.u8(0), gl.u8(0), gl.u8(0), gl.u64(0), gl.u64(0))
        i = self.incidents[incident_id]
        return (i.target_id, i.policy_key, i.policy_version, i.rule_id, i.resource_id, i.reporter, i.judge, i.evidence_hash, i.condition_code, i.provisional_outcome, i.final_outcome, i.status, i.created_at, i.closed_at)

    @gl.public.view
    def get_incident_final_outcome(self, incident_id: str) -> gl.u8:
        if incident_id not in self.incidents:
            return gl.u8(0)
        return self.incidents[incident_id].final_outcome

    @gl.public.view
    def get_policy_counts(self, policy_key: str) -> tuple:
        header = self.policy_headers[policy_key]
        return (header.rule_count, header.resource_count, header.effect_count)

    # --- Owner-directed remediation pass: additive read-only views ---------------------------
    # Items 6 and 9 of the owner-directed bundle. Both are NEW view methods only - no existing
    # method's signature or behavior changes. CLAUDE.md Section 12/45: the Kernel is the
    # deterministic root of trust and stays immutable in its write surface; these views expose
    # state the Kernel already stores (PolicyHeader.sealed_at/activation_not_before/activated_at,
    # IncidentRecord.parent_incident_id) that was previously write-only/unreadable, closing the two
    # "genuine, now-diagnosed protocol read-gaps" recorded in
    # docs/execution/audit-packets/A3-attempt-2/known-limitations.md items 8 and 9.

    @gl.public.view
    def get_policy_lifecycle(self, policy_key: str) -> tuple:
        """Item 6: full policy timing/lifecycle, so a client can render a real chain-derived
        activation countdown instead of asking the user to self-attest that enough time has
        passed. Returns: (target_id, version, manifest_hash, created_at, sealed_at,
        activation_not_before, activated_at, sealed, active, superseded)."""
        if policy_key not in self.policy_headers:
            return ("", gl.u32(0), "", gl.u64(0), gl.u64(0), gl.u64(0), gl.u64(0), False, False, False)
        h = self.policy_headers[policy_key]
        return (h.target_id, h.version, h.manifest_hash, h.created_at, h.sealed_at, h.activation_not_before, h.activated_at, h.sealed, h.active, h.superseded)

    @gl.public.view
    def get_target_incident_count(self, target_id: str) -> gl.u32:
        """Already-populated reverse index (see target_incident_count/target_incident_at above,
        added in the A2-remediation pass) - exposed here as a first-class paired accessor
        alongside the new lineage views so a caller can enumerate ALL of a target's incidents
        (root, remediation and recovery-validation alike) without an indexer."""
        return self.target_incident_count[target_id] if target_id in self.target_incident_count else gl.u32(0)

    @gl.public.view
    def get_target_incident_at(self, target_id: str, index: gl.u32) -> str:
        key = _ck(target_id, str(int(index)))
        return self.target_incident_at[key] if key in self.target_incident_at else ""

    @gl.public.view
    def get_policy_resource_at(self, policy_key: str, index: gl.u16) -> str:
        key = _ck(policy_key, str(int(index)))
        return self.policy_resources[key] if key in self.policy_resources else ""

    @gl.public.view
    def get_policy_rule_id_at(self, policy_key: str, index: gl.u16) -> str:
        key = _ck(policy_key, str(int(index)))
        return self.policy_rules[key].rule_id if key in self.policy_rules else ""

    @gl.public.view
    def get_policy_effect_at(self, policy_key: str, index: gl.u16) -> tuple:
        key = _ck(policy_key, str(int(index)))
        if key not in self.policy_effects:
            return ("", gl.u8(0), "", gl.u256(0), "", gl.u8(0), False)
        e = self.policy_effects[key]
        return (e.rule_id, e.action_type, e.resource_id, e.param_u256, e.param_str, e.release_phase, e.enabled)

    # -- A2-remediation: target-restriction enumeration (closes getAssuranceState()'s
    # always-empty activeRestrictions gap). Purely additive read views over storage that
    # receive_decision/_apply_restriction already populate - no new state machine behaviour.

    @gl.public.view
    def get_target_incident_count(self, target_id: str) -> gl.u32:
        return self.target_incident_count[target_id] if target_id in self.target_incident_count else gl.u32(0)

    @gl.public.view
    def get_target_incident_at(self, target_id: str, index: gl.u32) -> str:
        key = _ck(target_id, str(int(index)))
        return self.target_incident_at[key] if key in self.target_incident_at else ""

    @gl.public.view
    def get_incident_restriction_count(self, incident_id: str) -> gl.u32:
        if incident_id not in self.incidents:
            return gl.u32(0)
        return self.incidents[incident_id].restriction_count

    @gl.public.view
    def get_incident_restriction_at(self, incident_id: str, index: gl.u32) -> tuple:
        """Returns (restriction_id, rule_id, action_type, resource_id, release_phase, active) for
        the restriction at this index on this incident, or a zero-valued inactive tuple if out of
        range - mirrors get_policy_effect_at's out-of-range convention."""
        key = _ck(incident_id, str(int(index)))
        if key not in self.restrictions:
            return ("", "", gl.u8(0), "", gl.u8(0), False)
        r = self.restrictions[key]
        return (r.restriction_id, r.rule_id, r.action_type, r.resource_id, r.release_phase, r.active)
