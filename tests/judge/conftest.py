"""Direct Mode helpers for hardened IncidentJudgeV1."""

import json
import sys
import pytest
from eth_utils import keccak

SOURCE_URL = "https://status.example.com/incident"
SOURCE_ID = "status-source"
SOURCE_CLASS = "AUTHORITATIVE_PUBLIC"


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def hash_obj(value):
    return "0x" + keccak(text=canonical_json(value)).hex()


def make_registry():
    registry = {
        "schema": "reclose-source-registry-v1",
        "sources": [{
            "sourceId": SOURCE_ID,
            "canonicalOrigin": "https://status.example.com",
            "sourceClass": SOURCE_CLASS,
            "ruleIds": [
                "PROVIDER_COMPROMISE_V1",
                "SERVICE_FAILURE_V1",
                "REMEDIATION_CONFIRMED_V1",
                "RECOVERY_VALIDATED_V1",
            ],
            "enabled": True,
        }],
    }
    return registry, hash_obj(registry)


def build_eap(reporter, policy_hash, rule_id="PROVIDER_COMPROMISE_V1", text="fallback text", subject="provider incident", **overrides):
    source = {
        "sourceId": SOURCE_ID,
        "url": SOURCE_URL,
        "sourceClass": SOURCE_CLASS,
        "extractedText": text,
        "contentHash": "0x" + keccak(text=text).hex(),
        "snapshotRef": "",
        "retrievedAt": "2026-09-11T20:01:00.000Z",
    }
    eap = {
        "schema": "reclose-eap-v1",
        "targetId": "target-001",
        "policyHash": policy_hash,
        "ruleId": rule_id,
        "subject": subject,
        "reporter": reporter,
        "observedAt": "2026-09-11T20:00:00.000Z",
        "sources": [source],
        "sourceClasses": [SOURCE_CLASS],
        "retrievedAt": "2026-09-11T20:01:00.000Z",
        "contentHashes": [source["contentHash"]],
        "snapshotRefs": [""],
    }
    eap.update(overrides)
    eap["artifactHash"] = hash_obj(eap)
    return eap


@pytest.fixture(autouse=True)
def _fix_llm_mock_json_passthrough():
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


class FakeKernelVaultProxy:
    def __init__(self, config, judge_addr, decision_log):
        self.config = config
        self.judge_addr = judge_addr
        self.decision_log = decision_log

    def view(self):
        return self

    def get_target_policy_identity(self, target_id):
        return (self.config["policy_key"], self.config["policy_version"], self.config["policy_hash"])

    def get_policy_rule(self, policy_key, rule_id):
        return (
            self.judge_addr,
            self.config["judge_version"],
            self.config["rule_kind"],
            self.config["provisional_allowed"],
            True,
        )

    def get_policy_rule_economics(self, policy_key, rule_id):
        return (self.config["report_bond"], self.config["confirmed_bounty"])

    def is_policy_resource(self, policy_key, resource_id):
        return resource_id in self.config["resources"]

    def verify_open_bond(self, bond_id, reporter, target_id, policy_key, policy_version, rule_id, reporter_nonce, incident_id, expected_amount):
        return bool(self.config["bond_valid"]) and int(expected_amount) == int(self.config["report_bond"])

    def emit(self, **kwargs):
        phase = kwargs.get("on")
        if phase not in {"decided", "finalized"}:
            raise ValueError(f"phase {phase!r} is not accepted by the pinned EmitInternalMessage ABI")
        self.config.setdefault("emit_phases", []).append(phase)
        return self

    def mark_bond_consumed(self, bond_id, incident_id):
        self.decision_log.append({"_bond_consumed": True, "bond_id": bond_id, "incident_id": incident_id})

    def receive_decision(self, incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome, condition_code, decision_stage, judge_version):
        self._record_decision(incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome, condition_code, decision_stage, judge_version)

    def receive_provisional_decision(self, incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome, condition_code, judge_version):
        self._record_decision(incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome, condition_code, 1, judge_version)

    def receive_final_decision(self, incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome, condition_code, judge_version):
        self._record_decision(incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome, condition_code, 2, judge_version)

    def _record_decision(self, incident_id, parent_incident_id, target_id, policy_key, policy_version, policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome, condition_code, decision_stage, judge_version):
        self.decision_log.append({
            "incident_id": incident_id,
            "parent_incident_id": parent_incident_id,
            "target_id": target_id,
            "policy_key": policy_key,
            "policy_hash": policy_hash,
            "rule_id": rule_id,
            "resource_id": resource_id,
            "evidence_hash": evidence_hash,
            "outcome": int(outcome),
            "condition_code": condition_code,
            "decision_stage": int(decision_stage),
            "judge_version": int(judge_version),
        })


@pytest.fixture
def judge_harness(direct_deploy, direct_owner, direct_alice):
    registry, registry_hash = make_registry()
    judge = direct_deploy("incident_judge_v1.py", direct_alice, 1, registry_hash, canonical_json(registry))
    mod = sys.modules[type(judge).__module__]
    gl = mod.gl
    judge.set_vault(direct_owner)

    decision_log = []
    config = {
        "policy_key": "policy-1",
        "policy_version": 1,
        "policy_hash": "0x" + "1" * 64,
        "rule_kind": 1,
        "judge_version": 1,
        "provisional_allowed": True,
        "resources": {"provider_a", "provider_b"},
        "report_bond": 0,
        "confirmed_bounty": 0,
        "bond_valid": True,
        "emit_phases": [],
    }
    proxy = FakeKernelVaultProxy(config, judge.address, decision_log)
    original = gl.contract.get_at
    gl.contract.get_at = lambda _addr: proxy
    yield judge, gl, decision_log, config
    gl.contract.get_at = original
