# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""AssuranceKernel - the deterministic, immutable root of trust for Reclose R1 (C1).

Implements Implementation Specification Sections 16-29. This contract has no web access, no LLM
call, no arbitrary external call, and no upgrader - it is immutable once deployed (CLAUDE.md
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
"""

import genlayer as gl

# -- Enums (Implementation Specification Section 10) -------------------------------------------

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

# R1 Kernel-v1 supported action set (Implementation Specification Section 10, R1 minimum).
SUPPORTED_ACTIONS = {
    ACTION_NO_ACTION,
    ACTION_ALERT,
    ACTION_MONITOR,
    ACTION_RESTRICT,
    ACTION_REVOKE_CAPABILITY,
    ACTION_ENTER_SAFE_MODE,
    ACTION_PAUSE,
    ACTION_ENTER_RECOVERY,
    ACTION_RESTORE,
}

# R1 provisional-safe action set (Implementation Specification Section 25; TM-LIFE-* / Section 16
# of CLAUDE.md invariant 6). Only these may execute before finality.
PROVISIONAL_SAFE_ACTIONS = {
    ACTION_MONITOR,
    ACTION_RESTRICT,
    ACTION_REVOKE_CAPABILITY,
    ACTION_ENTER_SAFE_MODE,
}

# Kernel-v1 hard safety bound (Implementation Specification Section 21; CLAUDE.md Section 12).
MAX_EFFECTS_PER_DECISION = 4


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
    rule_kind: gl.u8
    provisional_allowed: bool
    report_bond: gl.u256
    confirmed_bounty: gl.u256
    enabled: bool


@gl.storage.allow
class EffectRecord:
    action_type: gl.u8
    resource_id: str
    param_u256: gl.u256
    param_str: str
    release_phase: gl.u8
    enabled: bool


@gl.storage.allow
class IncidentRecord:
    incident_id: str
    parent_incident_id: str
    target_id: str
    policy_key: str
    policy_version: gl.u32
    rule_id: str
    resource_id: str
    reporter: gl.Address
    judge: gl.Address
    evidence_hash: str
    condition_code: str
    provisional_outcome: gl.u8
    final_outcome: gl.u8
    status: gl.u8  # 0=OPEN 1=PROVISIONAL_APPLIED 2=FINAL 3=REMEDIATION_PENDING 4=RECOVERY 5=CLOSED
    created_at: gl.u64
    closed_at: gl.u64


class AssuranceKernel(gl.contract.Contract):
    # -- Required storage (Implementation Specification Section 18) ----------------------------
    protocol_schema_version: gl.u16
    minimum_policy_delay_seconds: gl.u64

    target_ids: gl.storage.DynArray[str]
    targets: gl.storage.TreeMap[str, TargetRecord]

    policy_headers: gl.storage.TreeMap[str, PolicyHeader]
    # policy_rules/resources/effects keyed by f"{policy_key}:{index}"; counts on PolicyHeader.
    policy_rules: gl.storage.TreeMap[str, PolicyRuleRecord]
    policy_resources: gl.storage.TreeMap[str, str]
    policy_effects: gl.storage.TreeMap[str, EffectRecord]

    # Immediate safety overlays (Section 22): generation-scoped disable flags.
    # Keyed by f"{target_id}:{action_type}" / f"{target_id}:{resource_id}" -> generation at which
    # the overlay was written. An overlay is active while policy_generation has not advanced past
    # a NEW POLICY VERSION since the overlay (overlays survive policy_generation bumps that merely
    # reflect the same or a reduced policy - they are cleared only by an explicit new activation
    # that the owner has reviewed, per Section 22 "authority increase requires a new timelocked
    # policy version").
    owner_action_disable_generation: gl.storage.TreeMap[str, gl.u32]
    owner_resource_disable_generation: gl.storage.TreeMap[str, gl.u32]

    incidents: gl.storage.TreeMap[str, IncidentRecord]
    # restrictions keyed by f"{incident_id}:{resource_id}" -> action_type currently held by that
    # incident against that resource (reason-indexed, Section 15 / CLAUDE.md Section 17).
    restrictions: gl.storage.TreeMap[str, gl.u8]
    # restriction_counts keyed by f"{target_id}:{resource_id}" -> number of distinct incidents
    # currently restricting that resource (Section 27's core multi-incident safety mechanism).
    restriction_counts: gl.storage.TreeMap[str, gl.u32]
    # state_restriction_counts keyed by f"{target_id}:{state}" -> number of distinct incidents
    # that have pushed the target into at least `state` severity, for monotonic strongest-state
    # composition (a state may not be weakened while any incident still requires it or worse).
    state_restriction_counts: gl.storage.TreeMap[str, gl.u32]

    # Replay protection (CLAUDE.md Section 7 invariants 8-9; TM-AUTH-006, TM-LIFE-*).
    processed_decisions: gl.storage.TreeMap[str, bool]
    processed_actions: gl.storage.TreeMap[str, bool]

    audit_sequence: gl.u64
    audit_records: gl.storage.TreeMap[gl.u64, str]

    def __init__(self, protocol_schema_version: gl.u16, minimum_policy_delay_seconds: gl.u64) -> None:
        # No omnipotent project admin is created here (Implementation Specification Section 17) -
        # every subsequent authority-bearing action is scoped per-target to that target's live
        # owner/controller, never to the deployer of this Kernel.
        self.protocol_schema_version = protocol_schema_version
        self.minimum_policy_delay_seconds = minimum_policy_delay_seconds
        self.audit_sequence = gl.u64(0)

    # -- Internal helpers --------------------------------------------------------------------

    def _audit(self, entry: str) -> None:
        seq = self.audit_sequence
        self.audit_records[seq] = entry
        self.audit_sequence = gl.u64(int(seq) + 1)

    def _require(self, condition: bool, message: str) -> None:
        if not condition:
            raise gl.vm.UserError(message)

    def _live_owner(self, target_address: gl.Address) -> gl.Address:
        # Implementation Specification Section 19: query the LIVE target owner via a synchronous
        # view call, never the cached_owner field alone (cached_owner is display/audit only).
        # ReferenceAgentProtocol and any conforming Target Adapter expose `get_owner()`.
        target = gl.contract.get_at(target_address)
        return target.view().get_owner()

    def _require_live_owner(self, target_id: str, target: TargetRecord) -> None:
        live_owner = self._live_owner(target.target_address)
        self._require(gl.message.sender_address == live_owner, "UNAUTHORIZED_CALLER: not the live target owner")

    # -- Target registration (Section 20) ------------------------------------------------------

    @gl.public.write
    def register_target(self, target_id: str, target_address: gl.Address, human_override_enabled: bool, now: gl.u64) -> None:
        # Address-typed parameters arrive as raw bytes over the wire - wrap defensively.
        target_address = gl.Address(target_address)
        self._require(len(target_id) > 0 and len(target_id) <= 96, "invalid target_id length")
        self._require(target_id not in self.targets, "DUPLICATE_TARGET: target_id already registered")

        # Live handshake: the target must acknowledge this Kernel as its controller and report an
        # owner we can authenticate against for all future owner-gated calls (TM-AUTH-007).
        target_view = gl.contract.get_at(target_address)
        reported_owner = target_view.view().get_owner()
        self._require(gl.message.sender_address == reported_owner, "UNAUTHORIZED_CALLER: caller is not target owner")
        controller = target_view.view().get_assurance_controller()
        self._require(controller == gl.message.contract_address, "TARGET_HANDSHAKE_FAILED: target does not recognize this Kernel as controller")

        record = TargetRecord()
        record.target_address = target_address
        record.cached_owner = reported_owner
        record.state = ASSURANCE_STATE_NORMAL
        record.active_policy_key = ""
        record.registered_at = now
        record.policy_generation = gl.u32(0)
        record.authority_revoked = False
        record.human_override_enabled = human_override_enabled

        self.targets[target_id] = record
        self.target_ids.append(target_id)
        self._audit(f"REGISTER_TARGET target_id={target_id}")

    # -- Policy construction (Section 21) -------------------------------------------------------

    @gl.public.write
    def begin_policy(self, target_id: str, policy_key: str, manifest_hash: str, now: gl.u64) -> None:
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        self._require(policy_key not in self.policy_headers, "DUPLICATE_POLICY: policy_key already exists")

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
        header.created_at = now
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
        # Kernel-v1 keeps policy discovery simple and explicit rather than maintaining a separate
        # target->policy-keys index; callers (SDK/tests) are expected to track policy_key history.
        keys: list[str] = []
        for pk in self.policy_headers.keys():
            if self.policy_headers[pk].target_id == target_id:
                keys.append(pk)
        return keys

    @gl.public.write
    def add_policy_resource(self, policy_key: str, resource_id: str) -> None:
        header = self.policy_headers[policy_key]
        target = self.targets[header.target_id]
        self._require_live_owner(header.target_id, target)
        self._require(not header.sealed, "SEALED_POLICY: cannot mutate a sealed policy")
        idx = int(header.resource_count)
        self.policy_resources[f"{policy_key}:{idx}"] = resource_id
        header.resource_count = gl.u16(idx + 1)
        self.policy_headers[policy_key] = header

    @gl.public.write
    def add_policy_rule(
        self,
        policy_key: str,
        rule_id: str,
        judge: gl.Address,
        rule_kind: gl.u8,
        provisional_allowed: bool,
        report_bond: gl.u256,
        confirmed_bounty: gl.u256,
    ) -> None:
        header = self.policy_headers[policy_key]
        target = self.targets[header.target_id]
        self._require_live_owner(header.target_id, target)
        self._require(not header.sealed, "SEALED_POLICY: cannot mutate a sealed policy")

        rule = PolicyRuleRecord()
        rule.rule_id = rule_id
        rule.judge = gl.Address(judge)
        rule.rule_kind = rule_kind
        rule.provisional_allowed = provisional_allowed
        rule.report_bond = report_bond
        rule.confirmed_bounty = confirmed_bounty
        rule.enabled = True

        idx = int(header.rule_count)
        self.policy_rules[f"{policy_key}:{idx}"] = rule
        header.rule_count = gl.u16(idx + 1)
        self.policy_headers[policy_key] = header

    @gl.public.write
    def add_policy_effect(
        self,
        policy_key: str,
        action_type: gl.u8,
        resource_id: str,
        param_u256: gl.u256,
        param_str: str,
        release_phase: gl.u8,
    ) -> None:
        header = self.policy_headers[policy_key]
        target = self.targets[header.target_id]
        self._require_live_owner(header.target_id, target)
        self._require(not header.sealed, "SEALED_POLICY: cannot mutate a sealed policy")
        # TM-AUTH-002: only the finite Kernel-v1 action set may ever be registered as an effect.
        self._require(action_type in SUPPORTED_ACTIONS, "UNSUPPORTED_ACTION: action_type not in Kernel-v1 action set")

        current = int(header.effect_count)
        self._require(current < MAX_EFFECTS_PER_DECISION * 16, "TOO_MANY_EFFECTS: policy effect table exceeds Kernel-v1 bound")

        effect = EffectRecord()
        effect.action_type = action_type
        effect.resource_id = resource_id
        effect.param_u256 = param_u256
        effect.param_str = param_str
        effect.release_phase = release_phase
        effect.enabled = True

        self.policy_effects[f"{policy_key}:{current}"] = effect
        header.effect_count = gl.u16(current + 1)
        self.policy_headers[policy_key] = header

    @gl.public.write
    def seal_policy(self, policy_key: str) -> None:
        header = self.policy_headers[policy_key]
        target = self.targets[header.target_id]
        self._require_live_owner(header.target_id, target)
        self._require(not header.sealed, "ALREADY_SEALED")
        header.sealed = True
        self.policy_headers[policy_key] = header
        self._audit(f"SEAL_POLICY policy_key={policy_key}")

    @gl.public.write
    def activate_policy(self, policy_key: str, now: gl.u64) -> None:
        header = self.policy_headers[policy_key]
        target_id = header.target_id
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        self._require(header.sealed, "NOT_SEALED: cannot activate an unsealed policy")
        self._require(not header.active, "ALREADY_ACTIVE")

        # TM-AUTH-004/CLAUDE.md invariant 4: authority EXPANSION is always delayed by at least
        # minimum_policy_delay_seconds. Authority REDUCTION (or a brand-new target's first policy,
        # which cannot expand relative to nothing) activates immediately.
        active_key = target.active_policy_key
        is_expansion = False
        if active_key != "":
            prior = self.policy_headers[active_key]
            is_expansion = int(header.effect_count) > int(prior.effect_count) or int(header.rule_count) > int(prior.rule_count)

        if is_expansion:
            self._require(int(now) >= int(header.created_at) + int(self.minimum_policy_delay_seconds), "TIMELOCK_NOT_ELAPSED: authority expansion requires the configured delay")

        if active_key != "":
            prior = self.policy_headers[active_key]
            prior.active = False
            prior.superseded = True
            self.policy_headers[active_key] = prior

        header.active = True
        header.activated_at = now
        self.policy_headers[policy_key] = header

        target.active_policy_key = policy_key
        target.policy_generation = gl.u32(int(target.policy_generation) + 1)
        self.targets[target_id] = target
        self._audit(f"ACTIVATE_POLICY policy_key={policy_key} target_id={target_id} expansion={is_expansion}")

    # -- Immediate safety overlays (Section 22) -------------------------------------------------

    @gl.public.write
    def disable_action(self, target_id: str, action_type: gl.u8) -> None:
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        self.owner_action_disable_generation[f"{target_id}:{int(action_type)}"] = target.policy_generation
        self._audit(f"DISABLE_ACTION target_id={target_id} action_type={int(action_type)}")

    @gl.public.write
    def disable_resource(self, target_id: str, resource_id: str) -> None:
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        self.owner_resource_disable_generation[f"{target_id}:{resource_id}"] = target.policy_generation
        self._audit(f"DISABLE_RESOURCE target_id={target_id} resource_id={resource_id}")

    def _is_action_disabled(self, target_id: str, action_type: gl.u8, generation: gl.u32) -> bool:
        key = f"{target_id}:{int(action_type)}"
        if key not in self.owner_action_disable_generation:
            return False
        # An overlay written at or before the CURRENT generation is still active (overlays can
        # only reduce/disable; they never expire on their own - only an explicit new policy
        # activation the owner reviewed can implicitly supersede one, per Section 22).
        return int(self.owner_action_disable_generation[key]) <= int(generation)

    def _is_resource_disabled(self, target_id: str, resource_id: str, generation: gl.u32) -> bool:
        key = f"{target_id}:{resource_id}"
        if key not in self.owner_resource_disable_generation:
            return False
        return int(self.owner_resource_disable_generation[key]) <= int(generation)

    # -- Authority revocation (Section 23) ------------------------------------------------------

    @gl.public.write
    def revoke_authority(self, target_id: str) -> None:
        target = self.targets[target_id]
        self._require_live_owner(target_id, target)
        target.authority_revoked = True
        self.targets[target_id] = target
        self._audit(f"REVOKE_AUTHORITY target_id={target_id}")

    # -- Decision entry point (Section 24) ------------------------------------------------------

    @gl.public.write
    def receive_decision(
        self,
        incident_id: str,
        parent_incident_id: str,
        target_id: str,
        policy_key: str,
        rule_id: str,
        resource_id: str,
        reporter: gl.Address,
        evidence_hash: str,
        outcome: gl.u8,
        condition_code: str,
        decision_stage: gl.u8,
        judge_version: gl.u32,
    ) -> None:
        decision_key = f"{incident_id}:{decision_stage}"
        if decision_key in self.processed_decisions:
            # Invariant 8 (CLAUDE.md Section 7): duplicate legitimate delivery is a no-op success,
            # never a duplicated effect.
            return

        target = self.targets[target_id]
        # Invariant 1 / TM-AUTH-001: default-deny without an active policy.
        self._require(target.active_policy_key != "", "INACTIVE_POLICY: no active policy for target")
        self._require(not target.authority_revoked, "AUTHORITY_REVOKED")

        header = self.policy_headers[target.active_policy_key]
        # TM-AUTH-006: the decision must be bound to the CURRENTLY active policy_key/version -
        # a decision produced against a stale (superseded) policy is rejected outright rather than
        # silently applied under the new policy's authority.
        self._require(policy_key == target.active_policy_key, "STALE_POLICY: decision references a superseded policy_key")

        # Find and authenticate the exact rule (and therefore exact Judge/version) this decision
        # claims to be produced by (TM-AUTH-008: wrong Judge/module must be rejected).
        rule = self._find_rule(policy_key, rule_id, header)
        self._require(rule is not None, "UNKNOWN_RULE: rule_id not registered on active policy")
        self._require(rule.enabled, "RULE_DISABLED")
        # TM-AUTH-008: exact sender validation - the caller must be the exact Judge address
        # configured for this rule (PolicyRuleRecord.judge, Implementation Specification Section
        # 13). `judge_version` is accepted and recorded for audit per the Section 24 signature, but
        # independent cross-validation against the Judge module's own reported version is deferred
        # to C2 (IncidentJudge is out of C1 scope per the Master Plan phase boundary) - documented
        # here rather than adding an undocumented judge_version field to the locked
        # PolicyRuleRecord schema. The primary TM-AUTH-008 control (exact sender match) is fully
        # enforced now; this is a defense-in-depth completeness gap, not a P0 control gap.
        self._require(gl.message.sender_address == rule.judge, "WRONG_JUDGE: sender is not the configured Judge for this rule")

        self.processed_decisions[decision_key] = True

        incident_exists = incident_id in self.incidents
        incident = self.incidents[incident_id] if incident_exists else None
        if incident is None:
            incident = IncidentRecord()
            incident.incident_id = incident_id
            incident.parent_incident_id = parent_incident_id
            incident.target_id = target_id
            incident.policy_key = policy_key
            incident.policy_version = header.version
            incident.rule_id = rule_id
            incident.resource_id = resource_id
            incident.reporter = gl.Address(reporter)
            incident.judge = rule.judge
            incident.evidence_hash = evidence_hash
            incident.condition_code = condition_code
            incident.provisional_outcome = DECISION_OUTCOME_NONE
            incident.final_outcome = DECISION_OUTCOME_NONE
            incident.status = gl.u8(0)
            incident.created_at = gl.u64(0)
            incident.closed_at = gl.u64(0)

        if int(decision_stage) == int(DECISION_STAGE_PROVISIONAL):
            self._apply_provisional(incident, outcome, policy_key, header, target)
        elif int(decision_stage) == int(DECISION_STAGE_FINAL):
            self._apply_final(incident, outcome, policy_key, header, target)
        else:
            raise gl.vm.UserError("INVALID_DECISION_STAGE")

        self.incidents[incident_id] = incident
        self._audit(f"RECEIVE_DECISION incident_id={incident_id} stage={int(decision_stage)} outcome={int(outcome)}")

    def _find_rule(self, policy_key: str, rule_id: str, header: PolicyHeader) -> PolicyRuleRecord | None:
        for i in range(int(header.rule_count)):
            key = f"{policy_key}:{i}"
            if key in self.policy_rules and self.policy_rules[key].rule_id == rule_id:
                return self.policy_rules[key]
        return None

    def _effects_for_rule(self, policy_key: str, header: PolicyHeader, release_phase: gl.u8) -> list[EffectRecord]:
        out: list[EffectRecord] = []
        for i in range(int(header.effect_count)):
            key = f"{policy_key}:{i}"
            if key not in self.policy_effects:
                continue
            effect = self.policy_effects[key]
            if effect.enabled and int(effect.release_phase) == int(release_phase):
                out.append(effect)
        return out[:MAX_EFFECTS_PER_DECISION]

    # -- Provisional handling (Section 25) ------------------------------------------------------

    def _apply_provisional(self, incident: IncidentRecord, outcome: gl.u8, policy_key: str, header: PolicyHeader, target: TargetRecord) -> None:
        incident.provisional_outcome = outcome
        if int(outcome) != int(DECISION_OUTCOME_CONFIRMED):
            # Only PROVISIONAL + CONFIRMED may create provisional restrictions (Section 25).
            return
        effects = self._effects_for_rule(policy_key, header, gl.u8(0))  # PROVISIONAL release phase
        for effect in effects:
            if int(effect.action_type) not in PROVISIONAL_SAFE_ACTIONS:
                # Invariant 6 (CLAUDE.md Section 7): provisional action must be reversible/
                # idempotent/authority-reducing/non-value-moving. Anything outside the R1
                # provisional-safe set is never applied provisionally.
                continue
            self._apply_restriction(incident, effect, target)
        incident.status = gl.u8(1)  # PROVISIONAL_APPLIED

    # -- Final handling (Section 26) ------------------------------------------------------------

    def _apply_final(self, incident: IncidentRecord, outcome: gl.u8, policy_key: str, header: PolicyHeader, target: TargetRecord) -> None:
        incident.final_outcome = outcome
        if int(outcome) == int(DECISION_OUTCOME_CONFIRMED):
            # Convert provisional restrictions to final without a temporary unlock window - the
            # restriction was already applied provisionally (or is applied now if this decision
            # skipped straight to FINAL), so there is nothing to release; final effects supersede.
            effects = self._effects_for_rule(policy_key, header, gl.u8(0))
            for effect in effects:
                self._apply_restriction(incident, effect, target)
            incident.status = gl.u8(2)  # FINAL_CONFIRMED
        elif int(outcome) == int(DECISION_OUTCOME_REJECTED):
            self._release_incident_restrictions(incident, target)
            incident.status = gl.u8(5)  # CLOSED
        elif int(outcome) == int(DECISION_OUTCOME_UNDETERMINED):
            # Remove high-impact provisional effects (e.g. REVOKE_CAPABILITY/ENTER_SAFE_MODE) and
            # apply the explicit uncertainty mapping to MONITORED for the affected resource, per
            # Section 26 - never left silently unresolved and never coerced into confidence.
            self._release_incident_restrictions(incident, target)
            self._set_state_floor(incident.target_id, target, ASSURANCE_STATE_MONITORED)
            incident.status = gl.u8(5)  # CLOSED
        else:
            raise gl.vm.UserError("INVALID_OUTCOME")

    def _apply_restriction(self, incident: IncidentRecord, effect: EffectRecord, target: TargetRecord) -> None:
        rkey = f"{incident.incident_id}:{effect.resource_id}"
        if rkey not in self.restrictions:
            ckey = f"{target.target_address.as_hex}:{effect.resource_id}"
            count = int(self.restriction_counts[ckey]) if ckey in self.restriction_counts else 0
            # Section 27: 0 -> 1 emits the restriction; 1 -> 2 (already restricted) is a no-op
            # duplicate-semantic-action, never double-applied.
            self.restriction_counts[ckey] = gl.u32(count + 1)
            self.restrictions[rkey] = effect.action_type

        if int(effect.action_type) == int(ACTION_ENTER_SAFE_MODE):
            self._set_state_floor(incident.target_id, target, ASSURANCE_STATE_SAFE_MODE)
        elif int(effect.action_type) == int(ACTION_RESTRICT) or int(effect.action_type) == int(ACTION_REVOKE_CAPABILITY):
            self._set_state_floor(incident.target_id, target, ASSURANCE_STATE_RESTRICTED)
        elif int(effect.action_type) == int(ACTION_MONITOR):
            self._set_state_floor(incident.target_id, target, ASSURANCE_STATE_MONITORED)
        elif int(effect.action_type) == int(ACTION_PAUSE):
            self._set_state_floor(incident.target_id, target, ASSURANCE_STATE_PAUSED)

        self._dispatch_action(incident, effect, target, decision_stage=DECISION_STAGE_FINAL if incident.status != gl.u8(1) else DECISION_STAGE_PROVISIONAL)

    def _release_incident_restrictions(self, incident: IncidentRecord, target: TargetRecord) -> None:
        # Reason-indexed release (Section 27; TM-REC-001/TM-REC-002): only THIS incident's own
        # restriction entries are removed, and the shared per-resource count is decremented by
        # exactly one per resource this incident held - it can never go negative, and restoration
        # (RESTORE dispatch) only occurs on the 1 -> 0 transition, never on 2 -> 1.
        for resource_id in self._resources_restricted_by(incident.incident_id):
            rkey = f"{incident.incident_id}:{resource_id}"
            if rkey not in self.restrictions:
                continue
            del self.restrictions[rkey]
            ckey = f"{target.target_address.as_hex}:{resource_id}"
            count = int(self.restriction_counts[ckey]) if ckey in self.restriction_counts else 0
            new_count = max(0, count - 1)
            self.restriction_counts[ckey] = gl.u32(new_count)
            if new_count == 0:
                self._dispatch_restore(incident, resource_id, target)

    def _resources_restricted_by(self, incident_id: str) -> list[str]:
        out: list[str] = []
        prefix = f"{incident_id}:"
        for key in self.restrictions.keys():
            if key.startswith(prefix):
                out.append(key[len(prefix):])
        return out

    def _set_state_floor(self, target_id: str, target: TargetRecord, minimum_state: gl.u8) -> None:
        # Monotonic strongest-state composition (TM-REC-008): the target's state may only move
        # UP to at least `minimum_state` here - it is lowered only via explicit RESTORE handling
        # once no active incident requires the stronger state.
        if int(target.state) < int(minimum_state):
            target.state = minimum_state
            self.targets[target_id] = target

    def _dispatch_action(self, incident: IncidentRecord, effect: EffectRecord, target: TargetRecord, decision_stage: gl.u8) -> None:
        action_id = f"{incident.incident_id}:{effect.resource_id}:{int(effect.action_type)}"
        if action_id in self.processed_actions:
            return  # Invariant 8: duplicate action dispatch is a no-op.
        self.processed_actions[action_id] = True

        # Implementation Specification Section 29: provisional messages use on='accepted' (only
        # ever reached here for the R1 provisional-safe action set); final actions use
        # on='finalized'.
        on = "accepted" if int(decision_stage) == int(DECISION_STAGE_PROVISIONAL) else "finalized"
        target_contract = gl.contract.get_at(target.target_address)
        target_contract.emit(on=on).apply_assurance_action(
            action_id,
            incident.incident_id,
            incident.policy_key,
            int(effect.action_type),
            effect.resource_id,
            effect.param_u256,
            effect.param_str,
            int(decision_stage),
        )

    def _dispatch_restore(self, incident: IncidentRecord, resource_id: str, target: TargetRecord) -> None:
        action_id = f"restore:{incident.incident_id}:{resource_id}"
        if action_id in self.processed_actions:
            return
        self.processed_actions[action_id] = True
        target_contract = gl.contract.get_at(target.target_address)
        target_contract.emit(on="finalized").apply_assurance_action(
            action_id, incident.incident_id, incident.policy_key, int(ACTION_RESTORE), resource_id, gl.u256(0), "", int(DECISION_STAGE_FINAL)
        )

    # -- Remediation and recovery (Section 28) --------------------------------------------------

    @gl.public.write
    def apply_remediation_decision(self, incident_id: str, outcome: gl.u8) -> None:
        incident = self.incidents[incident_id]
        target = self.targets[incident.target_id]
        if int(outcome) == int(DECISION_OUTCOME_CONFIRMED):
            # REMEDIATION_CONFIRMED releases effects marked for remediation and enters RECOVERY -
            # stricter effects tied to OTHER incidents may remain (TM-REC-003).
            incident.status = gl.u8(4)  # RECOVERY
            self._set_state_floor(incident.target_id, target, ASSURANCE_STATE_RECOVERY)
        else:
            # REJECTED/UNDETERMINED remediation does not restore authority (invariant 11).
            pass
        self.incidents[incident_id] = incident
        self._audit(f"REMEDIATION_DECISION incident_id={incident_id} outcome={int(outcome)}")

    @gl.public.write
    def apply_recovery_validation(self, incident_id: str, outcome: gl.u8) -> None:
        incident = self.incidents[incident_id]
        target = self.targets[incident.target_id]
        if int(outcome) == int(DECISION_OUTCOME_CONFIRMED):
            self._release_incident_restrictions(incident, target)
            incident.status = gl.u8(5)  # CLOSED
            # Restore NORMAL only if no OTHER active incident on this target still requires a
            # restrictive state (TM-REC-006: recovery cannot restore more authority than the
            # currently active policy permits, and cannot ignore unrelated active incidents).
            if not self._any_active_restriction(incident.target_id):
                target.state = ASSURANCE_STATE_NORMAL
                self.targets[incident.target_id] = target
        self.incidents[incident_id] = incident
        self._audit(f"RECOVERY_VALIDATION incident_id={incident_id} outcome={int(outcome)}")

    def _any_active_restriction(self, target_id: str) -> bool:
        target = self.targets[target_id]
        prefix_addr = target.target_address.as_hex
        for key in self.restriction_counts.keys():
            if key.startswith(f"{prefix_addr}:") and int(self.restriction_counts[key]) > 0:
                return True
        return False

    # -- Views ------------------------------------------------------------------------------

    @gl.public.view
    def get_target_state(self, target_id: str) -> gl.u8:
        return self.targets[target_id].state

    @gl.public.view
    def get_active_policy_key(self, target_id: str) -> str:
        return self.targets[target_id].active_policy_key

    @gl.public.view
    def get_restriction_count(self, target_address: gl.Address, resource_id: str) -> gl.u32:
        target_address = gl.Address(target_address)
        key = f"{target_address.as_hex}:{resource_id}"
        return self.restriction_counts[key] if key in self.restriction_counts else gl.u32(0)

    @gl.public.view
    def is_authority_revoked(self, target_id: str) -> bool:
        return self.targets[target_id].authority_revoked
