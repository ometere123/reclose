"""Pure-model adversarial tests (C1R Section 20) - no GenVM/Direct Mode dependency, run under
plain pytest. These exercise scenarios that are cheap to assert against the independent model
directly, in addition to the model-vs-contract trace tests in test_model_vs_contract.py."""

import pytest

from tests.model.kernel_model import (
    Model,
    ModelError,
    OUTCOME_CONFIRMED,
    OUTCOME_REJECTED,
    RULE_KIND_INCIDENT,
    RULE_KIND_REMEDIATION,
    STAGE_PROVISIONAL,
    STAGE_FINAL,
    RELEASE_RECOVERY,
)

M1, M2 = "0x" + "1" * 64, "0x" + "2" * 64
JUDGE = "0xjudge"
OTHER_JUDGE = "0xother"


def _fresh():
    m = Model(minimum_policy_delay_seconds=60)
    m.register_target("t1", "0xowner", True)
    return m


def test_no_action_without_active_policy():
    m = _fresh()
    with pytest.raises(ModelError):
        m.receive_decision("i1", "", "t1", "nonexistent", 1, M1, "R1", "", JUDGE, OUTCOME_CONFIRMED, STAGE_FINAL, 1)


def test_wrong_judge_rejected():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")
    with pytest.raises(ModelError):
        m.receive_decision("i1", "", "t1", "p1", 1, M1, "R1", "", OTHER_JUDGE, OUTCOME_CONFIRMED, STAGE_FINAL, 1)


def test_wrong_judge_version_rejected():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")
    with pytest.raises(ModelError):
        m.receive_decision("i1", "", "t1", "p1", 1, M1, "R1", "", JUDGE, OUTCOME_CONFIRMED, STAGE_FINAL, 2)


def test_stale_policy_key_rejected():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")
    m.begin_policy("t1", "p2", M2)
    m.seal_policy("p2")
    m.activate_policy("p2")
    with pytest.raises(ModelError):
        m.receive_decision("i1", "", "t1", "p1", 1, M1, "R1", "", JUDGE, OUTCOME_CONFIRMED, STAGE_FINAL, 1)


def test_stale_policy_version_rejected():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")
    with pytest.raises(ModelError):
        m.receive_decision("i1", "", "t1", "p1", 99, M1, "R1", "", JUDGE, OUTCOME_CONFIRMED, STAGE_FINAL, 1)


def test_stale_policy_hash_rejected():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")
    with pytest.raises(ModelError):
        m.receive_decision("i1", "", "t1", "p1", 1, M2, "R1", "", JUDGE, OUTCOME_CONFIRMED, STAGE_FINAL, 1)


def test_exact_replay_is_noop():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_resource("p1", "r")
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.add_policy_effect("p1", "R1", "RESTRICT", "r", RELEASE_RECOVERY)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")
    args = ("i1", "", "t1", "p1", 1, M1, "R1", "r", JUDGE, OUTCOME_CONFIRMED, STAGE_PROVISIONAL, 1)
    m.receive_decision(*args)
    m.receive_decision(*args)  # exact duplicate
    assert m.resource_restriction_count("t1", "r") == 1


def test_conflicting_replay_rejected():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_resource("p1", "r")
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.add_policy_effect("p1", "R1", "RESTRICT", "r", RELEASE_RECOVERY)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")
    m.receive_decision("i1", "", "t1", "p1", 1, M1, "R1", "r", JUDGE, OUTCOME_CONFIRMED, STAGE_PROVISIONAL, 1)
    with pytest.raises(ModelError):
        m.receive_decision("i1", "", "t1", "p1", 1, M1, "R1", "r", JUDGE, OUTCOME_REJECTED, STAGE_PROVISIONAL, 1)


def test_same_count_action_substitution_is_expansion():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.add_policy_effect("p1", "R1", "MONITOR", "", RELEASE_RECOVERY)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")

    m.begin_policy("t1", "p2", M2)
    m.add_policy_rule("p2", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.add_policy_effect("p2", "R1", "PAUSE", "", RELEASE_RECOVERY)
    m.seal_policy("p2")
    with pytest.raises(ModelError):
        m.activate_policy("p2")  # must be timelocked (expansion)


def test_removal_is_reduction():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_resource("p1", "r")
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.add_policy_effect("p1", "R1", "RESTRICT", "r", RELEASE_RECOVERY)
    m.add_policy_effect("p1", "R1", "MONITOR", "", RELEASE_RECOVERY)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")

    m.begin_policy("t1", "p2", M2)
    m.add_policy_resource("p2", "r")
    m.add_policy_rule("p2", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.add_policy_effect("p2", "R1", "RESTRICT", "r", RELEASE_RECOVERY)
    m.seal_policy("p2")
    m.activate_policy("p2")  # no exception - reduction is immediate


def test_more_than_four_effects_for_one_rule_rejected():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    for i in range(4):
        m.add_policy_resource("p1", f"r{i}")
        m.add_policy_effect("p1", "R1", "RESTRICT", f"r{i}", RELEASE_RECOVERY)
    m.add_policy_resource("p1", "r4")
    with pytest.raises(ModelError):
        m.add_policy_effect("p1", "R1", "RESTRICT", "r4", RELEASE_RECOVERY)


def test_remediation_requires_parent_final_confirmed():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "INC", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.add_policy_rule("p1", "REM", JUDGE, 1, RULE_KIND_REMEDIATION, True)
    m.seal_policy("p1")
    m.warp(120)
    m.activate_policy("p1")
    # incident never confirmed - remediation must be rejected
    with pytest.raises(ModelError):
        m.receive_decision("rem-1", "no-such-incident", "t1", "p1", 1, M1, "REM", "", JUDGE, OUTCOME_CONFIRMED, STAGE_FINAL, 1)


def test_model_first_policy_with_effect_requires_timelock():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_resource("p1", "r")
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.add_policy_effect("p1", "R1", "RESTRICT", "r", RELEASE_RECOVERY)
    m.seal_policy("p1")
    with pytest.raises(ModelError):
        m.activate_policy("p1")
    m.warp(60)
    m.activate_policy("p1")


def test_model_first_policy_no_effects_activates_immediately():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.seal_policy("p1")
    m.activate_policy("p1")  # no exception


def test_model_confirmed_bounty_decrease_is_reduction():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True, 0, 100)
    m.seal_policy("p1")
    m.warp(60)
    m.activate_policy("p1")

    m.begin_policy("t1", "p2", M2)
    m.add_policy_rule("p2", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True, 0, 50)
    m.seal_policy("p2")
    m.activate_policy("p2")  # no exception


def test_model_confirmed_bounty_increase_is_expansion():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True, 0, 50)
    m.seal_policy("p1")
    m.warp(60)
    m.activate_policy("p1")

    m.begin_policy("t1", "p2", M2)
    m.add_policy_rule("p2", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True, 0, 100)
    m.seal_policy("p2")
    with pytest.raises(ModelError):
        m.activate_policy("p2")


def test_model_report_bond_change_is_expansion():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True, 10, 0)
    m.seal_policy("p1")
    m.warp(60)
    m.activate_policy("p1")

    m.begin_policy("t1", "p2", M2)
    m.add_policy_rule("p2", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True, 5, 0)
    m.seal_policy("p2")
    with pytest.raises(ModelError):
        m.activate_policy("p2")


def test_model_registration_rejects_wrong_owner():
    m = Model(minimum_policy_delay_seconds=60)
    with pytest.raises(ModelError):
        m.register_target("t1", "0xowner", True, caller="0xsomeoneelse")


def test_model_registration_rejects_wrong_controller():
    m = Model(minimum_policy_delay_seconds=60)
    with pytest.raises(ModelError):
        m.register_target("t1", "0xowner", True, reported_controller_matches=False)


def test_model_registration_rejects_target_id_mismatch():
    m = Model(minimum_policy_delay_seconds=60)
    with pytest.raises(ModelError):
        m.register_target("t1", "0xowner", True, reported_target_id="different-id")


def test_model_registration_rejects_already_revoked_target():
    m = Model(minimum_policy_delay_seconds=60)
    with pytest.raises(ModelError):
        m.register_target("t1", "0xowner", True, reported_revoked=True)


def test_model_receive_decision_rejects_target_side_revocation():
    m = _fresh()
    m.begin_policy("t1", "p1", M1)
    m.add_policy_rule("p1", "R1", JUDGE, 1, RULE_KIND_INCIDENT, True)
    m.seal_policy("p1")
    m.warp(60)
    m.activate_policy("p1")
    m.target_side_revoke("t1")
    with pytest.raises(ModelError):
        m.receive_decision("i1", "", "t1", "p1", 1, M1, "R1", "", JUDGE, OUTCOME_CONFIRMED, STAGE_FINAL, 1)
