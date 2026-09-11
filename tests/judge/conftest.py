"""Direct Mode test helpers for IncidentJudgeV1 (C2). Same one-contract-per-test-function
limitation as tests/kernel/conftest.py applies - deploys ONLY the Judge, monkeypatches
gl.contract.get_at with a FakeKernelProxy that answers the deterministic read views
(get_target_policy_identity/get_policy_rule/is_policy_resource) and records receive_decision
calls, so the Judge's OWN precheck/judgment/dispatch logic is proven without a second live
contract. Live Studio-dev deployment remains the proof of the real cross-contract wire format."""

import sys
import pytest


@pytest.fixture(autouse=True)
def _fix_llm_mock_json_passthrough():
    """genlayer-test 0.30.0rc2's Direct Mode _handle_llm_request auto-json.loads()'s any
    JSON-shaped mock_llm() string before wrapping it as {"ok": ...} - but the exact pinned
    py-lib-genlayer-std's exec_prompt(response_format='json') decode path
    (genlayer/nondet/__init__.py::_decode_nondet_json) requires 'ok' to be RAW TEXT, which IT
    then json.loads()'s itself. This is a confirmed Direct-Mode-vs-exact-pinned-SDK mismatch
    (same class of issue as genvm-lint's stale @allow_storage rule found earlier this program) -
    verified by direct inspection of both sources. Monkeypatches the harness's internal
    _handle_llm_request for the duration of Judge tests to preserve raw text, matching real
    pinned-SDK behavior, rather than weakening the contract to work around a test-tool bug."""
    from gltest.direct import wasi_mock

    original = wasi_mock._handle_llm_request

    def _patched(vm, data):
        prompt = data.get("prompt", "")
        response = vm._match_llm_mock(prompt)
        if response is not None:
            return {"ok": response}
        return original(vm, data)

    wasi_mock._handle_llm_request = _patched
    yield
    wasi_mock._handle_llm_request = original


class FakeKernelProxy:
    def __init__(self, judge_addr, policy_key, policy_version, policy_hash, rule_kind, judge_version, provisional_allowed, resources, decision_log):
        self._judge_addr = judge_addr
        self._policy_key = policy_key
        self._policy_version = policy_version
        self._policy_hash = policy_hash
        self._rule_kind = rule_kind
        self._judge_version = judge_version
        self._provisional_allowed = provisional_allowed
        self._resources = resources
        self._decision_log = decision_log

    def view(self):
        return self

    def get_target_policy_identity(self, target_id):
        return (self._policy_key, self._policy_version, self._policy_hash)

    def get_policy_rule(self, policy_key, rule_id):
        return (self._judge_addr, self._judge_version, self._rule_kind, self._provisional_allowed, True)

    def is_policy_resource(self, policy_key, resource_id):
        return resource_id in self._resources

    def emit(self, **kwargs):
        return self

    def receive_decision(self, incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome, condition_code, decision_stage, judge_version):
        self._decision_log.append({
            "incident_id": incident_id,
            "parent_incident_id": parent_incident_id,
            "target_id": target_id,
            "outcome": outcome,
            "condition_code": condition_code,
            "decision_stage": decision_stage,
        })

    def open_bond(self, bond_id, target_id, policy_key, policy_version, rule_id, reporter_nonce, incident_id):
        self._decision_log.append({
            "_bond_open": True,
            "bond_id": bond_id,
            "target_id": target_id,
            "incident_id": incident_id,
        })


@pytest.fixture
def judge_harness(direct_deploy, direct_owner):
    """Deploys a fresh IncidentJudgeV1 and monkeypatches gl.contract.get_at with a
    FakeKernelProxy. Returns (judge, gl, decision_log, kernel_config) where kernel_config is a
    dict a test can mutate (policy_key/rule_kind/etc) before the FIRST call that reads it."""
    kernel_addr_placeholder = None

    def _make(policy_key="policy-1", policy_version=1, policy_hash="0x" + "1" * 64, rule_kind=1, judge_version=1, provisional_allowed=True, resources=None):
        resources = resources if resources is not None else {"provider_a", "provider_b"}
        kernel_stub_addr = None  # filled in after deploy, since judge address itself is the kernel arg target here
        return {
            "policy_key": policy_key, "policy_version": policy_version, "policy_hash": policy_hash,
            "rule_kind": rule_kind, "judge_version": judge_version, "provisional_allowed": provisional_allowed,
            "resources": resources or set(),
        }

    judge = direct_deploy("incident_judge_v1.py", direct_owner, 1, "0x" + "2" * 64)
    mod = sys.modules[type(judge).__module__]
    gl = mod.gl
    judge.set_vault(direct_owner)  # placeholder vault address for tests that don't exercise bonds

    decision_log = []
    config = _make()

    orig_get_at = gl.contract.get_at
    gl.contract.get_at = lambda addr: FakeKernelProxy(
        judge.address, config["policy_key"], config["policy_version"], config["policy_hash"],
        config["rule_kind"], config["judge_version"], config["provisional_allowed"], config["resources"],
        decision_log,
    )

    yield judge, gl, decision_log, config

    gl.contract.get_at = orig_get_at
