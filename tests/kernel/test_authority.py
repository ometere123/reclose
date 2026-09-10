"""AssuranceKernel security invariant tests (C1). Each test cites the TM-* threat ID it verifies
(CLAUDE.md Section 36 / Threat Model Section 15). Uses the `kernel_harness` fixture (conftest.py)
to work around genlayer-test 0.30.0rc2 Direct Mode's single-contract-per-process limitation - see
conftest.py's module docstring for why, and known-limitations for the live-proof requirement this
implies.
"""

import pytest


def test_no_action_without_active_policy(kernel_harness):
    """TM-AUTH-001: Kernel must default-deny receive_decision when no policy is active."""
    kernel, gl, owner_addr, _ = kernel_harness
    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-nonexistent", "PROVIDER_COMPROMISE_V1",
            "provider_a", owner_addr, "0xevidence", 1, "COND_1", 2, 1,
        )


def test_unauthorized_owner_cannot_construct_policy(kernel_harness, direct_vm, direct_alice):
    """TM-AUTH-007-adjacent: only the live target owner may construct/mutate a policy."""
    kernel, gl, owner_addr, _ = kernel_harness
    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        kernel.begin_policy("target-001", "policy-1", "0xmanifest", 1000)


def test_duplicate_target_registration_rejected(kernel_harness):
    kernel, gl, owner_addr, _ = kernel_harness
    with pytest.raises(Exception):
        kernel.register_target("target-001", gl.Address(b"\x33" * 20), True, 1001)


def test_sealed_policy_mutation_rejected(kernel_harness):
    """TM-AUTH-005: a sealed policy is immutable - further mutation must be rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest", 1000)
    kernel.seal_policy("policy-1")
    with pytest.raises(Exception):
        kernel.add_policy_resource("policy-1", "provider_a")


def test_authority_expansion_requires_timelock(kernel_harness):
    """TM-AUTH-004: activating an EXPANDED policy before the timelock elapses must be rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)  # first policy: not an expansion, immediate OK

    kernel.begin_policy("target-001", "policy-2", "0xmanifest-2", 1000)
    kernel.add_policy_rule("policy-2", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.add_policy_rule("policy-2", "SERVICE_FAILURE_V1", owner_addr, 1, True, 0, 0)  # expands rule_count
    kernel.seal_policy("policy-2")

    with pytest.raises(Exception):
        kernel.activate_policy("policy-2", 1001)  # only 1 second elapsed, delay is 60


def test_authority_reduction_is_immediate(kernel_harness):
    """Authority REDUCTION does not require the expansion timelock."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.add_policy_rule("policy-1", "SERVICE_FAILURE_V1", owner_addr, 1, True, 0, 0)
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)

    kernel.begin_policy("target-001", "policy-2", "0xmanifest-2", 1000)
    kernel.add_policy_rule("policy-2", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)  # fewer rules
    kernel.seal_policy("policy-2")
    kernel.activate_policy("policy-2", 1001)  # reduction: immediate, no error expected


def test_stale_policy_decision_rejected(kernel_harness):
    """TM-AUTH-006: a decision bound to a superseded policy_key must be rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)

    kernel.begin_policy("target-001", "policy-2", "0xmanifest-2", 1000)
    kernel.seal_policy("policy-2")
    kernel.activate_policy("policy-2", 1000)  # reduction (0 rules), immediate

    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1",
            "provider_a", owner_addr, "0xevidence", 1, "COND_1", 2, 1,
        )


def test_wrong_judge_rejected(kernel_harness, direct_vm, direct_alice):
    """TM-AUTH-008: only the exact configured Judge address for the rule may call receive_decision."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)  # judge = owner_addr
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)

    direct_vm.sender = direct_alice  # not the configured judge
    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1",
            "provider_a", owner_addr, "0xevidence", 1, "COND_1", 2, 1,
        )


def test_unsupported_action_rejected_at_policy_construction(kernel_harness):
    """TM-AUTH-002: an action_type outside the finite Kernel-v1 set must be rejected."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    with pytest.raises(Exception):
        kernel.add_policy_effect("policy-1", 99, "provider_a", 0, "", 0)  # 99 is not a Kernel-v1 action


def test_arbitrary_calldata_impossible(kernel_harness):
    """TM-AUTH-003/009: the Kernel has no method that accepts free-form calldata/selector/target."""
    kernel, gl, owner_addr, _ = kernel_harness
    assert not hasattr(kernel, "execute")
    assert not hasattr(kernel, "call")
    assert not hasattr(kernel, "delegatecall")


def test_provisional_disallowed_action_not_applied(kernel_harness):
    """Implementation Spec Section 25: PAUSE is not in the R1 provisional-safe action set and must
    not be dispatched provisionally even if registered as a PROVISIONAL-phase effect."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.add_policy_effect("policy-1", 8, "provider_a", 0, "", 0)  # PAUSE, PROVISIONAL release phase
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)

    kernel.receive_decision(
        "incident-001", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1",
        "provider_a", owner_addr, "0xevidence", 1, "COND_1", 1, 1,
    )
    assert len(dispatch_log) == 0  # PAUSE must never have been dispatched provisionally


def test_replayed_decision_is_noop(kernel_harness):
    """Invariant 8: duplicate legitimate delivery of the same decision must be a no-op."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.add_policy_effect("policy-1", 3, "provider_a", 0, "", 0)  # RESTRICT, PROVISIONAL
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)

    kernel.receive_decision(
        "incident-001", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1",
        "provider_a", owner_addr, "0xevidence", 1, "COND_1", 1, 1,
    )
    count_after_first = int(kernel.get_restriction_count(kernel.targets["target-001"].target_address, "provider_a"))
    kernel.receive_decision(
        "incident-001", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1",
        "provider_a", owner_addr, "0xevidence", 1, "COND_1", 1, 1,
    )
    count_after_replay = int(kernel.get_restriction_count(kernel.targets["target-001"].target_address, "provider_a"))
    assert count_after_first == count_after_replay == 1
    assert len(dispatch_log) == 1  # dispatched exactly once, not twice


def test_multi_incident_restriction_composition(kernel_harness):
    """TM-REC-008/Section 27: two incidents restricting the same resource -> count reaches 2."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.add_policy_effect("policy-1", 3, "provider_a", 0, "", 0)  # RESTRICT, PROVISIONAL
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a", owner_addr, "0xa", 1, "C1", 1, 1)
    kernel.receive_decision("incident-B", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a", owner_addr, "0xb", 1, "C2", 1, 1)
    target_addr = kernel.targets["target-001"].target_address
    assert int(kernel.get_restriction_count(target_addr, "provider_a")) == 2


def test_resolving_incident_a_does_not_remove_incident_b_restriction(kernel_harness):
    """TM-REC-001 (the core reason-indexed restriction invariant)."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.add_policy_effect("policy-1", 3, "provider_a", 0, "", 0)
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a", owner_addr, "0xa", 1, "C1", 1, 1)
    kernel.receive_decision("incident-B", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a", owner_addr, "0xb", 1, "C2", 1, 1)
    # Final REJECTED for incident A releases only A's own restriction (Section 26).
    kernel.receive_decision("incident-A", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a", owner_addr, "0xa", 2, "C1", 2, 1)
    target_addr = kernel.targets["target-001"].target_address
    assert int(kernel.get_restriction_count(target_addr, "provider_a")) == 1  # B still holds it


def test_strongest_state_cannot_weaken(kernel_harness):
    """TM-REC-008: once SAFE_MODE is reached via one incident, a second, weaker-effect incident
    (e.g. MONITOR) must not pull the target's displayed state back down."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.add_policy_effect("policy-1", 7, "provider_a", 0, "", 0)  # ENTER_SAFE_MODE
    kernel.add_policy_rule("policy-1", "SERVICE_FAILURE_V1", owner_addr, 1, True, 0, 0)
    kernel.add_policy_effect("policy-1", 2, "provider_b", 0, "", 0)  # MONITOR
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a", owner_addr, "0xa", 1, "C1", 1, 1)
    assert int(kernel.get_target_state("target-001")) == 3  # SAFE_MODE
    kernel.receive_decision("incident-B", "", "target-001", "policy-1", "SERVICE_FAILURE_V1", "provider_b", owner_addr, "0xb", 1, "C2", 1, 1)
    assert int(kernel.get_target_state("target-001")) == 3  # must remain SAFE_MODE


def test_authority_revoked_path(kernel_harness):
    """TM-AUTH-007: once revoked, the Kernel must refuse further decisions for that target."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)
    kernel.revoke_authority("target-001")

    with pytest.raises(Exception):
        kernel.receive_decision(
            "incident-001", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1",
            "provider_a", owner_addr, "0xevidence", 1, "COND_1", 1, 1,
        )


def test_overlay_cannot_broaden_authority(kernel_harness):
    """Section 22: disable_action/disable_resource only ever narrow authority - there is no
    corresponding enable_* method that could be used to broaden it outside the timelock path."""
    kernel, gl, owner_addr, _ = kernel_harness
    assert not hasattr(kernel, "enable_action")
    assert not hasattr(kernel, "enable_resource")


def test_overlay_can_immediately_disable_action(kernel_harness):
    """Section 22: disable_action takes effect immediately, without a policy-activation timelock."""
    kernel, gl, owner_addr, _ = kernel_harness
    kernel.disable_action("target-001", 3)  # RESTRICT, immediate - no exception expected


def test_maximum_effect_limit_bounds_dispatch(kernel_harness):
    """CLAUDE.md Section 12 / Implementation Spec Section 21: MAX_EFFECTS_PER_DECISION=4 bounds
    the effects actually dispatched for a single rule's release phase."""
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    kernel.begin_policy("target-001", "policy-1", "0xmanifest-1", 1000)
    kernel.add_policy_rule("policy-1", "PROVIDER_COMPROMISE_V1", owner_addr, 1, True, 0, 0)
    for i in range(6):
        kernel.add_policy_effect("policy-1", 3, f"resource-{i}", 0, "", 0)  # 6 RESTRICT effects, PROVISIONAL
    kernel.seal_policy("policy-1")
    kernel.activate_policy("policy-1", 1000)

    kernel.receive_decision(
        "incident-001", "", "target-001", "policy-1", "PROVIDER_COMPROMISE_V1",
        "resource-0", owner_addr, "0xevidence", 1, "COND_1", 1, 1,
    )
    assert len(dispatch_log) <= 4
