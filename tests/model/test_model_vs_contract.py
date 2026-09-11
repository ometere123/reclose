"""Model-vs-contract trace tests (C1R Section 20). Each test runs an IDENTICAL sequence of
operations against the independent pure-Python model (kernel_model.py, which does not import
contracts/assurance_kernel.py) and the real Direct Mode AssuranceKernel contract, then asserts
their resulting logical state (target_state, resource_restriction_count, incident_status) agrees
at each checkpoint. Divergence here means either the model or the real contract has drifted from
the specification - both are useful signals.

Uses `kernel_harness` (deploys ONLY the Kernel, injects target-001 directly, monkeypatches
gl.contract.get_at with a FakeTargetProxy - see tests/kernel/conftest.py for why) for the contract
side, and a freshly constructed Model for the model side.
"""

import sys

from tests.model.kernel_model import (
    Model,
    OUTCOME_CONFIRMED,
    OUTCOME_REJECTED,
    OUTCOME_UNDETERMINED,
    RULE_KIND_INCIDENT,
    RULE_KIND_REMEDIATION,
    RULE_KIND_RECOVERY_VALIDATION,
    STAGE_PROVISIONAL,
    STAGE_FINAL,
    RELEASE_REMEDIATION,
    RELEASE_RECOVERY,
)

M1 = "0x" + "1" * 64
M2 = "0x" + "2" * 64
EV_A = "0x" + "a" * 64
EV_B = "0x" + "b" * 64

CONTRACT_OUTCOME = {OUTCOME_CONFIRMED: 1, OUTCOME_REJECTED: 2, OUTCOME_UNDETERMINED: 3}
CONTRACT_STAGE = {STAGE_PROVISIONAL: 1, STAGE_FINAL: 2}
CONTRACT_RULE_KIND = {RULE_KIND_INCIDENT: 1, RULE_KIND_REMEDIATION: 2, RULE_KIND_RECOVERY_VALIDATION: 3}
CONTRACT_ACTION = {
    "MONITOR": 2, "RESTRICT": 3, "THROTTLE": 4, "REVOKE_CAPABILITY": 5, "REROUTE": 6,
    "ENTER_SAFE_MODE": 7, "PAUSE": 8, "ENTER_RECOVERY": 9, "RESTORE": 10,
}
CONTRACT_RELEASE_PHASE = {RELEASE_REMEDIATION: 1, RELEASE_RECOVERY: 2}


def _new_model(delay=60):
    m = Model(minimum_policy_delay_seconds=delay)
    return m


def _assert_states_agree(model, kernel, target_id, target_addr, resource_id=None):
    assert int(kernel.get_target_state(target_id)) == model.target_state(target_id), (
        f"target_state diverged: contract={int(kernel.get_target_state(target_id))} model={model.target_state(target_id)}"
    )
    if resource_id:
        contract_count = int(kernel.get_resource_restriction_count(target_addr, resource_id))
        model_count = model.resource_restriction_count(target_id, resource_id)
        assert contract_count == model_count, f"resource_restriction_count diverged for {resource_id}: contract={contract_count} model={model_count}"


def test_trace_provisional_confirm_dual_incident_resolution(kernel_harness, direct_vm):
    """Two incidents restrict the same resource; resolving one leaves the other's restriction in
    place, in BOTH the model and the real contract (TM-REC-001)."""
    kernel, gl, owner_addr, _ = kernel_harness
    direct_vm.warp("2026-01-01T00:00:00Z")
    owner_hex = owner_addr.as_hex
    target_addr = kernel.targets["target-001"].target_address

    model = _new_model()
    model.register_target("target-001", owner_hex, True)

    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, CONTRACT_RULE_KIND["INCIDENT"], True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", CONTRACT_ACTION["RESTRICT"], "provider_a", 0, "", CONTRACT_RELEASE_PHASE["RECOVERY"])
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    model.begin_policy("target-001", "policy-1", M1)
    model.add_policy_resource("policy-1", "provider_a")
    model.add_policy_rule("policy-1", "RULE_A", owner_hex, 1, RULE_KIND_INCIDENT, True)
    model.add_policy_effect("policy-1", "RULE_A", "RESTRICT", "provider_a", RELEASE_RECOVERY)
    model.seal_policy("policy-1")
    model.warp(120)  # matches direct_vm.warp("...T00:02:00Z") on the contract side
    model.activate_policy("policy-1")

    for incident_id, ev in (("incident-A", EV_A), ("incident-B", EV_B)):
        kernel.receive_decision(incident_id, "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, ev, CONTRACT_OUTCOME[OUTCOME_CONFIRMED], "C1", CONTRACT_STAGE[STAGE_PROVISIONAL], 1)
        model.receive_decision(incident_id, "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_hex, OUTCOME_CONFIRMED, STAGE_PROVISIONAL, 1)

    _assert_states_agree(model, kernel, "target-001", target_addr, "provider_a")
    assert int(kernel.get_resource_restriction_count(target_addr, "provider_a")) == 2

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_A, CONTRACT_OUTCOME[OUTCOME_REJECTED], "C1", CONTRACT_STAGE[STAGE_FINAL], 1)
    model.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_hex, OUTCOME_REJECTED, STAGE_FINAL, 1)

    _assert_states_agree(model, kernel, "target-001", target_addr, "provider_a")
    assert int(kernel.get_resource_restriction_count(target_addr, "provider_a")) == 1


def test_trace_final_undetermined_becomes_monitored(kernel_harness, direct_vm):
    kernel, gl, owner_addr, _ = kernel_harness
    direct_vm.warp("2026-01-01T00:00:00Z")
    owner_hex = owner_addr.as_hex
    target_addr = kernel.targets["target-001"].target_address

    model = _new_model()
    model.register_target("target-001", owner_hex, True)

    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, CONTRACT_RULE_KIND["INCIDENT"], True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", CONTRACT_ACTION["ENTER_SAFE_MODE"], "", 0, "", CONTRACT_RELEASE_PHASE["RECOVERY"])
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    model.begin_policy("target-001", "policy-1", M1)
    model.add_policy_rule("policy-1", "RULE_A", owner_hex, 1, RULE_KIND_INCIDENT, True)
    model.add_policy_effect("policy-1", "RULE_A", "ENTER_SAFE_MODE", "", RELEASE_RECOVERY)
    model.seal_policy("policy-1")
    model.warp(120)  # matches direct_vm.warp("...T00:02:00Z") on the contract side
    model.activate_policy("policy-1")

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "", owner_addr, EV_A, CONTRACT_OUTCOME[OUTCOME_CONFIRMED], "C1", CONTRACT_STAGE[STAGE_PROVISIONAL], 1)
    model.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "", owner_hex, OUTCOME_CONFIRMED, STAGE_PROVISIONAL, 1)
    _assert_states_agree(model, kernel, "target-001", target_addr)

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "", owner_addr, EV_A, CONTRACT_OUTCOME[OUTCOME_UNDETERMINED], "C1", CONTRACT_STAGE[STAGE_FINAL], 1)
    model.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "", owner_hex, OUTCOME_UNDETERMINED, STAGE_FINAL, 1)
    _assert_states_agree(model, kernel, "target-001", target_addr)
    assert int(kernel.get_target_state("target-001")) == 1  # MONITORED


def test_trace_confirmed_remediation_recovery_flow(kernel_harness, direct_vm):
    kernel, gl, owner_addr, _ = kernel_harness
    direct_vm.warp("2026-01-01T00:00:00Z")
    owner_hex = owner_addr.as_hex
    target_addr = kernel.targets["target-001"].target_address

    model = _new_model()
    model.register_target("target-001", owner_hex, True)

    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "INC", owner_addr, 1, CONTRACT_RULE_KIND["INCIDENT"], True, 0, 0)
    kernel.add_policy_effect("policy-1", "INC", CONTRACT_ACTION["RESTRICT"], "provider_a", 0, "", CONTRACT_RELEASE_PHASE["RECOVERY"])
    kernel.add_policy_rule("policy-1", "REM", owner_addr, 1, CONTRACT_RULE_KIND["REMEDIATION"], True, 0, 0)
    kernel.add_policy_rule("policy-1", "REC", owner_addr, 1, CONTRACT_RULE_KIND["RECOVERY_VALIDATION"], True, 0, 0)
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    model.begin_policy("target-001", "policy-1", M1)
    model.add_policy_resource("policy-1", "provider_a")
    model.add_policy_rule("policy-1", "INC", owner_hex, 1, RULE_KIND_INCIDENT, True)
    model.add_policy_effect("policy-1", "INC", "RESTRICT", "provider_a", RELEASE_RECOVERY)
    model.add_policy_rule("policy-1", "REM", owner_hex, 1, RULE_KIND_REMEDIATION, True)
    model.add_policy_rule("policy-1", "REC", owner_hex, 1, RULE_KIND_RECOVERY_VALIDATION, True)
    model.seal_policy("policy-1")
    model.warp(120)  # matches direct_vm.warp("...T00:02:00Z") on the contract side
    model.activate_policy("policy-1")

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "INC", "provider_a", owner_addr, EV_A, CONTRACT_OUTCOME[OUTCOME_CONFIRMED], "C1", CONTRACT_STAGE[STAGE_FINAL], 1)
    model.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "INC", "provider_a", owner_hex, OUTCOME_CONFIRMED, STAGE_FINAL, 1)
    _assert_states_agree(model, kernel, "target-001", target_addr, "provider_a")
    assert model.incident_status("incident-A") == "FINAL_CONFIRMED"

    kernel.receive_decision("rem-1", "incident-A", "target-001", "policy-1", 1, M1, "REM", "", owner_addr, EV_B, CONTRACT_OUTCOME[OUTCOME_CONFIRMED], "R1", CONTRACT_STAGE[STAGE_FINAL], 1)
    model.receive_decision("rem-1", "incident-A", "target-001", "policy-1", 1, M1, "REM", "", owner_hex, OUTCOME_CONFIRMED, STAGE_FINAL, 1)
    _assert_states_agree(model, kernel, "target-001", target_addr, "provider_a")
    assert model.incident_status("incident-A") == "RECOVERY"

    kernel.receive_decision("rec-1", "incident-A", "target-001", "policy-1", 1, M1, "REC", "", owner_addr, EV_A, CONTRACT_OUTCOME[OUTCOME_CONFIRMED], "V1", CONTRACT_STAGE[STAGE_FINAL], 1)
    model.receive_decision("rec-1", "incident-A", "target-001", "policy-1", 1, M1, "REC", "", owner_hex, OUTCOME_CONFIRMED, STAGE_FINAL, 1)
    _assert_states_agree(model, kernel, "target-001", target_addr, "provider_a")
    assert model.incident_status("incident-A") == "CLOSED"
    assert int(kernel.get_target_state("target-001")) == 0  # NORMAL


def test_trace_disabled_action_suppresses_both(kernel_harness, direct_vm):
    kernel, gl, owner_addr, dispatch_log = kernel_harness
    direct_vm.warp("2026-01-01T00:00:00Z")
    owner_hex = owner_addr.as_hex
    target_addr = kernel.targets["target-001"].target_address

    model = _new_model()
    model.register_target("target-001", owner_hex, True)

    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, CONTRACT_RULE_KIND["INCIDENT"], True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", CONTRACT_ACTION["RESTRICT"], "provider_a", 0, "", CONTRACT_RELEASE_PHASE["RECOVERY"])
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    model.begin_policy("target-001", "policy-1", M1)
    model.add_policy_resource("policy-1", "provider_a")
    model.add_policy_rule("policy-1", "RULE_A", owner_hex, 1, RULE_KIND_INCIDENT, True)
    model.add_policy_effect("policy-1", "RULE_A", "RESTRICT", "provider_a", RELEASE_RECOVERY)
    model.seal_policy("policy-1")
    model.warp(120)  # matches direct_vm.warp("...T00:02:00Z") on the contract side
    model.activate_policy("policy-1")

    kernel.disable_action("target-001", CONTRACT_ACTION["RESTRICT"])
    model.disable_action("target-001", "RESTRICT")

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_addr, EV_A, CONTRACT_OUTCOME[OUTCOME_CONFIRMED], "C1", CONTRACT_STAGE[STAGE_PROVISIONAL], 1)
    model.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "provider_a", owner_hex, OUTCOME_CONFIRMED, STAGE_PROVISIONAL, 1)

    _assert_states_agree(model, kernel, "target-001", target_addr, "provider_a")
    assert len(dispatch_log) == 0
    assert model.resource_restriction_count("target-001", "provider_a") == 0


def test_trace_resolve_weaker_first_leaves_stronger(kernel_harness, direct_vm):
    kernel, gl, owner_addr, _ = kernel_harness
    direct_vm.warp("2026-01-01T00:00:00Z")
    owner_hex = owner_addr.as_hex
    target_addr = kernel.targets["target-001"].target_address

    model = _new_model()
    model.register_target("target-001", owner_hex, True)

    kernel.begin_policy("target-001", "policy-1", M1)
    kernel.add_policy_resource("policy-1", "provider_a")
    kernel.add_policy_rule("policy-1", "RULE_A", owner_addr, 1, CONTRACT_RULE_KIND["INCIDENT"], True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_A", CONTRACT_ACTION["ENTER_SAFE_MODE"], "", 0, "", CONTRACT_RELEASE_PHASE["RECOVERY"])
    kernel.add_policy_rule("policy-1", "RULE_B", owner_addr, 1, CONTRACT_RULE_KIND["INCIDENT"], True, 0, 0)
    kernel.add_policy_effect("policy-1", "RULE_B", CONTRACT_ACTION["RESTRICT"], "provider_a", 0, "", CONTRACT_RELEASE_PHASE["RECOVERY"])
    kernel.seal_policy("policy-1")
    direct_vm.warp("2026-01-01T00:02:00Z")  # C1-FINAL Section 5/A1-H14: first policy is an expansion too
    kernel.activate_policy("policy-1")

    model.begin_policy("target-001", "policy-1", M1)
    model.add_policy_resource("policy-1", "provider_a")
    model.add_policy_rule("policy-1", "RULE_A", owner_hex, 1, RULE_KIND_INCIDENT, True)
    model.add_policy_effect("policy-1", "RULE_A", "ENTER_SAFE_MODE", "", RELEASE_RECOVERY)
    model.add_policy_rule("policy-1", "RULE_B", owner_hex, 1, RULE_KIND_INCIDENT, True)
    model.add_policy_effect("policy-1", "RULE_B", "RESTRICT", "provider_a", RELEASE_RECOVERY)
    model.seal_policy("policy-1")
    model.warp(120)  # matches direct_vm.warp("...T00:02:00Z") on the contract side
    model.activate_policy("policy-1")

    kernel.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "", owner_addr, EV_A, CONTRACT_OUTCOME[OUTCOME_CONFIRMED], "C1", CONTRACT_STAGE[STAGE_PROVISIONAL], 1)
    model.receive_decision("incident-A", "", "target-001", "policy-1", 1, M1, "RULE_A", "", owner_hex, OUTCOME_CONFIRMED, STAGE_PROVISIONAL, 1)
    kernel.receive_decision("incident-B", "", "target-001", "policy-1", 1, M1, "RULE_B", "provider_a", owner_addr, EV_B, CONTRACT_OUTCOME[OUTCOME_CONFIRMED], "C2", CONTRACT_STAGE[STAGE_PROVISIONAL], 1)
    model.receive_decision("incident-B", "", "target-001", "policy-1", 1, M1, "RULE_B", "provider_a", owner_hex, OUTCOME_CONFIRMED, STAGE_PROVISIONAL, 1)
    _assert_states_agree(model, kernel, "target-001", target_addr, "provider_a")
    assert int(kernel.get_target_state("target-001")) == 3  # SAFE_MODE

    kernel.receive_decision("incident-B", "", "target-001", "policy-1", 1, M1, "RULE_B", "provider_a", owner_addr, EV_B, CONTRACT_OUTCOME[OUTCOME_REJECTED], "C2", CONTRACT_STAGE[STAGE_FINAL], 1)
    model.receive_decision("incident-B", "", "target-001", "policy-1", 1, M1, "RULE_B", "provider_a", owner_hex, OUTCOME_REJECTED, STAGE_FINAL, 1)
    _assert_states_agree(model, kernel, "target-001", target_addr, "provider_a")
    assert int(kernel.get_target_state("target-001")) == 3  # still SAFE_MODE
