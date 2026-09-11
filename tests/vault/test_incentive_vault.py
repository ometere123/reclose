"""IncentiveVault tests (C2 Section 33/34). Each test cites the requirement/threat it verifies."""

import pytest

OUTCOME_CONFIRMED = 1
OUTCOME_REJECTED = 2
OUTCOME_UNDETERMINED = 3


def test_module_identity(vault_harness):
    vault, gl, outcomes, claim_log = vault_harness
    assert vault.get_module_type() == "INCENTIVE_VAULT"


def test_zero_bond_policy_works(vault_harness, direct_vm, direct_owner):
    """CLAUDE.md Section 19: zero-bond policies must work."""
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner  # judge stub
    direct_vm.value = 0
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    assert int(vault.get_bond_claimable_amount("bond-1")) == 0
    assert bool(vault.is_bond_settled("bond-1")) is False


def test_only_judge_can_open_bond(vault_harness, direct_vm, direct_alice):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_alice  # not the configured judge
    with pytest.raises(Exception):
        vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")


def test_confirmed_outcome_returns_bond_plus_bounty_bounded_by_pool(vault_harness, direct_vm, direct_owner, direct_alice):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    direct_vm.value = 100
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    direct_vm.value = 0

    direct_vm.sender = direct_alice
    direct_vm.value = 50
    vault.fund_target_pool("target-001")
    direct_vm.value = 0

    outcomes["incident-1"] = OUTCOME_CONFIRMED
    vault.settle_bond("bond-1", 1000)  # ceiling exceeds pool - bounded by available 50
    assert int(vault.get_bond_claimable_amount("bond-1")) == 150  # 100 bond + 50 bounty
    assert int(vault.get_target_pool_balance("target-001")) == 0  # pool drained by the bounty


def test_rejected_outcome_returns_bond_only_no_slashing(vault_harness, direct_vm, direct_owner, direct_alice):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    direct_vm.value = 100
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    direct_vm.value = 0
    direct_vm.sender = direct_alice
    direct_vm.value = 50
    vault.fund_target_pool("target-001")
    direct_vm.value = 0

    outcomes["incident-1"] = OUTCOME_REJECTED
    vault.settle_bond("bond-1", 1000)
    assert int(vault.get_bond_claimable_amount("bond-1")) == 100  # bond only, no slashing
    assert int(vault.get_target_pool_balance("target-001")) == 50  # pool untouched


def test_undetermined_outcome_returns_bond_only_no_slashing(vault_harness, direct_vm, direct_owner):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    direct_vm.value = 100
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    direct_vm.value = 0

    outcomes["incident-1"] = OUTCOME_UNDETERMINED
    vault.settle_bond("bond-1", 1000)
    assert int(vault.get_bond_claimable_amount("bond-1")) == 100


def test_settle_rejected_before_final_outcome(vault_harness, direct_vm, direct_owner):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    with pytest.raises(Exception):
        vault.settle_bond("bond-1", 0)  # no outcome recorded yet


def test_settle_twice_rejected(vault_harness, direct_vm, direct_owner):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    outcomes["incident-1"] = OUTCOME_CONFIRMED
    vault.settle_bond("bond-1", 0)
    with pytest.raises(Exception):
        vault.settle_bond("bond-1", 0)


def test_claim_dispatches_and_is_idempotent(vault_harness, direct_vm, direct_owner):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    direct_vm.value = 100
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    direct_vm.value = 0
    outcomes["incident-1"] = OUTCOME_REJECTED
    vault.settle_bond("bond-1", 0)

    vault.claim("bond-1")
    assert len(claim_log) == 1
    with pytest.raises(Exception):
        vault.claim("bond-1")  # already claimed
    assert len(claim_log) == 1


def test_claim_requires_original_reporter(vault_harness, direct_vm, direct_owner, direct_alice):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner  # judge opens bond; reporter recorded is the caller (judge) in this design
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    outcomes["incident-1"] = OUTCOME_REJECTED
    vault.settle_bond("bond-1", 0)

    direct_vm.sender = direct_alice  # not the bond's recorded reporter
    with pytest.raises(Exception):
        vault.claim("bond-1")


def test_claim_before_settlement_rejected(vault_harness, direct_vm, direct_owner):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    with pytest.raises(Exception):
        vault.claim("bond-1")


def test_reclaim_unused_bond_before_grace_period_rejected(vault_harness, direct_vm, direct_owner):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    direct_vm.warp("2026-01-01T00:00:00Z")
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    direct_vm.warp("2026-01-02T00:00:00Z")  # only 1 day later, grace period is 7 days
    with pytest.raises(Exception):
        vault.reclaim_unused_bond("bond-1")


def test_reclaim_unused_bond_after_grace_period_succeeds(vault_harness, direct_vm, direct_owner):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    direct_vm.value = 100
    direct_vm.warp("2026-01-01T00:00:00Z")
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    direct_vm.value = 0
    direct_vm.warp("2026-01-09T00:00:00Z")  # 8 days later
    vault.reclaim_unused_bond("bond-1")
    assert int(vault.get_bond_claimable_amount("bond-1")) == 100
    assert len(claim_log) == 1


def test_reclaim_after_settled_rejected(vault_harness, direct_vm, direct_owner):
    vault, gl, outcomes, claim_log = vault_harness
    direct_vm.sender = direct_owner
    direct_vm.warp("2026-01-01T00:00:00Z")
    vault.open_bond("bond-1", "target-001", "policy-1", 1, "RULE_A", 0, "incident-1")
    outcomes["incident-1"] = OUTCOME_REJECTED
    vault.settle_bond("bond-1", 0)
    direct_vm.warp("2026-02-01T00:00:00Z")
    with pytest.raises(Exception):
        vault.reclaim_unused_bond("bond-1")
