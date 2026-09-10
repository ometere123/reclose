# Implementation Specification

**Status:** IMPLEMENTATION-READY BASELINE  
**Date:** 8 September 2026  
**Product:** **Reclose**  
**Product category:** Autonomous Protocol Assurance  
**Parent documents:** Research Closure & Architecture Decision Record; Master Design Package  
**Hackathon track:** Autonomous Protocols  
**Canonical Agent Tank network:** GenLayer Studio-dev, chain ID 61997  
**Consensus family:** v0.6 release candidate  
**Project token:** not introduced; future need intentionally unresolved

---

# PART 0 - PURPOSE AND AUTHORITY

## 0.1 Purpose

This specification defines exactly how Reclose Release R1 must be implemented.

It converts the architecture into:

- repository layout;
- contract boundaries;
- persistent state;
- method surfaces;
- enums;
- error conventions;
- policy/evidence representation;
- Judge and Equivalence Principle implementation;
- accepted/finalized message behaviour;
- provisional containment;
- final reconciliation;
- recovery;
- economic flows;
- reference autonomous agent behaviour;
- frontend;
- Sentinel;
- SDK;
- fee profiling;
- tests;
- deployment;
- demo;
- acceptance criteria.

Coding may refine organization or performance without changing these implementation contracts.

---

## 0.2 Normative language

- **MUST / MUST NOT:** mandatory.
- **SHOULD / SHOULD NOT:** expected unless documented reason.
- **MAY:** optional.

---

## 0.3 Hierarchy of authority

If sources conflict:

1. current 61997 network behaviour;
2. current matching v0.6 RC SDK/schema/linter;
3. Research Closure & ADR;
4. this Implementation Specification;
5. Master Design Package;
6. README;
7. implementation convenience.

This protects the project from stale RC examples.

---

# PART I - R1 PRODUCT DEFINITION

# 1. Objective

R1 proves this sequence with real GenLayer transactions:

```text
autonomous economic agent
 -> uses Provider A
 -> external evidence indicates compromise
 -> permissionless report
 -> GenLayer adjudicates evidence
 -> DecisionRecord
 -> immutable AssuranceKernel
 -> bounded deterministic action
 -> Provider A restricted
 -> agent automatically uses Provider B
 -> remediation evidence
 -> RECOVERY
 -> recovery validation
 -> Provider A restored
 -> NORMAL
```

---

# 2. R1 must prove

1. target registration;
2. policy creation/activation;
3. permissionless reporting;
4. public-web evidence retrieval;
5. real GenLayer non-deterministic consensus;
6. structured semantic decision;
7. CONFIRMED, REJECTED, UNDETERMINED;
8. IC-to-IC communication;
9. provisional containment where stable;
10. final intervention;
11. duplicate safety;
12. real economic consequence in test GEN;
13. fallback operation;
14. remediation and RECOVERY;
15. restoration;
16. audit trace;
17. fee profiling;
18. 61997 deployment;
19. machine-readable interaction.

---

# 3. R1 exclusions

Architecturally defined but not required for canonical hackathon transaction path:

- Safe;
- Base external execution;
- Hyperlane;
- ERC-7579;
- ERC-8004 writes;
- production AntSeed control;
- autonomous code generation/promotion;
- production truth-slashing;
- confidential evidence adjudication.

---

# PART II - TOOLCHAIN AND NETWORK

# 4. Canonical network

```text
network: studio-dev
chain ID: 61997
```

The repository MUST NOT silently use stable 61999.

---

# 5. Gate G0 - Toolchain Conformance

No implementation begins before:

1. install exact current Studio-dev compatible CLI/SDK/test/linter;
2. set studio-dev;
3. assert chain ID 61997;
4. lint/schema a smoke contract;
5. deploy smoke contract;
6. wait for finalization;
7. verify successful execution result;
8. freeze runner/dependency header and exact toolchain versions.

Files:

```text
toolchain/versions.lock
toolchain/runner.lock
toolchain/network.lock.json
```

No floating `latest` for security-critical RC packages.

---

# 6. Contract syntax authority

The exact pinned RC linter/schema is authoritative. Current documented surfaces include `gl.Contract`, persistent `TreeMap`/`DynArray`, `gl.vm.UserError`, `gl.vm.run_nondet_unsafe`, typed contract interfaces and explicit message timing.

Do not hard-code undocumented migration assumptions if the pinned RC contradicts them.

---

# PART III - REPOSITORY

# 7. Canonical structure

```text
/
|-- contracts/
|   |-- assurance_kernel.py
|   |-- incident_judge_v1.py
|   |-- incentive_vault.py
|   |-- reference_agent_protocol.py
|   |-- provider_stub_a.py
|   |-- provider_stub_b.py
|   `-- interfaces/
|-- schemas/
|-- policies/
|-- evidence/
|-- packages/
|   |-- policy-compiler/
|   |-- evidence-builder/
|   |-- protocol-sdk/
|   `-- transaction-tracker/
|-- sentinel/
|-- frontend/
|-- integrations/
|-- tests/
|-- benchmark/
|-- deploy/
|-- deployment/61997/
|-- toolchain/
|-- docs/
|-- fee-profile.json
|-- gltest.config.yaml
|-- README.md
`-- LICENSE
```

Only deployable contracts belong in the contract discovery path. No `conftest.py`, fixtures or unsupported imports under `/contracts`.

---

# PART IV - CANONICAL TYPES

# 8. Persistent type rules

Persistent fields use supported fixed-size/storage types.

Reference types:

```text
u8   enums
u16  counts
u32  versions/generations
u64  timestamps/sequences
u256 GEN/large quantities
Address addresses
str  IDs/hashes
bool flags
```

Identifiers are normalized strings. Cryptographic hashes are lowercase `0x`-prefixed hex strings.

---

# 9. Identifier policy

Allowed identifier characters:

```text
[A-Za-z0-9_.:-]+
```

Forbidden:

```text
| / \ whitespace control characters
```

Suggested hard limits:

```text
target_id <= 96
policy_key <= 96
rule_id <= 64
condition_code <= 64
resource_id <= 64
URI <= 2048
evidence JSON <= 12288 bytes
```

---

# 10. Enums

## AssuranceState

```text
0 NORMAL
1 MONITORED
2 RESTRICTED
3 SAFE_MODE
4 PAUSED
5 RECOVERY
```

## DecisionOutcome

```text
0 NONE
1 CONFIRMED
2 REJECTED
3 UNDETERMINED
```

## DecisionStage

```text
0 NONE
1 PROVISIONAL
2 FINAL
```

## RuleKind

```text
1 INCIDENT
2 REMEDIATION
3 RECOVERY_VALIDATION
```

## ActionType

```text
0 NO_ACTION
1 ALERT
2 MONITOR
3 RESTRICT
4 THROTTLE
5 REVOKE_CAPABILITY
6 REROUTE
7 ENTER_SAFE_MODE
8 PAUSE
9 ENTER_RECOVERY
10 RESTORE
```

R1 Kernel supports at least MONITOR, RESTRICT, REVOKE_CAPABILITY, ENTER_SAFE_MODE, PAUSE, ENTER_RECOVERY and RESTORE.

---

# PART V - COMMON STORAGE RECORDS

# 11. TargetRecord

```text
TargetRecord
  target_address: Address
  cached_owner: Address
  state: u8
  active_policy_key: str
  registered_at: u64
  policy_generation: u32
  authority_revoked: bool
  human_override_enabled: bool
```

---

# 12. PolicyHeader

```text
PolicyHeader
  policy_key: str
  target_id: str
  version: u32
  manifest_hash: str
  creator: Address
  created_at: u64
  activation_not_before: u64
  activated_at: u64
  sealed: bool
  active: bool
  superseded: bool
  rule_count: u16
  resource_count: u16
  effect_count: u16
  human_override_enabled: bool
```

---

# 13. PolicyRuleRecord

```text
rule_id: str
judge: Address
rule_kind: u8
provisional_allowed: bool
report_bond: u256
confirmed_bounty: u256
enabled: bool
```

---

# 14. EffectRecord

```text
action_type: u8
resource_id: str
param_u256: u256
param_str: str
release_phase: u8
enabled: bool
```

---

# 15. Incident and restriction records

Kernel incident tracks target, policy, rule, resource, Reporter, Judge, evidence hash, provisional/final outcome, condition, status and timestamps.

Restriction records are reason-indexed by incident so one incident cannot accidentally remove another incident's restriction.

---

# PART VI - ASSURANCE KERNEL

# 16. Contract

```text
contracts/assurance_kernel.py
class AssuranceKernel
```

Immutable. No web access. No LLM call. No arbitrary external call. No upgrader.

---

# 17. Constructor

Logical:

```text
__init__(
  protocol_schema_version: u16,
  minimum_policy_delay_seconds: u64
)
```

No omnipotent project admin is created.

---

# 18. Required storage

```text
protocol_schema_version
minimum_policy_delay_seconds

target_ids
targets
policy_headers
policy_rules
policy_resources
policy_effects
policy_effect_counts
owner_action_disable_generation
owner_resource_disable_generation
incidents
restrictions
restriction_counts
state_restriction_counts
processed_decisions
processed_actions
audit_sequence
audit_records
```

---

# 19. Owner authentication

For security-sensitive owner methods, Kernel queries the live target owner through a synchronous target view and requires message sender == live owner.

Cached owner is display/audit only.

---

# 20. Target registration

Logical method:

```text
register_target(
  target_id,
  target_address,
  human_override_enabled
)
```

Checks target ID, duplicate registration, target controller, target owner and target ID handshake. Initial state NORMAL.

---

# 21. Policy construction

Methods:

```text
begin_policy
add_policy_resource
add_policy_rule
add_policy_effect
seal_policy
activate_policy
```

A sealed policy is immutable.

`MAX_EFFECTS_PER_DECISION = 4` is a Kernel-v1 hard safety bound.

---

# 22. Immediate safety overlays

Instead of editing an active policy immediately:

```text
disable_action(target_id, action_type)
disable_resource(target_id, resource_id)
```

These write generation-scoped restrictive overlays.

Authority increase requires a new timelocked policy version.

---

# 23. Authority revocation

```text
revoke_authority(target_id)
```

sets `authority_revoked = true` and prevents future Kernel actions. Target independently supports direct controller revocation.

---

# 24. Decision entry point

Logical:

```text
receive_decision(
  incident_id,
  parent_incident_id,
  target_id,
  policy_key,
  rule_id,
  resource_id,
  reporter,
  evidence_hash,
  outcome,
  condition_code,
  decision_stage,
  judge_version
)
```

Kernel authenticates the configured Judge from active/pinned policy.

Duplicate legitimate delivery returns no-op success.

---

# 25. Provisional handling

Only `PROVISIONAL + CONFIRMED` may create provisional restrictions.

R1 provisional-safe actions:

```text
MONITOR
RESTRICT
REVOKE_CAPABILITY
ENTER_SAFE_MODE
```

R1 reference policy does not use provisional PAUSE.

---

# 26. Final handling

### Final CONFIRMED

Convert provisional restrictions to final restrictions without temporary unlock.

### Final REJECTED

Remove incident-specific provisional restrictions and restore only when no other active reason remains.

### Final UNDETERMINED

Remove high-impact provisional effects and apply explicit uncertainty mapping, e.g. MONITORED.

---

# 27. Restriction counting

Resource restriction count transition rules:

```text
0 -> 1 : emit restriction
1 -> 2 : no duplicate semantic action
2 -> 1 : do not restore
1 -> 0 : restoration may occur
```

This is the core multi-incident safety mechanism.

---

# 28. Remediation and recovery

`REMEDIATION_CONFIRMED` releases effects marked for remediation and enters RECOVERY while stricter effects may remain.

`RECOVERY_VALIDATED` releases remaining effects and restores NORMAL only if no unrelated active incident requires a restrictive state.

REJECTED/UNDETERMINED remediation does not restore authority.

---

# 29. Target messages

Typed interface:

```text
apply_assurance_action(
  action_id,
  incident_id,
  policy_key,
  action_type,
  resource_id,
  param_u256,
  param_str,
  decision_stage
)
```

Provisional messages use `on='accepted'` only for approved provisional-safe actions. Final actions use `on='finalized'`.

---

# PART VII - INCIDENT JUDGE V1

# 30. Contract

```text
contracts/incident_judge_v1.py
class IncidentJudgeV1
```

Constructor binds Kernel and Vault addresses plus immutable version.

---

# 31. Reporter nonce and incident ID

Reporter uses monotonically increasing nonce.

R1 incident identity is deterministic and human-debuggable:

```text
target_id + ':' + reporter + ':' + nonce
```

Evidence hash and policy key are separately bound in the stored record.

---

# 32. submit_incident

Logical:

```text
submit_incident(
  target_id,
  policy_key,
  rule_id,
  resource_id,
  evidence_hash,
  evidence_json,
  reporter_nonce,
  bond_id
) -> incident_id
```

---

# 33. Deterministic precheck order

Before any web/LLM work:

1. validate IDs/lengths;
2. verify nonce;
3. parse EAP JSON;
4. validate schema subset;
5. validate source count/URLs;
6. reject unsupported schemes/private endpoints;
7. query active Kernel policy;
8. verify rule/Judge/resource;
9. verify rule kind;
10. verify bond if required.

No nondeterministic call on deterministic failure.

---

# 34. Evidence limits

R1 defaults:

```text
MAX_EAP_JSON_BYTES = 12288
MAX_SOURCES = 4
MAX_SOURCE_URL_CHARS = 2048
MAX_SOURCE_TEXT_CHARS = 16000
```

These are JudgeV1 bounds and can change in a future Judge version without changing Kernel.

---

# 35. R1 rule registry

JudgeV1 supports exactly:

```text
PROVIDER_COMPROMISE_V1
SERVICE_FAILURE_V1
REMEDIATION_CONFIRMED_V1
RECOVERY_VALIDATED_V1
```

Arbitrary Reporter-authored executable rule text is not supported.

---

# 36. Provider compromise rule

Recognized confirmed condition codes:

```text
CREDENTIAL_COMPROMISE
UNAUTHORIZED_CONTROL
MALICIOUS_SERVICE_SUBSTITUTION
CONFIRMED_ACTIVE_EXPLOITATION
CRITICAL_SUPPLY_CHAIN_COMPROMISE
```

Admissible evidence follows rule-specific source patterns rather than generic source counts.

Leader fetches admissible sources, returns strict JSON outcome. Validator independently evaluates the same rule and evidence. Schema-only validation is forbidden.

---

# 37. Service failure

Prefer deterministic resolution where objective uptime/health data are sufficient. Invoke LLM judgment only for genuinely semantic service obligations.

---

# 38. Remediation and recovery rules

Recovery submission references the original incident. Reporter cannot redirect remediation to another target/resource.

Remediation confirms that corrective action is materially sufficient. Recovery validation confirms post-remediation conditions.

---

# 39. Judge error model

Stable prefixes:

```text
[JUDGE_INPUT]
[JUDGE_POLICY]
[JUDGE_EVIDENCE]
[JUDGE_SOURCE]
[JUDGE_LLM]
[JUDGE_BOND]
```

Expected business failures use `gl.vm.UserError` under the pinned RC.

---

# 40. Nondeterministic error handling

Leader/validator logic uses explicit `gl.vm.run_nondet_unsafe` handling for Return/UserError/VMError states where current RC supports that documented surface.

Malformed model output is not accepted as a decision.

---

# 41. Message emission

After accepted decision data is obtained, Judge emits:

```text
Kernel.emit(on='accepted').receive_decision(...)
Kernel.emit(on='finalized').receive_decision(...)
```

Kernel, not Judge, decides whether provisional policy permits action.

---

# PART VIII - INCENTIVE VAULT

# 42. Purpose

Separate economic module for Reporter bonds and optional target-funded bounties. No target-control authority.

---

# 43. Methods

```text
open_bond(target_id, policy_key, rule_id, reporter_nonce)
fund_target_pool(target_id)
settle_bond(bond_id, incident_id, outcome)
claim(bond_id, payout_address)
```

Zero-bond policy is permitted for Agent Tank demo simplicity. Vault remains implemented/tested.

---

# 44. Settlement

CONFIRMED: bond returned + available configured bounty.

REJECTED: bond returned.

UNDETERMINED: bond returned.

No truth-based slashing for ordinary good-faith false reports.

---

# PART IX - REFERENCE AUTONOMOUS AGENT

# 45. Contract

```text
contracts/reference_agent_protocol.py
```

Represents a real controlled economic system with:

- owner;
- authorized agent;
- Kernel;
- target ID;
- Provider A primary;
- Provider B fallback;
- provider authorization state;
- per-request limit;
- safe-mode limit;
- GEN treasury;
- assurance state;
- action replay map.

---

# 46. AUTO provider selection

### NORMAL

Primary if enabled, else fallback.

### RESTRICTED

Any owner+assurance-enabled approved provider.

### SAFE_MODE

Fallback only.

### PAUSED

Reject.

### RECOVERY

Fallback only until validation completes.

---

# 47. purchase_service

Checks caller, state, amount, selected provider, limits and balance, then sends finalized GEN value to provider contract's `fulfill(request_ref)`.

This gives the hackathon demo a real economic consequence.

---

# 48. apply_assurance_action

Only Kernel can call.

Duplicate action ID -> no-op.

Supported effects:

- MONITOR;
- RESTRICT;
- REVOKE_CAPABILITY(provider);
- ENTER_SAFE_MODE;
- PAUSE;
- ENTER_RECOVERY;
- RESTORE.

Target validates resource and bounds independently of Kernel.

---

# 49. Emergency owner controls

Target exposes direct:

```text
owner_emergency_pause()
revoke_assurance_controller()
```

and, if human override is enabled, explicit owner restoration. Every such action is labeled `HUMAN_OVERRIDE` in audit data.

---

# PART X - REFERENCE POLICY

# 50. Resources

```text
provider_a
provider_b
```

Rules:

```text
PROVIDER_COMPROMISE_V1
SERVICE_FAILURE_V1
REMEDIATION_CONFIRMED_V1
RECOVERY_VALIDATED_V1
```

---

# 51. Provider compromise mapping

Provisional, if enabled:

```text
CONFIRMED ->
  REVOKE_CAPABILITY(provider_a)
  ENTER_SAFE_MODE
```

Final:

```text
CONFIRMED ->
  REVOKE_CAPABILITY(provider_a) [release at recovery validated]
  ENTER_SAFE_MODE [release at remediation confirmed]
```

No direct REROUTE is required: the reference agent deterministically chooses Provider B.

---

# 52. Uncertainty mapping

Final `UNDETERMINED` maps to MONITOR only in the reference policy. It does not revoke provider authority.

---

# PART XI - ERRORS

# 53. Stable convention

```text
E_<CONTRACT>_<NUMBER>: short description
```

Examples:

```text
E_KRN_001 invalid target id
E_KRN_003 caller is not target owner
E_KRN_011 unauthorized judge
E_KRN_014 unsupported provisional action
E_JDG_001 invalid nonce
E_JDG_006 invalid evidence JSON
E_JDG_014 malformed model output
E_VLT_001 insufficient bond
E_AGT_002 protocol paused
E_AGT_007 unauthorized kernel
```

Stable code precedes mutable human text.

---

# PART XII - POLICY COMPILER

# 54. Compiler pipeline

```text
APM JSON
 -> JSON Schema validation
 -> semantic validation
 -> decimal-string normalization
 -> RFC 8785 canonicalization
 -> Keccak-256
 -> classify resources/rules/effects
 -> generate ordered Kernel calls
 -> compiled-policy.json
```

Compiler also produces a security diff classifying authority added/removed, resources/actions changed, bounds changed, Judge changed and override changed.

---

# PART XIII - FRONTEND

# 55. Frontend authority model

Frontend is non-authoritative. Security state comes from GenLayer RPC, contract reads, receipts and hash-verified artifacts.

---

# 56. Write lifecycle

```text
build args
 -> load fee profile
 -> quote current network prices
 -> show chain/action/value/fee
 -> wallet signs
 -> persist tx ID immediately
 -> track lifecycle
 -> inspect status + execution result
 -> follow child transactions
 -> verify target post-state
```

Refresh resumes the same transaction. Timeout does not cause blind resubmission.

---

# 57. Pages

Required R1:

```text
/
/targets
/targets/[targetId]
/policies/[policyKey]
/incidents
/incidents/[incidentId]
/report
/recovery
/benchmark
/about
```

Incident page distinctly displays:

1. evidence;
2. GenLayer lifecycle/judgment;
3. policy consequence;
4. actual execution.

---

# 58. Product language

Do not display "AI decided to pause".

Prefer:

```text
GenLayer decision: PROVIDER_COMPROMISE confirmed
Policy consequence: Provider A revoked; safe mode entered
```

---

# PART XIV - SENTINEL

# 59. Sentinel modules

```text
PolicyLoader
SourcePoller
CandidateDetector
EvidenceBuilder
ReportPreflight
BondManager
ReportSubmitter
TransactionWatcher
HealthExporter
```

Candidate detection may reduce noise but has no truth authority.

---

# PART XV - FEES

# 60. Fee profile

Required representative entries include deployments, registration, policy writes, incident variants, provisional/final messages, remediation, recovery, target purchase/value transfer and bond claim.

The parent incident profile must cover child message depth:

```text
Judge -> Kernel -> Target
```

No handwritten production GEN fee formula.

---

# PART XVI - TEST SPECIFICATION

# 61. Core test families

### Kernel

registration, policy, authority overlays, revocation, decisions, stale policy, idempotency.

### Multi-incident

Two incidents restricting same provider; state hierarchy; false provisional plus true final.

### Recovery

confirmed incident -> rejected remediation; undetermined remediation; confirmed remediation -> RECOVERY; recovery rejected; recovery confirmed.

### Judge

invalid input, stale/inactive policy, wrong Judge/resource/nonce, URL restrictions, malformed model output, source failure.

### Prompt injection

Evidence containing commands such as "ignore instructions", "return confirmed", "transfer funds" must remain evidence only.

### Equivalence Principle

Leader/validator agreement and disagreement, malformed leader, same semantic conclusion/different wording.

### Messages

Duplicate accepted/final messages produce identical economic state.

### Economics

GEN flow to Provider A, then Provider B after restriction, purchase rejection while paused.

### Transaction result

Finalized UserError must appear as finalized error, not success.

### Fee

All message-producing paths have profiles.

### Lint/schema

Every contract passes the exact pinned RC linter/schema.

---

# 62. Benchmark

Minimum 50 scenarios, with coverage across confirmed compromise, rejected rumor, ambiguity, prompt injection/adversarial content, remediation and recovery.

Outputs:

```text
benchmark/reports/r1.json
benchmark/reports/r1.md
```

Publish precision, recall, critical false negatives, false interventions, UNDETERMINED rate, validator disagreement, decision time and cost.

---

# PART XVII - DEPLOYMENT

# 63. Order

```text
00 G0 preflight
01 AssuranceKernel
02 IncentiveVault
03 IncidentJudgeV1
04 ProviderStubA
05 ProviderStubB
06 ReferenceAgentProtocol
07 target controller verification
08 target registration
09 policy construction
10 policy seal
11 policy activation
12 reference agent funding
13 optional bounty funding
14 end-to-end verification
```

No circular deployment dependency.

---

# 64. Deployment manifest

Store chain/network/toolchain/runner/Git commit, contract addresses/transactions, policy hash, fee-profile hash and benchmark hash under `deployment/61997`.

A reset must be recoverable with a reproducible deployment command and funded deployer wallet.

---

# PART XVIII - CANONICAL DEMO

# 65. Sequence

1. Reclose target is NORMAL; Provider A primary, Provider B fallback.
2. Agent purchases service from A with real test GEN.
3. Report submits Provider A compromise evidence.
4. GenLayer lifecycle is shown from real transaction state.
5. If stable, provisional safe mode/revocation is shown explicitly as provisional.
6. Final decision CONFIRMED.
7. Policy consequence revokes A and keeps safe mode.
8. Next AUTO request goes to B and transfers GEN to B.
9. Remediation evidence is submitted.
10. Reclose enters RECOVERY; B remains operational.
11. Recovery validation succeeds.
12. A is restored and state returns NORMAL.
13. Final AUTO purchase can use A again.

The demo must use real behaviour and never fake an appeal, EVM call or GenLayer lifecycle animation.

---

# PART XIX - MACHINE INTERFACE

# 66. SDK

Package namespace after naming lock:

```text
@reclose/protocol-sdk
@reclose/policy-compiler
@reclose/evidence-builder
@reclose/transaction-tracker
```

Core SDK methods:

```text
getTarget
getAssuranceState
getActivePolicy
getIncident
getDecision
getEffectiveProviderStatus
buildIncidentReport
buildRecoveryReport
validateAPM
hashAPM
diffAPM
trackTransaction
trackActionTrace
```

Writes remain wallet-signed. No private-key custody.

---

# 67. CLI

Canonical command:

```text
reclose
```

Examples:

```text
reclose status
reclose target inspect
reclose policy validate
reclose policy hash
reclose policy diff
reclose incident report
reclose incident inspect
reclose recovery submit
reclose sentinel run
reclose audit export
reclose benchmark run
```

---

# PART XX - EXTERNAL ADAPTERS

# 68. EVM

Only final DecisionRecords leave GenLayer for EVM execution.

Generic external ActionEnvelope contains action ID, incident ID, policy hash, typed action, resource, bounded parameter, nonce and expiry. No arbitrary calldata.

---

# 69. Safe

Safe adapter exposes typed assurance methods only, never assurance-authorized generic arbitrary execution.

---

# 70. Hyperlane

First planned cross-chain gateway implementation. It verifies trusted gateway/source Kernel/policy/action/nonce/expiry/replay. No R1 claim that 61997 currently has a production Hyperlane route.

---

# PART XXI - SELF-EVOLUTION HOOKS

# 71. R1 does not self-modify

No generated code receives R1 execution authority.

Every replaceable module should expose module type, version and manifest identity so future ModuleRegistry/EvolutionCoordinator can reason over immutable deployed candidates.

Kernel remains outside evolution permanently.

---

# PART XXII - BUILD PHASES

# 72. Phase A - Foundation

Repository, G0, toolchain locks, enums/interfaces, Kernel storage skeleton, deterministic tests.

# 73. Phase B - Policy engine

Registration, policy compiler, seal/activate, restrictive overlays, diff.

# 74. Phase C - Economic target

Providers, ReferenceAgentProtocol, funding, purchases, AUTO fallback, action interface.

# 75. Phase D - Judge

EAP parser, web fetch, four R1 rules, validators, structured outcomes, Kernel messaging.

# 76. Phase E - Incident lifecycle

Provisional/final, restrictions, stale reconciliation, multi-incident.

# 77. Phase F - Recovery

Remediation, RECOVERY, validation, restoration.

# 78. Phase G - Economics

Vault, bond, bounty, claim.

# 79. Phase H - Frontend

Dashboard, policy viewer, report, Incident Explorer, recovery, transaction trace.

# 80. Phase I - 61997

Deploy and collect real transaction/child transaction/finality/state/fee evidence.

# 81. Phase J - Benchmark/hardening

Run 50+ scenarios, freeze public Judge version and document any replacement as a new version rather than silent swap.

---

# PART XXIII - CI AND RELEASE GATES

# 82. CI jobs

```text
lint-contracts
schema-contracts
test-direct
test-kernel-state-machine
test-judge
test-consensus
test-adversarial
test-multi-incident
test-fee-profile
test-policy-schema
test-evidence-schema
frontend-typecheck
frontend-build
sdk-test
benchmark-smoke
```

---

# 83. Hard release blockers

Reclose R1 cannot ship if:

- arbitrary calldata is reachable;
- arbitrary Judge installation is possible without target authority;
- Kernel has an upgrader;
- Reporter chooses action/target method;
- target trusts non-Kernel assurance callers;
- resolving one incident restores another incident's restriction;
- duplicates duplicate economic effects;
- stale policy creates new authority effects;
- frontend treats Finalized status alone as success;
- private keys are server-custodied;
- fees are fake/hardcoded;
- 61999 is accidentally hardcoded;
- EVM execution is falsely represented as working inside Studio;
- validator checks schema only;
- UNDETERMINED is absent;
- recovery bypasses evidence;
- test helpers break contract discovery.

---

# 84. Definition of done

## Contract DoD

Lint clean, schema valid, direct/consensus tested, fee profiled, 61997 deployed/finalized successfully, source/addresses published.

## Protocol DoD

Target registration, active policy, permissionless report, Judge, Kernel decision processing, target action, duplicate safety, recovery and multi-incident safety all work.

## Product DoD

A user can understand target, policy, evidence, GenLayer judgment, policy consequence, execution and recovery without reading source.

## Agentic DoD

An agent can programmatically answer current assurance state, eligible provider, reason for restriction, provisional/final state, recovery requirement and causal transaction.

## Hackathon DoD

Canonical scenario succeeds repeatedly from clean state, deployment is reproducible, repository/public addresses/frontend/demo claims are verifiable.

---

# 85. Change control

Implementation convenience does not permit architecture drift.

Rejected without ADR reopening:

- Judge directly calling target;
- upgradeable Kernel;
- centralized backend deciding incidents;
- LLM selecting arbitrary action/address;
- ignoring finalization;
- replacing bounded typed actions with generic execution.

Allowed without ADR reopening:

- helper/file organization;
- frontend component structure;
- indexer/database choice;
- visual design;
- performance optimization;
- fixture/log organization;
- source-specific parsers.

---

# 86. Implementation authorization

Subject only to G0 confirming the live Studio-dev RC surface, this specification is sufficient to begin repository implementation.

Sequence:

```text
Research Closure & ADR        complete
Master Design Package         complete
Implementation Specification complete
Naming & Brand Decision       Reclose locked
        |
        v
Toolchain Conformance G0
        |
        v
Repository Build
        |
        v
Tests + Benchmark
        |
        v
61997 Deployment
        |
        v
Hardening / Agent Tank
        |
        v
External Integrations / Ecosystem Product
```

The permanent engineering rule is:

> **Never give non-deterministic intelligence more authority than the deterministic system can prove was delegated to it.**
