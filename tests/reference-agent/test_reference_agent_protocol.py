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


# -- C1-FINAL Section 4: exact provisional-safe action set matrix (A1-H13 closure), target layer -

@pytest.mark.parametrize("action_type,resource_id,label", [
    (2, "", "MONITOR"),
    (3, "provider_a", "RESTRICT"),
    (5, "provider_a", "REVOKE_CAPABILITY"),
    (7, "", "ENTER_SAFE_MODE"),
])
def test_target_provisional_safe_action_accepted(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie, action_type, resource_id, label):
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    direct_vm.sender = kernel_stub
    target.apply_assurance_action(f"a-safe-{label}", "i1", "p1", action_type, resource_id, 0, "", 1)  # PROVISIONAL


@pytest.mark.parametrize("action_type,resource_id,label", [
    (4, "provider_a", "THROTTLE"),
    (6, "provider_a", "REROUTE"),
    (8, "", "PAUSE"),
    (9, "", "ENTER_RECOVERY"),
    (10, "", "RESTORE"),
])
def test_target_provisional_unsafe_action_rejected(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie, action_type, resource_id, label):
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    direct_vm.sender = kernel_stub
    with pytest.raises(Exception):
        target.apply_assurance_action(f"a-unsafe-{label}", "i1", "p1", action_type, resource_id, 0, "", 1)  # PROVISIONAL


# -- C1-FINAL Section 13/19: explicit state priority, not raw enum ordering (A1-H19 closure) -----

def test_recovery_does_not_weaken_active_restrict(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    """RECOVERY(5) is numerically higher than RESTRICTED(2) but semantically WEAKER - entering
    RECOVERY must never overwrite an already-active stronger RESTRICTED state."""
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    direct_vm.sender = kernel_stub
    target.apply_assurance_action("a1", "i1", "p1", 3, "provider_a", 0, "", 2)  # FINAL RESTRICT
    assert int(target.get_state()) == 2  # RESTRICTED
    target.apply_assurance_action("a2", "i2", "p1", 9, "", 0, "", 2)  # FINAL ENTER_RECOVERY
    assert int(target.get_state()) == 2  # still RESTRICTED - not weakened to RECOVERY


def test_recovery_does_not_weaken_active_safe_mode(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    direct_vm.sender = kernel_stub
    target.apply_assurance_action("a1", "i1", "p1", 7, "", 0, "", 2)  # FINAL ENTER_SAFE_MODE
    assert int(target.get_state()) == 3  # SAFE_MODE
    target.apply_assurance_action("a2", "i2", "p1", 9, "", 0, "", 2)  # FINAL ENTER_RECOVERY
    assert int(target.get_state()) == 3  # still SAFE_MODE - not weakened


def test_monitored_does_not_weaken_active_restrict(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    direct_vm.sender = kernel_stub
    target.apply_assurance_action("a1", "i1", "p1", 3, "provider_a", 0, "", 2)  # FINAL RESTRICT
    target.apply_assurance_action("a2", "i2", "p1", 2, "", 0, "", 2)  # FINAL MONITOR
    assert int(target.get_state()) == 2  # still RESTRICTED - not weakened to MONITORED


def test_paused_cannot_be_weakened_by_any_raising_action(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    direct_vm.sender = kernel_stub
    target.apply_assurance_action("a1", "i1", "p1", 8, "", 0, "", 2)  # FINAL PAUSE
    assert int(target.get_state()) == 4  # PAUSED
    for i, (action_type, resource_id) in enumerate([(2, ""), (3, "provider_a"), (5, "provider_a"), (7, ""), (9, "")], start=2):
        target.apply_assurance_action(f"a{i}", f"i{i}", "p1", action_type, resource_id, 0, "", 2)
        assert int(target.get_state()) == 4  # PAUSED never weakened by any of these


# -- C1-FINAL Section 10: target capability handshake (new closure) ------------------------------

def test_supports_assurance_action_matrix(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    assert bool(target.supports_assurance_action(2, "")) is True   # MONITOR
    assert bool(target.supports_assurance_action(3, "provider_a")) is True   # RESTRICT
    assert bool(target.supports_assurance_action(5, "provider_a")) is True   # REVOKE_CAPABILITY
    assert bool(target.supports_assurance_action(7, "")) is True    # ENTER_SAFE_MODE
    assert bool(target.supports_assurance_action(8, "")) is True    # PAUSE
    assert bool(target.supports_assurance_action(9, "")) is True    # ENTER_RECOVERY
    assert bool(target.supports_assurance_action(10, "provider_a")) is True  # RESTORE
    assert bool(target.supports_assurance_action(4, "provider_a")) is False  # THROTTLE
    assert bool(target.supports_assurance_action(6, "provider_a")) is False  # REROUTE
    assert bool(target.supports_assurance_action(0, "")) is False   # NO_ACTION
    assert bool(target.supports_assurance_action(1, "")) is False   # ALERT


def test_throttle_is_genuinely_unsupported_by_dispatch(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    """C1-FINAL Section 10: THROTTLE is not target-executable - apply_assurance_action must reject
    it, not silently alias it to RESTRICT."""
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    direct_vm.sender = kernel_stub
    with pytest.raises(Exception):
        target.apply_assurance_action("a1", "i1", "p1", 4, "provider_a", 0, "", 2)  # FINAL THROTTLE


# -- C1-FINAL Section 16: stable error codes (new closure) ----------------------------------------

def test_stable_error_code_e_agt_007_unauthorized_kernel(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    direct_vm.sender = direct_alice
    with pytest.raises(Exception) as exc_info:
        target.apply_assurance_action("a1", "i1", "p1", 3, "provider_a", 0, "", 2)
    assert "E_AGT_007" in str(exc_info.value)


def test_stable_error_code_e_agt_008_unsupported_action(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    direct_vm.sender = kernel_stub
    with pytest.raises(Exception) as exc_info:
        target.apply_assurance_action("a1", "i1", "p1", 4, "provider_a", 0, "", 2)  # THROTTLE
    assert "E_AGT_008" in str(exc_info.value)


# -- C1-FINAL Section 17: human-override audit trail (new closure) -------------------------------

def test_controller_installation_is_audited(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(direct_owner)
    assert int(target.get_override_audit_count()) == 1
    assert "HUMAN_OVERRIDE" in target.get_override_audit_entry(0)
    assert "CONTROLLER_INSTALLATION" in target.get_override_audit_entry(0)


def test_emergency_pause_and_restore_are_audited(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    direct_vm.sender = direct_owner
    target.owner_emergency_pause()
    target.owner_restore()
    assert int(target.get_override_audit_count()) == 2
    assert "OWNER_EMERGENCY_PAUSE" in target.get_override_audit_entry(0)
    assert "OWNER_RESTORE" in target.get_override_audit_entry(1)


def test_controller_revocation_is_audited(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie)
    direct_vm.sender = direct_owner
    target.revoke_assurance_controller()
    assert int(target.get_override_audit_count()) == 1
    assert "CONTROLLER_REVOCATION" in target.get_override_audit_entry(0)


def test_owner_provider_revocation_is_audited_and_not_kernel_clearable(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob, direct_charlie):
    kernel_stub = direct_bob
    target = _deploy(direct_deploy, direct_vm, direct_owner, direct_alice, kernel_stub, direct_charlie)
    direct_vm.sender = direct_owner
    target.set_assurance_controller(kernel_stub)
    target.owner_revoke_provider("provider_a")
    assert int(target.get_override_audit_count()) == 2  # controller install + provider revoke
    assert "OWNER_PROVIDER_REVOCATION" in target.get_override_audit_entry(1)
    assert int(target.get_effective_provider()) == 2  # falls back to B

    # A Kernel RESTORE for provider_a must NOT clear the owner-level revocation.
    direct_vm.sender = kernel_stub
    target.apply_assurance_action("restore-1", "i1", "p1", 10, "provider_a", 0, "", 2)  # FINAL RESTORE
    assert int(target.get_effective_provider()) == 2  # still B - owner revocation persists
