# Master Design Package

**Status:** IMPLEMENTATION BASELINE  
**Date:** 8 September 2026  
**Product:** **Reclose**  
**Product category:** Autonomous Protocol Assurance  
**Parent document:** Research Closure & Architecture Decision Record  
**Hackathon track:** Autonomous Protocols  
**Canonical Agent Tank GenLayer network:** Studio-dev, chain ID 61997  
**Project token:** not introduced; future need intentionally unresolved  
**Target:** Agent Tank submission plus post-hackathon GenLayer ecosystem product

---

# Executive Summary

**Reclose** is runtime assurance for autonomous economic systems.

It allows an agent, treasury, protocol, service router, smart account or other autonomous system to pre-authorize a bounded set of defensive actions. When something ambiguous happens in the outside world, permissionless Reporters or automated Sentinels submit evidence. GenLayer validators independently evaluate that evidence according to a policy accepted by the protected system.

The GenLayer result does not directly control the protected system.

Instead:

> **GenLayer determines what condition has been established.**

A deterministic immutable Kernel determines:

> **What that condition is allowed to cause.**

Core architecture:

```text
OUTSIDE WORLD
    |
    v
REPORTER / SENTINEL
    |
    v
EVIDENCE ARTIFACT PACKAGE
    |
    v
JUDGE MODULE
    |
    | GenLayer Optimistic Democracy
    v
DECISION RECORD
    |
    v
IMMUTABLE ASSURANCE KERNEL
    |
    | active policy + authority bounds
    v
ACTION ENVELOPE
    |
    v
TARGET ADAPTER
    |
    v
AUTONOMOUS ECONOMIC SYSTEM
    |
    +-- restrict
    +-- revoke
    +-- safe mode
    +-- pause
    +-- recovery
    +-- restore
```

Reclose's product thesis is:

> **Autonomous systems should be capable of reacting to an uncertain world without receiving uncertain authority.**

---

# BOOK I - PRODUCT

# 1. Mission

Create the standard runtime-assurance layer through which autonomous economic systems can:

1. define which external conditions matter;
2. delegate precisely bounded intervention authority;
3. obtain decentralized judgment about ambiguous evidence;
4. react without waiting for a new governance vote;
5. preserve a complete causal audit trail;
6. recover safely;
7. eventually evolve replaceable modules without expanding constitutional authority.

Long-term target users include:

- autonomous agents;
- agent marketplaces;
- agent treasuries;
- AI service networks;
- stablecoins;
- bridges;
- DeFi protocols;
- autonomous funds;
- SLA systems;
- agent-operated organizations;
- other Intelligent Contracts.

---

# 2. Core problem

Autonomous systems increasingly receive funds, permissions, API credentials, service dependencies and authority to transact.

Static smart-contract controls can determine whether an address is authorized, an amount is below a threshold or a deadline has passed.

They cannot by themselves credibly determine questions such as:

- has a provider actually been compromised?
- does current public evidence establish an active exploit?
- has a service materially failed an obligation?
- has an authorized runtime identity changed?
- has remediation genuinely occurred?
- does contradictory evidence satisfy a natural-language policy condition?

Those are judgment problems. Reclose places that narrow boundary on GenLayer.

---

# 3. Why Autonomous Protocols

AI Governance asks how humans or communities choose with AI assistance.

Reclose asks:

> **What authority has already been delegated to a protocol, and under which pre-defined external conditions may the protocol exercise it without another vote?**

Canonical loop:

```text
pre-delegated policy
  -> world changes
  -> evidence
  -> GenLayer consensus
  -> autonomous state transition
```

---

# 4. Primary users

## Protocol Operator

Needs policy authoring, target registration, monitoring, actions, audit, recovery and integrations.

## Autonomous Agent

Needs machine-readable assurance state, current provider/capability eligibility, active restrictions and recovery status.

## Security Researcher / Reporter

Needs permissionless reporting, evidence schema, bond/bounty information and incident lifecycle.

## Sentinel Operator

Needs monitoring SDK, policy feeds, evidence builders, transaction tracking and health metrics.

## Auditor / Integrator

Needs policy hashes, module identities, evidence, decision provenance, execution receipts and state-transition history.

---

# 5. Non-goals

Reclose is not primarily:

- a generalized AI wallet;
- wallet firewall;
- security-news aggregator;
- antivirus;
- oracle replacement;
- centralized SOC;
- DAO voting application;
- prediction market;
- insurance product;
- Internet Court replacement;
- agent identity standard;
- generic LLM execution engine.

---

# 6. Competitive boundary

Deterministic control:

```text
amount > daily_limit -> reject
```

Reclose:

```text
credible evidence suggests provider compromise
    -> does it satisfy PROVIDER_COMPROMISE_V1?
    -> GenLayer
    -> CONFIRMED
    -> policy maps condition to REVOKE + SAFE_MODE
```

---

# 7. Product principles

1. Judgment must genuinely be necessary.
2. AI never invents authority.
3. Restriction is easier than expansion.
4. UNDETERMINED is valid.
5. Recovery receives the same rigor as incident detection.
6. Evidence is hostile by default.
7. Machine users are equal to human users.
8. Decentralization is functional: Reclose-operated servers are not protocol authorities.

---

# BOOK II - PROTOCOL

# 8. System actors

- Target Owner
- Protected Target
- AssuranceKernel
- Judge Module
- Reporter
- Sentinel
- Target Adapter

No actor receives all roles.

---

# 9. Trust boundaries

Trusted assumptions include the correctness of GenLayer consensus according to current protocol, correct immutable Kernel deployment, correct target delegation and correct adapter enforcement.

Not inherently trusted:

- Reporter;
- Sentinel;
- Reclose backend;
- frontend;
- one validator;
- one model;
- one webpage;
- Reporter reputation;
- arbitrary Judge module;
- relayer;
- agent output;
- evidence text.

---

# 10. Core GenLayer contract topology

## AssuranceKernel

Immutable root of trust.

Responsibilities:

- target registration;
- policy registration/activation;
- authority validation;
- Judge pinning;
- active incident tracking;
- restriction composition;
- state machine;
- action generation;
- replay protection;
- provisional/final reconciliation;
- recovery;
- human override records;
- authority revocation.

No open-ended LLM reasoning.

## IncidentJudgeV1

Immutable/versioned Intelligent Contract responsible for report validation, evidence retrieval, semantic judgment, Equivalence Principle and DecisionRecord emission.

## IncentiveVault

Separate economic module for Reporter bond and optional bounties. It has no target-control authority.

## ReferenceAgentProtocol

Agent Tank reference target: autonomous service-buying agent with GEN treasury, primary/fallback providers, provider permissions, transaction limits, assurance state and Kernel authorization.

---

# 11. Reference topology

```text
Public evidence
    |
Reporter/Sentinel
    |
IncidentJudgeV1 (61997)
    |
GenLayer consensus
    |
AssuranceKernel (immutable)
    |
typed bounded action
    |
ReferenceAgentProtocol
    |
Provider A / Provider B
```

---

# 12. Kernel state

Logical state includes:

```text
targets[target_id]
policies[policy_key]
active_policy[target_id]
pending_policy[target_id]
incidents[incident_id]
restrictions[restriction_id]
processed_actions[action_id]
target_state[target_id]
audit_records
```

Large evidence is not stored in Kernel state. Evidence remains externally content-addressed and is referenced by hashes/source URIs.

---

# 13. Registration handshake

The target exposes:

```text
get_assurance_controller()
get_assurance_owner()
get_assurance_target_id()
```

Registration succeeds only if the target itself reports the Kernel, owner and target ID expected by the caller. Registration cannot be unilateral.

---

# 14. Policy lifecycle

```text
DRAFT
 -> VALIDATED OFFCHAIN
 -> PROPOSED
 -> TIMELOCK
 -> ACTIVE
 -> SUPERSEDED
```

No edit-in-place.

Authority expansion is timelocked. Immediate safety reductions use restrictive overlays or revocation.

---

# 15. Incident lifecycle

```text
CREATED
 -> PRECHECKED
 -> CONSENSUS_RUNNING
 -> ACCEPTED
 -> optional provisional containment
 -> APPEAL WINDOW
 -> FINALIZED
 -> CONFIRMED / REJECTED / UNDETERMINED
 -> ACTION / NO ACTION
 -> RECOVERY if applicable
 -> CLOSED
```

Application `UNDETERMINED` is distinct from GenLayer transaction status `Undetermined`.

---

# 16. Two-speed execution

## Provisional

Accepted-phase restriction only when explicit, reversible, idempotent, authority-reducing, non-value-moving and reconcilable.

## Final

Finality required for external execution, value movement caused by judgment, permanent changes, module promotion and final settlement.

---

# 17. Multi-incident restrictions

Capabilities are reason-indexed. Effective authority is base authority intersected with all active restrictions.

Resolving one incident never restores a capability still restricted by another.

---

# 18. Recovery

Critical recovery uses:

```text
PAUSED / SAFE_MODE
 -> remediation evidence
 -> RECOVERY
 -> post-remediation validation
 -> NORMAL
```

A timer alone cannot prove remediation.

---

# BOOK III - FORMAL DATA SCHEMAS

# 19. Autonomous Policy Manifest

Canonical external policy is RFC-8785-canonicalized JSON.

Exact large integers use decimal strings.

Logical structure:

```text
schema
policyId
version
target
authority
protectedResources
judgeModules
semanticRules
sourcePolicies
capabilities
actionBounds
stateMachine
provisionalContainment
recovery
reporting
crossChain
humanOverride
evolutionEnvelope
activation
metadata
```

Policy identity:

```text
keccak256(JCS(manifest))
```

---

# 20. Evidence Artifact Package

EAP includes:

```text
schema
targetId
policyHash
ruleId
subject
reporter
observedAt
sources[]
sourceClasses
retrievedAt
contentHashes
snapshotRefs
artifactHash
```

Source requirements are rule-specific.

---

# 21. DecisionRecord

```text
schemaVersion
incidentId
targetId
policyHash
policyVersion
ruleId
affectedResource
evidenceHash
reporter
outcome
conditionCode
reasonCodes
judgeModule
judgeVersion
decisionStage
generatedAt
```

`outcome` is exactly CONFIRMED, REJECTED or UNDETERMINED.

Confidence percentages are not enforcement inputs.

---

# 22. ActionEnvelope

```text
schemaVersion
actionId
targetId
targetAddress
incidentId
policyHash
policyVersion
resourceId
actionType
boundedParameters
decisionStage
decisionReference
nonce
expiry
```

No arbitrary calldata field.

---

# 23. ExecutionReceipt

Tracks action ID, target, adapter, parent/child transactions, execution result, pre/post-state hash, time and status.

---

# 24. ModuleManifest and EvolutionEnvelope

Every replaceable module exposes immutable identity/version/source/test/benchmark information. EvolutionEnvelope defines exactly which module types may evolve and which authority boundaries cannot be crossed.

---

# BOOK IV - GENLAYER IMPLEMENTATION

# 25. Network and toolchain

Canonical Agent Tank chain is 61997 Studio-dev using a pinned matching v0.6 RC family.

Repository maintains toolchain/network/deployment manifests. No floating latest versions for security-critical RC packages.

---

# 26. Studio limitation

The canonical hackathon path is IC-to-IC. External EVM integration is implemented/tested separately where suitable and not falsely represented as native Studio EVM execution.

---

# 27. Internal messaging

Typed IC interfaces are preferred. Security-sensitive message timing is explicit:

```text
on='accepted'
on='finalized'
```

Accepted messages must be duplicate-safe.

---

# 28. Transaction success

A transaction is not considered successful merely because it is Finalized. Reclose requires successful execution result, successful required child transactions and expected target post-state.

---

# 29. Fee engineering

Every material deployment/write/message branch receives a representative fee profile. `fee-profile.json` is committed and used with current network pricing through the SDK estimator.

---

# 30. Web strategy

Pipeline:

```text
FETCH
 -> NORMALIZE
 -> DETERMINISTIC PRECHECK
 -> FACT EXTRACTION
 -> SEMANTIC CLASSIFICATION
 -> STRUCTURED DECISION
```

Raw dynamic page equality is not an Equivalence Principle.

---

# 31. Rule strategy

Each semantic rule separates deterministic checks from nondeterministic judgment.

Initial R1 rules:

- PROVIDER_COMPROMISE_V1;
- SERVICE_FAILURE_V1;
- REMEDIATION_CONFIRMED_V1;
- RECOVERY_VALIDATED_V1.

Provider compromise returns a bounded condition such as CREDENTIAL_COMPROMISE, UNAUTHORIZED_CONTROL, MALICIOUS_SERVICE_SUBSTITUTION, ACTIVE_EXPLOITATION or SUPPLY_CHAIN_COMPROMISE.

---

# 32. Prompt structure

Fixed rule, allowed outcomes, untrusted evidence delimiter, explicit instruction not to follow evidence instructions, narrow task and strict output schema.

No free-form output controls execution.

---

# BOOK V - SECURITY

# 33. Root-of-trust minimization

AssuranceKernel has:

- no web fetch;
- no prompt;
- no arbitrary external call;
- no unlimited module delegation;
- no upgrade function.

---

# 34. Defense in depth

Target adapters validate action bounds independently of Kernel validation.

Reporter, Sentinel and frontend never possess target authority.

Policy versioning prevents silent rule mutation.

---

# 35. Cross-chain security

Only final decisions leave the GenLayer domain. Destination adapters validate trusted gateway, source domain, Kernel identity, policy, action, bounds, nonce, expiry and replay state.

---

# 36. Safe integration

Safe is the first external actuator, not the protocol core. Reclose's Safe module exposes typed actions only and never a generic `execute(target,value,data)` authority surface for assurance messages.

---

# 37. Threat matrix

Threat classes include malicious Reporter/Sentinel/evidence/source/Judge, prompt injection, stale evidence, source outage, replay, duplicate accepted messages, appeal reversal, policy compromise, target compromise, bridge compromise, fee starvation, false recovery and malicious evolution candidate.

Each is mapped to prevention, detection and recovery in the Security specification.

---

# BOOK VI - SELF-EVOLUTION

# 38. Purpose

Self-evolution is a later capability inside the architecture, not an undefined idea.

Candidate lifecycle:

```text
deficiency
 -> specification
 -> candidate
 -> static validation
 -> tests
 -> security tests
 -> benchmark
 -> invariants
 -> immutable deployment
 -> shadow
 -> canary
 -> promote / rollback
```

The Kernel is permanently outside evolution.

---

# 39. Promotion rules

Candidate promotion requires known source hash, valid manifest, interface compatibility, passing tests/benchmarks/invariants, shadow observations, canary success, unchanged authority envelope and rollback target.

Automatic rejection occurs if candidate attempts to expand authority, change ownership, modify Kernel, remove rollback or introduce unrestricted execution.

---

# BOOK VII - PRODUCT INTERFACES

# 40. Console

Primary areas:

- Overview;
- Targets;
- Policies;
- Incidents;
- Evidence;
- Recovery;
- Benchmark;
- Integrations.

The Incident Explorer is a flagship product surface.

---

# 41. Incident Explorer

Visual causal timeline:

```text
REPORT
 -> EVIDENCE
 -> GENLAYER TRANSACTION
 -> ACCEPTED
 -> PROVISIONAL ACTION
 -> APPEAL WINDOW
 -> FINAL
 -> FINAL ACTION
 -> TARGET STATE
 -> RECOVERY
```

The UI must make the distinction between evidence, GenLayer judgment, policy consequence and execution obvious.

---

# 42. Policy UX

Policy diff highlights:

- authority added;
- authority removed;
- new resource;
- new action;
- increased bound;
- Judge change;
- human override change.

Users must not approve an authority expansion without seeing that it is an authority expansion.

---

# 43. Agent API and CLI

Read interfaces expose target state, policy, incident, evidence/action trace and effective capability.

Write helpers build report/recovery/policy transactions but never custody user keys.

Canonical CLI root is:

```text
reclose
```

Example commands:

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

# 44. Sentinel

Sentinel improves liveness and may monitor sources, construct EAPs, submit reports, track transactions and export health metrics.

It never decides truth.

---

# BOOK VIII - EXTERNAL INTEGRATIONS

# 45. Base and Safe

External architecture:

```text
GenLayer final DecisionRecord
 -> Reclose Kernel
 -> gateway
 -> Base
 -> bounded Safe assurance adapter
 -> Safe
```

---

# 46. ERC-7579

Future generic smart-account adapter should use modular-account interfaces without assuming every account supports every execution mode.

---

# 47. ERC-8004

Identity, Reputation and Validation registries are complementary inputs. Reclose still owns runtime assurance and policy-triggered intervention.

---

# 48. AntSeed

Preferred early agent-service integration target where technically/product-wise appropriate. Reclose does not replace provider routing; it can determine whether a provider remains policy-authorized.

---

# 49. Hyperlane and ERC-7786

Hyperlane is the first planned transport adapter. Internal gateway abstraction follows ERC-7786 portability principles so Reclose is not bridge-locked.

---

# BOOK IX - VERIFICATION

# 50. Test layers

- deterministic Kernel;
- policy;
- evidence;
- Judge;
- Equivalence Principle;
- messages/appeals;
- multi-incident;
- economics/value transfer;
- real 61997.

---

# 51. Benchmark

Initial benchmark: at least 50 curated scenarios including genuine/false/ambiguous incidents, stale evidence, malicious evidence, prompt injection, source outages, recovery, replay and policy mismatch.

Metrics include precision, recall, false intervention, critical false-negative rate, UNDETERMINED calibration, validator disagreement, decision/execution latency, cost, replay failures and recovery correctness.

Hard release gates include zero unauthorized actions, zero duplicate economic effects, zero autonomous authority escalation, zero Kernel invariant violations and zero cross-incident erroneous restorations in the test corpus.

---

# 52. Formal invariants

At minimum:

- no action without active policy;
- no action outside policy action set;
- no autonomous authority expansion;
- no irreversible provisional action;
- one economic effect per action ID;
- resolving A cannot remove B's restriction;
- revoked Kernel cannot create future target effects;
- incompatible stale policy cannot silently execute;
- recovery cannot exceed pre-incident authority;
- evolution cannot enlarge authority envelope.

---

# BOOK X - DELIVERY

# 53. Repository shape

Canonical high-level structure:

```text
contracts/
schemas/
policies/
evidence/
packages/
sentinel/
frontend/
integrations/
tests/
benchmark/
deploy/
deployment/
toolchain/
docs/
```

Only deployable Intelligent Contracts belong in the contract discovery path.

---

# 54. Agent Tank Release R1

R1 must ship:

- AssuranceKernel;
- IncidentJudgeV1;
- ReferenceAgentProtocol;
- Provider stubs;
- IncentiveVault if stable;
- one complete APM;
- Provider Compromise, Service Failure and Remediation rules;
- real public-web evidence retrieval;
- real GenLayer judgment;
- real IC-to-IC actions;
- real test GEN economic consequence;
- recovery;
- web console;
- CLI/SDK machine interface;
- layered tests;
- 50+ scenario benchmark;
- deployment documentation.

---

# 55. Canonical demo

1. Agent operates normally with Provider A.
2. Agent spends real test GEN on Provider A.
3. Sentinel/Reporter submits compromise evidence.
4. GenLayer adjudicates.
5. Reclose restricts/revokes Provider A and enters safe mode.
6. Agent automatically continues through Provider B.
7. Remediation evidence is submitted.
8. Reclose enters RECOVERY.
9. Recovery validation succeeds.
10. Provider A is restored and target returns NORMAL.

The key product moment is continuity: the autonomous system adapts rather than merely stopping.

---

# 56. Delivery roadmap

## R1 - Agent Tank reference product

Complete native GenLayer vertical slice.

## R2 - Hardened alpha

More rules, production Sentinel, SDK/API, expanded benchmark, audit preparation.

## R3 - External economic control

Base/Safe, generic EVM adapters, cross-chain execution.

## R4 - Agentic ecosystem integrations

ERC-8004, service marketplaces, GenLayer ecosystem evidence providers.

## R5 - Autonomous evolution

EvolutionEnvelope, candidate shadow/canary/promotion/rollback.

The architecture is prepared now so these phases do not require a new thesis.

---

# 57. Business model

Core protocol remains open.

Revenue paths:

- GenLayer developer economics where applicable;
- managed Sentinel monitoring;
- policy authoring/simulation;
- enterprise console and evidence retention;
- integration/security engineering;
- audits, incident simulations and support.

No project token is required.

---

# 58. Ecosystem ambition

The goal is not simply to enter Autonomous Protocols.

The goal is for Reclose to become one of the reference answers to:

> **What does a real Autonomous Protocol on GenLayer look like?**

Reclose should ultimately expose composable state such as:

```text
getAssuranceState(target)
getActiveRestrictions(target)
getIncidents(target)
```

so other protocols can react to assurance state without repeating the original semantic judgment.

---

# 59. Implementation red lines

During implementation:

1. no arbitrary AI calldata;
2. no LLM-created authority;
3. no Kernel upgrader;
4. no hidden admin rewriting incident results;
5. no Reporter voting network underneath GenLayer;
6. no critical evidence solely from a private Reclose backend;
7. no irreversible accepted-phase action;
8. no policy edit-in-place;
9. no silent Judge upgrade;
10. no autonomous authority expansion;
11. no timer-only recovery;
12. no cross-incident erroneous restoration;
13. no treating Finalized as execution success without receipt/state verification;
14. no fake 61997 EVM execution;
15. no hardcoded v0.6 fee guess;
16. no dependency on a project token;
17. no frontend-only security;
18. no uncontrolled self-evolution.

---

# 60. Final system definition

A protected system can declare:

> I authorize this immutable Kernel. These are my protected resources. These are the circumstances I care about. These exact Judge Modules may adjudicate them. These are the only actions an incident may trigger. This is what must wait for finality. This is how restrictions interact. This is how I recover. This is how my modules may evolve. This is the authority the system can never exceed.

The product's permanent design statement is:

> **GenLayer determines the judgment. The policy determines the consequence. The Kernel enforces the boundary. The target retains sovereignty. The system may evolve, but it may never autonomously enlarge its own authority.**
