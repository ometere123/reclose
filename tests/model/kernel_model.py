"""Independent pure-Python reference model of the AssuranceKernel security state machine
(C1R Section 20). This module deliberately does NOT import contracts/assurance_kernel.py - it is
an independent oracle derived from the Implementation Specification / CLAUDE.md text and the
C1R hardening instruction, not a copy of the production algorithm. Its internal structure
(dict-of-dataclasses, a single `Model.apply(...)` dispatcher) is intentionally organised
differently from the production Kernel's storage-map/composite-key style.

This model has no GenVM dependency and runs under plain pytest with no Direct Mode fixture.
"""

from __future__ import annotations

from dataclasses import dataclass, field


# -- Enums (mirrors the spec, not the contract's literal constant names) -----------------------

STATE_NORMAL, STATE_MONITORED, STATE_RESTRICTED, STATE_SAFE_MODE, STATE_PAUSED, STATE_RECOVERY = range(6)

OUTCOME_CONFIRMED, OUTCOME_REJECTED, OUTCOME_UNDETERMINED = "CONFIRMED", "REJECTED", "UNDETERMINED"
STAGE_PROVISIONAL, STAGE_FINAL = "PROVISIONAL", "FINAL"

RULE_KIND_INCIDENT, RULE_KIND_REMEDIATION, RULE_KIND_RECOVERY_VALIDATION = "INCIDENT", "REMEDIATION", "RECOVERY_VALIDATION"

ACTION_MONITOR, ACTION_RESTRICT, ACTION_THROTTLE, ACTION_REVOKE_CAPABILITY = "MONITOR", "RESTRICT", "THROTTLE", "REVOKE_CAPABILITY"
ACTION_REROUTE, ACTION_ENTER_SAFE_MODE, ACTION_PAUSE, ACTION_ENTER_RECOVERY, ACTION_RESTORE = (
    "REROUTE", "ENTER_SAFE_MODE", "PAUSE", "ENTER_RECOVERY", "RESTORE",
)

PROVISIONAL_SAFE_ACTIONS = {ACTION_MONITOR, ACTION_RESTRICT, ACTION_REVOKE_CAPABILITY, ACTION_ENTER_SAFE_MODE}
RESOURCE_SCOPED_ACTIONS = {ACTION_RESTRICT, ACTION_THROTTLE, ACTION_REVOKE_CAPABILITY, ACTION_REROUTE}

RELEASE_REMEDIATION, RELEASE_RECOVERY, RELEASE_POLICY_REPLACEMENT = "REMEDIATION", "RECOVERY", "POLICY_REPLACEMENT"

MAX_EFFECTS_PER_RULE = 4

_ACTION_TO_STATE = {
    ACTION_PAUSE: STATE_PAUSED,
    ACTION_ENTER_SAFE_MODE: STATE_SAFE_MODE,
    ACTION_RESTRICT: STATE_RESTRICTED,
    ACTION_THROTTLE: STATE_RESTRICTED,
    ACTION_REVOKE_CAPABILITY: STATE_RESTRICTED,
    ACTION_REROUTE: STATE_RESTRICTED,
    ACTION_MONITOR: STATE_MONITORED,
}


class ModelError(Exception):
    pass


@dataclass
class Rule:
    rule_id: str
    judge: str
    judge_version: int
    rule_kind: str
    provisional_allowed: bool
    report_bond: int = 0
    confirmed_bounty: int = 0
    enabled: bool = True


@dataclass
class Effect:
    rule_id: str
    action_type: str
    resource_id: str
    release_phase: str
    enabled: bool = True


@dataclass
class Policy:
    policy_key: str
    target_id: str
    version: int
    manifest_hash: str
    resources: set = field(default_factory=set)
    rules: dict = field(default_factory=dict)   # rule_id -> Rule
    effects: list = field(default_factory=list)  # list[Effect]
    sealed: bool = False
    active: bool = False
    sealed_at: int | None = None
    human_override_enabled: bool = False

    def rule_identity_map(self):
        """rule identity (excluding confirmed_bounty) -> confirmed_bounty. report_bond
        participates in identity (any report_bond change is always expansion)."""
        return {
            (r.rule_id, r.judge, r.judge_version, r.rule_kind, r.provisional_allowed, r.report_bond): r.confirmed_bounty
            for r in self.rules.values() if r.enabled
        }

    def authority_tuples(self):
        rule_tuples = set(self.rule_identity_map().keys())
        effect_tuples = {
            (e.rule_id, e.action_type, e.resource_id, e.release_phase)
            for e in self.effects if e.enabled
        }
        return rule_tuples, effect_tuples

    def effects_for_rule(self, rule_id: str):
        return [e for e in self.effects if e.enabled and e.rule_id == rule_id][:MAX_EFFECTS_PER_RULE]


@dataclass
class Restriction:
    incident_id: str
    rule_id: str
    action_type: str
    resource_id: str
    release_phase: str
    active: bool = True


@dataclass
class Incident:
    incident_id: str
    parent_incident_id: str
    target_id: str
    policy_key: str
    rule_id: str
    status: str = "OPEN"  # OPEN, PROVISIONAL_APPLIED, FINAL_CONFIRMED, RECOVERY, CLOSED


@dataclass
class Target:
    target_id: str
    owner: str
    human_override_enabled: bool
    active_policy_key: str = ""
    authority_revoked: bool = False
    disabled_actions: set = field(default_factory=set)
    disabled_resources: set = field(default_factory=set)


class Model:
    def __init__(self, minimum_policy_delay_seconds: int):
        self.delay = minimum_policy_delay_seconds
        self.targets: dict[str, Target] = {}
        self.policies: dict[str, Policy] = {}
        self.incidents: dict[str, Incident] = {}
        self.restrictions: list[Restriction] = []
        self.processed_decisions: dict[str, tuple] = {}
        self.time = 0

    # -- time --

    def warp(self, seconds: int) -> None:
        self.time = seconds

    # -- targets --

    def register_target(self, target_id: str, owner: str, human_override_enabled: bool) -> None:
        if target_id in self.targets:
            raise ModelError("DUPLICATE_TARGET")
        self.targets[target_id] = Target(target_id, owner, human_override_enabled)

    def revoke_authority(self, target_id: str) -> None:
        self.targets[target_id].authority_revoked = True

    def disable_action(self, target_id: str, action_type: str) -> None:
        self.targets[target_id].disabled_actions.add(action_type)

    def disable_resource(self, target_id: str, resource_id: str) -> None:
        self.targets[target_id].disabled_resources.add(resource_id)

    # -- policy construction --

    def begin_policy(self, target_id: str, policy_key: str, manifest_hash: str) -> None:
        if policy_key in self.policies:
            raise ModelError("DUPLICATE_POLICY")
        version = 1 + max([p.version for p in self.policies.values() if p.target_id == target_id], default=0)
        self.policies[policy_key] = Policy(policy_key, target_id, version, manifest_hash)

    def add_policy_resource(self, policy_key: str, resource_id: str) -> None:
        p = self.policies[policy_key]
        if p.sealed:
            raise ModelError("SEALED_POLICY")
        if resource_id in p.resources:
            raise ModelError("DUPLICATE_RESOURCE")
        p.resources.add(resource_id)

    def add_policy_rule(self, policy_key: str, rule_id: str, judge: str, judge_version: int, rule_kind: str, provisional_allowed: bool, report_bond: int = 0, confirmed_bounty: int = 0) -> None:
        p = self.policies[policy_key]
        if p.sealed:
            raise ModelError("SEALED_POLICY")
        if rule_id in p.rules:
            raise ModelError("DUPLICATE_RULE_ID")
        p.rules[rule_id] = Rule(rule_id, judge, judge_version, rule_kind, provisional_allowed, report_bond, confirmed_bounty)

    def add_policy_effect(self, policy_key: str, rule_id: str, action_type: str, resource_id: str, release_phase: str) -> None:
        p = self.policies[policy_key]
        if p.sealed:
            raise ModelError("SEALED_POLICY")
        if rule_id not in p.rules:
            raise ModelError("UNKNOWN_RULE")
        if action_type in RESOURCE_SCOPED_ACTIONS and resource_id not in p.resources:
            raise ModelError("UNREGISTERED_RESOURCE")
        existing = len([e for e in p.effects if e.enabled and e.rule_id == rule_id])
        if existing >= MAX_EFFECTS_PER_RULE:
            raise ModelError("TOO_MANY_EFFECTS")
        p.effects.append(Effect(rule_id, action_type, resource_id, release_phase))

    def seal_policy(self, policy_key: str) -> None:
        p = self.policies[policy_key]
        if p.sealed:
            raise ModelError("ALREADY_SEALED")
        p.sealed = True
        p.sealed_at = self.time

    def _is_expansion(self, target: Target, new_policy: Policy) -> bool:
        """C1-FINAL Section 5/A1-H14: the baseline before a target's first policy is EMPTY, so a
        first policy granting any executable rule/effect IS an expansion (a no-op first policy is
        not). Section 8/A1-H20: confirmed_bounty may decrease without being an expansion (all else
        equal); any other rule-identity change (including report_bond) is always expansion."""
        active_key = target.active_policy_key
        if not active_key or active_key not in self.policies:
            new_rules_first, new_effects_first = new_policy.authority_tuples()
            return len(new_rules_first) > 0 or len(new_effects_first) > 0

        old = self.policies[active_key]
        new_rule_map = new_policy.rule_identity_map()
        old_rule_map = old.rule_identity_map()
        for identity, new_bounty in new_rule_map.items():
            if identity not in old_rule_map:
                return True
            if new_bounty > old_rule_map[identity]:
                return True

        _, new_effects = new_policy.authority_tuples()
        _, old_effects = old.authority_tuples()
        if not new_effects.issubset(old_effects):
            return True
        if new_policy.human_override_enabled and not old.human_override_enabled:
            return True
        return False

    def activate_policy(self, policy_key: str) -> None:
        p = self.policies[policy_key]
        target = self.targets[p.target_id]
        if not p.sealed:
            raise ModelError("NOT_SEALED")
        if p.active:
            raise ModelError("ALREADY_ACTIVE")
        expansion = self._is_expansion(target, p)
        if expansion and self.time < p.sealed_at + self.delay:
            raise ModelError("TIMELOCK_NOT_ELAPSED")
        if target.active_policy_key and target.active_policy_key in self.policies:
            self.policies[target.active_policy_key].active = False
        p.active = True
        if expansion:
            # C1R Section 6: an expansion-classified activation supersedes overlays for exactly
            # the action/resource combinations it re-authorises.
            for e in p.effects:
                if e.enabled:
                    target.disabled_actions.discard(e.action_type)
                    if e.resource_id:
                        target.disabled_resources.discard(e.resource_id)
        target.active_policy_key = policy_key

    # -- decisions --

    def receive_decision(
        self, incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash,
        rule_id, resource_id, judge, outcome, decision_stage, judge_version,
    ) -> None:
        target = self.targets[target_id]
        if not target.active_policy_key:
            raise ModelError("INACTIVE_POLICY")
        if target.authority_revoked:
            raise ModelError("AUTHORITY_REVOKED")
        if policy_key != target.active_policy_key:
            raise ModelError("STALE_POLICY")
        policy = self.policies[policy_key]
        if policy_version != policy.version or policy_hash != policy.manifest_hash:
            raise ModelError("STALE_POLICY_VERSION_OR_HASH")
        if rule_id not in policy.rules:
            raise ModelError("UNKNOWN_RULE")
        rule = policy.rules[rule_id]
        if judge != rule.judge or judge_version != rule.judge_version:
            raise ModelError("WRONG_JUDGE")

        decision_key = (incident_id, decision_stage)
        fingerprint = (
            incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash,
            rule_id, resource_id, judge, outcome, decision_stage, judge_version,
        )
        if decision_key in self.processed_decisions:
            if self.processed_decisions[decision_key] == fingerprint:
                return
            raise ModelError("CONFLICTING_DECISION")
        self.processed_decisions[decision_key] = fingerprint

        if rule.rule_kind == RULE_KIND_INCIDENT:
            if parent_incident_id:
                raise ModelError("UNEXPECTED_PARENT")
            incident = self.incidents.get(incident_id)
            if incident is None:
                incident = Incident(incident_id, "", target_id, policy_key, rule_id)
                self.incidents[incident_id] = incident
            if decision_stage == STAGE_PROVISIONAL:
                self._apply_provisional(incident, rule, policy, outcome)
            else:
                self._apply_final_incident(incident, rule, policy, outcome)
        elif rule.rule_kind == RULE_KIND_REMEDIATION:
            if decision_stage != STAGE_FINAL or not parent_incident_id:
                raise ModelError("INVALID_REMEDIATION_DECISION")
            if parent_incident_id not in self.incidents:
                raise ModelError("UNKNOWN_PARENT_INCIDENT")
            parent = self.incidents[parent_incident_id]
            if parent.status != "FINAL_CONFIRMED":
                raise ModelError("PARENT_NOT_ELIGIBLE")
            if outcome == OUTCOME_CONFIRMED:
                self._release(parent, RELEASE_REMEDIATION)
                parent.status = "RECOVERY"
        elif rule.rule_kind == RULE_KIND_RECOVERY_VALIDATION:
            if decision_stage != STAGE_FINAL or not parent_incident_id:
                raise ModelError("INVALID_RECOVERY_DECISION")
            if parent_incident_id not in self.incidents:
                raise ModelError("UNKNOWN_PARENT_INCIDENT")
            parent = self.incidents[parent_incident_id]
            if parent.status != "RECOVERY":
                raise ModelError("PARENT_NOT_IN_RECOVERY")
            if outcome == OUTCOME_CONFIRMED:
                self._release(parent, RELEASE_RECOVERY)
                parent.status = "CLOSED"
        else:
            raise ModelError("UNSUPPORTED_RULE_KIND")

    def _apply_provisional(self, incident: Incident, rule: Rule, policy: Policy, outcome: str) -> None:
        if outcome != OUTCOME_CONFIRMED or not rule.provisional_allowed:
            return
        applied = False
        for e in policy.effects_for_rule(rule.rule_id):
            if e.action_type not in PROVISIONAL_SAFE_ACTIONS:
                continue
            if self._add_restriction(incident, e):
                applied = True
        if applied:
            incident.status = "PROVISIONAL_APPLIED"

    def _apply_final_incident(self, incident: Incident, rule: Rule, policy: Policy, outcome: str) -> None:
        if outcome == OUTCOME_CONFIRMED:
            for e in policy.effects_for_rule(rule.rule_id):
                self._add_restriction(incident, e)
            incident.status = "FINAL_CONFIRMED"
        elif outcome == OUTCOME_REJECTED:
            self._release(incident, None)
            incident.status = "CLOSED"
        elif outcome == OUTCOME_UNDETERMINED:
            self._release(incident, None)
            self.restrictions.append(Restriction(incident.incident_id, rule.rule_id, ACTION_MONITOR, "", RELEASE_POLICY_REPLACEMENT))
            incident.status = "CLOSED"
        else:
            raise ModelError("INVALID_OUTCOME")

    def _add_restriction(self, incident: Incident, effect: Effect) -> bool:
        target = self.targets[incident.target_id]
        if effect.action_type in target.disabled_actions:
            return False
        if effect.resource_id and effect.resource_id in target.disabled_resources:
            return False
        exists = any(
            r.active and r.incident_id == incident.incident_id and r.rule_id == effect.rule_id
            and r.action_type == effect.action_type and r.resource_id == effect.resource_id
            for r in self.restrictions
        )
        if not exists:
            self.restrictions.append(Restriction(incident.incident_id, effect.rule_id, effect.action_type, effect.resource_id, effect.release_phase))
        return True

    def _release(self, incident: Incident, only_phase) -> None:
        for r in self.restrictions:
            if r.incident_id != incident.incident_id or not r.active:
                continue
            if only_phase is not None and r.release_phase != only_phase:
                continue
            r.active = False

    # -- derived state --

    def resource_restriction_count(self, target_id: str, resource_id: str) -> int:
        return sum(
            1 for r in self.restrictions
            if r.active and r.resource_id == resource_id
            and self.incidents[r.incident_id].target_id == target_id
        )

    def target_state(self, target_id: str) -> int:
        def has(state_level) -> bool:
            for r in self.restrictions:
                if not r.active:
                    continue
                inc = self.incidents.get(r.incident_id)
                if inc is None or inc.target_id != target_id:
                    continue
                if _ACTION_TO_STATE.get(r.action_type) == state_level:
                    return True
            return False

        if has(STATE_PAUSED):
            return STATE_PAUSED
        if has(STATE_SAFE_MODE):
            return STATE_SAFE_MODE
        if has(STATE_RESTRICTED):
            return STATE_RESTRICTED
        if any(i.target_id == target_id and i.status == "RECOVERY" for i in self.incidents.values()):
            return STATE_RECOVERY
        if has(STATE_MONITORED):
            return STATE_MONITORED
        return STATE_NORMAL

    def incident_status(self, incident_id: str) -> str:
        return self.incidents[incident_id].status
