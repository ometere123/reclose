"""AssuranceKernel security invariant tests (C1R hardening). Each test cites the TM-* threat ID
it verifies (CLAUDE.md Section 36 / Threat Model Section 15) and, where applicable, the A1-Hxx
finding it closes (see docs/execution/Audit Register.md / audit-packets/A1-attempt-2/
findings-closure.md). Uses the `kernel_harness` fixture (conftest.py) to work around
genlayer-test 0.30.0rc2 Direct Mode's single-contract-per-process limitation - see conftest.py's
module docstring for why, and known-limitations for the live-proof requirement this implies.

Time control: `direct_vm.warp(iso_string)` advances the deterministic VM clock that
`gl.message.datetime` (and therefore `_tx_time_seconds()`) reads - this is the ONLY way these
tests control time; no method under test accepts a caller-supplied timestamp (A1-H02 closure).
"""

import pytest

M1 = "0x" + "1" * 64
M2 = "0x" + "2" * 64
EV_A = "0x" + "a" * 64
EV_B = "0x" + "b" * 64
INCIDENT_RULE = 1
REMEDIATION_RULE = 2
RECOVERY_RULE = 3
STAGE_PROVISIONAL = 1
STAGE_FINAL = 2
OUTCOME_CONFIRMED = 1
OUTCOME_REJECTED = 2
OUTCOME_UNDETERMINED = 3


def _base_time(direct_vm):
    direct_vm.warp("2026-01-01T00:00:00Z")


def test_no_action_without_active_policy(kernel_harness, direct_vm):
    """TM-AUTH-001: Kernel must default-deny receive_decision when no policy is active."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-nonexistent", 1, M1,
            "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_FINAL, 1,
        )


def test_unauthorized_owner_cannot_construct_policy(kernel_harness, direct_vm, direct_alice):
    """TM-AUTH-007-adjacent: only the live target owner may construct/mutate a policy."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        kernel.begin_policy("target-001", "policy-1", M1)


def test_duplicate_target_registration_rejected(kernel_harness):
    kernel, gl, owner_addr, _ = kernel_harness
    with pytest.raises(Exception):
        kernel.register_target("target-001", gl.Address(b"\x33" * 20), True)


def test_sealed_policy_mutation_rejected(kernel_harness, direct_vm):
    """TM-AUTH-005: a sealed policy is immutable - further mutation must be rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.seal_policy("policy-1")
    with pytest.raises(Exception):
        kernel.add_policy_resource("policy-1", "provider_a")


def test_authority_expansion_timelock_uses_sealed_at_not_created_at(kernel_harness, direct_vm):
    """C1R Section 3.1 (A1-H02): the timelock begins at sealed_at, not created_at - waiting after
    begin_policy() but sealing later must not shorten the effective delay from seal time."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.seal_policy("policy-1")
    # C1-FINAL Section 5/A1-H14: the FIRST policy for a target grants executable authority against
    # an empty baseline, so it IS an expansion and requires the timelock too - not immediate.
    with pytest.raises(Exception):
        kernel.activate_policy("policy-1")
    direct_vm.warp("2026-01-01T00:01:01Z")  # 61s after seal
    kernel.activate_policy("policy-1")

    direct_vm.warp("2026-01-01T00:01:10Z")
    kernel.begin_policy("target-001", "policy-2", M2)  # created early
    direct_vm.warp("2026-01-01T00:10:00Z")  # wait a long time before sealing
    kernel.add_policy_rule("policy-2", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_rule("policy-2", "RULE_B", owner_addr, 1, INCIDENT_RULE, True, 0, 0)  # expansion
    kernel.seal_policy("policy-2")  # sealed_at = 00:10:00

    direct_vm.warp("2026-01-01T00:10:30Z")  # only 30s after SEAL, delay is 60s
    with pytest.raises(Exception):
        kernel.activate_policy("policy-2")

    direct_vm.warp("2026-01-01T00:11:01Z")  # 61s after seal - now elapsed
    kernel.activate_policy("policy-2")


def test_authority_reduction_is_immediate(kernel_harness, direct_vm):
    """Authority REDUCTION does not require the expansion timelock."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_rule("policy-1", "RULE_B", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.begin_policy("target-001", "policy-2", M2)
    kernel.add_policy_rule("policy-2", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)  # fewer rules
    kernel.seal_policy("policy-2")
    kernel.activate_policy("policy-2")  # reduction: immediate, no error expected


def test_same_count_action_substitution_is_expansion(kernel_harness, direct_vm):
    """C1R A1-H03/Section 5: MONITOR -> PAUSE at the same rule/effect count must be EXPANSION,
    not silently reduction/no-change."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 2, "provider_a", 0, "", 1)  # MONITOR
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.begin_policy("target-001", "policy-2", M2)
    kernel.add_policy_rule("policy-2", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-2", "RULE_A", 8, "", 0, "", 1)  # PAUSE - same count, stronger
    assert kernel.get_policy_security_diff_is_expansion("target-001", "policy-2") is True
    kernel.seal_policy("policy-2")
    with pytest.raises(Exception):
        kernel.activate_policy("policy-2")  # must be timelocked


def test_same_count_judge_change_is_expansion(kernel_harness, direct_vm, direct_alice):
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.begin_policy("target-001", "policy-2", M2)
    kernel.add_policy_rule("policy-2", "RULE_A", direct_alice, 1, INCIDENT_RULE, True, 0, 0)  # different judge
    assert kernel.get_policy_security_diff_is_expansion("target-001", "policy-2") is True


def test_same_count_provisional_allowed_false_to_true_is_expansion(kernel_harness, direct_vm):
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, False, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.begin_policy("target-001", "policy-2", M2)
    kernel.add_policy_rule("policy-2", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    assert kernel.get_policy_security_diff_is_expansion("target-001", "policy-2") is True


def test_same_count_resource_change_is_expansion(kernel_harness, direct_vm):
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)  # RESTRICT provider_a
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.begin_policy("target-001", "policy-2", M2)
    kernel.add_policy_rule("policy-2", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_resource("policy-2", "provider_b")
    kernel.add_policy_effect("policy-2", "RULE_A", 3, "provider_b", 0, "", 1)  # different resource
    assert kernel.get_policy_security_diff_is_expansion("target-001", "policy-2") is True


def test_removal_of_effect_is_reduction(kernel_harness, direct_vm):
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)
    kernel.add_policy_effect("policy-1", "RULE_A", 2, "", 0, "", 1)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.begin_policy("target-001", "policy-2", M2)
    kernel.add_policy_resource("policy-2", "provider_a")
    kernel.add_policy_rule("policy-2", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-2", "RULE_A", 3, "provider_a", 0, "", 1)  # one fewer effect
    assert kernel.get_policy_security_diff_is_expansion("target-001", "policy-2") is False


def test_human_override_true_to_false_is_reduction(kernel_harness, direct_vm):
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.targets["target-001"].human_override_enabled  # sanity - fixture sets True
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")
    assert kernel.policy_headers["policy-1"].human_override_enabled is True

    kernel.begin_policy("target-001", "policy-2", M2)
    kernel.policy_headers["policy-2"].human_override_enabled = False
    assert kernel.get_policy_security_diff_is_expansion("target-001", "policy-2") is False


def test_stale_policy_key_decision_rejected(kernel_harness, direct_vm):
    """TM-AUTH-006: a decision bound to a superseded policy_key must be rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.begin_policy("target-001", "policy-2", M2)
    kernel.seal_policy("policy-2")
    kernel.activate_policy("policy-2")  # reduction (0 rules), immediate

    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-1", 1, M1,
            "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_FINAL, 1,
        )


def test_stale_policy_hash_decision_rejected(kernel_harness, direct_vm):
    """C1R A1-H11: policy_hash mismatch (even with correct key/version) must be rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-1", 1, M2,  # wrong hash
            "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_FINAL, 1,
        )


def test_wrong_judge_rejected(kernel_harness, direct_vm, direct_alice):
    """TM-AUTH-008: only the exact configured Judge address for the rule may call receive_decision."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)  # judge = owner_addr
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    direct_vm.sender = direct_alice  # not the configured judge
    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-1", 1, M1,
            "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_FINAL, 1,
        )


def test_wrong_judge_version_rejected(kernel_harness, direct_vm):
    """C1R A1-H11: judge_version must match the rule's configured judge_version exactly."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)  # judge_version=1
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-1", 1, M1,
            "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_FINAL, 2,
        )


def test_unsupported_action_rejected_at_policy_construction(kernel_harness, direct_vm):
    """TM-AUTH-002: an action_type outside the finite Kernel-v1 set must be rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    with pytest.raises(Exception):
        kernel.add_policy_effect("policy-1", "RULE_A", 99, "provider_a", 0, "", 1)  # 99 not in Kernel-v1 set


def test_effect_must_reference_existing_rule(kernel_harness, direct_vm):
    """C1R A1-H05: an effect referencing a nonexistent rule_id must be rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    with pytest.raises(Exception):
        kernel.add_policy_effect("policy-1", "NO_SUCH_RULE", 3, "provider_a", 0, "", 1)


def test_wrong_rule_cannot_execute_another_rules_effects(kernel_harness, direct_vm):
    """C1R A1-H05 (the core rule->effect binding invariant): RULE_B's decision must not trigger
    RULE_A's effects even though both are on the same policy."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)  # RESTRICT bound to RULE_A
    kernel.add_policy_rule("policy-1", "RULE_B", owner_addr, 1, INCIDENT_RULE, True, 0, 0)  # no effects
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.receive_decision(
        "incident-001", "", "target-001", "policy-1", 1, M1,
        "RULE_B", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_FINAL, 1,
    )
    assert len(dispatch_log) == 0  # RULE_B has no effects of its own - RULE_A's must not fire


def test_arbitrary_calldata_impossible(kernel_harness):
    """TM-AUTH-003/009: the Kernel has no method that accepts free-form calldata/selector/target."""
    kernel, gl, owner_addr, _ = kernel_harness
    assert not hasattr(kernel, "execute")
    assert not hasattr(kernel, "call")
    assert not hasattr(kernel, "delegatecall")


def test_remediation_recovery_have_no_independent_public_entry_point(kernel_harness):
    """C1R A1-H01: apply_remediation_decision/apply_recovery_validation must not exist as
    independent public methods - all judgement enters through receive_decision()."""
    kernel, gl, owner_addr, _ = kernel_harness
    assert not hasattr(kernel, "apply_remediation_decision")
    assert not hasattr(kernel, "apply_recovery_validation")


def test_provisional_disallowed_action_not_applied(kernel_harness, direct_vm):
    """Implementation Spec Section 25: PAUSE is not in the R1 provisional-safe action set and must
    not be dispatched provisionally even if registered as an effect for the triggering rule."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 8, "", 0, "", 1)  # PAUSE
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.receive_decision(
        "incident-001", "", "target-001", "policy-1", 1, M1,
        "RULE_A", "", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_PROVISIONAL, 1,
    )
    assert len(dispatch_log) == 0  # PAUSE must never have been dispatched provisionally


def test_provisional_allowed_false_suppresses_provisional_effects(kernel_harness, direct_vm):
    """C1R A1-H06: provisional_allowed=False must suppress all provisional effect application,
    even for an otherwise-safe action, and the incident must not be marked PROVISIONAL_APPLIED."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, False, 0, 0)  # provisional_allowed=False
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)  # RESTRICT
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.receive_decision(
        "incident-001", "", "target-001", "policy-1", 1, M1,
        "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_PROVISIONAL, 1,
    )
    assert len(dispatch_log) == 0
    assert int(kernel.get_incident_status("incident-001")) == 0  # still OPEN, not PROVISIONAL_APPLIED


def test_replayed_decision_is_noop(kernel_harness, direct_vm):
    """Invariant 8: exact duplicate delivery of the same decision must be a no-op success."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    args = ("incident-001", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_PROVISIONAL, 1)
    kernel.receive_decision(*args)
    count_after_first = int(kernel.get_resource_restriction_count(kernel.targets["target-001"].target_address, "provider_a"))
    kernel.receive_decision(*args)  # exact duplicate
    count_after_replay = int(kernel.get_resource_restriction_count(kernel.targets["target-001"].target_address, "provider_a"))
    assert count_after_first == count_after_replay == 1
    assert len(dispatch_log) == 1  # dispatched exactly once, not twice


def test_conflicting_replay_rejected(kernel_harness, direct_vm):
    """C1R A1-H11/Section 7: a SECOND decision for the same incident/stage with different content
    must be rejected as a conflict, never silently accepted as if it were the same decision."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.receive_decision(
        "incident-001", "", "target-001", "policy-1", 1, M1,
        "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_PROVISIONAL, 1,
    )
    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-1", 1, M1,
            "RULE_A", "provider_a", owner_addr, EV_B, OUTCOME_CONFIRMED, "COND_1", STAGE_PROVISIONAL, 1,  # different evidence_hash
        )


def test_multi_incident_restriction_composition(kernel_harness, direct_vm):
    """TM-REC-008/Section 27: two incidents restricting the same resource -> count reaches 2."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_PROVISIONAL, 1)
    kernel.receive_decision("incident-B", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_B, OUTCOME_CONFIRMED, "C2", STAGE_PROVISIONAL, 1)
    target_addr = kernel.targets["target-001"].target_address
    assert int(kernel.get_resource_restriction_count(target_addr, "provider_a")) == 2


def test_resolving_incident_a_does_not_remove_incident_b_restriction(kernel_harness, direct_vm):
    """TM-REC-001 (the core reason-indexed restriction invariant)."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_PROVISIONAL, 1)
    kernel.receive_decision("incident-B", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_B, OUTCOME_CONFIRMED, "C2", STAGE_PROVISIONAL, 1)
    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_REJECTED, "C1", STAGE_FINAL, 1)
    target_addr = kernel.targets["target-001"].target_address
    assert int(kernel.get_resource_restriction_count(target_addr, "provider_a")) == 1  # B still holds it


def test_resolve_weaker_first_leaves_stronger_state(kernel_harness, direct_vm):
    """C1R Section 10: SAFE_MODE incident + RESTRICTED incident, resolve RESTRICTED first ->
    state must remain SAFE_MODE (not fall to NORMAL)."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 7, "", 0, "", 1)  # ENTER_SAFE_MODE
    kernel.add_policy_rule("policy-1", "RULE_B", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_B", 3, "provider_a", 0, "", 1)  # RESTRICT
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_PROVISIONAL, 1)
    assert int(kernel.get_target_state("target-001")) == 3  # SAFE_MODE
    kernel.receive_decision("incident-B", "", "target-001", "policy-1", 1, M1, "RULE_B", "provider_a", owner_addr, EV_B, OUTCOME_CONFIRMED, "C2", STAGE_PROVISIONAL, 1)
    assert int(kernel.get_target_state("target-001")) == 3  # must remain SAFE_MODE
    kernel.receive_decision("incident-B", "", "target-001", "policy-1", 1, M1, "RULE_B", "provider_a", owner_addr, EV_B, OUTCOME_REJECTED, "C2", STAGE_FINAL, 1)
    assert int(kernel.get_target_state("target-001")) == 3  # resolving B (weaker) must not drop below SAFE_MODE


def test_final_undetermined_becomes_monitored(kernel_harness, direct_vm):
    """C1R Section 8.1: FINAL UNDETERMINED must release the incident's restrictions and leave the
    target MONITORED (never SAFE_MODE and never NORMAL) when no other incident is active."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 7, "", 0, "", 1)  # ENTER_SAFE_MODE
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_PROVISIONAL, 1)
    assert int(kernel.get_target_state("target-001")) == 3  # SAFE_MODE
    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "", owner_addr, EV_A, OUTCOME_UNDETERMINED, "C1", STAGE_FINAL, 1)
    assert int(kernel.get_target_state("target-001")) == 1  # MONITORED


def test_confirmed_remediation_recovery_flow(kernel_harness, direct_vm):
    """C1R Section 8.2/8.3: FINAL CONFIRMED -> authenticated REMEDIATION CONFIRMED -> RECOVERY ->
    authenticated RECOVERY_VALIDATION CONFIRMED -> restrictions released, target back to NORMAL."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "INCIDENT_RULE", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "INCIDENT_RULE", 3, "provider_a", 0, "", 2)  # RESTRICT, release-at-recovery-validated
    kernel.add_policy_rule("policy-1", "REMEDIATION_RULE", owner_addr, 1, REMEDIATION_RULE, True, 0, 0)
    kernel.add_policy_rule("policy-1", "RECOVERY_RULE", owner_addr, 1, RECOVERY_RULE, True, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "INCIDENT_RULE", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_FINAL, 1)
    assert int(kernel.get_incident_status("incident-A")) == 2  # FINAL_CONFIRMED
    assert int(kernel.get_target_state("target-001")) == 2  # RESTRICTED

    kernel.receive_decision("remediation-1", "incident-A", "target-001", "policy-1", 1, M1, "REMEDIATION_RULE", "", owner_addr, EV_B, OUTCOME_CONFIRMED, "R1", STAGE_FINAL, 1)
    assert int(kernel.get_incident_status("incident-A")) == 3  # RECOVERY
    # the RESTRICT restriction's release_phase is RELEASE_AT_RECOVERY_VALIDATED (not yet released),
    # so RESTRICTED still outranks RECOVERY in the Section 10 priority order - correct, not a bug.
    assert int(kernel.get_target_state("target-001")) == 2  # RESTRICTED

    kernel.receive_decision("recovery-1", "incident-A", "target-001", "policy-1", 1, M1, "RECOVERY_RULE", "", owner_addr, EV_A, OUTCOME_CONFIRMED, "V1", STAGE_FINAL, 1)
    assert int(kernel.get_incident_status("incident-A")) == 4  # CLOSED
    assert int(kernel.get_target_state("target-001")) == 0  # NORMAL


def test_remediation_rejected_does_not_restore_authority(kernel_harness, direct_vm):
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "INCIDENT_RULE", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "INCIDENT_RULE", 3, "provider_a", 0, "", 2)
    kernel.add_policy_rule("policy-1", "REMEDIATION_RULE", owner_addr, 1, REMEDIATION_RULE, True, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")
    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "INCIDENT_RULE", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_FINAL, 1)

    kernel.receive_decision("remediation-1", "incident-A", "target-001", "policy-1", 1, M1, "REMEDIATION_RULE", "", owner_addr, EV_B, OUTCOME_REJECTED, "R1", STAGE_FINAL, 1)
    assert int(kernel.get_incident_status("incident-A")) == 2  # still FINAL_CONFIRMED, not RECOVERY
    assert int(kernel.get_target_state("target-001")) == 2  # still RESTRICTED


def test_remediation_requires_authenticated_judge_not_arbitrary_caller(kernel_harness, direct_vm, direct_alice):
    """C1R A1-H01: remediation only enters via receive_decision, which still enforces the exact
    Judge check for the REMEDIATION rule - an arbitrary caller cannot resolve a remediation."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "INCIDENT_RULE", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_rule("policy-1", "REMEDIATION_RULE", owner_addr, 1, REMEDIATION_RULE, True, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")
    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "INCIDENT_RULE", "", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_FINAL, 1)

    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        kernel.receive_decision("remediation-1", "incident-A", "target-001", "policy-1", 1, M1, "REMEDIATION_RULE", "", owner_addr, EV_B, OUTCOME_CONFIRMED, "R1", STAGE_FINAL, 1)


def test_authority_revoked_path(kernel_harness, direct_vm):
    """TM-AUTH-007: once revoked, the Kernel must refuse further decisions for that target."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")
    kernel.revoke_authority("target-001")

    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-1", 1, M1,
            "RULE_A", "", owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_PROVISIONAL, 1,
        )


def test_overlay_cannot_broaden_authority(kernel_harness):
    """Section 22: disable_action/disable_resource only ever narrow authority - there is no
    corresponding enable_* method that could be used to broaden it outside the timelock path."""
    kernel, gl, owner_addr, _ = kernel_harness
    assert not hasattr(kernel, "enable_action")
    assert not hasattr(kernel, "enable_resource")


def test_disabled_action_suppresses_restriction_and_dispatch(kernel_harness, direct_vm):
    """C1R A1-H04: disable_action(RESTRICT) must suppress restriction creation AND target dispatch
    for an otherwise-valid decision."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)  # RESTRICT
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.disable_action("target-001", 3)  # RESTRICT
    kernel.receive_decision("incident-001", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_PROVISIONAL, 1)

    assert len(dispatch_log) == 0
    target_addr = kernel.targets["target-001"].target_address
    assert int(kernel.get_resource_restriction_count(target_addr, "provider_a")) == 0


def test_disabled_resource_suppresses_revoke_capability(kernel_harness, direct_vm):
    """C1R A1-H04: disable_resource(provider_a) suppresses REVOKE_CAPABILITY(provider_a)."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 5, "provider_a", 0, "", 1)  # REVOKE_CAPABILITY
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    kernel.disable_resource("target-001", "provider_a")
    kernel.receive_decision("incident-001", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_PROVISIONAL, 1)
    assert len(dispatch_log) == 0


def test_unrelated_reduction_policy_activation_does_not_clear_overlay(kernel_harness, direct_vm):
    """C1R Section 6: a reduction-only policy activation must NOT clear a safety overlay."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", 3, "provider_a", 0, "", 1)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")
    kernel.disable_action("target-001", 3)  # RESTRICT disabled

    # unrelated REDUCTION activation (fewer rules)
    kernel.begin_policy("target-001", "policy-2", M2)
    kernel.seal_policy("policy-2")
    kernel.activate_policy("policy-2")  # reduction - must not clear the overlay

    kernel.begin_policy("target-001", "policy-3", "0x" + "3" * 64)
    kernel.add_policy_resource("policy-3", "provider_a")
    kernel.add_policy_rule("policy-3", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-3", "RULE_A", 3, "provider_a", 0, "", 1)
    kernel.seal_policy("policy-3")
    direct_vm.warp("2026-01-01T00:03:01Z")
    kernel.activate_policy("policy-3")  # expansion (new rule/effect vs current-empty policy-2) - clears overlay this time

    kernel.receive_decision("incident-001", "", "target-001", "policy-3", 3, "0x" + "3" * 64, "RULE_A", "provider_a", owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_PROVISIONAL, 1)
    assert len(dispatch_log) == 1  # overlay was cleared by the expansion-classified activation that re-authorised it


def test_maximum_effect_limit_rejected_at_construction(kernel_harness, direct_vm):
    """CLAUDE.md Section 12 / C1R Section 3.3: the 5th enabled effect for one rule is rejected at
    construction time, never silently truncated at execution."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    for i in range(4):
        kernel.add_policy_resource("policy-1", f"resource-{i}")
        kernel.add_policy_effect("policy-1", "RULE_A", 3, f"resource-{i}", 0, "", 1)
    kernel.add_policy_resource("policy-1", "resource-4")
    with pytest.raises(Exception):
        kernel.add_policy_effect("policy-1", "RULE_A", 3, "resource-4", 0, "", 1)  # 5th effect for RULE_A


def test_invalid_identifier_rejected(kernel_harness, direct_vm):
    """C1R A1-H09: identifiers with disallowed characters (whitespace, slash, unicode) are rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    with pytest.raises(Exception):
        kernel.begin_policy("target-001", "policy with space", M1)
    with pytest.raises(Exception):
        kernel.begin_policy("target-001", "policy/slash", M1)
    with pytest.raises(Exception):
        kernel.begin_policy("target-001", "policyé", M1)


def test_malformed_hash_rejected(kernel_harness, direct_vm):
    """C1R A1-H09: manifest_hash must be exactly 0x + 64 lowercase hex characters."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    with pytest.raises(Exception):
        kernel.begin_policy("target-001", "policy-x", "0xmanifest1")  # too short, not hex
    with pytest.raises(Exception):
        kernel.begin_policy("target-001", "policy-y", "0x" + "A" * 64)  # uppercase hex rejected


def test_hash_argument_normalizes_from_int_calldata(kernel_harness, direct_vm):
    """C1R live-deployment finding: the exact pinned genlayer CLI 0.40.0-rc.3's --args scalar
    parser always coerces a `0x`+hex token to a BigInt/int before it reaches this contract (no
    CLI escape exists to force a hex-shaped string to stay a string) - see _normalize_hash_arg's
    docstring. Prove the round-trip is lossless: passing the int form of a valid canonical hash
    must be accepted identically to passing the string form."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    hash_str = "0x" + "7" * 64
    hash_int = int(hash_str, 16)
    kernel.begin_policy("target-001", "policy-int-hash", hash_int)
    kernel.add_policy_rule("policy-int-hash", "R1", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.seal_policy("policy-int-hash")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-int-hash")
    kernel.receive_decision(
        "incident-int-hash", "", "target-001", "policy-int-hash", 1, hash_int,
        "R1", "", owner_addr, hash_int, OUTCOME_CONFIRMED, "C1", STAGE_FINAL, 1,
    )
    # a leading-zero-shaped hash must round-trip through zero-padding, not just any hash value
    padded_hash_str = "0x" + "00" + "9" * 62
    padded_hash_int = int(padded_hash_str, 16)
    kernel.begin_policy("target-001", "policy-padded-hash", padded_hash_int)


def test_empty_str_argument_normalizes_from_int_zero_calldata(kernel_harness, direct_vm):
    """C1R live-deployment finding: the exact pinned genlayer CLI 0.40.0-rc.3's --args scalar
    parser runs `Number(value)` on non-special tokens, and `Number("")` is `0` in JavaScript, so
    an intentionally empty string argument (parent_incident_id for an INCIDENT decision,
    resource_id/param_str for a target-wide effect) arrives at the contract as the int 0, not the
    empty string - see _normalize_str_arg's docstring. Prove int 0 is accepted identically to "".
    """
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-empty-str", M2)
    kernel.add_policy_rule("policy-empty-str", "R1", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect("policy-empty-str", "R1", 7, 0, 0, 0, 2)  # ENTER_SAFE_MODE, resource_id=int 0
    kernel.seal_policy("policy-empty-str")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-empty-str")
    kernel.receive_decision(
        "incident-empty-str", 0, "target-001", "policy-empty-str", 1, M2,
        "R1", 0, owner_addr, EV_A, OUTCOME_CONFIRMED, "C1", STAGE_FINAL, 1,
    )
    assert int(kernel.get_target_state("target-001")) == 3  # SAFE_MODE


# -- C1-FINAL Section 4: exact provisional-safe action set matrix (A1-H13 closure) --------------
# EXACTLY {MONITOR, RESTRICT, REVOKE_CAPABILITY, ENTER_SAFE_MODE} may execute provisionally.
# THROTTLE was previously (incorrectly) included; ENTER_SAFE_MODE was already present.

@pytest.mark.parametrize("action_type,resource_id,label", [
    (2, "", "MONITOR"),
    (3, "provider_a", "RESTRICT"),
    (5, "provider_a", "REVOKE_CAPABILITY"),
    (7, "", "ENTER_SAFE_MODE"),
])
def test_provisional_safe_action_dispatches(kernel_harness, direct_vm, action_type, resource_id, label):
    """C1-FINAL Section 4 (A1-H13): each of the four provisional-safe actions must actually be
    applied/dispatched when submitted PROVISIONAL CONFIRMED."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    _base_time(direct_vm)
    policy_key = f"policy-safe-{label.lower()}"
    kernel.begin_policy("target-001", policy_key, M1)
    if resource_id:
        kernel.add_policy_resource(policy_key, resource_id)
    kernel.add_policy_rule(policy_key, "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect(policy_key, "RULE_A", action_type, resource_id, 0, "", 1)
    kernel.seal_policy(policy_key)
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy(policy_key)

    kernel.receive_decision(
        f"incident-safe-{label.lower()}", "", "target-001", policy_key, 1, M1,
        "RULE_A", resource_id, owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_PROVISIONAL, 1,
    )
    assert len(dispatch_log) >= 1, f"{label} was not dispatched provisionally"


@pytest.mark.parametrize("action_type,resource_id,label", [
    (4, "provider_a", "THROTTLE"),
    (6, "provider_a", "REROUTE"),
    (8, "", "PAUSE"),
    (9, "", "ENTER_RECOVERY"),
    (10, "", "RESTORE"),
])
def test_provisional_unsafe_action_rejected(kernel_harness, direct_vm, action_type, resource_id, label):
    """C1-FINAL Section 4 (A1-H13): none of THROTTLE/REROUTE/PAUSE/ENTER_RECOVERY/RESTORE may ever
    be dispatched provisionally, even if registered as an effect for the triggering rule."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    _base_time(direct_vm)
    policy_key = f"policy-unsafe-{label.lower()}"
    kernel.begin_policy("target-001", policy_key, M1)
    if resource_id:
        kernel.add_policy_resource(policy_key, resource_id)
    kernel.add_policy_rule(policy_key, "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect(policy_key, "RULE_A", action_type, resource_id, 0, "", 1)
    kernel.seal_policy(policy_key)
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy(policy_key)

    kernel.receive_decision(
        f"incident-unsafe-{label.lower()}", "", "target-001", policy_key, 1, M1,
        "RULE_A", resource_id, owner_addr, EV_A, OUTCOME_CONFIRMED, "COND_1", STAGE_PROVISIONAL, 1,
    )
    assert len(dispatch_log) == 0, f"{label} must never be dispatched provisionally"


# -- C1-FINAL Section 5: first-policy timelock matrix (A1-H14 closure) --------------------------

@pytest.mark.parametrize("action_type,resource_id,label", [
    (3, "provider_a", "RESTRICT"),
    (5, "provider_a", "REVOKE_CAPABILITY"),
    (7, "", "ENTER_SAFE_MODE"),
])
def test_first_policy_with_executable_effect_requires_timelock(kernel_harness, direct_vm, action_type, resource_id, label):
    """C1-FINAL Section 5 (A1-H14): the authority baseline before a target's first policy is
    EMPTY, so a first policy granting an executable effect IS an expansion and must respect the
    timelock from sealed_at - it may NOT activate immediately."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    policy_key = f"policy-first-{label.lower()}"
    kernel.begin_policy("target-001", policy_key, M1)
    if resource_id:
        kernel.add_policy_resource(policy_key, resource_id)
    kernel.add_policy_rule(policy_key, "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 0)
    kernel.add_policy_effect(policy_key, "RULE_A", action_type, resource_id, 0, "", 1)
    kernel.seal_policy(policy_key)
    with pytest.raises(Exception):
        kernel.activate_policy(policy_key)
    direct_vm.warp("2026-01-01T00:01:01Z")
    kernel.activate_policy(policy_key)  # succeeds once the delay has elapsed


def test_first_policy_with_confirmed_bounty_requires_timelock(kernel_harness, direct_vm):
    """C1-FINAL Section 5/8 (A1-H14/A1-H20): a first policy whose only enabled rule introduces a
    non-zero confirmed_bounty (no effects at all) is still an economic authority expansion and
    must respect the timelock."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-first-bounty", M1)
    kernel.add_policy_rule("policy-first-bounty", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 100)  # confirmed_bounty=100
    kernel.seal_policy("policy-first-bounty")
    with pytest.raises(Exception):
        kernel.activate_policy("policy-first-bounty")
    direct_vm.warp("2026-01-01T00:01:01Z")
    kernel.activate_policy("policy-first-bounty")


def test_first_policy_with_no_effects_activates_immediately(kernel_harness, direct_vm):
    """C1-FINAL Section 5 (A1-H14): a first policy with no enabled rules/effects grants nothing,
    so it is NOT an expansion and may activate immediately - a no-op policy is not treated as
    dangerous merely because it is a target's first policy."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-first-noop", M1)
    kernel.seal_policy("policy-first-noop")
    kernel.activate_policy("policy-first-noop")  # no exception - immediate is correct


def test_confirmed_bounty_decrease_is_reduction(kernel_harness, direct_vm):
    """C1-FINAL Section 8 (A1-H20): a confirmed_bounty DECREASE, with everything else identical,
    is a reduction and may activate immediately - only an increase is an expansion."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-bounty-1", M1)
    kernel.add_policy_rule("policy-bounty-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 100)
    kernel.seal_policy("policy-bounty-1")
    direct_vm.warp("2026-01-01T00:01:01Z")
    kernel.activate_policy("policy-bounty-1")

    kernel.begin_policy("target-001", "policy-bounty-2", M2)
    kernel.add_policy_rule("policy-bounty-2", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 50)  # decreased
    kernel.seal_policy("policy-bounty-2")
    kernel.activate_policy("policy-bounty-2")  # no exception - bounty decrease is reduction


def test_confirmed_bounty_increase_is_expansion(kernel_harness, direct_vm):
    """C1-FINAL Section 8 (A1-H20): a confirmed_bounty INCREASE is an expansion and requires the
    timelock, even with everything else identical."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-bounty-1", M1)
    kernel.add_policy_rule("policy-bounty-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 50)
    kernel.seal_policy("policy-bounty-1")
    direct_vm.warp("2026-01-01T00:01:01Z")
    kernel.activate_policy("policy-bounty-1")

    kernel.begin_policy("target-001", "policy-bounty-2", M2)
    kernel.add_policy_rule("policy-bounty-2", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 0, 100)  # increased
    kernel.seal_policy("policy-bounty-2")
    with pytest.raises(Exception):
        kernel.activate_policy("policy-bounty-2")


def test_report_bond_change_is_expansion(kernel_harness, direct_vm):
    """C1-FINAL Section 8 (A1-H20): ANY report_bond change (not just an increase) is always an
    expansion."""
    kernel, gl, owner_addr, _ = kernel_harness
    _base_time(direct_vm)
    kernel.begin_policy("target-001", "policy-bond-1", M1)
    kernel.add_policy_rule("policy-bond-1", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 10, 0)
    kernel.seal_policy("policy-bond-1")
    direct_vm.warp("2026-01-01T00:01:01Z")
    kernel.activate_policy("policy-bond-1")

    kernel.begin_policy("target-001", "policy-bond-2", M2)
    kernel.add_policy_rule("policy-bond-2", "RULE_A", owner_addr, 1, INCIDENT_RULE, True, 5, 0)  # decreased bond
    kernel.seal_policy("policy-bond-2")
    with pytest.raises(Exception):
        kernel.activate_policy("policy-bond-2")  # bond decrease is STILL expansion per Section 8
