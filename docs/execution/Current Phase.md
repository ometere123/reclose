Current phase: C2 (IncidentJudgeV1, IncentiveVault, EAP/rule families, live Studio-dev proof)
  complete on branch claude/r1-consensus (head 205dff3). C3 (SDK/tracker/policy compiler/
  evidence builder/CLI/Sentinel/fee profiling/deployment automation/operations runbook) is
  IN PROGRESS on branch claude/r1-tooling, per the owner's Master Execution Directive (continue
  without stopping for permission between phases; the only mandatory stop is S1, or a genuine
  hard technical boundary per CLAUDE.md Section 47).

C2 closure summary (commits fdcf64d, c7e97bf, 1ade0ee, eec684c, 97484f2, 63e0958, 61d6b0f,
  205dff3):
  - IncidentJudgeV1: real semantic adjudicator for PROVIDER_COMPROMISE_V1/SERVICE_FAILURE_V1/
    REMEDIATION_CONFIRMED_V1/RECOVERY_VALIDATED_V1. Deterministic EAP precheck (bounded JSON,
    HTTPS-only/private-IP-blocked source URLs, governed ADR-011 source classes), nondeterministic
    judgment via gl.eq_principle.strict_eq (real web fetch + real gl.nondet.exec_prompt inside the
    re-executed closure, never a schema-only check), strict per-rule condition-code registry,
    UNDETERMINED handled as a first-class honest outcome.
  - IncentiveVault: bond/target-bounty-pool/settle/claim/reclaim, zero target-control authority,
    ordinary REJECTED/UNDETERMINED never truth-slashed.
  - Kernel deterministic read views for the Judge (get_target_policy_identity/get_policy_rule/
    get_policy_header/is_policy_resource/get_incident_summary/get_incident_final_outcome).
  - Judge/Vault circular-construction dependency resolved via a one-time owner-gated set_vault().
  - Full Direct Mode test suite: 184/184 passing (tests/judge/, tests/vault/, plus the full prior
    C1-FINAL suite).
  - Live Studio-dev (chain 61997) proof: full fresh C2 contract stack deployed, wired
    (set_vault/set_assurance_controller/register_target), and a real policy (policy-c2-002) sealed
    and activated binding all three Judge rule_ids. See deployment/61997/c2-manifest.json and
    docs/execution/C2 Live Proof Evidence.md.
  - HONEST OPEN FINDING (not fabricated as resolved): Judge -> Kernel receive_decision dispatch
    fails live with SystemError: 2: inval (an AllocationTreeMalformed-class GenVM/Studio-dev
    runtime limitation, the same class already documented for the Kernel -> Target hop in A1's
    known-limitations.md item 2, now recurring one hop earlier). The Judge's own deterministic
    precheck, real web fetch, and real eq_principle LLM judgment ARE live-proven; cross-contract
    decision dispatch to the Kernel remains proven only via Direct Mode, carried as
    MITIGATED/UNVERIFIED (not VERIFIED) in Requirements Status.csv (PRD-INC-002/PRD-INC-009).
  - Also fixed two live-deployment-only CLI scalar-coercion findings in incident_judge_v1.py
    (int-coerced 0x+hex hash args; JSON-shaped string args auto-parsed into objects) using the
    same _normalize_*_arg pattern already established in assurance_kernel.py.

Next: C3 tooling build-out on claude/r1-tooling, then A2 checkpoint (stop for external audit,
  do not self-PASS) before D1-D4/I1-I2 frontend.
