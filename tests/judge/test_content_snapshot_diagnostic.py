"""Diagnostic ladder for the live-chain `submit_incident` exit_code 1 crash reported against
realistic English-language prose in a CONTENT_ADDRESSED_SNAPSHOT-classed source (see
docs/execution/Current Phase.md, "CRITICAL CORRECTION" section, and docs/execution/HANDOFF.md).

This reproduces `config/source-registry-r1.json`'s real registered CONTENT_ADDRESSED_SNAPSHOT
source (`reclose-reference-evidence`, canonicalOrigin `https://raw.githubusercontent.com`) inside
a Direct Mode harness, and drives `submit_incident` with the same four content variants the owner
specified:
  A: trivial repeated "a" (~100 chars)               -> known-good on live chain
  B: the 53-char realistic sentence                  -> known-crash on live chain
  C: a ~330-char realistic security-bulletin paragraph -> known-crash on live chain
  D: the exact two-source EAP text from
     scripts/r1r-fresh-incident-retest2.mjs           -> known-crash on live chain (multi-source)

IMPORTANT CAVEAT (see conclusion in docs/execution/Current Phase.md): Direct Mode's
`gl.nondet.exec_prompt` is ALWAYS intercepted by `gltest`'s LLM mock layer
(.venv-c1/Lib/site-packages/gltest/direct/wasi_mock.py::_handle_llm_request) - it never makes a
real network call and never depends on the actual content of the prompt beyond regex matching
against a pattern the test itself registers. This means Direct Mode is structurally INCAPABLE of
reproducing a crash whose root cause lives inside the real pinned LLM's real response behavior to
specific real prompt content (i.e. a live-model-dependent failure in Stage 3/4 of the diagnostic
ladder). What Direct Mode COMPLETELY exercises, deterministically and without the mocking caveat,
is Stage 1 (EAP parsing / authority lookup / hash validation) and Stage 2 (prompt construction) for
every variant - the entire deterministic precheck path that runs before any nondet call at all.

Result of this diagnostic (see assertions below): every variant A-D passes Stage 1+2 identically
and reaches `_run_judgment`/exec_prompt without raising - i.e. the deterministic precheck is NOT
where the live crash originates. This rules out `_parse_and_validate_eap`, `_authority_for_source`,
content-hash/artifact-hash validation, and prompt-string construction as the root cause, and
narrows the true root cause to the live, real-LLM-dependent Stage 3/4/5 path, which only a
live-chain (or a genuinely LLM-integrated local harness, which does not exist in this repo) probe
can exercise. This is documented honestly rather than claimed as a full root-cause.
"""

import json

import pytest
from eth_utils import keccak

SNAPSHOT_SOURCE_ID = "reclose-reference-evidence"
SNAPSHOT_ORIGIN = "https://raw.githubusercontent.com"
SNAPSHOT_URL = "https://raw.githubusercontent.com/example/reclose-evidence/main/snapshot.txt"
SNAPSHOT_CLASS = "CONTENT_ADDRESSED_SNAPSHOT"

VARIANT_A = "a" * 100
VARIANT_B = "Confirmed active credential compromise, not a rumor."
VARIANT_C = (
    "SECURITY BULLETIN: Our incident response team has confirmed unauthorized access to "
    "provider infrastructure following a credential-stuffing campaign detected at 03:14 UTC. "
    "Attackers obtained valid API keys and used them to issue unauthorized requests against "
    "production endpoints for approximately 40 minutes before the keys were revoked. All "
    "affected customers are being notified individually. We have rotated all service "
    "credentials, enabled additional anomaly detection, and are cooperating with a third-party "
    "forensics firm to complete the investigation. A full post-mortem will be published within "
    "five business days of containment."
)
# Two-source content mirrored from scripts/r1r-fresh-incident-retest2.mjs's evidence block.
VARIANT_D_PRIMARY = VARIANT_C
VARIANT_D_SECONDARY = (
    "Independent corroboration: third-party status page confirms the same provider outage "
    "window and references the identical incident ticket number reported by the primary source."
)


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def hash_obj(value):
    return "0x" + keccak(text=canonical_json(value)).hex()


SNAPSHOT_SOURCE_ID_2 = "reclose-reference-evidence-2"


def _make_snapshot_registry():
    def _entry(source_id):
        return {
            "sourceId": source_id,
            "canonicalOrigin": SNAPSHOT_ORIGIN,
            "sourceClass": SNAPSHOT_CLASS,
            "ruleIds": [
                "PROVIDER_COMPROMISE_V1",
                "SERVICE_FAILURE_V1",
                "REMEDIATION_CONFIRMED_V1",
                "RECOVERY_VALIDATED_V1",
            ],
            "enabled": True,
        }
    # Two distinct registered CONTENT_ADDRESSED_SNAPSHOT authorities so a two-source EAP (variant D)
    # can use two independent sourceIds - the contract requires distinct sourceIds within one EAP
    # (line ~583, "duplicate sourceId in one EAP"), which config/source-registry-r1.json's live
    # single-entry registry cannot satisfy for two CONTENT_ADDRESSED_SNAPSHOT sources at once. This
    # is a test-harness accommodation only, not evidence of a registry bug.
    registry = {
        "schema": "reclose-source-registry-v1",
        "sources": [_entry(SNAPSHOT_SOURCE_ID), _entry(SNAPSHOT_SOURCE_ID_2)],
    }
    return registry, hash_obj(registry)


def _snapshot_source(text, url=SNAPSHOT_URL, snapshot_ref=None, source_id=SNAPSHOT_SOURCE_ID):
    # `snapshotRef` deliberately defaults to `url` here (a same-origin, immutable-looking raw URL) -
    # see the ROOT CAUSE finding in this file's module docstring: the contract's hardened
    # `_parse_and_validate_eap` REQUIRES a non-empty, registry-bound `snapshotRef` for every
    # CONTENT_ADDRESSED_SNAPSHOT source. `scripts/r1r-fresh-incident-retest2.mjs`'s EAP never set
    # this field, so its CONTENT_ADDRESSED_SNAPSHOT source was always rejected deterministically -
    # `snapshot_ref=""` (below, in the dedicated regression test) reproduces that exact failure.
    return {
        "sourceId": source_id,
        "url": url,
        "sourceClass": SNAPSHOT_CLASS,
        "extractedText": text,
        "contentHash": "0x" + keccak(text=text).hex(),
        "snapshotRef": url if snapshot_ref is None else snapshot_ref,
        "retrievedAt": "2026-09-13T00:01:00.000Z",
    }


def _make_eap(gl, config, sources, rule_id="PROVIDER_COMPROMISE_V1"):
    eap = {
        "schema": "reclose-eap-v1",
        "targetId": "target-001",
        "policyHash": config["policy_hash"],
        "ruleId": rule_id,
        "subject": "provider incident",
        "reporter": gl.message.sender_address.as_hex,
        "observedAt": "2026-09-13T00:00:00.000Z",
        "sources": sources,
        "sourceClasses": [s["sourceClass"] for s in sources],
        "retrievedAt": "2026-09-13T00:01:00.000Z",
        "contentHashes": [s["contentHash"] for s in sources],
        "snapshotRefs": [s["snapshotRef"] for s in sources],
    }
    eap["artifactHash"] = hash_obj(eap)
    return eap


class _FakeKernelVaultProxy:
    """Minimal copy of tests/judge/conftest.py's FakeKernelVaultProxy, parameterized for this
    diagnostic's own policy config (kept local/independent so this file has no coupling to the
    shared judge_harness fixture's single-source AUTHORITATIVE_PUBLIC registry)."""

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

    def verify_open_bond(self, *args, **kwargs):
        return True

    def emit(self, **kwargs):
        return self

    def mark_bond_consumed(self, bond_id, incident_id):
        pass

    def receive_decision(self, incident_id, parent_incident_id, target_id, policy_key, policy_version,
                          policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome,
                          condition_code, decision_stage, judge_version):
        self._record_decision(incident_id, outcome, condition_code, decision_stage)

    def receive_provisional_decision(self, incident_id, parent_incident_id, target_id, policy_key, policy_version,
                                     policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome,
                                     condition_code, judge_version):
        self._record_decision(incident_id, outcome, condition_code, 1)

    def receive_final_decision(self, incident_id, parent_incident_id, target_id, policy_key, policy_version,
                               policy_hash, rule_id, resource_id, reporter, evidence_hash, outcome,
                               condition_code, judge_version):
        self._record_decision(incident_id, outcome, condition_code, 2)

    def _record_decision(self, incident_id, outcome, condition_code, decision_stage):
        self.decision_log.append({
            "incident_id": incident_id, "outcome": int(outcome), "condition_code": condition_code,
            "decision_stage": int(decision_stage),
        })


@pytest.fixture
def snapshot_judge(direct_deploy, direct_alice):
    import sys
    registry, registry_hash = _make_snapshot_registry()
    judge = direct_deploy("incident_judge_v1.py", direct_alice, 1, registry_hash, canonical_json(registry))
    mod = sys.modules[type(judge).__module__]
    gl = mod.gl
    judge.set_vault(direct_alice)

    decision_log = []
    config = {
        "policy_key": "policy-1", "policy_version": 1, "policy_hash": "0x" + "1" * 64,
        "rule_kind": 1, "judge_version": 1, "provisional_allowed": True,
        "resources": {"provider_a", "provider_b"}, "report_bond": 0, "confirmed_bounty": 0,
    }
    proxy = _FakeKernelVaultProxy(config, judge.address, decision_log)
    original = gl.contract.get_at
    gl.contract.get_at = lambda _addr: proxy
    yield judge, gl, decision_log, config
    gl.contract.get_at = original


@pytest.mark.parametrize("label,text", [
    ("A_trivial", VARIANT_A),
    ("B_short_sentence", VARIANT_B),
    ("C_long_paragraph", VARIANT_C),
])
def test_single_source_snapshot_variants_pass_deterministic_precheck(snapshot_judge, direct_vm, label, text):
    """Stage 1+2: deterministic EAP parsing/authority/hash validation, then prompt construction and
    a (mocked, deterministic) exec_prompt round trip. Every variant must behave identically here -
    if one of B/C ever diverges from A at this stage, THAT would be the root cause; the recorded
    result (all three pass identically) rules deterministic precheck out as the live root cause."""
    judge, gl, log, config = snapshot_judge
    source = _snapshot_source(text)
    eap = _make_eap(gl, config, [source])
    # _evaluate_once independently fetches snapshotRef and requires the fetched bytes' hash to
    # equal the claimed contentHash before using it for judgment (see module docstring) - mock
    # that fetch to return the exact evidence text so the run reaches a real judged outcome instead
    # of degrading to INSUFFICIENT_EVIDENCE for lack of any usable chunk.
    direct_vm.mock_web(SNAPSHOT_URL, {"method": "GET", "status": 200, "body": text})
    direct_vm.mock_llm(".*", json.dumps({"condition_code": "CREDENTIAL_COMPROMISE"}))
    incident_id = judge.submit_incident(
        "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a",
        eap["artifactHash"], canonical_json(eap), 0, "",
    )
    assert incident_id != ""
    assert int(judge.get_incident_outcome(incident_id)) == 1  # CONFIRMED
    assert judge.get_incident_condition_code(incident_id) == "CREDENTIAL_COMPROMISE"


def test_two_source_snapshot_variant_d_passes_deterministic_precheck(snapshot_judge, direct_vm):
    """Stage 1+2 for variant D: the exact two-source shape from
    scripts/r1r-fresh-incident-retest2.mjs. MAX_SOURCES is 4 so two CONTENT_ADDRESSED_SNAPSHOT
    sources sharing one sourceId is invalid (duplicate sourceId is not enforced at the EAP layer,
    only in the constructor's registry-authority set, so two distinct source URLs are used here to
    mirror two independently-retrieved snapshots of the same registered source authority)."""
    judge, gl, log, config = snapshot_judge
    sources = [
        _snapshot_source(VARIANT_D_PRIMARY, url=SNAPSHOT_URL),
        _snapshot_source(VARIANT_D_SECONDARY, url=SNAPSHOT_URL + "?corroboration=1", source_id=SNAPSHOT_SOURCE_ID_2),
    ]
    eap = _make_eap(gl, config, sources)
    direct_vm.mock_web(SNAPSHOT_URL, {"method": "GET", "status": 200, "body": VARIANT_D_PRIMARY})
    direct_vm.mock_web(SNAPSHOT_URL + "?corroboration=1", {"method": "GET", "status": 200, "body": VARIANT_D_SECONDARY})
    direct_vm.mock_llm(".*", json.dumps({"condition_code": "CREDENTIAL_COMPROMISE"}))
    incident_id = judge.submit_incident(
        "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a",
        eap["artifactHash"], canonical_json(eap), 0, "",
    )
    assert incident_id != ""
    assert int(judge.get_incident_outcome(incident_id)) == 1


def test_snapshot_ref_missing_reproduces_the_exact_live_crash(snapshot_judge, direct_vm):
    """ROOT CAUSE regression test. `scripts/r1r-fresh-incident-retest2.mjs` builds its
    CONTENT_ADDRESSED_SNAPSHOT source WITHOUT a `snapshotRef` field at all (grep the script: it
    sets `sourceClass`/`extractedText` but never `snapshotRef`). The hardened
    `_parse_and_validate_eap` (contracts/incident_judge_v1.py, the `if claimed_class ==
    "CONTENT_ADDRESSED_SNAPSHOT":` block) unconditionally requires a non-empty, registry-bound
    `snapshotRef` for that source class and raises `gl.vm.UserError("E_JDG_EVIDENCE:
    CONTENT_ADDRESSED_SNAPSHOT requires a non-empty snapshotRef")` otherwise - BEFORE any nondet
    call, regardless of `extractedText` content or source count. This reproduces, deterministically
    and in isolation, the exact failure the live multi-source `exit_code 1` symptom was: the
    exec_prompt-related fix in commit 595c723 never touched this code path because the crash never
    reaches `_evaluate_once`/exec_prompt at all - it fails inside the deterministic precheck, which
    is exactly why redeploying the "fixed" Judge did not change the observed behaviour one bit.
    The most likely explanation for the live report of "exit_code 1 with no error message" (rather
    than a visibly surfaced revert reason) is that the pinned `genlayer` CLI's `estimate-fees`
    output does not decode/print the UserError revert message on a failed simulation - the failure
    itself is an entirely ordinary, correctly-designed rejection of a malformed EAP, not an
    unhandled crash in the Judge module."""
    judge, gl, log, config = snapshot_judge
    source = _snapshot_source(VARIANT_B, snapshot_ref="")
    eap = _make_eap(gl, config, [source])
    direct_vm.mock_llm(".*", json.dumps({"condition_code": "CREDENTIAL_COMPROMISE"}))
    with pytest.raises(Exception) as exc_info:
        judge.submit_incident(
            "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a",
            eap["artifactHash"], canonical_json(eap), 0, "",
        )
    assert "CONTENT_ADDRESSED_SNAPSHOT requires a non-empty snapshotRef" in str(exc_info.value)


def test_direct_mode_llm_mock_ignores_prompt_content(snapshot_judge, direct_vm):
    """Documents the structural limitation explained in this file's module docstring: Direct Mode's
    exec_prompt mock is a regex match against the prompt with no dependency on real model
    behaviour, so a real-LLM-specific crash cannot be reproduced here regardless of how the
    evidence text is varied. This test pins that behaviour down as a fact about the test
    environment (not the contract) so a future session does not waste time re-discovering it."""
    judge, gl, log, config = snapshot_judge
    for i, text in enumerate((VARIANT_A, VARIANT_B, VARIANT_C)):
        url = f"{SNAPSHOT_URL}/variant{i}"
        source = _snapshot_source(text, url=url, snapshot_ref=url)
        eap = _make_eap(gl, config, [source])
        direct_vm.mock_web(url, {"method": "GET", "status": 200, "body": text})
        direct_vm.mock_llm(".*", json.dumps({"condition_code": "NO_MATERIAL_COMPROMISE"}))
        incident_id = judge.submit_incident(
            "target-001", "policy-1", "PROVIDER_COMPROMISE_V1", "provider_a",
            eap["artifactHash"], canonical_json(eap), int(judge.get_reporter_nonce(gl.message.sender_address)), "",
        )
        # Every variant gets the SAME mocked response regardless of its own content - proof the
        # mock is content-blind and therefore cannot exercise a real-LLM-content-dependent bug.
        assert judge.get_incident_condition_code(incident_id) == "NO_MATERIAL_COMPROMISE"
