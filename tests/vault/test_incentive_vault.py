"""A2 economic security tests for IncentiveVault."""

import pytest

CONFIRMED = 1
REJECTED = 2
UNDETERMINED = 3


def open_required_bond(vault, direct_vm, reporter, amount=100, incident_id="incident-1", bond_id="bond-1"):
    direct_vm.sender = reporter
    direct_vm.value = amount
    vault.open_bond(bond_id, "target-001", "policy-1", 1, "PROVIDER_COMPROMISE_V1", 0, incident_id)
    direct_vm.value = 0


def test_module_identity(vault_harness):
    vault, _gl, _state, _transfers = vault_harness
    assert vault.get_module_type() == "INCENTIVE_VAULT"


def test_reporter_opens_own_bond_and_identity_is_preserved(vault_harness, direct_vm, direct_alice):
    vault, _gl, state, _transfers = vault_harness
    open_required_bond(vault, direct_vm, direct_alice)
    assert vault.get_bond_reporter("bond-1").as_bytes == direct_alice
    assert vault.verify_open_bond("bond-1", direct_alice, "target-001", "policy-1", 1, "PROVIDER_COMPROMISE_V1", 0, "incident-1", 100)


def test_bond_amount_must_exactly_match_policy(vault_harness, direct_vm, direct_alice):
    vault, _gl, state, _transfers = vault_harness
    state["report_bond"] = 100
    direct_vm.sender = direct_alice
    direct_vm.value = 99
    with pytest.raises(Exception):
        vault.open_bond("bond-low", "target-001", "policy-1", 1, "PROVIDER_COMPROMISE_V1", 0, "incident-low")
    direct_vm.value = 101
    with pytest.raises(Exception):
        vault.open_bond("bond-high", "target-001", "policy-1", 1, "PROVIDER_COMPROMISE_V1", 0, "incident-high")
    direct_vm.value = 0


def test_zero_bond_policy_rejects_unnecessary_vault_bond(vault_harness, direct_vm, direct_alice):
    vault, _gl, state, _transfers = vault_harness
    state["report_bond"] = 0
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with pytest.raises(Exception):
        vault.open_bond("bond-1", "target-001", "policy-1", 1, "PROVIDER_COMPROMISE_V1", 0, "incident-1")


def test_duplicate_bond_rejected(vault_harness, direct_vm, direct_alice):
    vault, _gl, _state, _transfers = vault_harness
    open_required_bond(vault, direct_vm, direct_alice)
    direct_vm.value = 100
    with pytest.raises(Exception):
        vault.open_bond("bond-1", "target-001", "policy-1", 1, "PROVIDER_COMPROMISE_V1", 0, "incident-1")
    direct_vm.value = 0


def test_only_judge_can_consume_bond(vault_harness, direct_vm, direct_alice, direct_owner):
    vault, _gl, _state, _transfers = vault_harness
    open_required_bond(vault, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        vault.mark_bond_consumed("bond-1", "incident-1")
    direct_vm.sender = direct_owner
    vault.mark_bond_consumed("bond-1", "incident-1")
    assert not vault.verify_open_bond("bond-1", direct_alice, "target-001", "policy-1", 1, "PROVIDER_COMPROMISE_V1", 0, "incident-1", 100)


def test_confirmed_bounty_is_policy_derived_not_caller_controlled(vault_harness, direct_vm, direct_alice, direct_owner):
    vault, _gl, state, _transfers = vault_harness
    state["confirmed_bounty"] = 50
    open_required_bond(vault, direct_vm, direct_alice)
    direct_vm.sender = direct_owner
    direct_vm.value = 1000
    vault.fund_target_pool("target-001")
    direct_vm.value = 0
    state["outcomes"]["incident-1"] = CONFIRMED
    # No bounty argument exists. Any caller obtains the same immutable policy-derived result.
    direct_vm.sender = direct_owner
    vault.settle_bond("bond-1")
    assert int(vault.get_bond_claimable_amount("bond-1")) == 150
    assert int(vault.get_target_pool_balance("target-001")) == 950


def test_confirmed_bounty_is_capped_by_available_pool(vault_harness, direct_vm, direct_alice, direct_owner):
    vault, _gl, state, _transfers = vault_harness
    state["confirmed_bounty"] = 500
    open_required_bond(vault, direct_vm, direct_alice)
    direct_vm.sender = direct_owner
    direct_vm.value = 25
    vault.fund_target_pool("target-001")
    direct_vm.value = 0
    state["outcomes"]["incident-1"] = CONFIRMED
    vault.settle_bond("bond-1")
    assert int(vault.get_bond_claimable_amount("bond-1")) == 125
    assert int(vault.get_target_pool_balance("target-001")) == 0


@pytest.mark.parametrize("outcome", [REJECTED, UNDETERMINED])
def test_rejected_and_undetermined_return_bond_only_without_slashing(vault_harness, direct_vm, direct_alice, direct_owner, outcome):
    vault, _gl, state, _transfers = vault_harness
    open_required_bond(vault, direct_vm, direct_alice)
    direct_vm.sender = direct_owner
    direct_vm.value = 75
    vault.fund_target_pool("target-001")
    direct_vm.value = 0
    state["outcomes"]["incident-1"] = outcome
    vault.settle_bond("bond-1")
    assert int(vault.get_bond_claimable_amount("bond-1")) == 100
    assert int(vault.get_target_pool_balance("target-001")) == 75


def test_settlement_requires_final_kernel_outcome(vault_harness, direct_vm, direct_alice):
    vault, _gl, _state, _transfers = vault_harness
    open_required_bond(vault, direct_vm, direct_alice)
    with pytest.raises(Exception):
        vault.settle_bond("bond-1")


def test_settlement_is_once_only(vault_harness, direct_vm, direct_alice):
    vault, _gl, state, _transfers = vault_harness
    open_required_bond(vault, direct_vm, direct_alice)
    state["outcomes"]["incident-1"] = REJECTED
    vault.settle_bond("bond-1")
    with pytest.raises(Exception):
        vault.settle_bond("bond-1")


def test_claim_submits_exactly_one_external_value_transfer(vault_harness, direct_vm, direct_alice):
    vault, _gl, state, transfers = vault_harness
    open_required_bond(vault, direct_vm, direct_alice)
    state["outcomes"]["incident-1"] = REJECTED
    vault.settle_bond("bond-1")
    direct_vm.sender = direct_alice
    vault.claim("bond-1")
    assert len(transfers) == 1
    assert transfers[0]["address"].as_bytes == direct_alice
    assert transfers[0]["value"] == 100
    with pytest.raises(Exception):
        vault.claim("bond-1")
    assert len(transfers) == 1


def test_claim_requires_original_reporter(vault_harness, direct_vm, direct_alice, direct_owner):
    vault, _gl, state, _transfers = vault_harness
    open_required_bond(vault, direct_vm, direct_alice)
    state["outcomes"]["incident-1"] = REJECTED
    vault.settle_bond("bond-1")
    direct_vm.sender = direct_owner
    with pytest.raises(Exception):
        vault.claim("bond-1")


def test_reclaim_before_grace_rejected(vault_harness, direct_vm, direct_alice):
    vault, _gl, _state, _transfers = vault_harness
    direct_vm.warp("2026-01-01T00:00:00Z")
    open_required_bond(vault, direct_vm, direct_alice)
    direct_vm.warp("2026-01-02T00:00:00Z")
    with pytest.raises(Exception):
        vault.reclaim_unused_bond("bond-1")


def test_reclaim_after_grace_requires_no_final_outcome(vault_harness, direct_vm, direct_alice):
    vault, _gl, state, _transfers = vault_harness
    direct_vm.warp("2026-01-01T00:00:00Z")
    open_required_bond(vault, direct_vm, direct_alice)
    direct_vm.warp("2026-01-09T00:00:00Z")
    state["outcomes"]["incident-1"] = REJECTED
    with pytest.raises(Exception):
        vault.reclaim_unused_bond("bond-1")


def test_orphaned_bond_reclaim_after_grace_submits_single_transfer(vault_harness, direct_vm, direct_alice):
    vault, _gl, state, transfers = vault_harness
    direct_vm.warp("2026-01-01T00:00:00Z")
    open_required_bond(vault, direct_vm, direct_alice)
    direct_vm.warp("2026-01-09T00:00:00Z")
    assert state["outcomes"].get("incident-1", 0) == 0
    vault.reclaim_unused_bond("bond-1")
    assert len(transfers) == 1
    assert transfers[0]["value"] == 100
