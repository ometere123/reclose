# Research Closure & Architecture Decision Record

**Status:** RESEARCH CLOSED / ARCHITECTURE BASELINE LOCKED  
**Date:** 8 September 2026  
**Product:** **Reclose**  
**Product category:** Autonomous Protocol Assurance  
**Hackathon track:** Autonomous Protocols  
**Canonical hackathon GenLayer network:** Chain ID 61997  
**Token:** no project token introduced; future necessity intentionally unresolved  
**Next governing document:** Master Design Package

---

# 0. Purpose

This document closes the broad exploratory research phase for Reclose and establishes the architecture decisions that subsequent design and implementation must follow.

Its purpose is to prevent the project from entering a loop of research, partial implementation, structural contradiction, redesign and rebuild. The research phase therefore resolves the structural questions before implementation:

- what problem Reclose solves;
- why the problem belongs on GenLayer;
- where GenLayer should and should not be used;
- what authority an autonomous protocol may exercise;
- how authority is bounded;
- how evidence enters the system;
- how ambiguity is adjudicated;
- how accepted and finalized decisions differ;
- how actions execute;
- how appeals reconcile provisional effects;
- how recovery works;
- how policies change;
- how modules evolve;
- how self-evolution can exist without self-expanding authority;
- how watchers operate;
- how external chains and smart accounts fit;
- how the product fails safely;
- how it becomes an ecosystem primitive rather than a one-off hackathon application.

An ADR may be reopened only under the reopening policy in this document.

---

# 1. Research closure conclusion

The research supports proceeding with Reclose.

Reclose is a reusable **Autonomous Protocol Assurance** system.

Its core proposition is:

> **Autonomous economic systems need a neutral mechanism for determining when ambiguous changes in the outside world justify changing their operating behaviour.**

The core flow is:

```text
evidence
  -> GenLayer judgment
  -> bounded deterministic policy
  -> autonomous intervention
  -> verification
  -> recovery
```

The central architectural rule is:

> **GenLayer determines the judgment. Deterministic policy determines what that judgment is allowed to cause.**

GenLayer's current builder guidance recommends the network where an application needs a shared state-changing decision involving evidence, judgment or ambiguity and validators can independently check the material. It recommends deterministic code or ordinary backends where those conditions do not apply.

Primary reference:
https://docs.genlayer.com/developers/intelligent-contracts/when-to-use-genlayer

Reclose therefore does not use GenLayer as a generic AI brain, chatbot, deterministic policy engine, arbitrary transaction generator, monitoring backend or replacement for ordinary authorization.

---

# 2. Research basis

Research closure was based on five source groups.

## 2.1 GenLayer primary material

The design was checked against current documentation covering:

- when to use GenLayer;
- Optimistic Democracy;
- Equivalence Principle;
- accepted and finalized execution;
- Intelligent Contract messaging;
- IC-to-IC communication;
- EVM interaction;
- Studio limitations;
- Studio-dev chain 61997;
- Consensus v0.6 migration;
- fees and fee profiling;
- web evidence;
- prompt injection;
- keeper/liveness roles;
- upgradability;
- testing;
- economic model.

Current documentation identifies Studio-dev as chain ID **61997**, distinct from stable Studionet 61999, and treats the v0.6 release-candidate stack as a coherent family.

References:

- https://docs.genlayer.com/developers/consensus-v06-migration
- https://docs.genlayer.com/developers/intelligent-contracts/features/messages
- https://docs.genlayer.com/developers/intelligent-contracts/features/interacting-with-intelligent-contracts
- https://docs.genlayer.com/developers/intelligent-contracts/features/upgradability
- https://docs.genlayer.com/developers/intelligent-contracts/security-and-best-practices/prompt-injection

## 2.2 Existing GenLayer ecosystem systems

The ecosystem repeatedly demonstrates the same pattern:

> deterministic mechanisms around a narrow consensus-critical judgment.

Internet Court, Uptime, AntSeed, MergeProof, BuildersClaw and related products reinforce the idea that GenLayer should own the difficult judgment boundary rather than every application function.

## 2.3 Agentic-economy research

Current research identifies permissioning, observability, recovery, prompt injection, compromised keys and runtime policy enforcement as central trust boundaries for autonomous agents.

Useful references:

- https://arxiv.org/abs/2601.04583
- https://arxiv.org/abs/2607.00245
- https://arxiv.org/abs/2603.16586

## 2.4 Runtime assurance and safety research

The design aligns with the safety-engineering pattern of separating a high-performance intelligent controller from a more constrained safety controller. Reclose applies the same idea economically: semantic judgment can be flexible, but authority remains deterministic and bounded.

## 2.5 Standards and mature infrastructure

The architecture was compared with:

- RFC 8785 JSON Canonicalization;
- ERC-7579 modular smart accounts;
- ERC-7786 cross-chain gateway abstraction;
- ERC-8004 agent identity/reputation/validation;
- Safe Modules/Guards;
- Hyperlane modular interchain security;
- OPA-style policy decision/enforcement separation.

---

# 3. Foundational invariants

## INV-001 - No authority by implication

Reclose may exercise only capabilities explicitly delegated by the protected target. Anything not expressly authorized is denied.

## INV-002 - Judgment and enforcement remain separate

Non-deterministic judgment never directly produces arbitrary execution instructions. A structured judgment crosses the consensus boundary; deterministic code maps it to an authorized response.

## INV-003 - No arbitrary AI-generated calldata

An LLM may never generate unconstrained executable calldata for another contract.

## INV-004 - Authority cannot autonomously expand itself

A system may optimize how it uses existing authority. It may not grant itself additional authority.

## INV-005 - The constitutional Kernel cannot rewrite itself

The root enforcement contract is immutable. Autonomous evolution occurs only through versioned replaceable modules.

## INV-006 - Uncertainty is valid

The system must support `UNDETERMINED`. A model is never forced to manufacture certainty.

## INV-007 - Uncertainty cannot create unlimited intervention

By default, a final `UNDETERMINED` result cannot create a new high-impact final action. Any precautionary uncertainty response must have been explicitly authorized beforehand.

## INV-008 - Irreversible actions require finality

Asset movement, permanent configuration change, cross-chain execution, authority expansion and upgrades cannot execute from provisional consensus.

## INV-009 - Provisional execution can only reduce risk

An accepted-but-not-finalized decision may cause action only when the target opted in and the action is reversible, idempotent, authority-reducing, non-value-moving and guaranteed to be reconciled at finality.

## INV-010 - Every execution is attributable

Every autonomous action must resolve to:

```text
target
  -> policy version
  -> rule
  -> evidence package
  -> GenLayer decision
  -> action
  -> execution result
  -> resulting state
```

## INV-011 - Stale policy cannot create new authority effects

A decision produced under an obsolete policy may reconcile effects already created under that policy, but cannot silently create new authority under a newer incompatible policy.

## INV-012 - Duplicate delivery cannot duplicate economic effect

Every receiver must be idempotent.

## INV-013 - Permission revocation is faster than expansion

Removing authority may be immediate. Increasing authority requires delayed activation.

## INV-014 - Recovery is explicit

Absence of new bad evidence is not proof that a previous incident has ended.

## INV-015 - External source data is hostile by default

Webpages, reports, agent text and external evidence are potentially adversarial inputs.

## INV-016 - Critical evidence must be independently assessable

A private proprietary backend cannot be the sole source supporting a critical autonomous intervention.

## INV-017 - Frontend state is not authoritative

The UI explains protocol state. It does not determine protocol state.

## INV-018 - Finalized is not synonymous with successful execution

Application completion requires the relevant lifecycle stage, successful execution result, successful required child transactions and verified target post-state.

---

# 4. Architecture Decision Register

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Reclose product category and system boundary | LOCKED |
| ADR-002 | GenLayer owns semantic judgment, not arbitrary execution | LOCKED |
| ADR-003 | Bounded autonomy and fail-closed design | LOCKED |
| ADR-004 | Target sovereignty and delegated authority | LOCKED |
| ADR-005 | Chain 61997 as canonical Agent Tank environment | LOCKED |
| ADR-006 | Immutable Kernel + versioned Judge architecture | LOCKED |
| ADR-007 | IC -> IC canonical hackathon execution | LOCKED |
| ADR-008 | Two-speed provisional/final intervention | LOCKED |
| ADR-009 | Transaction success and child-message lifecycle | LOCKED |
| ADR-010 | Autonomous Policy Manifest | LOCKED |
| ADR-011 | Evidence Artifact Package | LOCKED |
| ADR-012 | Equivalence Principle and judgment schema | LOCKED |
| ADR-013 | Capability-bounded actions | LOCKED |
| ADR-014 | Operational state machine | LOCKED |
| ADR-015 | Recovery architecture | LOCKED |
| ADR-016 | Permissionless reporting and Sentinels | LOCKED |
| ADR-017 | Reporter economics | LOCKED |
| ADR-018 | Appeals | LOCKED |
| ADR-019 | Human override and target sovereignty | LOCKED |
| ADR-020 | Upgrade architecture | LOCKED |
| ADR-021 | Bounded self-evolution | LOCKED |
| ADR-022 | Cross-chain architecture | LOCKED |
| ADR-023 | Safe/Base/ERC-7579 integration path | LOCKED |
| ADR-024 | ERC-8004 interoperability | LOCKED |
| ADR-025 | Ecosystem composability | LOCKED |
| ADR-026 | Fee engineering | LOCKED |
| ADR-027 | Security testing and benchmark strategy | LOCKED |
| ADR-028 | Audit/provenance model | LOCKED |
| ADR-029 | Business and protocol model | LOCKED |
| ADR-030 | Parameter governance | LOCKED |
| Brand | Product name is Reclose | LOCKED |
| Token | No project token introduced; future need intentionally unresolved | DEFERRED |

---

# ADR-001 - Product category and system boundary

## Decision

Reclose is a reusable **Autonomous Protocol Assurance** protocol.

It enables autonomous economic systems to modify behaviour safely in response to ambiguous, externally observable conditions.

## Boundary

Conventional policy can answer deterministic questions such as whether a spender is within a limit or an address is authorized. Reclose addresses semantic runtime questions such as whether evidence establishes that a dependency is compromised, remediation occurred, or an external obligation materially failed.

## Rejected alternatives

- agent wallet guardrails as the core category;
- generic AI cybersecurity;
- AI Governance;
- Onchain Justice as the primary category;
- ordinary oracle infrastructure.

These may be adjacent or complementary, but they do not define Reclose.

---

# ADR-002 - GenLayer owns semantic judgment, not arbitrary execution

GenLayer is used only for the consensus-critical semantic decision. The Intelligent Contract returns a bounded structured DecisionRecord. The deterministic Kernel decides what that record permits.

Bad architecture:

```text
LLM -> "send funds / pause X / call Y" -> execute
```

Reclose architecture:

```text
GenLayer -> condition CONFIRMED
policy -> condition maps to predefined restriction
Kernel -> enforce bounded action
```

---

# ADR-003 - Bounded autonomy and fail-closed design

Every autonomous component operates inside an authority envelope.

Unknown action, stale policy, malformed DecisionRecord, invalid source or unsupported state transition fails closed.

Fail-closed means "do not perform an action whose authority/correctness cannot be established." It does not automatically mean maximum shutdown.

---

# ADR-004 - Target sovereignty

There is no mandatory global DAO controlling protected systems.

Each target decides:

- whether to install Reclose;
- which resources are protected;
- which Judge modules are trusted;
- which actions may be taken;
- whether provisional containment is enabled;
- whether human override remains;
- recovery rules;
- evolution envelope;
- gateway policy.

Authority reduction may be immediate. Authority expansion is delayed.

---

# ADR-005 - Agent Tank network

The canonical hackathon environment is:

```text
GenLayer Studio-dev
chain ID 61997
```

The exact matching release-candidate toolchain must be pinned as a coherent family. The network identity is locked; individual preview endpoint naming belongs in deployment configuration.

Because the preview environment may be redeployed/reset, the repository must contain reproducible deployment scripts, source commit, dependencies, constructor arguments, policy artifacts, addresses, transaction hashes and fee profiles.

---

# ADR-006 - Core topology

Reclose is divided into:

### AssuranceKernel

Immutable deterministic root of trust.

### Judge Modules

Versioned Intelligent Contracts responsible for semantic adjudication.

### Target Adapter

Bounded execution interface between Kernel and protected system.

### Sentinel / Reporter

Offchain liveness and evidence-submission actor with no truth authority.

### Evidence Store

Content-addressed artifact storage plus original source references.

Canonical flow:

```text
Reporter
  -> Judge Module
  -> GenLayer consensus
  -> DecisionRecord
  -> AssuranceKernel
  -> ActionEnvelope
  -> Target Adapter
  -> Protected system
```

---

# ADR-007 - Canonical 61997 demonstration

The Agent Tank proof uses real **Intelligent Contract -> Intelligent Contract** control.

Current Studio limitations do not justify pretending arbitrary external EVM execution works inside Studio. Cross-chain/EVM adapters may be implemented and tested separately, but the canonical 61997 demo remains IC-to-IC.

---

# ADR-008 - Two-speed intervention

There are two execution classes.

## Class P - Provisional containment

Accepted-phase execution is permitted only when all are true:

- explicit opt-in;
- reversible;
- idempotent;
- authority-reducing;
- no value movement;
- no upgrade;
- no authority expansion;
- final settlement reconciles it.

Examples: monitor, restrict, temporary provider disable, safe mode.

## Class F - Final actions

Finalized decision required for:

- external EVM/cross-chain execution;
- value movement caused by judgment;
- permanent configuration;
- upgrades/module promotion;
- authority expansion;
- final incident/bounty settlement.

Every provisional path must receive final reconciliation.

---

# ADR-009 - Transaction lifecycle

Messages create asynchronous child transactions. Reclose therefore models execution as a trace, not one receipt.

```text
Judge transaction
  -> Kernel child
  -> Target child
  -> target post-state
```

An action is successful only when required stages are final, execution results succeed and the target state reflects the expected transition.

---

# ADR-010 - Autonomous Policy Manifest

Every target is governed by an **Autonomous Policy Manifest (APM)**.

The APM has two layers:

1. deterministic Authority Envelope;
2. semantic Incident Rules.

External manifests are canonicalized with RFC 8785 before hashing. Exact large quantities are represented as decimal strings rather than JSON numbers to avoid IEEE-754 precision loss.

Canonical identity:

```text
Keccak-256(JCS manifest bytes)
```

---

# ADR-011 - Evidence Artifact Package

Reports reference an Evidence Artifact Package (EAP) containing source references, source classes, timestamps, hashes/snapshots and provenance metadata.

Initial source classes:

- AUTHORITATIVE_SIGNED;
- AUTHORITATIVE_PUBLIC;
- ONCHAIN;
- INDEPENDENT_PUBLIC;
- CONTENT_ADDRESSED_SNAPSHOT;
- DERIVED_DETERMINISTIC.

There is no universal "two sources" rule. Each semantic rule declares admissible source combinations.

---

# ADR-012 - Equivalence Principle and DecisionRecord

Every semantic rule uses the narrowest possible equivalence condition.

Validators independently reproduce or assess the substantive decision rather than merely checking output shape.

DecisionRecord includes at least:

```text
incident_id
policy_id / policy_version
rule_id
affected_resource
evidence_hash
outcome
condition_code
reason_codes
judge_module
decision_stage
```

Application outcomes:

```text
CONFIRMED
REJECTED
UNDETERMINED
```

The Kernel ignores free-form reasoning for execution.

---

# ADR-013 - Capability-bounded actions

The Kernel supports a finite action vocabulary, including:

- NO_ACTION;
- ALERT;
- MONITOR;
- RESTRICT;
- THROTTLE;
- REVOKE_CAPABILITY;
- REROUTE;
- ENTER_SAFE_MODE;
- PAUSE;
- ENTER_RECOVERY;
- RESTORE.

No arbitrary calldata is accepted.

---

# ADR-014 - Operational state machine

V1 logical states:

```text
NORMAL
MONITORED
RESTRICTED
SAFE_MODE
PAUSED
RECOVERY
```

Each APM defines which bounded actions accompany transitions.

---

# ADR-015 - Recovery architecture

Recovery is first-class protocol behaviour.

Critical flow:

```text
PAUSED
  -> remediation evidence
  -> RECOVERY
  -> post-remediation validation
  -> NORMAL
```

Insufficient remediation evidence does not restore authority.

---

# ADR-016 - Permissionless reporters and Sentinels

Reporting is permissionless from V1.

Reclose may operate high-availability Sentinels, but they possess no unique adjudication authority. If Reclose-operated servers disappear, another actor must still be able to submit evidence and invoke the protocol.

---

# ADR-017 - Reporter economics

No project token is required.

Reporter economics combine:

1. GenLayer execution cost;
2. temporary anti-spam bond;
3. optional target-funded detection bounty.

Ordinary good-faith false reports are not truth-slashed. Deterministically abusive submissions can be rejected/penalized according to explicit rules.

---

# ADR-018 - Appeals

Reclose reuses GenLayer Optimistic Democracy appeals. It does not build a second jury.

The explorer must distinguish:

```text
PROVISIONAL
APPEAL WINDOW
FINAL
```

Accepted outcomes are never presented as final.

---

# ADR-019 - Human override

Human override is optional and target-controlled.

Modes:

- sovereign autonomous: owner retains emergency override/revocation;
- fully autonomous: target deliberately renounces the relevant human authority.

Human actions are labeled `HUMAN_OVERRIDE` and never masquerade as GenLayer outcomes.

---

# ADR-020 - Upgrade architecture

AssuranceKernel is permanently non-upgradeable.

Mutable intelligence/functionality lives in versioned immutable modules:

```text
JudgeModule_v1 -> JudgeModule_v2
TargetAdapter_v1 -> TargetAdapter_v2
EvidenceModule_v1 -> EvidenceModule_v2
```

Policies pin exact module versions.

---

# ADR-021 - Bounded self-evolution

Self-evolution is architecturally supported but constrained by an immutable Evolution Envelope.

Fundamental rule:

> **A system may improve capabilities it already possesses. It may not autonomously grant itself new authority.**

Candidate lifecycle:

```text
deficiency
 -> specification
 -> candidate
 -> static analysis
 -> tests
 -> adversarial benchmark
 -> invariants
 -> GenLayer semantic evaluation where needed
 -> immutable candidate deployment
 -> shadow
 -> canary
 -> promotion
 -> monitoring / rollback
```

Kernel self-modification and autonomous privilege expansion are forbidden.

---

# ADR-022 - Cross-chain architecture

Long-term model:

> **GenLayer judgment hub + chain-specific execution adapters.**

Transport is abstracted using ERC-7786-style gateway principles. Hyperlane is the first planned transport adapter because of application-specific, composable security modules.

Only finalized decisions cross domains.

No claim is made that a production Hyperlane route already exists for 61997.

---

# ADR-023 - Base, Safe and ERC-7579

First external chain: **Base**.

First account-level actuator: **Safe Smart Account**.

Generic modular smart-account compatibility direction: **ERC-7579**.

Safe is an adapter, not the product. The adapter must expose typed assurance operations and never a generic arbitrary execution escape hatch.

---

# ADR-024 - ERC-8004 interoperability

ERC-8004 is complementary identity/reputation/validation infrastructure. Reclose may consume those records but does not duplicate them.

Identity and reputation inform evidence; they do not replace incident judgment.

---

# ADR-025 - Ecosystem composability

Reclose is designed to consume and produce reusable ecosystem primitives.

Potential relationships:

- Uptime -> operational evidence;
- Reclose -> runtime intervention;
- Internet Court -> downstream contractual dispute;
- Intelligent Oracle -> reusable real-world resolution;
- ERC-8004 -> identity/reputation inputs;
- AntSeed -> agent-service environment.

External integrations never become correctness dependencies for the core protocol.

---

# ADR-026 - Fee engineering

Consensus v0.6 fee engineering is part of architecture and testing.

Repository commits `fee-profile.json` generated from representative execution paths, including message-producing branches. Production submission uses SDK estimation against current network parameters, not handwritten fee guesses.

---

# ADR-027 - Testing, formal invariants and benchmark

Testing is a product component.

Required layers:

1. deterministic unit tests;
2. Judge tests with mocked web/LLM;
3. consensus tests;
4. lifecycle/appeal tests;
5. adversarial tests;
6. real 61997 end-to-end tests.

Reclose maintains an **Autonomous Assurance Benchmark**, beginning with at least 50 curated scenarios.

Primary safety target:

> **unsafe autonomous actions = 0**

This is an engineering target, not a claim that software can never contain defects.

---

# ADR-028 - Audit and provenance

Every consequential state transition must be traceable:

```text
Target
 -> Policy
 -> Rule
 -> Incident
 -> Evidence
 -> Judge
 -> GenLayer transaction
 -> DecisionRecord
 -> Kernel action
 -> Target transaction
 -> Execution result
 -> Post-state
 -> Recovery
```

The same causal chain is exposed in human-readable Explorer UX and structured machine interfaces.

---

# ADR-029 - Business and protocol model

The core protocol remains open and composable.

Revenue may come from:

- GenLayer Intelligent Contract developer economics where applicable;
- managed Sentinels and monitoring;
- policy tooling;
- enterprise assurance and SLAs;
- custom integrations;
- security engineering and incident simulation.

No proprietary mandatory toll or project token is required for the initial architecture.

---

# ADR-030 - Parameter governance

Uncertain numerical values are policy/calibration parameters, not architectural ambiguity.

Examples:

- bond size;
- source age;
- cooldown;
- policy timelock;
- recovery observation period;
- canary duration;
- bounty;
- throttle percentage.

Hierarchy:

```text
protocol hard safety bounds
  -> APM permitted range
  -> target-configured value
```

Defaults are derived from benchmark, network latency, appeal duration, spam economics and target risk class.

---

# 5. Provisional containment protocol

If an accepted decision is `CONFIRMED` and policy allows provisional containment, the Kernel may apply reversible authority-reducing restrictions.

Appeal re-execution may deliver duplicate accepted messages; all are idempotent.

Final outcomes reconcile provisional state:

### Final CONFIRMED

Provisional restrictions convert to final restrictions as defined by policy.

### Final REJECTED

Incident-specific provisional restrictions are removed.

### Final UNDETERMINED

High-impact provisional restrictions are removed or converted to an explicitly authorized uncertainty state such as MONITORED.

Restrictions are reason-indexed so resolving Incident A cannot restore a capability still restricted by Incident B.

---

# 6. Multi-incident composition

Effective capability is the intersection of base policy and all active restrictions.

```text
effective capability
=
base capability
AND restrictions from incident 1
AND restrictions from incident 2
AND ...
```

This is a non-negotiable safety property.

---

# 7. Initial semantic-rule families

R1 supports or prepares for:

## SERVICE_FAILURE

Determine whether evidence satisfies a defined service-failure obligation.

## PROVIDER_COMPROMISE

Determine whether evidence establishes compromise of an authorized dependency/provider.

## SECURITY_VULNERABILITY_ACTIVE

Determine whether evidence establishes an exploitable vulnerability affecting a protected target or dependency.

## IDENTITY_OR_RUNTIME_MISMATCH

Determine whether independently verifiable evidence establishes that the provider/agent/runtime identity differs materially from policy.

## REMEDIATION_CONFIRMED

Determine whether remediation evidence satisfies the active incident's recovery requirements.

## RECOVERY_VALIDATED

Determine whether post-remediation observation requirements are satisfied.

---

# 8. Threat-model baseline

| Threat | Primary response |
|---|---|
| malicious Reporter | fees/bond, prechecks, GenLayer consensus |
| Sybil Reporters | reporters do not vote |
| spam | execution cost + bonded capital + duplicate rejection |
| malicious webpage | source policy, hostile-input handling |
| prompt injection | constrained inputs/outputs, validator diversity |
| compromised source | corroboration and source classes |
| changing page | snapshots/hash/timestamp + independent retrieval |
| unavailable source | UNDETERMINED/fail closed |
| malicious leader | independent validator verification |
| false accepted result | reversible provisional actions only |
| appeal changes verdict | mandatory final reconciliation |
| duplicate accepted message | idempotent receiver |
| stale DecisionRecord | policy/version validation |
| replay | stable action identities |
| malicious Judge | module pinning + bounded Kernel |
| policy-author compromise | delayed expansion + immediate restriction |
| bridge compromise | gateway/source/nonce/action verification |
| Sentinel outage | permissionless reporting |
| frontend lies | frontend non-authoritative |
| false recovery | independent recovery judgment |
| overlapping incidents | reason-indexed restrictions |
| malicious evolution candidate | tests, shadow, canary, rollback |
| child fee starvation | measured fee profiles |
| 61997 reset | reproducible deployment |
| finalized execution error | execution result + post-state verification |

---

# 9. Prompt-injection posture

External evidence is untrusted data.

Requirements:

- fixed contract rule and system prompt;
- Reporter cannot submit arbitrary system instructions;
- evidence clearly delimited as untrusted;
- deterministic validation occurs before LLM reasoning;
- questions are narrow;
- outputs are strict structured schemas;
- validator independently evaluates evidence;
- malformed/adversarial output cannot default to CONFIRMED.

---

# 10. External integration priority

1. GenLayer-native controlled protocol on 61997;
2. Safe on Base;
3. agent-service integration, preferably AntSeed where appropriate;
4. cross-chain gateway, Hyperlane first.

The core architecture does not depend on any external integration being available.

---

# 11. Benchmark philosophy

The benchmark deliberately includes hard and failing scenarios rather than demo-only examples.

Labels:

```text
CONFIRMED
REJECTED
UNDETERMINED
```

Categories include genuine incidents, false reports, stale information, contradictory evidence, malicious sources, prompt injection, source outage, genuine/fake remediation, replay and lifecycle divergence.

Metrics include precision, recall, false intervention, false pause, critical false negatives, UNDETERMINED calibration, validator disagreement, cost, latency and recovery correctness.

---

# 12. Deliberately unresolved product question

The only intentionally unresolved product-architecture question is whether a project-specific token should **ever** exist.

There is no Reclose token in the current product. No R1 architecture, incentive or business model may depend on a hypothetical future token.

---

# 13. ADR reopening policy

An accepted ADR may reopen only for:

- platform contradiction;
- security contradiction;
- empirical infeasibility;
- standards incompatibility;
- materially superior evidence.

Developer preference, fashionable tooling, competitor patterns, visual preference or implementation convenience do not reopen an ADR.

---

# 14. Master Design Package gate

The next design document consumes these principles as fixed inputs:

- semantic judgment belongs to GenLayer;
- enforcement is deterministic and bounded;
- Kernel is immutable;
- modules are versioned;
- reporting is permissionless;
- Sentinels are non-authoritative;
- policy is explicit/versioned;
- authority expansion is delayed;
- revocation can be immediate;
- UNDETERMINED exists;
- no arbitrary AI calldata;
- accepted execution is reversible/authority-reducing only;
- irreversible/external execution is finality-bound;
- recovery is evidence-backed;
- multi-incident restrictions compose safely;
- self-evolution cannot expand authority;
- 61997 is canonical for Agent Tank;
- IC-to-IC is the canonical hackathon proof;
- fee profiling and public benchmark are product requirements;
- product name is Reclose;
- no project token is introduced now.

---

# 15. Research closure declaration

The broad exploratory research phase is closed.

Future research is implementation-specific: exact Equivalence Principle, current RC fee budget, parameter calibration, integration conformance and security testing.

The project no longer searches for a different core idea.

Reclose proceeds under the permanent principle:

> **The system may judge an uncertain world, but it may act only inside authority that was made certain beforehand.**
