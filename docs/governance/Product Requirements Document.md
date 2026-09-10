# Product Requirements Document

**Status:** PRODUCT BASELINE LOCKED FOR R1  
**Product:** **Reclose**  
**Product category:** Autonomous Protocol Assurance  
**Hackathon track:** Autonomous Protocols  
**Canonical Agent Tank network:** GenLayer Studio-dev, chain ID 61997  
**Governing documents:** Research Closure & Architecture Decision Record; Master Design Package; Implementation Specification; Naming & Brand Decision Record  
**Project token:** not introduced; future necessity intentionally unresolved

---

# 1. Document purpose

This Product Requirements Document defines **what Reclose must provide to its users and machine consumers**. It is deliberately different from the Implementation Specification.

The Implementation Specification answers:

> How should the contracts, state, messages, schemas, fees, tests and deployment work?

This PRD answers:

> Who uses Reclose, what do they need to accomplish, what must they see, what must they be able to do, what happens when things go wrong, and what qualifies as a complete product experience?

The PRD is the shared product contract between frontend/design, protocol engineering, SDK/CLI, Sentinel infrastructure, QA and release management.

Where this document conflicts with a locked architectural invariant, the architecture wins. Product UX must represent protocol truth; it cannot redefine it.

---

# 2. Product definition

Reclose is **runtime assurance for autonomous economic systems**.

A protected protocol pre-authorizes bounded responses to defined incident conditions. Permissionless Reporters or automated Sentinels submit evidence. GenLayer judges whether the evidence satisfies the protected protocol's rule. Reclose's immutable AssuranceKernel maps that structured judgment to only the action that was authorized beforehand.

The product exists to answer a runtime question that static authorization cannot answer on its own:

> **Has the operating world changed enough that this autonomous system's permissions or operating state should change now?**

Reclose is not primarily a website. It is a protocol with multiple interfaces.

---

# 3. Product interaction model

Reclose has three product layers.

## 3.1 Protocol layer - source of truth

```text
GenLayer contracts
AssuranceKernel
Judge Modules
Policies
Target adapters
```

This layer establishes and enforces Reclose protocol state.

The hosted app, API and Sentinel services are not authorities over it.

## 3.2 Infrastructure layer - machine usability

```text
Protocol SDK
Policy compiler
Evidence builder
Transaction tracker
CLI
Sentinels
Indexer / optional hosted API
Artifact storage
```

This layer makes the protocol practical for developers, agents and automation.

## 3.3 Product layer - human understanding and control

```text
Dashboard
Target pages
Policy Builder
Incident Explorer
Report flow
Recovery flow
Benchmark
Deployment/about surfaces
```

This layer makes Reclose usable by humans without requiring them to understand contract internals.

---

# 4. How different users use Reclose

| User | Primary interface | Primary job |
|---|---|---|
| Protocol owner | Web app + wallet | Register target, define/delegate bounded authority, inspect incidents, revoke/override if retained |
| Developer | SDK/CLI + contracts | Integrate Reclose into an application or autonomous system |
| Autonomous agent | SDK/API/skill.md | Read assurance state and adapt behaviour programmatically |
| Reporter / researcher | App/CLI/SDK | Submit incident or remediation evidence and track outcome |
| Sentinel operator | Sentinel + SDK/contracts | Monitor sources and submit structured reports automatically |
| Auditor/security team | Explorer/SDK/export | Reconstruct why a state transition occurred |
| Protected protocol | Contracts/adapter | Receive and enforce bounded actions directly |

The hosted Reclose API is **convenience and indexing infrastructure**. It is not the protocol's source of truth and must never become a mandatory trust dependency.

---

# 5. Product goals

## G1 - Make bounded autonomy understandable

A user should be able to answer, before signing:

- what Reclose may control;
- what it cannot control;
- which external conditions matter;
- which Judge module evaluates them;
- whether provisional containment is enabled;
- what requires finality;
- what recovery requires.

## G2 - Make incidents explainable

A user should be able to reconstruct:

```text
claim
 -> evidence
 -> GenLayer decision
 -> policy consequence
 -> actual execution
 -> resulting state
 -> recovery
```

## G3 - Let autonomous systems continue safely where possible

The reference product must show more than pausing. Reclose should isolate an unsafe dependency and allow an approved fallback path where policy permits.

## G4 - Make Reclose machine-native

An agent must not need to browse the Reclose website. It should query state, provider/resource authorization, incident stage and recovery state through structured interfaces.

## G5 - Keep Reclose non-custodial and non-authoritative offchain

Reclose-operated web/API/Sentinel infrastructure must not control target treasury keys or become the sole judge of incident truth.

## G6 - Make recovery a product feature

Recovery is not a hidden admin action. It must be a visible, evidence-backed lifecycle.

---

# 6. Non-goals

R1 does not attempt to become:

- a general AI wallet;
- a generalized cybersecurity platform;
- an oracle replacement;
- an AI DAO;
- a prediction market;
- a private-evidence adjudication system;
- a production cross-chain protection network;
- a self-evolving production protocol;
- a custody service;
- a token economy.

Safe/Base/Hyperlane/ERC-7579/ERC-8004/AntSeed integrations are roadmap work, not dependencies of the canonical R1 proof.

---

# 7. Product principles

1. **Protocol truth before UI convenience.**
2. **Evidence, judgment, policy and execution are separate concepts.**
3. **The app explains authority before requesting authority.**
4. **Accepted does not mean final.**
5. **Finalized does not automatically mean execution succeeded.**
6. **UNDETERMINED is a valid user-visible result.**
7. **Long-running transactions remain navigable and resumable.**
8. **Agents receive structured state, not screenshots.**
9. **Hosted services add convenience, not trust.**
10. **Recovery receives first-class UX.**
11. **Security actions are precise rather than theatrical.**
12. **The visual product should feel engineered, calm and operational rather than generic AI/Web3.**

---

# 8. R1 product scope

## 8.1 Required R1 surfaces

- public dashboard;
- target list and detail;
- protocol-owner onboarding/registration;
- policy builder or guided compiler-backed policy construction;
- policy review/diff/activation;
- public incident list and Incident Explorer;
- incident report flow;
- recovery/remediation flow;
- global transaction center;
- benchmark page;
- deployment/about page;
- protocol SDK;
- CLI;
- `skill.md`;
- reference Sentinel.

## 8.2 Required R1 protocol story

The product must be able to demonstrate:

1. Reference agent in NORMAL state.
2. Agent uses Provider A and sends real test GEN.
3. Reporter/Sentinel submits evidence against Provider A.
4. GenLayer adjudicates.
5. Reclose applies provisional containment if the path is stable and policy-approved.
6. Final CONFIRMED decision revokes Provider A / enters safe mode according to policy.
7. Agent automatically uses Provider B.
8. Remediation is submitted.
9. Reclose enters RECOVERY.
10. Recovery validation succeeds.
11. Provider A is restored and state returns NORMAL.

The defining demo moment is **safe continuity**, not a cosmetic `paused=true` state.

---

# 9. Personas and jobs to be done

## 9.1 Protocol owner

**Job:** Protect my autonomous system without giving a centralized monitor unlimited emergency powers.

Needs to:

- understand Reclose before delegating;
- register a target;
- define protected resources;
- choose rules/Judges;
- define bounded consequences;
- see authority expansion clearly;
- activate policy;
- monitor incidents;
- revoke Reclose authority immediately where ownership is retained;
- understand whether recovery was autonomous or human-overridden.

## 9.2 Autonomous agent

**Job:** Continue operating safely under current policy without depending on a human dashboard.

Needs to answer:

- What state am I in?
- Is Provider A allowed?
- Which fallback is allowed?
- Why is a resource blocked?
- Is the decision provisional or final?
- Am I in recovery?

## 9.3 Reporter / security researcher

**Job:** Submit credible evidence efficiently and track what happened to it.

Needs:

- searchable target/rule/resource selection;
- source validation;
- fee/bond quote;
- incident ID immediately;
- transparent lifecycle;
- bond/bounty outcome where enabled.

## 9.4 Sentinel operator

**Job:** Improve liveness without becoming a trusted judge.

Needs:

- machine-readable active policies;
- source configuration;
- evidence builder;
- duplicate filtering;
- transaction persistence;
- operational metrics.

## 9.5 Auditor / integrator

**Job:** Prove why the system changed behaviour and whether it remained inside delegated authority.

Needs:

- policy hash;
- Judge version;
- evidence artifact;
- transaction trace;
- action identity;
- pre/post-state;
- recovery history.

---

# 10. Role and authority model

| Capability | Anonymous visitor | Reporter wallet | Target owner | Authorized agent | Sentinel | Reclose hosted backend |
|---|---:|---:|---:|---:|---:|---:|
| Read public state | Yes | Yes | Yes | Yes | Yes | Yes |
| Submit incident | No signature -> No | Yes | Yes | If allowed | Yes | Only as ordinary Reporter |
| Submit remediation | No | Yes | Yes | If allowed | Yes | Only as ordinary Reporter |
| Register target | No | No | Yes | No | No | No |
| Propose/activate policy | No | No | Yes | No | No | No |
| Immediate authority reduction | No | No | Yes | No | No | No |
| Direct assurance action on target | No | No | No | No | No | No |
| Kernel-mediated action | N/A | N/A | N/A | N/A | N/A | Protocol only |
| Human override | No | No | Target-configured only | No | No | No |

Reclose infrastructure does not get a secret super-admin role.

---

# 11. Product information architecture

```text
Reclose
|
|-- Dashboard
|-- Targets
|   `-- Target Detail
|       |-- Overview
|       |-- Policy
|       |-- Resources
|       |-- Incidents
|       `-- Audit
|-- Policies
|   |-- New / Build
|   |-- Review / Diff
|   `-- Policy Detail
|-- Incidents
|   `-- Incident Explorer
|-- Report Incident
|-- Recovery
|-- Benchmark
|-- Integrations / Developer
`-- About / Deployment
```

A persistent transaction center is available globally whenever the user has submitted writes.

---

# 12. Screen specifications

## 12.1 Dashboard

The dashboard should answer in one view:

- how many systems are protected;
- which targets are NORMAL / MONITORED / RESTRICTED / SAFE_MODE / PAUSED / RECOVERY;
- whether any incidents are provisional;
- which incidents need attention;
- recent autonomous actions;
- recent human overrides;
- current 61997 network context for R1.

The dashboard does **not** need to expose every protocol detail. It should link to causal detail.

## 12.2 Target Detail

Header:

- target name/ID/address;
- assurance state;
- autonomy mode;
- active policy/version/hash;
- Kernel address;
- current GEN balance for reference target where relevant.

Sections:

- protected resources and effective authorization;
- active restrictions with reason incident;
- recent incidents;
- recent actions;
- owner emergency/revocation controls when connected owner is eligible.

## 12.3 Policy Builder

The builder must present policy in the same conceptual order the owner thinks about protection:

1. target;
2. resources;
3. conditions/rules;
4. evidence/source policy;
5. Judge module;
6. provisional containment;
7. final consequences;
8. recovery;
9. human override;
10. reporting economics;
11. review and activation.

The owner should not begin from raw JSON unless they choose an advanced mode.

## 12.4 Policy Review / Diff

Before signature:

```text
Policy version
Manifest hash
Activation time

AUTHORITY ADDED
AUTHORITY REMOVED
BOUNDS INCREASED
BOUNDS DECREASED
JUDGE CHANGED
HUMAN OVERRIDE CHANGED
```

Authority expansion must be visually more prominent than cosmetic metadata changes.

## 12.5 Report Incident

Flow:

```text
Target
 -> Rule
 -> Resource
 -> Evidence sources
 -> Evidence validation
 -> Fee / bond quote
 -> Final review
 -> Wallet signature
 -> Transaction tracking
```

The Reporter never selects the resulting action.

## 12.6 Incident Explorer

The page must visually separate four questions:

### What was claimed?

Incident, target, resource, Reporter.

### What evidence was evaluated?

Sources, classes, provenance, artifact hash.

### What did GenLayer decide?

Raw transaction lifecycle plus Reclose DecisionOutcome, condition code and provisional/final stage.

### What did the policy cause and what actually executed?

Policy effects, Kernel/Target child transactions, resulting state and active restrictions.

Recovery extends the same timeline rather than appearing as an unrelated new page.

## 12.7 Recovery

The page must show:

- original incident;
- current restrictions;
- remediation rule;
- evidence requirements;
- remediation transaction;
- RECOVERY state;
- remaining validation requirement;
- final restoration.

## 12.8 Benchmark

Public page should show:

- benchmark version;
- scenario count/class distribution;
- methodology;
- class-level metrics;
- adversarial coverage;
- release hash / Judge version;
- link to raw report where possible.

## 12.9 Developer / Integrations

Must explain the product interfaces:

```text
Humans -> Web app
Developers -> SDK / CLI
Agents -> SDK / API / skill.md
Sentinels -> Sentinel package / contracts
Protected protocols -> contracts / adapters
Auditors -> Explorer / exports
```

It should explicitly state that the hosted API is convenience infrastructure rather than source of truth.

---

# 13. Transaction experience

GenLayer transactions may be long-running and include child transactions. The product must not use a single indefinite spinner.

R1 transaction experience:

```text
SUBMITTED
 -> queued/processing stages
 -> decision materialized
 -> ACCEPTED / appealable where applicable
 -> FINALIZED
 -> execution result check
 -> child transaction checks
 -> target post-state verification
```

The UI may expose exact raw statuses such as Pending, Proposing, Committing, Revealing, Accepted, Undetermined, Finalized and Canceled in advanced detail, but it should not invent undocumented raw protocol statuses.

A transaction reaching Accepted or Finalized does not by itself prove successful contract execution. Reclose must check the execution result and use the SDK's success helper/equivalent. Current GenLayer documentation explicitly requires status and execution result to be interpreted together.

The user's transaction ID must be persisted immediately so navigation/reload does not cause accidental resubmission.

---

# 14. Human app vs SDK/API

This distinction is product-critical.

## Web app

Best for:

- onboarding;
- policy authoring;
- incident reporting by humans;
- audit/Explorer;
- recovery management;
- benchmark visibility.

## SDK

Canonical developer/machine integration.

Best for:

- direct contract reads;
- transaction construction;
- agent integration;
- policy validation/hash/diff;
- transaction tracking.

## Hosted API / indexer

Convenience layer for:

- aggregated reads;
- historical indexing;
- dashboards;
- notifications/webhooks later;
- developer ergonomics.

It is not authoritative.

## CLI

Power-user, CI, Sentinel and developer operations.

## skill.md

Safe agent-facing instructions and capability surface.

---

# 15. Notifications and automation roadmap

R1 does not require a full notification SaaS. The product should be architected so R2 can add:

- webhook on incident submitted;
- webhook on accepted/provisional outcome;
- webhook on final outcome;
- webhook on target state transition;
- webhook on recovery transition;
- email/Slack/Discord integrations for managed customers.

Notifications report state. They never create protocol authority.

---

# 16. Product metrics

## R1 product-quality metrics

- onboarding completion rate during test sessions;
- policy validation failure rate;
- incident submission completion rate;
- transaction resume success after refresh;
- percentage of users who can correctly identify provisional vs final in usability tests;
- percentage who can answer "why was Provider A disabled?" from Explorer;
- canonical demo success rate from clean state;
- SDK read/write integration pass rate;
- benchmark and invariant results.

## Long-term business/product metrics

- protected targets;
- active policy versions;
- monthly incident judgments;
- independent Reporter/Sentinel operators;
- SDK integrations;
- managed Sentinel customers;
- autonomous incidents resolved without fresh governance vote;
- recovery completion rate;
- protocol usage from third-party integrations.

Metrics must not incentivize unsafe report volume or needless intervention.

---

# 17. R1 release acceptance

The product is not R1-ready merely because contracts deploy.

It is ready only when:

1. a target owner can understand/delegate authority;
2. a Reporter can submit evidence permissionlessly;
3. GenLayer judgment is visible and correctly distinguished from policy consequence;
4. accepted/finalized/execution-result semantics are represented correctly;
5. the reference agent changes real economic behaviour;
6. fallback operation is demonstrated;
7. recovery is demonstrated;
8. a machine can retrieve equivalent state through SDK/CLI;
9. a user can reconstruct the causal trace;
10. the benchmark and invariant gates pass;
11. all canonical components are deployed to 61997 with reproducible manifests.

---

# 18. Roadmap scope

## R1 - Agent Tank reference product

Native 61997 vertical slice, web product, SDK/CLI, Sentinel, benchmark.

## R2 - Hardened alpha / managed assurance

Hosted index/API, independent Sentinel onboarding, notifications/webhooks, richer policy tooling, managed monitoring, larger benchmark.

## R3 - External economic control

Base, Safe, ERC-7579, cross-chain gateway/Hyperlane.

## R4 - Agentic ecosystem integrations

ERC-8004, AntSeed and other ecosystem inputs/consumers.

## R5 - Bounded self-evolution

Candidate module testing, shadow, canary, promotion and rollback inside the immutable authority envelope.

---

# 19. Product language and design direction

Canonical product language uses:

- evidence;
- judgment;
- policy consequence;
- assurance state;
- restriction;
- safe mode;
- recovery;
- restoration;
- bounded authority.

Avoid:

- "AI decided to pause your funds";
- "autonomous superintelligence firewall";
- generic shield/robot/cybersecurity imagery;
- language suggesting Reclose has custody or omnipotent administrative powers.

The visual system should make state transition, isolation, continuity and recovery memorable.

---

# 20. External platform constraints that affect product requirements

The following current GenLayer behaviours are product requirements, not backend trivia:

1. Studio-dev v0.6 preview is chain ID 61997 and must use the matching RC family.
2. Accepted internal messages may execute before appeals close and may repeat on re-execution; recipients must be idempotent.
3. External messages are finality-only.
4. A stored Accepted/Finalized status can still accompany contract execution error; the UI must inspect execution result.
5. Long-running transactions should be resumable from persisted transaction IDs rather than blindly resubmitted.
6. v0.6 fees should be quoted from measured profiles and current network prices; fee deposit, value and refund are distinct concepts.
7. Web evidence can vary/fail and may contain adversarial text; Reclose must expose uncertainty rather than fake certainty.

Authoritative references are listed in Appendix A.

---

# 21. Requirements catalogue

## Access & onboarding

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-ACC-001** | The public Reclose application MUST allow read-only exploration without connecting a wallet. | P0 | R1 | A visitor can view public targets, incidents, policies and benchmark information without signing in. |
| **PRD-ACC-002** | The application MUST require a wallet only when an operation requires an onchain signature. | P0 | R1 | Read-only flows never trigger a wallet modal; write flows do. |
| **PRD-ACC-003** | The application MUST display the connected network and MUST reject write attempts from an unsupported or mismatched network. | P0 | R1 | Write CTA is blocked with a clear network correction state when chain identity is not 61997 for R1. |
| **PRD-ACC-004** | A protocol owner MUST be able to start a guided target-protection flow from the web application. | P0 | R1 | Owner can proceed from connect wallet to target registration and first-policy activation with clear checkpoints. |
| **PRD-ACC-005** | The onboarding flow MUST explain that Reclose is a control and assurance layer, not a custody wallet, oracle, or centralized monitoring authority. | P1 | R1 | Onboarding includes concise product-boundary explanation before authority delegation. |
| **PRD-ACC-006** | The onboarding flow MUST show the exact authority being delegated before the owner signs target registration or policy activation. | P0 | R1 | Pre-sign review lists target, Kernel, resources, actions, human override setting and activation timing. |
| **PRD-ACC-007** | Users MUST be able to leave a long-running GenLayer transaction flow and later resume from the original transaction ID. | P0 | R1 | Reload/navigation does not trigger resubmission and transaction tracking resumes. |
| **PRD-ACC-008** | The product MUST provide a visible route to technical documentation, deployed contract addresses and source repository. | P1 | R1 | Footer/about page exposes documentation, source and deployment manifest links. |


## Target management

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-TGT-001** | A target owner MUST be able to register a GenLayer-native protected target through the Reclose app. | P0 | R1 | Registration verifies owner/controller/target ID handshake and completes on 61997. |
| **PRD-TGT-002** | Reclose MUST refuse unilateral registration of a target that does not report the expected Kernel and owner. | P0 | R1 | Invalid handshake is rejected with a stable error and no target record. |
| **PRD-TGT-003** | Each target MUST have a stable public target page showing state, active policy, protected resources, active incidents and recent assurance actions. | P0 | R1 | Target page renders current onchain state and causal links. |
| **PRD-TGT-004** | The product MUST distinguish target assurance state from ordinary service/application health. | P0 | R1 | UI labels assurance state explicitly and does not equate it with general uptime. |
| **PRD-TGT-005** | The target owner MUST be able to immediately revoke future Reclose authority where ownership is retained. | P0 | R1 | Revocation transaction disables future Kernel effects and is clearly irreversible until explicit reauthorization. |
| **PRD-TGT-006** | The target owner MUST be able to trigger a clearly labelled human emergency pause when the target supports sovereign override. | P0 | R1 | Action is labelled HUMAN_OVERRIDE in audit history and never presented as GenLayer judgment. |
| **PRD-TGT-007** | The product MUST show whether a target is sovereign-with-override or fully autonomous. | P1 | R1 | Target header includes autonomy mode derived from target/policy configuration. |
| **PRD-TGT-008** | Target pages SHOULD expose a machine-readable endpoint or SDK method for current assurance state. | P0 | R1 | SDK returns target state without scraping the web UI. |


## Policy management

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-POL-001** | A target owner MUST be able to create an Autonomous Policy Manifest using guided product controls rather than editing raw contract state. | P0 | R1 | Owner can construct the R1 reference policy through UI or compiler-backed JSON flow. |
| **PRD-POL-002** | The product MUST validate an APM against schema and semantic constraints before any onchain policy write is offered. | P0 | R1 | Invalid manifests cannot proceed to signing; errors identify exact field/rule. |
| **PRD-POL-003** | The product MUST canonicalize and hash the complete manifest deterministically. | P0 | R1 | Repeated canonicalization of equivalent input produces identical policy hash fixtures. |
| **PRD-POL-004** | Exact high-precision monetary and integer values in the APM MUST be represented as canonical decimal strings. | P0 | R1 | Schema rejects unsafe floating-point representation for specified high-precision fields. |
| **PRD-POL-005** | The product MUST distinguish policy draft, proposed/timelocked, active and superseded states. | P0 | R1 | Policy page shows lifecycle and activation timing. |
| **PRD-POL-006** | Every active policy MUST be immutable; any substantive change MUST create a new policy version/hash. | P0 | R1 | No edit-in-place action exists for sealed/active policy. |
| **PRD-POL-007** | Authority expansion MUST be visually distinguished from ordinary policy edits. | P0 | R1 | Policy diff labels new actions/resources/bounds/Judges/override changes as authority expansion where applicable. |
| **PRD-POL-008** | Authority-expanding policy changes MUST respect the Kernel activation delay. | P0 | R1 | UI displays activation-not-before and Kernel rejects premature activation. |
| **PRD-POL-009** | Owners MUST be able to immediately reduce authority through restrictive overlays without editing the policy in place. | P0 | R1 | Disable-action/resource overlay takes effect immediately and is visible in effective policy state. |
| **PRD-POL-010** | The policy experience MUST show protected resources, allowed actions, Judge module, provisional permissions and recovery rules in human-readable form. | P0 | R1 | A non-developer can inspect these fields from the policy page without reading JSON. |
| **PRD-POL-011** | The raw canonical manifest and manifest hash MUST remain downloadable/inspectable for auditors. | P1 | R1 | Policy page provides raw JSON/hash view. |
| **PRD-POL-012** | The product MUST never imply that a policy can authorize actions not implemented by the target adapter. | P0 | R1 | Builder/validator rejects unsupported action-resource mappings. |


## Reporting & evidence

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-REP-001** | Any wallet MUST be able to submit an incident report for a target/rule that permits permissionless reporting. | P0 | R1 | No allowlist of Reporter identities blocks a valid report. |
| **PRD-REP-002** | A Reporter MUST select an existing target, active policy rule and protected resource; the Reporter MUST NOT supply arbitrary executable rule text. | P0 | R1 | UI and Judge reject unsupported rule/resource IDs. |
| **PRD-REP-003** | The report flow MUST support structured Evidence Artifact Package construction from admissible source URLs and metadata. | P0 | R1 | Reporter can add sources and produce schema-valid EAP JSON/hash. |
| **PRD-REP-004** | The product MUST classify evidence sources using the defined source classes and provenance groups. | P0 | R1 | Each source carries sourceClass and provenanceGroup or equivalent rule-relevant metadata. |
| **PRD-REP-005** | The Reporter experience MUST clearly warn that snapshots establish artifact integrity but do not by themselves establish original-source provenance. | P1 | R1 | Evidence UI distinguishes original source from snapshot. |
| **PRD-REP-006** | The product MUST deterministically reject malformed, oversized, unsupported-scheme and obvious private/local source URLs before non-deterministic judgment. | P0 | R1 | All invalid input fixtures fail before web/LLM mocks are invoked. |
| **PRD-REP-007** | The report flow MUST display expected protocol fee and any Reporter bond separately before wallet signing. | P0 | R1 | Pre-sign screen shows transaction fee deposit and bond/value as distinct concepts. |
| **PRD-REP-008** | The product MUST support a zero-bond policy without changing permissionless reporting semantics. | P1 | R1 | Valid zero-bond rule can be reported without Vault bond creation. |
| **PRD-REP-009** | After submission, the Reporter MUST receive and retain the incident ID and GenLayer transaction ID immediately. | P0 | R1 | IDs are persisted before long-running tracking begins. |
| **PRD-REP-010** | The product MUST let a Reporter inspect final bond/bounty settlement and claim status when the Vault path is enabled. | P1 | R1 | Incident/report page shows bond amount, final claimable amount and claimed status. |
| **PRD-REP-011** | A Reporter MUST NOT be able to choose the protocol action that follows a report. | P0 | R1 | Report payload contains no action selector and Kernel derives effects from policy. |


## Incident lifecycle

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-INC-001** | Every incident page MUST show the claim, target, resource, rule, Reporter, evidence artifact identity and current application outcome. | P0 | R1 | All fields render from chain/artifact data. |
| **PRD-INC-002** | The UI MUST distinguish raw GenLayer transaction status from Reclose DecisionOutcome. | P0 | R1 | `Undetermined` protocol status is never displayed as application `UNDETERMINED` without explicit labels. |
| **PRD-INC-003** | The UI MUST distinguish provisional/appealable state from final state. | P0 | R1 | Accepted result is labelled provisional/appealable and final only after finalization. |
| **PRD-INC-004** | The product MUST track and expose child transactions triggered by Judge -> Kernel -> Target messages. | P0 | R1 | Incident trace lists required child transaction IDs and status. |
| **PRD-INC-005** | The product MUST treat a transaction as successful only when lifecycle and execution result indicate success. | P0 | R1 | Finalized error is rendered as error, not success. |
| **PRD-INC-006** | Where the canonical flow requires target execution, the product MUST verify target post-state before presenting intervention as complete. | P0 | R1 | Completion waits for expected target state read. |
| **PRD-INC-007** | Duplicate accepted or final messages MUST NOT create duplicate target or economic effects. | P0 | R1 | Repeated delivery fixtures result in one effective action. |
| **PRD-INC-008** | Provisional actions MUST be limited to the policy-approved reversible authority-reducing set. | P0 | R1 | Kernel rejects provisional PAUSE/value/upgrade/authority-expansion actions in R1. |
| **PRD-INC-009** | A final REJECTED outcome MUST reconcile and remove only the provisional restrictions created by that incident. | P0 | R1 | Unrelated incident restrictions remain active. |
| **PRD-INC-010** | A final UNDETERMINED outcome MUST follow the explicit policy uncertainty mapping and MUST NOT implicitly escalate to maximum intervention. | P0 | R1 | Reference policy resolves to MONITORED only. |
| **PRD-INC-011** | The Incident Explorer MUST show the exact policy consequence separately from the GenLayer judgment. | P0 | R1 | UI has distinct Decision and Policy Consequence sections. |
| **PRD-INC-012** | The Incident Explorer MUST show the execution result separately from policy consequence. | P0 | R1 | User can see action requested versus action actually executed. |
| **PRD-INC-013** | An incident created under a stale policy MUST NOT create new final authority effects unless the active policy explicitly recognizes it. | P0 | R1 | Stale-policy final can reconcile old provisional effects but not create new final effects. |
| **PRD-INC-014** | The product SHOULD expose appeal capability when GenLayer lifecycle indicates appeal is available and the user has sufficient means to fund it. | P1 | R1 | Appeal CTA is driven by lifecycle/SDK quote, not wall-clock guesses. |


## Recovery

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-REC-001** | The product MUST treat recovery as a separate lifecycle rather than a manual unpause. | P0 | R1 | Confirmed critical incident enters remediation/recovery workflow before NORMAL. |
| **PRD-REC-002** | A recovery submission MUST reference a confirmed parent incident and MUST NOT let the Reporter redirect target/resource. | P0 | R1 | Judge derives target/resource from parent and rejects invalid parent. |
| **PRD-REC-003** | Failed or UNDETERMINED remediation MUST NOT restore restricted authority. | P0 | R1 | Target remains restricted when remediation is not confirmed. |
| **PRD-REC-004** | Confirmed remediation MUST transition the target into RECOVERY and release only restrictions configured for remediation release. | P0 | R1 | Safe-mode restriction can release while provider revoke remains. |
| **PRD-REC-005** | Recovery validation MUST restore only those restrictions whose release phase is RECOVERY_VALIDATED. | P0 | R1 | Provider A remains disabled until recovery validation. |
| **PRD-REC-006** | The target MUST return to NORMAL only when no other active incident requires a restrictive state. | P0 | R1 | Overlapping incident fixture blocks NORMAL restoration. |
| **PRD-REC-007** | The recovery UI MUST show what evidence/conditions remain before normal operation can resume. | P1 | R1 | Recovery page lists pending rule, affected resource and remaining restriction(s). |
| **PRD-REC-008** | Human override restoration, where enabled, MUST be visibly distinguishable from GenLayer-validated recovery. | P0 | R1 | Audit and UI label HUMAN_OVERRIDE. |


## Explorer & audit

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-EXP-001** | Reclose MUST provide a public Incident Explorer with a causal timeline from report through recovery. | P0 | R1 | Incident detail exposes report, evidence, consensus, policy, action, execution and recovery stages. |
| **PRD-EXP-002** | Every consequential autonomous action MUST be attributable to target, policy, rule, evidence, Judge decision and execution transaction. | P0 | R1 | Audit export contains all required identifiers. |
| **PRD-EXP-003** | The Explorer MUST link parent and child GenLayer transactions. | P0 | R1 | Judge, Kernel and Target transaction IDs appear as a navigable trace. |
| **PRD-EXP-004** | The Explorer MUST display source URLs and artifact hashes without presenting external source text as trusted application instructions. | P0 | R1 | Evidence area is visually marked as external/untrusted material. |
| **PRD-EXP-005** | The Explorer MUST expose active and historical restrictions by incident reason. | P0 | R1 | Users can see why a resource remains unavailable when multiple incidents overlap. |
| **PRD-EXP-006** | The Explorer SHOULD provide downloadable machine-readable audit data. | P1 | R1 | User can export JSON for an incident/target trace. |
| **PRD-EXP-007** | The product MUST show human override actions as a distinct audit actor/type. | P0 | R1 | Override cannot be confused with GenLayer decision. |
| **PRD-EXP-008** | The product MUST expose deployed contract addresses, policy hash and Judge version on relevant detail pages. | P1 | R1 | Details are visible/copyable. |
| **PRD-EXP-009** | The product SHOULD surface fee deposit, consumed fee and refund as distinct values when the SDK provides them. | P1 | R1 | Transaction detail does not conflate deposit with final fee. |


## Developer & agent interfaces

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-DEV-001** | Reclose MUST expose a protocol SDK so integrations do not depend on scraping the web application. | P0 | R1 | SDK package supports required read methods and transaction-building helpers. |
| **PRD-DEV-002** | The SDK MUST expose `getAssuranceState` or equivalent for a target. | P0 | R1 | Call returns canonical target state. |
| **PRD-DEV-003** | The SDK MUST expose effective resource/provider authorization. | P0 | R1 | Agent can determine whether Provider A is usable without parsing incidents itself. |
| **PRD-DEV-004** | The SDK MUST expose incident/decision details including provisional/final distinction. | P0 | R1 | Agent can identify current outcome and decision stage. |
| **PRD-DEV-005** | The SDK MUST expose policy validation, canonical hashing and policy diff helpers. | P0 | R1 | Equivalent manifest fixture hashes match and authority diff classifications are correct. |
| **PRD-DEV-006** | The SDK MUST expose incident and recovery transaction builders without custodying the caller private key. | P0 | R1 | Builder returns transaction request/SDK call; signature remains in caller wallet/agent. |
| **PRD-DEV-007** | The CLI MUST support status, target inspection, policy validation/hash/diff, incident report/inspect, recovery submission, Sentinel operation, audit export and benchmark execution. | P1 | R1 | Documented CLI commands execute against R1 fixtures/network where applicable. |
| **PRD-DEV-008** | Reclose MUST publish a `skill.md` describing safe machine interaction for autonomous agents. | P1 | R1 | Skill documents read/report operations and explicitly forbids self-authority expansion. |
| **PRD-DEV-009** | The ordinary agent interface MUST NOT expose policy activation, owner change, Judge installation or authority expansion. | P0 | R1 | Agent-facing API/skill lacks those operations; admin interface is separate. |
| **PRD-DEV-010** | A hosted HTTP API MAY provide indexed reads and transaction-building convenience, but direct protocol/SDK access MUST remain possible without it. | P0 | R2 | Disabling hosted API does not remove onchain read/write path through SDK/RPC. |
| **PRD-DEV-011** | The hosted API MUST NOT be the source of truth for target state, policy validity or incident outcome. | P0 | R2 | API responses include chain-derived identifiers and can be verified independently. |
| **PRD-DEV-012** | Future MCP integration, if shipped, MUST wrap the same bounded SDK capabilities rather than introducing new authority. | P1 | R4 | MCP tool surface is a subset of approved SDK/admin surfaces. |


## Sentinels

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-SEN-001** | Reclose MUST provide a reference Sentinel capable of monitoring configured public sources and building reports. | P0 | R1 | Reference Sentinel detects configured demo signal and builds/submits EAP. |
| **PRD-SEN-002** | A Sentinel MUST have no privileged truth or target-control authority. | P0 | R1 | Sentinel credentials can submit reports only; target rejects direct action. |
| **PRD-SEN-003** | The reference Sentinel SHOULD maintain a duplicate cache to reduce repeated reports, while contract-level duplicate safety remains authoritative. | P1 | R1 | Repeated same source event does not normally generate repeated report; disabling cache does not break protocol safety. |
| **PRD-SEN-004** | Sentinel source polling and candidate detection MUST be configurable by target/rule without changing the Judge rule itself. | P1 | R1 | Config can change cadence/source list while rule ID remains pinned. |
| **PRD-SEN-005** | Sentinel MUST persist submitted transaction IDs and resume lifecycle tracking after process restart. | P0 | R1 | Restart does not resubmit the incident and tracking resumes. |
| **PRD-SEN-006** | Sentinel SHOULD expose operational health metrics including source checks, failures, reports, outcomes and transaction failures. | P1 | R2 | Metrics endpoint/export contains defined counters. |
| **PRD-SEN-007** | Third parties MUST be able to run their own Sentinel or Reporter without permission from Reclose. | P0 | R2 | Documentation + SDK permit independent operator submission. |


## Benchmark & product operations

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-BEN-001** | Reclose MUST publish an Autonomous Assurance Benchmark with at least 50 curated R1 scenarios. | P0 | R1 | Repository includes >=50 labelled scenarios and reproducible runner. |
| **PRD-BEN-002** | Benchmark MUST include confirmed, rejected, ambiguous, adversarial prompt-injection, remediation and recovery scenarios. | P0 | R1 | Required class minimums are satisfied. |
| **PRD-BEN-003** | Benchmark reporting MUST publish class-level precision/recall and safety-relevant error metrics rather than one aggregate accuracy number. | P0 | R1 | Report includes required per-class metrics. |
| **PRD-BEN-004** | The product MUST expose benchmark methodology/results from the public app or documentation. | P1 | R1 | Benchmark page links methodology, version and report. |
| **PRD-BEN-005** | R1 release MUST be blocked by any unauthorized action, duplicate economic effect, autonomous authority expansion, Kernel invariant violation or cross-incident erroneous restoration in the test corpus. | P0 | R1 | CI hard-fails on these invariant tests. |
| **PRD-BEN-006** | The product SHOULD expose deployment, policy, fee-profile and benchmark hashes for a released build. | P1 | R1 | About/deployment page includes immutable release identities. |
| **PRD-BEN-007** | The product MUST keep Reclose core open and must not require a project-specific token for R1 use. | P0 | R1 | No R1 requirement/contract path depends on a Reclose token. |


## External integrations

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-INT-001** | The first external account actuator SHOULD target Safe on Base using typed bounded assurance actions. | P1 | R3 | Adapter cannot execute arbitrary caller-supplied target/value/data. |
| **PRD-INT-002** | Reclose SHOULD preserve ERC-7579-compatible modular-account direction for generic smart-account support. | P1 | R3 | Generic adapter maps only supported execution modes/capabilities. |
| **PRD-INT-003** | Reclose MAY consume ERC-8004 identity/reputation/validation data as evidence or metadata, but MUST NOT treat it as runtime truth by itself. | P1 | R4 | Integration never bypasses Reclose incident judgment solely on reputation. |
| **PRD-INT-004** | Hyperlane SHOULD be the first cross-chain transport adapter while the Kernel remains transport-independent. | P1 | R3 | Gateway interface permits transport replacement without Kernel redesign. |
| **PRD-INT-005** | Only final Reclose decisions MAY produce cross-chain/EVM assurance actions. | P0 | R3 | No provisional external message path exists. |
| **PRD-INT-006** | AntSeed MAY be used as an early agent-service ecosystem integration, but Reclose core MUST remain correct without it. | P1 | R4 | AntSeed adapter can be disabled with no effect on core assurance operation. |


## Security

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **NFR-SEC-001** | Reclose MUST use default-deny authority semantics: unknown actions/resources are rejected. | P0 | R1 | Unsupported action/resource fixtures fail closed. |
| **NFR-SEC-002** | The AssuranceKernel MUST be deployed without an upgrader. | P0 | R1 | No upgrade surface exists in Kernel schema/source. |
| **NFR-SEC-003** | No LLM output MUST be able to supply arbitrary target address, calldata or authority. | P0 | R1 | DecisionRecord schema contains no executable arbitrary payload. |
| **NFR-SEC-004** | All externally sourced text MUST be treated as untrusted evidence and prompts MUST restrict inputs/outputs. | P0 | R1 | Prompt-injection fixtures do not change rule/action semantics. |
| **NFR-SEC-005** | Judge validators MUST independently assess the substantive evidence rather than validate output schema only. | P0 | R1 | Leader false decision + valid schema is rejected by validator fixture. |
| **NFR-SEC-006** | Every action receiver MUST be idempotent. | P0 | R1 | Duplicate delivery produces one semantic/economic effect. |
| **NFR-SEC-007** | Target adapters MUST independently validate supported action/resource/bounds even after Kernel validation. | P0 | R1 | Malformed/unsupported Kernel action fixture is rejected by target. |
| **NFR-SEC-008** | Reclose-operated server credentials MUST never hold protected target treasury or owner keys. | P0 | R1 | Architecture and deployment secrets inventory shows Sentinel/reporting keys only. |
| **NFR-SEC-009** | Critical source policies MUST support failure/ambiguity without defaulting to CONFIRMED. | P0 | R1 | Missing/contradictory critical evidence yields UNDETERMINED or validator disagreement. |
| **NFR-SEC-010** | Private/confidential source material MUST NOT be represented as supported by the public R1 consensus path. | P0 | R1 | Docs/UI explicitly scope R1 to independently accessible evidence. |


## Reliability & liveness

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **NFR-REL-001** | Core assurance operation MUST remain possible if the hosted Reclose web app is unavailable. | P0 | R1 | SDK/CLI/direct RPC can still inspect and submit supported transactions. |
| **NFR-REL-002** | Core assurance operation MUST remain possible if Reclose-hosted Sentinel infrastructure is unavailable, provided another Reporter triggers the protocol. | P0 | R2 | Independent Reporter can submit and complete an incident. |
| **NFR-REL-003** | The application MUST persist transaction IDs immediately after successful submission. | P0 | R1 | Process/browser restart resumes same tx. |
| **NFR-REL-004** | The repository MUST support reproducible redeployment to 61997 after an environment reset. | P0 | R1 | Clean redeploy requires documented command and funded deployer only. |
| **NFR-REL-005** | The application MUST use measured fee profiles for materially expensive/message-emitting R1 paths. | P0 | R1 | CI detects missing profile coverage. |
| **NFR-REL-006** | The application MUST not infer failed submission from client timeout alone. | P0 | R1 | Timeout flow resumes polling known tx ID rather than resubmitting. |
| **NFR-REL-007** | Long-running transactions MUST not force the user to keep a modal or page open continuously. | P1 | R1 | User can navigate away and return to tracked tx. |
| **NFR-REL-008** | Reclose MUST distinguish temporary source unavailability from a semantic negative decision. | P0 | R1 | Unavailable required source maps to defined uncertainty/failure handling, not REJECTED unless rule specifies. |


## UX & accessibility

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **NFR-UX-001** | The main UI MUST explain evidence, GenLayer judgment, policy consequence and execution as separate concepts. | P0 | R1 | Incident page has visually distinct sections/stages for all four. |
| **NFR-UX-002** | The product MUST avoid generic security/AI wording that implies one AI model directly controls user assets. | P1 | R1 | Core UI copy follows Reclose vocabulary guidelines. |
| **NFR-UX-003** | Raw protocol details MUST be available without overwhelming ordinary users. | P1 | R1 | Primary state is concise; advanced panel exposes hashes/statuses/addresses. |
| **NFR-UX-004** | Every destructive or authority-changing owner action MUST have a clear pre-sign review state. | P0 | R1 | Review shows exact effect and distinguishes authority increase/reduction/revocation. |
| **NFR-UX-005** | Error states MUST provide stable error code and actionable explanation where possible. | P1 | R1 | Known Kernel/Judge/Vault/Agent errors map to user-facing messages without hiding raw code. |
| **NFR-UX-006** | Empty states MUST explain the next meaningful action rather than present blank dashboards. | P2 | R1 | No-target/no-incident/no-policy screens include contextual CTA or explanation. |
| **NFR-UX-007** | The application MUST be responsive across desktop and common mobile widths for read/monitoring flows. | P1 | R1 | No horizontal overflow/clipped critical content at 360px, 768px, 1440px. |
| **NFR-UX-008** | Critical status information MUST not rely on colour alone. | P0 | R1 | State/outcome use text/icon/shape in addition to colour. |
| **NFR-UX-009** | Interactive controls SHOULD meet WCAG 2.1 AA keyboard/focus/label expectations. | P1 | R1 | Automated accessibility scan has no critical violations and key journeys work by keyboard. |
| **NFR-UX-010** | The visual system SHOULD reflect system state, continuity, isolation and recovery rather than generic AI/Web3 motifs. | P1 | R1 | Design review accepts product-native state/trace language and rejects generic glow/shield/robot treatment. |


## Performance

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **NFR-PERF-001** | Read-only dashboard/target/incident views SHOULD render usable content within 2.5 seconds on a typical broadband connection when index/read services are healthy. | P2 | R1 | Measured median LCP or equivalent <=2.5s on reference environment. |
| **NFR-PERF-002** | The UI MUST provide immediate submission acknowledgement once a GenLayer transaction ID is returned, without waiting for consensus completion. | P0 | R1 | Tx ID/timeline appears immediately after submission response. |
| **NFR-PERF-003** | Explorer reads SHOULD avoid unnecessary repeated RPC calls by caching immutable policy/artifact metadata while refreshing mutable lifecycle state. | P2 | R1 | Network trace shows immutable metadata cache and bounded polling. |
| **NFR-PERF-004** | Sentinel polling cadence MUST be configurable and MUST NOT be hard-coded into protocol contracts. | P1 | R1 | Cadence change requires config only. |
| **NFR-PERF-005** | The product MUST avoid blocking UI interaction during long-running GenLayer consensus operations. | P1 | R1 | Other app navigation remains usable while tx tracks globally. |
| **NFR-PERF-006** | Benchmark execution SHOULD record decision latency and fee/cost alongside accuracy metrics. | P1 | R1 | Benchmark report includes latency and fee fields. |


## Observability & support

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **NFR-OBS-001** | Every release MUST publish a deployment manifest containing chain ID, toolchain family, contract addresses, policy hash, source commit, fee-profile hash and benchmark hash. | P0 | R1 | verification.json/manifest includes all fields. |
| **NFR-OBS-002** | Protocol and product logs MUST use stable incident/action/transaction identifiers to correlate a user-visible flow. | P1 | R1 | A canonical demo trace can be reconstructed from logs by IDs. |
| **NFR-OBS-003** | The product SHOULD capture frontend product analytics for funnel completion and errors without making analytics a protocol dependency. | P2 | R2 | Disabling analytics has no product/protocol correctness effect. |
| **NFR-OBS-004** | Analytics SHOULD avoid collecting private keys, seed phrases, raw secret credentials or unnecessary wallet-linked personal data. | P0 | R2 | Data inventory contains none of the prohibited fields. |
| **NFR-OBS-005** | Sentinel SHOULD expose source failure and transaction failure metrics sufficient to detect liveness degradation. | P1 | R2 | Metrics include defined failure counters/health state. |
| **NFR-OBS-006** | The app SHOULD expose a status/help path explaining current network, known release-candidate limitations and how to verify transactions independently. | P1 | R1 | About/status page documents 61997 and verification links. |


## Compatibility & portability

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **NFR-CMP-001** | R1 MUST use the canonical 61997 Studio-dev identity and matching RC chain definition rather than manually mixing stable 61999 configuration. | P0 | R1 | Network preflight fails if chain ID !=61997. |
| **NFR-CMP-002** | The exact RC toolchain and runner dependency MUST be pinned through a conformance smoke deployment before project deployment. | P0 | R1 | G0 smoke deployment finalized successfully and versions.lock/runner.lock committed. |
| **NFR-CMP-003** | Frontend, CLI, SDK and Sentinel MUST share canonical schemas and enum definitions rather than independently reimplementing protocol semantics. | P0 | R1 | Single package/schema source is imported or generated across clients. |
| **NFR-CMP-004** | The cross-chain architecture MUST remain transport-independent even when Hyperlane is implemented first. | P1 | R3 | Kernel interface contains no Hyperlane-specific execution semantics. |
| **NFR-CMP-005** | Technical protocol primitives MUST remain neutral names (AssuranceKernel, DecisionRecord, etc.) and MUST NOT be needlessly renamed to branded equivalents. | P1 | R1 | Source/schema names follow Naming Record rule. |
| **NFR-CMP-006** | If the 61997 RC surface changes, the project MUST rerun conformance, lint/schema, fee profiles and full tests before accepting the dependency change. | P0 | R1 | Dependency update checklist/CI demonstrates rerun. |


## Self-evolution roadmap

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-EVO-001** | R1 MUST NOT give generated code production execution authority. | P0 | R1 | No self-generated module promotion path exists in R1. |
| **PRD-EVO-002** | Replaceable modules SHOULD expose stable module type/version/manifest identity for future evolution governance. | P1 | R1 | Judge/adapter modules expose required identity views where feasible. |
| **PRD-EVO-003** | Future candidate promotion MUST never permit autonomous authority expansion or Kernel mutation. | P0 | R5 | Evolution invariant suite blocks both conditions. |
| **PRD-EVO-004** | Future evolution lifecycle MUST support candidate tests, shadow mode, canary and rollback before promotion. | P1 | R5 | Promotion requires all configured gates. |


## Business & ecosystem

| ID | Requirement | Priority | Release | Acceptance criterion |
|---|---|---:|---|---|
| **PRD-BIZ-001** | The core Reclose protocol MUST be usable without purchasing a proprietary Reclose subscription. | P0 | R2 | Open contracts/SDK enable self-hosted use; managed services are optional. |
| **PRD-BIZ-002** | Managed Reclose services MAY monetize hosted Sentinels, monitoring, policy tooling, enterprise assurance and integrations without becoming protocol authorities. | P1 | R2 | Service outage cannot alter onchain truth/authority. |
| **PRD-BIZ-003** | Reclose SHOULD expose composable assurance-state reads so other protocols can consume state without repeating the original semantic judgment. | P1 | R2 | Documented read interface returns state/restrictions/incidents. |
| **PRD-BIZ-004** | Reclose MUST avoid claims that imply perfect security or guaranteed zero defects. | P0 | R1 | Marketing/docs frame zero unsafe actions as engineering target, not absolute guarantee. |

---

# 22. Priority definitions

| Priority | Meaning |
|---|---|
| P0 | Release-blocking for the stated release; absence changes correctness, trust model or canonical product story |
| P1 | Strongly expected for the stated release; may be de-scoped only with documented release decision if core invariants remain intact |
| P2 | Product-quality improvement; not allowed to compromise P0/P1 work |

---

# 23. Open product parameters, not open architecture

The following may be calibrated without reopening the product architecture:

- report bond size;
- bounty size;
- policy activation delay within Kernel constraints;
- evidence age;
- Sentinel cadence;
- recovery observation window;
- safe-mode spending ceiling;
- polling intervals;
- benchmark release thresholds after baseline measurement.

Each parameter must have an owner, allowed range and test/calibration procedure before production use.

---

# 24. Product decisions intentionally not made here

- whether Reclose should ever issue a project-specific token;
- final production pricing;
- final enterprise packaging;
- final logo/visual identity system;
- final external-chain production sequence after R1;
- production legal/trademark strategy beyond the Naming & Brand Decision Record.

None blocks R1.

---

# 25. Product definition of success

Reclose succeeds when a protocol owner can delegate a narrow defensive authority, a third party can submit evidence without permission, GenLayer can adjudicate the defined condition, Reclose can apply only the pre-authorized consequence, an autonomous system can adapt without human intervention, and any observer can reconstruct exactly why that change occurred.

The product should make the following statement true in practice:

> **The app is the control room. The SDK/API makes Reclose usable by software. The contracts are the enforcement system.**

And the hosted interfaces must remain replaceable without replacing the trust model.

---

# Appendix A - Current GenLayer references used by this PRD

- Consensus v0.6 Migration: https://docs.genlayer.com/developers/consensus-v06-migration
- Querying a Transaction: https://docs.genlayer.com/developers/decentralized-applications/querying-a-transaction
- Transaction statuses: https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/transactions/transaction-statuses
- Messages: https://docs.genlayer.com/developers/intelligent-contracts/features/messages
- Interacting with Intelligent Contracts: https://docs.genlayer.com/developers/intelligent-contracts/features/interacting-with-intelligent-contracts
- Fees and Transaction Policy: https://docs.genlayer.com/developers/decentralized-applications/fees-and-transaction-kit
- Fee Profiling and Estimation: https://docs.genlayer.com/developers/decentralized-applications/fee-profiling-and-estimation
- Transaction Kit Integration: https://docs.genlayer.com/developers/decentralized-applications/transaction-kit-integration
- Web Access: https://docs.genlayer.com/developers/intelligent-contracts/features/web-access
- Prompt Injection: https://docs.genlayer.com/developers/intelligent-contracts/security-and-best-practices/prompt-injection
- Value Transfers: https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers

---

# Appendix B - Governing Reclose documents

1. Research Closure & Architecture Decision Record
2. Master Design Package
3. Implementation Specification
4. Naming & Brand Decision Record
5. Product Requirements Document (this document)
6. Requirements Traceability Matrix

The Requirements Traceability Matrix is the release-control companion to this PRD. It maps each requirement to architecture, implementation ownership, verification and release evidence.
