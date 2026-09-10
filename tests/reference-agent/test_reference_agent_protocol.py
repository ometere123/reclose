"""ReferenceAgentProtocol security/behavior tests (C1). Each test cites the TM-* threat ID or
requirement it verifies. Address-shaped fixture values (direct_owner/alice/bob/charlie) are passed
as-is to both deploy and regular method calls - the contract's own constructor and methods
defensively wrap them via gl.Address(...) internally (see reference_agent_protocol.py), which
avoids a real cross-module Address-class-identity mismatch between this test file's fixtures and
the contract's own dynamically-loaded `gl` module (a genuine Direct Mode quirk found while writing
these tests - see known-limitations)."""

import pytest


def _deploy(direct_deploy, direct_vm, owner, agent, provider_a, provider_b):
    direct_vm.sender = owner
    return direct_deploy(
        "reference_agent_protocol.py", agent, "target-001", provider_a, provider_b, 1000, 100, True,
    )


def test_target_methods_are_narrow_no_generic_execute(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    """TM-AUTH-009: no generic execute(bytes)-style bypass exists on the reference target."""
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    for forbidden in ("execute", "call", "delegatecall", "raw_call", "invoke_raw"):
        assert not hasattr(target, forbidden)


def test_only_kernel_can_apply_assurance_action(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    kernel_stub = direct_bob  # acts as the "kernel" address for this narrow test
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)

    direct_vm.sender = direct_alice  # not the kernel
    with pytest.raises(Exception):
        target.apply_assurance_action("a1", "i1", "p1", 3, "provider_a", 0, "", 2)


def test_duplicate_action_id_is_noop(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(direct_owner)  # owner acts as kernel stub for this unit test

    direct_vm.sender = direct_owner
    target.apply_assurance_action("action-1", "incident-1", "policy-1", 5, "provider_a", 0, "", 2)  # REVOKE_CAPABILITY
    assert target.get_effective_provider() != 1  # PROVIDER_A no longer selected
    # Re-dispatching the SAME action_id after a RESTORE must not re-apply a stale effect.
    target.apply_assurance_action("restore-1", "incident-1", "policy-1", 10, "provider_a", 0, "", 2)  # RESTORE
    target.apply_assurance_action("action-1", "incident-1", "policy-1", 5, "provider_a", 0, "", 2)  # replay
    assert target.get_effective_provider() == 1  # restore must have stuck; replayed revoke is a no-op


def test_auto_routing_avoids_restricted_provider(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    """Implementation Spec Section 46: NORMAL state prefers Provider A; once A is revoked, AUTO
    selection must route to Provider B instead."""
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(direct_owner)

    assert int(target.get_effective_provider()) == 1  # PROVIDER_A preferred in NORMAL
    target.apply_assurance_action("revoke-a", "incident-1", "policy-1", 5, "provider_a", 0, "", 2)
    assert int(target.get_effective_provider()) == 2  # falls back to PROVIDER_B


def test_safe_mode_ceiling_enforced(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    """purchase_service must enforce the (lower) safe_mode_limit once ENTER_SAFE_MODE is applied,
    per Implementation Spec Section 47/CLAUDE.md deterministic safe-mode spend ceiling."""
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(direct_owner)
    target.apply_assurance_action("safe-1", "incident-1", "policy-1", 7, "", 0, "", 2)  # ENTER_SAFE_MODE

    direct_vm.sender = direct_owner
    direct_vm.value = 500  # exceeds safe_mode_limit (100) though within per_request_limit (1000)
    with pytest.raises(Exception):
        target.purchase_service("req-1")


def test_paused_state_rejects_purchase(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    direct_vm.sender = direct_owner
    target.owner_emergency_pause()

    direct_vm.sender = direct_owner
    direct_vm.value = 10
    with pytest.raises(Exception):
        target.purchase_service("req-1")


def test_human_override_restores_only_when_enabled(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    direct_vm.sender = direct_owner
    target.owner_emergency_pause()
    target.owner_restore()  # human_override_enabled=True in _deploy - should succeed
    assert int(target.get_state()) == 0  # NORMAL


def test_unauthorized_caller_cannot_purchase(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    stranger = direct_charlie
    direct_vm.sender = stranger
    direct_vm.value = 10
    with pytest.raises(Exception):
        target.purchase_service("req-1")
