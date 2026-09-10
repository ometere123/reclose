# Repository Build Master Plan

**Status:** EXECUTION AUTHORITY FOR CLAUDE-ONLY REPOSITORY BUILD  
**Product:** **Reclose**  
**Date:** 9 September 2026  
**Canonical R1 network:** GenLayer Studio-dev, chain ID **61997**  
**Implementation agent:** **Claude Code**  
**Repository owner:** Human project owner  
**External reviewer:** Independent reviewer designated by the repository owner; for this build, ChatGPT is the intended external audit reviewer  
**Purpose:** convert the six locked Reclose governance documents into one controlled repository-delivery programme, with explicit Studio-dev compatibility and security-assurance baselines, without reopening product or architecture decisions during implementation.

---

# 1. Purpose

This document governs **how Reclose is built**.

It is not a seventh product or architecture specification. It does not replace:

1. Research Closure & Architecture Decision Record;
2. Master Design Package;
3. Implementation Specification;
4. Naming & Brand Decision Record;
5. Product Requirements Document;
6. Requirements Traceability Matrix.

Its job is to prevent a single powerful implementation agent from drifting into the same failure modes that a multi-agent build could create:

- silently redesigning the product while coding;
- changing architecture because implementation is inconvenient;
- allowing frontend assumptions to redefine protocol truth;
- treating RC/toolchain assumptions as verified facts;
- progressing past failed gates;
- marking code complete without verification and release evidence;
- weakening security invariants to make the demo easier;
- implementing later-roadmap features before R1 is closed;
- making large unreviewable changes across unrelated layers;
- self-certifying architecture/security work that requires independent review;
- fabricating or overstating lifecycle, deployment, benchmark or release evidence.

The governing principle is:

> **Claude Code owns implementation. It does not own Reclose's product truth. The locked governance documents and verified protocol state do.**

---

# 2. Governing document set

The repository MUST contain the following Markdown files under:

```text
docs/governance/
```

with these exact titles:

1. `Research Closure & Architecture Decision Record.md`
2. `Master Design Package.md`
3. `Implementation Specification.md`
4. `Naming & Brand Decision Record.md`
5. `Product Requirements Document.md`
6. `Requirements Traceability Matrix.md`

The PDF versions may exist outside the repository or under a release/documentation directory, but the Markdown files are the machine-readable normative copies used during implementation.


## 2.1 Required execution compatibility record

In addition to the six locked governance documents, the repository MUST contain:

```text
docs/execution/Studio-dev Toolchain & Network Compatibility Record.md
```

This is **not** a seventh governance document.

It is the controlled implementation-era record for:

- Studio-dev network identity;
- canonical RPC and chain ID;
- candidate and G0-verified compatible RC package family;
- runner hashes;
- installation/verification status;
- fee/lifecycle implications;
- Studio limitations;
- compatibility findings;
- dependency-change triggers.

The six governance documents should not be rewritten every time a release-candidate package or runner changes.

The compatibility record and machine lock files absorb those execution-sensitive changes.

Before G0, the record may contain a **candidate baseline**. After G0, accepted items are promoted to `G0 VERIFIED` and machine locks become the exact executable baseline.

## 2.2 Required security assurance plan

Before core feature implementation, the repository MUST contain:

```text
docs/security/Threat Model & Security Assurance Plan.md
```

This is **not** a seventh governance document. It is a living security-assurance record derived from the locked architecture and product requirements. It defines:

- security assets and trust boundaries;
- attacker classes and abuse paths;
- `TM-*` threat identifiers;
- severity and release treatment;
- required controls and verification;
- security audit lifecycle;
- residual-risk acceptance rules;
- threat-to-RTM/test/evidence traceability.

Claude MUST NOT weaken governance through this document. If a mitigation requires an architectural change, normal architecture-deviation/governance control applies.

The baseline threat model MUST exist before S0. Its implementation status is tracked in `docs/security/Threat Status.csv` and security findings are recorded in `docs/security/Security Findings.md`.

## 2.3 Domain-specific authority

Do not force every document into one simplistic linear hierarchy. Apply authority according to subject:

| Subject | Authority |
|---|---|
| Live Studio-dev behaviour, exact RC compatibility, linter/schema/runtime facts | Verified chain 61997 behaviour + accepted `Studio-dev Toolchain & Network Compatibility Record.md` + exact machine lock files |
| Fundamental invariants, trust boundaries, architecture reopening rules | Research Closure & Architecture Decision Record |
| System architecture, topology, release architecture, long-term design | Master Design Package |
| Engineering behaviour, storage, methods, message timing, schemas, tests, deployment | Implementation Specification |
| Product behaviour, user journeys, UX requirements, R1 product scope | Product Requirements Document |
| Requirement completeness, verification and release evidence | Requirements Traceability Matrix |
| Product identity, terminology and visual-brand constraints | Naming & Brand Decision Record |
| Threat inventory, control mapping, security verification and residual-risk status | `docs/security/Threat Model & Security Assurance Plan.md`, subordinate to locked governance |
| Build sequence, phase authorization, branching, audit gates, execution control | This Repository Build Master Plan |

When a product requirement conflicts with a protocol invariant, the invariant wins and the conflict must be recorded.

When an implementation detail conflicts with verified 61997 RC behaviour, verified compatible runtime behaviour wins and the compatibility process in this plan is triggered.

Claude MUST NOT silently resolve a material contradiction by choosing whichever document is easier to implement.

---

# 3. Roles and decision rights

## 3.1 Repository owner

The repository owner:

- authorizes the implementation programme;
- decides whether governance documents may be reopened;
- supplies or authorizes deployment credentials where needed;
- decides release/deferment questions allowed by the RTM;
- carries Claude's audit packets to the external reviewer;
- returns external findings to Claude;
- gives the final submission/release authorization.

## 3.2 Claude Code

Claude Code is the **sole repository implementation agent**.

Claude is responsible for every implementation domain required for Reclose R1, including:

```text
contracts/
schemas/
policies/
evidence/
packages/policy-compiler/
packages/evidence-builder/
packages/protocol-sdk/
packages/transaction-tracker/
sentinel/
frontend/
frontend tests
protocol/shared tests
benchmark/
deploy/
deployment/
toolchain/
integrations/
fee-profile.json
CI/release engineering
repository-generated implementation documentation
release evidence
RTM execution status
```

Claude therefore owns both protocol engineering and frontend/product execution **as implementation work**.

Claude does not gain authority to redefine:

- architecture;
- product requirements;
- security invariants;
- naming/brand constraints;
- R1 release definition;
- GenLayer truth semantics.

## 3.3 External reviewer

The external reviewer does not implement Reclose by default.

The reviewer's job is to independently examine designated audit packets and repository states for:

- architecture drift;
- security failures;
- GenLayer/runtime misunderstandings;
- requirement gaps;
- frontend/protocol semantic divergence;
- unsupported product claims;
- insufficient evidence;
- release blockers;
- missing or misclassified threats;
- insufficient mitigation/test coverage for CRITICAL/HIGH `TM-*` threats;
- unjustified residual-risk acceptance.

Claude MUST NOT mark a designated external audit gate as `PASS` by reviewing its own work.

## 3.4 Governance documents

The six locked governance documents are not “reference material”. They are the product and architecture authority.

Claude implements them. Claude does not silently rewrite them to match whatever code it happened to produce.

---

# 4. Permanent build principles

These apply to every phase.

## 4.1 Read before acting

Claude MUST read the relevant governance and execution documents before implementation and MUST NOT paraphrase them into weaker rules.

## 4.2 No architecture by convenience

The following are not valid reasons to change architecture:

- fewer files;
- easier frontend implementation;
- easier contract code;
- framework preference;
- avoiding asynchronous transaction handling;
- simplifying tests;
- reducing contract count;
- using one overloaded status model;
- a different pattern being fashionable;
- deadline pressure.

## 4.3 Protocol truth is not frontend state

The frontend may display, cache, index and explain protocol state. It may not invent or redefine it.

## 4.4 Hosted infrastructure is not authority

The Reclose app, API, indexer, Sentinel and backend may improve usability and liveness but cannot become a required source of truth for protocol correctness.

## 4.5 Verification beats assertion

A phase is not complete because Claude reports that it is complete. Completion requires the tests, evidence and gate criteria specified by the RTM and this plan.

## 4.6 R1 is real

The canonical demonstration must use real chain 61997 transactions and actual implemented behaviour.

Synthetic fixtures are allowed for frontend development before real integration but MUST be clearly labelled and MUST never be used as deployment/release evidence.

## 4.7 Security beats demo convenience

No hackathon deadline authorizes:

- arbitrary AI-generated calldata;
- upgradeable constitutional Kernel;
- centralized truth decisions;
- fake finality;
- fake EVM execution on Studio;
- disabled replay protection;
- fake benchmark results;
- unsafe authority expansion;
- recovery without evidence;
- hidden trusted backend shortcuts.

## 4.8 One agent does not mean one giant task

Claude MUST implement in controlled phases and reviewable commits. “Build Reclose” is never an acceptable internal phase definition.

## 4.9 Internal separation still matters

Because Claude owns both frontend and protocol, it is especially important to preserve a strict **Frontend Contract v1** between protocol-facing data and product UI.

The same agent MUST NOT use its cross-layer access as an excuse to create undocumented coupling.

## 4.10 Security threats are traceable work items

The Threat Model & Security Assurance Plan is active throughout implementation. Security-relevant changes MUST identify affected `TM-*` threat IDs where practical.

A threat is not mitigated because code exists. It is `MITIGATED / VERIFIED` only when the required tests/evidence exist. New attack paths discovered during implementation receive new threat IDs and are not buried in prose-only audit notes.

CRITICAL threats cannot be accepted as residual risk for R1. HIGH threats that violate a P0 requirement or locked invariant cannot be accepted.

---

# 5. Repository strategy

## 5.1 Protected branch

`main` is the integration/release branch.

Large exploratory implementation MUST NOT happen directly on `main`.

## 5.2 Audited tranche branches

Recommended build branches:

```text
claude/r1-foundation
claude/r1-core
claude/r1-consensus
claude/r1-product
claude/r1-release
```

Each branch begins from the last accepted checkpoint.

Recommended mapping:

| Branch | Main work | External gate before checkpoint acceptance |
|---|---|---|
| `claude/r1-foundation` | G0, F0, F1, S0 | A0 |
| `claude/r1-core` | Kernel, policy, reference target | A1 |
| `claude/r1-consensus` | Judge, evidence, lifecycle, recovery, Vault, SDK/Sentinel foundations | A2 |
| `claude/r1-product` | frontend, real SDK integration, transaction UX, product flows | A3 |
| `claude/r1-release` | 61997 E2E, benchmark, hardening, RTM closure | A4 |

The repository owner may use one long-lived `claude/r1-build` branch instead, but checkpoint commits MUST still be immutable references for external audit.

## 5.3 No multi-agent worktree requirement

Separate Codex/Claude worktrees are no longer required.

If Claude internally uses subagents, each subagent is subordinate to this same plan. The parent Claude session remains responsible for consistency, review, tests and evidence.

Internal subagents do not gain independent design authority.

## 5.4 No force rewriting audited history

After an audit packet references a commit, Claude MUST NOT rewrite that commit's history.

Fixes should be additional commits so the reviewer can inspect the delta.

---

# 6. Required repository execution artifacts

During the build, create:

```text
docs/security/
├── Threat Model & Security Assurance Plan.md
├── Threat Status.csv
└── Security Findings.md

docs/execution/
├── Current Phase.md
├── Frontend Contract v1.md
├── Requirements Status.csv
├── Phase Log.md
├── Studio-dev Toolchain & Network Compatibility Record.md
├── Interface Change Log.md
├── Architecture Deviations.md
├── Open Blockers.md
├── Audit Register.md
└── audit-packets/
    ├── A0/
    ├── A1/
    ├── A2/
    ├── A3/
    └── A4/

release-evidence/
└── r1/
    ├── g0/
    ├── contracts/
    ├── transactions/
    ├── frontend/
    ├── sentinel/
    ├── benchmark/
    ├── fees/
    ├── security/
    ├── deployment/
    └── demo/
```

These are execution/release artifacts, not new governance documents.

Large binary evidence may live outside Git where necessary, but the repository must contain a stable reference, checksum where appropriate, and enough metadata to understand what the artifact proves.

---

# 7. Current Phase control

Create:

```text
docs/execution/Current Phase.md
```

Minimum content:

```text
Current phase:
Phase status:
Authorized scope:
Blocked/dependent phases:
Required gate to advance:
Latest accepted audit:
Current branch:
Current commit:
Updated at:
```

Claude may advance ordinary internal phases after their objective criteria pass.

Claude MUST NOT advance past an external audit gate until the repository owner supplies the audit decision.

---

# 8. RTM operating model

The locked Requirements Traceability Matrix contains **156 requirements**, with **135 assigned to R1**.

The repository MUST operationalize them rather than rewrite the locked RTM.

Create:

```text
docs/execution/Requirements Status.csv
```

with at least:

```text
requirement_id,status,owner,phase,implementation_ref,test_ref,evidence_ref,threat_ref,blocker,commit,last_updated
```

For this Claude-only build, `owner` may use implementation domains such as:

```text
Claude/Protocol
Claude/Frontend
Claude/SDK
Claude/Sentinel
Claude/QA
Claude/Release
Shared
```

Allowed status values exactly:

```text
NOT STARTED
IN PROGRESS
IMPLEMENTED / UNVERIFIED
VERIFIED
DEFERRED BY RELEASE DECISION
BLOCKED
```

Rules:

1. P0/R1 requirements cannot be deferred.
2. P1/R1 deferment requires an explicit release decision and cannot weaken an ADR invariant or canonical demo.
3. Code without the required verification is `IMPLEMENTED / UNVERIFIED`, never `VERIFIED`.
4. Every phase report identifies requirement IDs changed by that phase.
5. A requirement may be `VERIFIED` only when its required verification and evidence exist.
6. Later-release requirements remain traceable but do not block R1 unless they encode a present invariant.
7. Claude may update the execution status ledger but MUST NOT silently rewrite locked PRD/RTM requirement prose.
8. Requirement status should reference concrete file paths, test names, evidence files and commits whenever possible.
9. Security-relevant requirement rows SHOULD reference applicable `TM-*` IDs in `threat_ref`.

---

# 9. Build programme overview

```text
R0 Repository Seed
      |
      v
G0 Toolchain Conformance
      |
      v
F0 Repository Foundation
      |
      v
F1 Internal Frontend Contract Freeze
      |
      v
S0 Security Threat Baseline
      |
      v
A0 External Foundation Audit
      |
      v
C1 Kernel + Policy + Reference Target
      |
      v
A1 External Core Architecture/Security Audit
      |
      v
C2 Judge + Evidence + Lifecycle + Recovery + Vault
      |
      v
C3 SDK + Tracker + Compiler + Sentinel + Fees + Deploy Tooling
      |
      v
A2 External Consensus/Lifecycle/Security Audit
      |
      v
D1 Product/Visual Foundation
      |
      v
D2 Core Read Surfaces
      |
      v
D3 Write/Recovery/Transaction Flows
      |
      v
I1 Mock Integration
      |
      v
I2 Real SDK / Protocol Integration
      |
      v
D4 Accessibility + Edge States + Polish
      |
      v
A3 External Product/Integration Audit
      |
      v
E1 Canonical 61997 End-to-End
      |
      v
H1 Benchmark + Security Hardening
      |
      v
A4 External Pre-Release Audit
      |
      v
R1 Requirements/Evidence Closure
      |
      v
S1 Agent Tank Submission Freeze
```

This is the default critical path.

Claude MAY build clearly independent frontend foundations after F1 while core protocol work continues, but the external audit gates still govern what is accepted and what dependent work may rely upon.

For maximum discipline, the default recommendation is to follow the sequence above rather than interleave many major domains at once.

---

# 10. R0 - Repository Seed

**Owner:** Repository owner  
**Purpose:** ensure Claude begins from the complete source of truth.

Required initial structure:

```text
reclose/
├── docs/
│   ├── governance/
│   │   ├── Research Closure & Architecture Decision Record.md
│   │   ├── Master Design Package.md
│   │   ├── Implementation Specification.md
│   │   ├── Naming & Brand Decision Record.md
│   │   ├── Product Requirements Document.md
│   │   └── Requirements Traceability Matrix.md
│   ├── security/
│   │   └── Threat Model & Security Assurance Plan.md
│   └── execution/
│       └── Studio-dev Toolchain & Network Compatibility Record.md
├── Repository Build Master Plan.md
└── CLAUDE.md
```

The old split-agent `AGENTS.md` MUST NOT remain as an active instruction file because it assigns protocol ownership to Codex and conflicts with this plan.

If the old file already exists, remove it from the active repository before starting Claude, or archive it outside the repository as historical material.

R0 passes when the six governance files, the Threat Model & Security Assurance Plan baseline, the Studio-dev compatibility record, the Master Plan and `CLAUDE.md` exist with the correct names, and no contradictory split-agent instruction file remains active.

---


# 11. G0 - Toolchain Conformance

**Owner:** Claude Code  
**Parallel product work:** none  
**Primary execution input:** `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md`  
**Purpose:** promote the candidate Studio-dev compatibility baseline into an evidenced Reclose-specific runtime baseline.

Claude MUST NOT begin G0 by independently inventing a package list.

Claude first reads the compatibility record, then verifies it against current primary sources and the actual installed/runtime environment.

Claude MUST:

1. read all six governance documents, this plan, `CLAUDE.md`, the Threat Model & Security Assurance Plan, and the Studio-dev compatibility record;
2. review the compatibility record's candidate baseline and open findings;
3. verify the canonical Studio-dev RPC and returned chain identity;
4. prove chain ID `61997`;
5. verify the CLI `studio-dev` preset;
6. verify the JavaScript `studioDevnet` chain object;
7. verify the Python `studio_devnet` chain object;
8. verify the exact CLI, `genlayer-js`, `genlayer-py`, `genlayer-test` and `genvm-linter` versions actually installed;
9. determine the official/accepted installation source for any candidate prerelease that is not available through the assumed package channel;
10. verify the current Intelligent Contract runner and standard-library runner hashes;
11. build the smallest valid deterministic smoke Intelligent Contract using the verified SDK/runner surface;
12. run lint, semantic validation, schema extraction and supported type checking;
13. run available direct/local tests;
14. deploy the smoke contract to chain 61997 when credentials/network permit;
15. persist the transaction ID immediately;
16. observe transaction lifecycle;
17. inspect execution result separately from lifecycle finality;
18. verify deployed/read state where deployment succeeds;
19. prove the deploy fee path and at least one representative write fee path;
20. record every candidate-versus-observed discrepancy;
21. classify each finding `C0`, `C1`, or `C2`;
22. update the compatibility record with G0 status/evidence;
23. freeze accepted values into the machine lock files;
24. initialize/reconcile the RTM execution ledger for G0-related requirements.

Required artifacts:

```text
docs/execution/Studio-dev Toolchain & Network Compatibility Record.md

toolchain/
├── versions.lock
├── runner.lock
└── network.lock.json

release-evidence/r1/g0/
├── preflight.md
├── install-log.txt or equivalent
├── version-report.txt
├── network-verification.json or equivalent
├── smoke-contract.py
├── smoke-schema.json
├── smoke-test-report.*
├── smoke-deployment.json              # if deployment possible
├── smoke-receipt.json                 # if deployment occurs
└── compatibility-evidence-index.md
```

## 11.1 Candidate baseline rule

The compatibility record may enter G0 with values marked:

```text
CANDIDATE
EXTERNALLY VERIFIED
```

Claude MUST NOT copy those values into machine lock files without actual G0 verification.

The accepted Reclose executable baseline is the intersection of:

```text
current primary-source compatibility
+
successful local/tool installation
+
successful linter/test compatibility
+
successful live Studio-dev verification where access permits
```

## 11.2 Discrepancy classes

### C0 - Documentation/example drift

The pinned RC uses a newer equivalent surface without changing Reclose architecture, product behaviour or invariants.

Record evidence and update implementation-facing code, compatibility record and locks as required.

### C1 - Implementation refinement

A technical detail changes without altering product behaviour, authority boundary or locked invariant.

Record it, test it and proceed.

### C2 - Material architecture contradiction

Verified platform behaviour prevents or invalidates a locked Reclose architecture property.

**STOP the affected critical path.**

Do not hide the contradiction behind an adapter, mock, frontend state or undocumented manual step.

Create/update `docs/execution/Architecture Deviations.md` and escalate for governance/ADR reopening decision.

## 11.3 G0 pass criteria

G0 is internally complete only when:

- canonical Studio-dev network identity is proven;
- chain `61997` is runtime-verified;
- accepted toolchain versions are installed and recorded;
- runner hashes are recorded;
- linter/validation/schema path works;
- smoke contract works with the pinned tooling;
- direct/local smoke testing works;
- deployment lifecycle and execution result are verified where deploy access exists;
- fee submission/estimation path is proven where deploy/write access exists;
- compatibility findings are classified;
- accepted values are written to machine lock files;
- the compatibility record is updated;
- no unresolved C2 contradiction remains.

If credentials or an external network prerequisite prevents a required live check, G0 is:

```text
PARTIAL - EXTERNAL BLOCKER
```

not `PASS`.

A0 cannot accept the foundation as fully verified unless the audit decision explicitly accepts the external-only blocker and records the residual risk.

## 11.4 G0 compatibility record promotion

Only after the above checks may Claude change the compatibility record header from:

```text
CANDIDATE BASELINE FOR G0 VERIFICATION
```

to:

```text
G0 VERIFIED EXECUTION BASELINE
```

If any release-blocking item remains unverified, retain a partial/blocked status and identify it explicitly.

---

# 12. F0 - Repository Foundation

**Starts after:** G0 pass or explicitly accepted external-only blocker.

Claude creates the Implementation Specification repository structure, including:

- package/workspace configuration;
- dependency locks;
- `.gitignore`;
- `.env.example` with no secrets;
- lint/typecheck/test foundation;
- CI skeleton;
- contract discovery boundaries;
- deployment-manifest schema;
- evidence/policy schema directories;
- RTM status ledger;
- release-evidence folders;
- conventional root verification scripts.

F0 checks:

- repository clean build;
- no secret material;
- `/contracts` contains only intended deployable sources/interfaces;
- test helpers stay outside deployable discovery;
- exact dependency locks exist;
- root verification commands are documented.

F0 must not silently implement major product features merely because scaffolding touches those directories.

---

# 13. F1 - Internal Frontend Contract Freeze

**Owner and consumer:** Claude Code  
**Purpose:** force a stable interface boundary between Claude's protocol work and Claude's frontend work.

The fact that one agent owns both sides makes this gate **more important, not less**.

Claude MUST define the frontend-facing protocol contract before deep product UI implementation.

## 13.1 Canonical types

At minimum:

- Target;
- AssuranceState;
- Policy summary/detail;
- Policy security diff;
- Incident;
- Evidence/source representation;
- DecisionRecord;
- DecisionOutcome;
- DecisionStage;
- GenLayer transaction/lifecycle representation;
- ActionEnvelope;
- ExecutionReceipt;
- active restrictions/effective capabilities;
- recovery state;
- protocol error envelope;
- fee/transaction preview data.

## 13.2 SDK interface contract

At minimum specify stable signatures/interface stubs for:

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

R1 may add methods required by the PRD/RTM, but semantics MUST be documented.

## 13.3 Transaction truth model

`docs/execution/Frontend Contract v1.md` MUST explicitly distinguish:

- GenLayer transaction status;
- application DecisionOutcome;
- DecisionStage;
- execution result;
- child transaction state;
- expected target post-state.

The frontend contract MUST NOT expose one overloaded `status` that erases these distinctions.

## 13.4 Required fixtures

Provide realistic validated synthetic fixtures for at least:

```text
normal target
monitored target
restricted target
safe-mode target
paused target
recovery target
confirmed incident
rejected incident
undetermined incident
provisional incident
appealable incident where represented
finalized-success transaction trace
finalized-execution-error trace
child-transaction failure trace
multi-incident target
policy authority-expansion diff
wrong-network/error responses
```

Fixtures MUST validate against canonical types and be clearly labelled synthetic.

## 13.5 F1 acceptance

F1 passes internally when:

1. shared types compile;
2. schema tests pass;
3. fixture validation passes;
4. transaction semantics are documented;
5. every R1 screen can be built without inventing a protocol field;
6. every P0/R1 shared-interface requirement has an implementation path;
7. no unresolved interface contradiction remains.

Create:

```text
docs/execution/Frontend Contract v1.md
```

and mark its version/hash/commit.

---

# 14. S0 - Security Threat Baseline

**Owner:** Claude Code  
**Starts after:** F0 + F1 internal completion  
**Purpose:** convert the architectural security principles into an implementation-ready threat ledger before core authority code begins.

Claude MUST:

1. read `docs/security/Threat Model & Security Assurance Plan.md` in full;
2. validate its assets, trust boundaries and assumptions against the actual F0/F1 repository;
3. initialize `docs/security/Threat Status.csv`;
4. initialize `docs/security/Security Findings.md`;
5. map every CRITICAL/HIGH threat to planned controls, implementation location and verification path;
6. map relevant P0/R1 RTM rows to `TM-*` threat IDs;
7. add any threat introduced by the actual repository/toolchain/interface design;
8. classify any threat that is already removed from scope or externally blocked;
9. record the threat-model baseline commit/hash;
10. ensure no CRITICAL threat lacks a planned mitigation and verification path.

Minimum `Threat Status.csv` columns:

```text
threat_id,status,severity,control_refs,requirement_refs,implementation_refs,test_refs,evidence_refs,residual_risk,owner,commit,last_updated
```

S0 is internally complete only when all CRITICAL/HIGH threats are traceable. `MITIGATED / VERIFIED` status is not expected yet unless the evidence actually exists.

---

# 15. A0 - External Foundation Audit

A0 MUST review the G0-promoted Studio-dev compatibility record together with `versions.lock`, `runner.lock`, `network.lock.json` and the G0 evidence pack. A0 must confirm that candidate values were not merely copied into locks without verification.


Claude MUST stop the critical path after G0 + F0 + F1 + S0 and prepare `audit-packets/A0/`.

Purpose:

- independently verify 61997/toolchain claims;
- verify repository foundation is safe/reproducible;
- confirm F1 semantics do not contradict governance;
- review the S0 threat baseline, assets, trust boundaries and CRITICAL/HIGH control plans;
- confirm every CRITICAL/HIGH `TM-*` threat has an implementation and verification path;
- catch early assumptions before contract implementation becomes expensive.

Minimum packet:

```text
docs/execution/audit-packets/A0/
├── README.md
├── commit.txt
├── scope.md
├── files-changed.txt
├── requirements.csv
├── commands-and-results.md
├── compatibility-findings.md
├── frontend-contract-review.md
├── threat-model-review.md
├── threat-status.csv
├── known-limitations.md
└── evidence-index.md
```

Claude may perform an internal self-review, but the audit status remains:

```text
AWAITING EXTERNAL REVIEW
```

until the repository owner supplies the external decision.

Allowed decisions:

```text
PASS
PASS WITH CONDITIONS
FAIL
NOT RUN
```

`PASS WITH CONDITIONS` must list required follow-up and whether the next phase may start before those conditions close.

---

# 16. C1 - AssuranceKernel + Policy + Reference Target

Deliver:

## Kernel/policy

- canonical enums/storage;
- target registration handshake;
- live owner authentication where required;
- policy construction;
- seal/activation;
- restrictive overlays;
- authority revocation;
- Judge authentication surface;
- replay/idempotency foundations;
- effect lookup;
- reason-indexed restrictions;
- deterministic state machine.

## Reference target

- Provider A/B stubs;
- ReferenceAgentProtocol;
- GEN funding path;
- owner/agent authorization;
- AUTO provider selection;
- safe-mode behaviour;
- typed `apply_assurance_action`;
- target defense-in-depth;
- emergency owner controls;
- direct economic tests.

Required invariant focus:

- no action without active policy;
- no action outside allowed set;
- no arbitrary calldata;
- no authority expansion;
- no duplicate economic effect;
- no cross-incident erroneous restoration;
- revoked controller cannot continue acting.

C1 code alone is not enough. Mapped RTM requirements must advance with test/evidence references. `TM-AUTH-*`, applicable `TM-REC-*`, `TM-ECON-*` and `TM-INF-*` statuses must be updated with implementation/test references.

---

# 17. A1 - External Core Architecture & Security Audit

Claude stops the critical path after C1 and prepares A1.

External review scope:

- AssuranceKernel authority boundaries;
- policy immutability/activation;
- immediate restrictive overlays;
- live owner/controller logic;
- replay/idempotency;
- reason-indexed multi-incident restrictions;
- ReferenceAgentProtocol defense-in-depth;
- economic/value-transfer safety;
- stale-policy attack surface;
- human override semantics;
- divergence from ADR/MDP/Implementation Specification.

A1 packet MUST include:

- commit and diff from A0-accepted checkpoint;
- contract map;
- storage/method summary;
- mapped requirement IDs;
- test list/results;
- invariant results;
- threat-focused self-review;
- `Threat Status.csv` export/delta for core threats;
- new or reopened `TM-*` threats;
- security findings added/closed since A0;
- known limitations;
- architecture deviations, including an explicit `none` if none exist;
- exact questions where Claude is uncertain.

Claude cannot self-certify A1.

---

# 18. C2 - IncidentJudge + Evidence + Lifecycle + Recovery + Vault

Deliver:

## Judge/evidence

- EAP parser and deterministic prechecks;
- source handling;
- HTTPS/private-endpoint restrictions;
- exact R1 rule registry;
- `PROVIDER_COMPROMISE_V1`;
- `SERVICE_FAILURE_V1`;
- `REMEDIATION_CONFIRMED_V1`;
- `RECOVERY_VALIDATED_V1`;
- structured outcomes;
- leader/validator semantic verification;
- prompt-injection/adversarial tests;
- source-outage/variance handling;
- explicit nondeterministic error handling.

## Lifecycle

- accepted/finalized Judge-to-Kernel messages;
- provisional containment where policy permits;
- final CONFIRMED reconciliation;
- final REJECTED rollback of incident-specific provisional restrictions;
- final UNDETERMINED safe reconciliation;
- stale-policy handling;
- multi-incident composition;
- remediation;
- RECOVERY;
- recovery validation;
- restoration only when all relevant restrictions allow it.

## IncentiveVault

- bond open;
- target bounty pool;
- settlement;
- claim;
- zero-bond support;
- no truth-based slashing for ordinary good-faith rejected/undetermined reports;
- value-transfer failure tests.

---

# 19. C3 - SDK, Tracker, Compiler, Sentinel, Fees and Deployment Tooling

Deliver:

- real protocol SDK behind F1 interfaces;
- transaction tracker;
- policy compiler;
- RFC 8785/JCS + Keccak policy artifact flow;
- evidence builder;
- CLI;
- reference Sentinel;
- fee-profile coverage;
- deployment scripts;
- deployment manifest generation;
- transaction/action trace tooling;
- verification helpers.

Sentinel remains non-authoritative.

Hosted API/indexer remains optional convenience infrastructure.

No package may silently implement a second policy engine or state truth separate from the contracts/SDK semantics.

---

# 20. A2 - External Consensus, Lifecycle & Security Audit

After C2 + C3, Claude stops the critical path and prepares A2.

External review scope:

- Judge input validation;
- `TM-EVID-*` evidence/web threat coverage;
- `TM-LIFE-*`, `TM-ECON-*` and applicable infrastructure threat coverage;
- prompt injection posture;
- Equivalence Principle implementation;
- CONFIRMED/REJECTED/UNDETERMINED correctness;
- accepted versus finalized behaviour;
- provisional-action safety;
- appeal/re-execution/idempotency;
- final reconciliation;
- remediation/recovery;
- IncentiveVault economics;
- child message/fee handling;
- transaction tracker semantics;
- Sentinel authority/liveness;
- SDK interface consistency;
- 61997 RC conformance after real implementation.

Required packet includes representative adversarial test output, lifecycle traces, updated `Threat Status.csv`, security-findings delta, threat-to-test evidence mapping and any new compatibility findings.

Claude cannot self-certify A2.

---

# 21. D1 - Product and Visual Foundation

After A2 acceptance, or earlier only if the repository owner explicitly permits safe parallel mock-only frontend work after F1, Claude builds:

- frontend architecture;
- design system;
- typography hierarchy;
- spacing/layout system;
- state visualization language;
- information architecture/navigation;
- responsive shell;
- accessibility baseline;
- mock adapter consuming F1 types/fixtures.

Visual direction MUST follow the Naming & Brand Decision Record:

- engineered;
- calm;
- consequential;
- operational;
- modern;
- trustworthy;
- alive without generic AI/Web3 aesthetics.

Avoid:

- default black/purple Web3 gradient language;
- glowing AI brains;
- robot mascots as core identity;
- shield/lock clichés;
- decorative cyberpunk circuitry;
- identical-card-everywhere dashboards;
- gratuitous glassmorphism;
- meaningless neon state effects.

---

# 22. D2 - Core Read Surfaces

Deliver at minimum:

- Dashboard;
- Targets list/detail;
- policy viewer;
- Incidents list;
- flagship Incident Explorer;
- benchmark surface;
- deployment/about/status surfaces required by R1.

Incident Explorer MUST separate:

1. claim/evidence;
2. GenLayer judgment/lifecycle;
3. policy consequence;
4. actual execution/post-state;
5. recovery.

---

# 23. D3 - Write, Recovery and Transaction Flows

Deliver:

- target onboarding;
- policy author/review/diff/activation UX;
- explicit authority review before signing;
- report incident flow;
- fee/bond preview;
- transaction submission/tracking;
- recovery submission;
- wrong-network states;
- protocol/user error states;
- human override presentation;
- pending/provisional/final distinctions.

No screen may collapse protocol truth for visual simplicity.

---

# 24. I1 - Mock Integration

Before real-chain frontend integration, prove the product works against validated F1 fixtures.

Must demonstrate:

- all required lifecycle states;
- deterministic error states;
- no frontend shadow types contradict SDK types;
- policy authority expansion is explicit;
- parent + child transaction traces can be represented;
- `UNDETERMINED`, provisional, final success and execution error are distinct;
- multi-incident target state can be explained;
- recovery flow is first-class.

---

# 25. I2 - Real SDK / Protocol Integration

Replace mock adapter with real Reclose SDK/indexer paths without rewriting product semantics.

Verify:

- read data matches contract truth;
- writes use canonical SDK/transaction builders instead of duplicated frontend logic;
- chain 61997 guard works;
- transaction IDs persist immediately;
- refresh resumes tracking;
- child transaction traces work;
- finalized execution error is shown as failure;
- target post-state is verified where required;
- API/indexer outage does not become protocol-authority failure.

---

# 26. D4 - Accessibility, Edge States and Product Polish

Deliver:

- keyboard support;
- semantic structure;
- accessible labels;
- sufficient contrast;
- visible focus;
- status not communicated only by colour;
- reduced-motion support;
- responsive behaviour;
- loading/empty/error states;
- provisional/final visual distinction;
- restrained causal motion;
- visual regression coverage;
- performance pass;
- no fake chain state.

---

# 27. A3 - External Product & Integration Audit

Claude stops the critical path after D1-D4 + I1/I2 and prepares A3.

External review scope:

- frontend accurately represents protocol truth;
- GenLayer transaction status is distinct from DecisionOutcome/DecisionStage/execution result;
- child transaction failures are visible;
- target post-state verification is represented correctly;
- Incident Explorer causal chain is faithful;
- policy authority expansion is obvious before signing;
- report/recovery flows match PRD;
- app/API/indexer do not become truth authorities;
- agent/developer SDK surfaces satisfy PRD;
- accessibility/product requirements have evidence;
- no unsupported visual/product claims;
- `TM-UX-*` threats and hosted-infrastructure trust boundaries are verified;
- malicious evidence rendering and stale/indexer disagreement paths are tested;
- requirement/threat mapping is complete enough to proceed to real E2E.

A3 packet includes screenshots or recordings of all primary R1 flows plus representative error and edge states.

Claude cannot self-certify A3.

---

# 28. E1 - Canonical 61997 End-to-End Gate

Run the real reference scenario on chain 61997.

Required sequence:

1. deploy/verify Reclose R1 contracts;
2. register target;
3. activate reference policy;
4. fund ReferenceAgentProtocol;
5. purchase service from Provider A with real test GEN;
6. submit compromise report using the canonical public evidence scenario;
7. observe real GenLayer lifecycle;
8. apply provisional containment only if the actual RC path is stable and verified;
9. finalize CONFIRMED decision;
10. verify Provider A restriction + safe mode;
11. AUTO purchase routes to Provider B with real test GEN;
12. submit remediation evidence;
13. enter RECOVERY;
14. validate recovery;
15. restore Provider A/NORMAL when policy permits;
16. perform final AUTO purchase;
17. capture the complete causal trace.

The canonical scenario MUST succeed from a clean deployment at least twice before release closure.

Required evidence belongs under `release-evidence/r1/` and is referenced in the RTM status ledger.

No fabricated appeal, transaction, EVM call, GenLayer lifecycle state or benchmark result is permitted.

---

# 29. H1 - Benchmark and Security Hardening

Requirements:

- 50+ scenario benchmark;
- confirmed/rejected/undetermined cases;
- prompt injection;
- stale/conflicting evidence;
- source outage;
- replay/duplicate delivery;
- multi-incident restoration safety;
- remediation/recovery cases;
- fee-profile validation;
- unauthorized action tests;
- stale-policy tests;
- transaction failure tests;
- frontend accessibility/visual regression;
- dependency/security review;
- no unsupported product claims;
- benchmark/adversarial cases mapped to `TM-*` threat IDs;
- new failures create or reopen security threats/findings.

Hard release targets in the test corpus:

```text
unauthorized autonomous action successful = 0
duplicate economic effect = 0
autonomous authority expansion = 0
Kernel invariant violation = 0
cross-incident erroneous restoration = 0
stale-policy authority execution = 0
```

These are engineering/release targets, not a marketing claim of defect-free software.

---

# 30. A4 - External Pre-Release Audit

This is the broad final independent repository audit before R1 closure.

Claude prepares a complete A4 packet covering:

- repository commit;
- source tree;
- governance conformance;
- all P0/R1 requirements and status;
- P1/R1 deferments, if any;
- contracts/security;
- Judge/evidence/Equivalence Principle;
- SDK/Sentinel/fees/deploy tooling;
- frontend/product semantics;
- 61997 deployments/transactions;
- canonical demo evidence;
- benchmark report;
- fee profile;
- deployment manifest;
- open limitations;
- complete `Threat Status.csv`;
- security findings and residual-risk decisions;
- known security issues;
- exact product claims intended for submission.

The reviewer should be able to answer:

> **If this repository were submitted now, what can still cause Reclose to be incorrect, misleading, unsafe, unverifiable or incomplete?**

Claude MUST NOT mark A4 `PASS` itself.

Release-critical findings must be fixed and re-audited as necessary.

---

# 31. External audit packet protocol

Every A0-A4 packet MUST include at least:

```text
Audit ID
Audit status: AWAITING EXTERNAL REVIEW
Branch
Commit hash
Previous accepted audit/commit
Scope
Files changed
Requirements addressed
Requirements claimed VERIFIED
Commands/tests run
Raw/result artifact locations
Invariant/security checks
Threat IDs addressed/reopened
Threat status delta
Residual-risk decisions
Compatibility findings
Architecture deviations
Known limitations
Open blockers
Product/deployment claims affected
Exact questions for reviewer
Evidence index
```

Recommended files:

```text
README.md
commit.txt
scope.md
files-changed.txt
requirements.csv
tests.md
security-self-review.md
threat-status.csv
threat-delta.md
security-findings.md
compatibility-findings.md
architecture-deviations.md
known-limitations.md
open-questions.md
evidence-index.md
```

For frontend gates also include screenshots/recordings index.

For deployment gates include transaction IDs, contract addresses, chain ID, execution results and post-state references.

No private keys, secrets or seed phrases belong in an audit packet.

## 30.1 Audit decision recording

Store the external decision in:

```text
docs/execution/audit-packets/<AUDIT_ID>/AUDIT_DECISION.md
```

Claude may create/update this file only from the repository owner's supplied external-review result. It MUST NOT invent or self-authorize a `PASS` decision.

Minimum decision:

```text
Audit ID:
Reviewer:
Reviewed commit:
Decision: PASS | PASS WITH CONDITIONS | FAIL | NOT RUN
Blocking findings:
Non-blocking findings:
Required fixes:
Re-audit required: yes/no
Owner authorization to advance: yes/no
```

---

# 32. Interface change control

After F1, protocol-facing interface changes must be explicit even though Claude owns both sides.

Record changes in:

```text
docs/execution/Interface Change Log.md
```

Each entry includes:

```text
Change ID
Affected requirement IDs
Current interface
Proposed interface
Reason
Protocol-semantic change? yes/no
Frontend impact
Backward compatible? yes/no
Tests required
Governance impact? yes/no
Decision
```

Rules:

- internal refactoring that preserves public semantics may proceed with tests;
- breaking F1 changes update schemas, fixtures and frontend consumers in the same controlled change;
- any change affecting PRD behaviour or ADR invariants triggers governance change control rather than being hidden as an interface refactor.

---

# 33. Architecture deviation control

Create:

```text
docs/execution/Architecture Deviations.md
```

The default desired state is:

```text
No active architecture deviations.
```

If Claude believes an implementation must differ from a governing document, record:

```text
Deviation ID
Governing source
Original requirement/decision
Verified implementation constraint
Proposed difference
Security impact
Product impact
Compatibility impact
Reversible? yes/no
Classification: C0 | C1 | C2
Decision required from
Status
```

C2 deviations block the affected phase until externally decided.

---

# 34. Commit discipline

Use small, coherent commits.

Examples:

```text
chore(toolchain): pin 61997 rc compatibility set
chore(repo): scaffold reclose workspace
feat(schema): add canonical incident and decision schemas
feat(kernel): implement target registration handshake
feat(policy): add immutable policy sealing and activation
test(kernel): cover multi-incident restriction composition
feat(agent): implement deterministic fallback purchasing
feat(judge): add provider compromise rule v1
test(judge): add prompt-injection equivalence cases
feat(sdk): implement canonical transaction tracker
feat(sentinel): add policy-driven evidence monitoring
feat(frontend): establish reclose design system
feat(frontend): build incident explorer
feat(frontend): add recovery flow
test(e2e): verify canonical 61997 incident recovery path
```

Avoid giant commits such as:

```text
feat: build reclose
```

Commit bodies SHOULD list materially affected requirement IDs.

An audit gate MUST reference an immutable commit hash.

---

# 35. Testing discipline

Claude must run the narrowest relevant test during implementation and the full required suite at gates.

Expected layers include:

- contract lint/schema;
- deterministic unit tests;
- Kernel state-machine/invariant tests;
- Judge mocked web/LLM tests;
- consensus tests;
- message/lifecycle tests;
- economic/value-transfer tests;
- replay/idempotency tests;
- multi-incident tests;
- recovery tests;
- policy canonicalization/hash tests;
- SDK/interface tests;
- transaction-tracker tests;
- Sentinel tests;
- frontend unit/integration tests;
- accessibility tests;
- visual regression where configured;
- real 61997 E2E;
- benchmark.

Tests MUST prove negative/security cases, not only happy paths. Security tests SHOULD reference the `TM-*` threats they verify, and H1 must provide threat-to-benchmark traceability.

---

# 36. Secrets and operational safety

Never commit:

- private keys;
- seed phrases;
- wallet export files;
- production API secrets;
- access tokens;
- deployment credentials.

Use environment variables and `.env.example` placeholders.

Claude MUST inspect configuration diffs for accidental secrets before commits.

Audit packets must redact secrets while retaining verifiable non-secret evidence.

---

# 37. Product-language guardrails

Implementation-facing copy must preserve these distinctions:

- **GenLayer judgment** vs **policy consequence**;
- **provisional** vs **final**;
- **transaction finality** vs **execution success**;
- **Reporter/Sentinel submission** vs **truth decision**;
- **human override** vs **GenLayer result**;
- **hosted API/indexer** vs **protocol source of truth**.

Do not write:

> AI decided to pause the protocol.

Prefer:

> GenLayer decision: provider compromise confirmed. Policy consequence: Provider A restricted and safe mode entered.

---

# 38. Current R1 non-goals

R1 does not require:

- production Safe/Base execution;
- production Hyperlane route from 61997;
- ERC-7579 production adapter;
- ERC-8004 writes;
- production AntSeed control;
- autonomous generated-code promotion;
- project-specific Reclose token;
- production self-evolution;
- proprietary hosted API as correctness dependency.

Do not spend R1 time on later-roadmap features at the expense of R1 P0 requirements.

---

# 39. Stop conditions

Claude MUST stop the affected critical path and report rather than improvise when:

1. verified 61997 behaviour materially contradicts a locked invariant or the accepted compatibility baseline;
2. governance documents contain a genuine unresolved contradiction affecting correctness;
3. required credentials/network access make a gate impossible to verify;
4. a proposed change expands Kernel authority;
5. arbitrary calldata/execution appears necessary;
6. provisional behaviour cannot be made reversible/idempotent as required;
7. a P0/R1 requirement appears impossible without architecture change;
8. a security finding invalidates the current phase approach;
9. an F1 interface change would silently alter product/protocol semantics;
10. an external dependency would become mandatory trust authority contrary to architecture;
11. an external audit gate returns `FAIL` or withholds authorization to advance;
12. the canonical demo requires fake/manual state not represented in documented protocol behaviour;
13. a CRITICAL threat lacks a credible mitigation/verification path;
14. a HIGH threat violates a P0 requirement or locked invariant and remains unresolved.

Claude may complete safe independent cleanup within the current phase, but MUST NOT claim the blocked gate has passed.

---

# 40. R1 Requirements Closure Gate

R1 cannot close until:

- every P0/R1 RTM requirement is `VERIFIED`;
- every P1/R1 requirement is `VERIFIED` or explicitly deferred by a valid release decision;
- no deferment weakens an ADR invariant or canonical demo;
- all required release evidence exists;
- canonical 61997 scenario is reproducible;
- deployment manifest is complete;
- benchmark and fee profile are committed/referenced;
- frontend reflects real protocol state;
- no claim depends on undocumented manual intervention;
- no active C2 contradiction exists;
- no unresolved release-blocking security issue exists;
- every CRITICAL threat is `MITIGATED / VERIFIED` or genuinely `REMOVED FROM SCOPE`;
- no blocking HIGH threat remains;
- residual-risk decisions satisfy the Threat Model & Security Assurance Plan;
- security findings/evidence indexes are current;
- A4 has an external decision authorizing closure.

Generate:

```text
release-evidence/r1/R1 Closure Report.md
```

including requirement coverage, known limitations, deferred items, audit decisions and deployment references.

---

# 41. S1 - Submission Freeze

After R1 closure:

1. freeze source commit;
2. record Git commit hash;
3. record exact 61997 deployment addresses;
4. record policy hash/version;
5. record Judge version;
6. record toolchain/runner locks;
7. record fee-profile hash;
8. record benchmark hash;
9. rerun canonical smoke and demo tests;
10. verify README/demo/submission claims against actual behaviour;
11. tag submission release only after evidence matches source.

No last-minute feature may be added to the submission branch without rerunning every affected test/evidence gate.

---

# 42. First Claude Code session - exact authorization

After R0 is prepared, open the Reclose repository in Claude Code and give this instruction:

> You are the sole implementation agent for Reclose R1. Before making any implementation change, read `CLAUDE.md`, `Repository Build Master Plan.md`, every document under `docs/governance/` in full, `docs/security/Threat Model & Security Assurance Plan.md` in full, and `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` in full. These documents are normative and you are implementing them, not redesigning them. Your authorized scope for this first session is **G0 Toolchain Conformance plus the minimum repository foundation necessary to record and verify G0**. Do not begin Reclose product features or deep frontend work. Treat the Studio-dev compatibility record as a candidate baseline, not unquestioned truth. Verify the exact current GenLayer Studio-dev / chain 61997-compatible RC stack, verify chain ID 61997, prove the intended install source/version for every compatibility-sensitive package, verify the current runner hashes, lint/validate/schema/test a minimal smoke Intelligent Contract, deploy it to 61997 if credentials and network access permit, prove deploy/write fee handling, verify execution result rather than finality alone, freeze exact toolchain/runner/network data, update the compatibility record, and record every candidate/runtime/spec discrepancy using the Master Plan classification. Create the required execution/evidence artifacts and start the RTM status ledger. Do not mark security threats mitigated during G0 unless their actual verification exists; S0 will operationalize the threat ledger after F0/F1. Do not substitute chain 61999. Do not modify the six governance documents. Do not claim checks you did not actually perform. At the end, report each G0 sub-gate as PASS, FAIL, PARTIAL/EXTERNAL BLOCKER, or NOT RUN; list exact changes, commands, versions, transaction/deployment evidence, discrepancies, blockers, requirement IDs affected, and the precise next phase that would be authorized. Stop at the current gate.

Do not tell Claude to “build the whole project” in the first session.

---

# 43. Standard phase-completion report

At the end of every controlled phase, Claude reports:

```text
Authorized phase:
Phase status:
Branch:
Commit(s):
Files changed:
Requirements addressed:
Requirements moved to VERIFIED:
Tests/checks run:
Evidence produced:
Compatibility findings:
Security/invariant findings:
Threat IDs addressed/reopened:
Threat status changes:
Residual-risk decisions:
Architecture deviations:
Known limitations:
Blockers:
External audit required next?:
Exact next phase authorized if gate passes:
Work deliberately not attempted because out of scope:
```

This report should also be reflected in `docs/execution/Phase Log.md`.

---

# 44. Final execution principle

The repository build succeeds when Claude behaves as a disciplined implementer of one already-governed system, not as an autonomous product designer with permission to rewrite the brief.

The permanent Reclose engineering rule remains:

> **The system may judge an uncertain world, but it may act only inside authority that was made certain beforehand.**

The permanent repository rule is:

> **Claude Code may build every layer of Reclose, but it may not silently redefine any layer of Reclose.**

The permanent compatibility rule is:

> **Candidate RC notes become Reclose truth only after G0 proves them and freezes them into the compatibility record and machine locks.**

The permanent security rule is:

> **A security control is not complete because it exists in code; the mapped threat must be mitigated, tested and evidenced.**

The permanent audit rule is:

> **Critical architecture, security, product-integration and release gates are independently reviewed; Claude cannot certify its own external audit gates.**
