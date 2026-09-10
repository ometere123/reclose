# Threat Model & Security Assurance Plan

**Status:** R1 SECURITY BASELINE FOR IMPLEMENTATION AND AUDIT  
**Product:** **Reclose**  
**Date:** 9 September 2026  
**Canonical R1 network:** GenLayer Studio-dev, chain ID **61997**  
**Document class:** security assurance / living implementation-security record  
**Governing architecture:** Research Closure & Architecture Decision Record; Master Design Package; Implementation Specification; Product Requirements Document; Requirements Traceability Matrix  
**Build-process authority:** `Repository Build Master Plan.md`  
**Runtime/toolchain record:** `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md`

---

# 1. Purpose

This document defines the **security model Reclose R1 must defend**, the threats that matter, the controls expected to mitigate them, the tests and evidence required to prove those controls, and the residual-risk process used before release.

It exists because Reclose is not a passive dashboard. Reclose receives **pre-authorised, bounded control authority over autonomous economic systems**. A security failure can therefore cause an unsafe target state, unauthorized restriction or restoration, mis-routing of value, false incident handling, or a misleading representation of protocol truth.

This document converts the security principles already distributed across the Reclose governance set into one auditable model:

```text
assets
  -> trust boundaries
  -> threat actors
  -> abuse paths
  -> controls
  -> tests
  -> evidence
  -> residual risk
  -> audit decision
```

This document **does not redefine the Reclose architecture**. If a proposed mitigation would alter a locked architectural invariant, the architecture-deviation process in the Repository Build Master Plan applies.

---

# 2. Security objective

Reclose R1 is secure enough for release only when the implementation demonstrates that:

1. no actor can cause an autonomous target action without an active delegated policy;
2. no Judge or model output can create authority that was not pre-authorised;
3. no action can escape the finite allowed action catalogue, resource scope or bounds;
4. provisional actions remain reversible, idempotent, authority-reducing and non-value-moving;
5. irreversible, external, value-moving or authority-expanding consequences never execute from provisional state;
6. duplicate, delayed, retried or replayed messages cannot create duplicate semantic or economic effects;
7. stale policy state cannot silently produce new authority effects;
8. resolving one incident cannot remove restrictions belonging to another active incident;
9. recovery cannot restore more authority than the active policy permits;
10. evidence, web content and Reporter input cannot rewrite the Judge's rule, prompt or consequence;
11. Sentinel, API, indexer and frontend infrastructure cannot become hidden protocol authorities;
12. transaction lifecycle, execution result and target post-state are not conflated;
13. secrets, owner keys and protected treasury authority are not held by Reclose-operated servers;
14. a Studio-dev reset, dependency change or toolchain drift cannot make a deployment unverifiable;
15. release claims remain no stronger than the verified implementation and evidence.

The security objective is **bounded correctness under adversarial inputs and partial failures**, not a claim of perfect security.

---

# 3. Scope

## 3.1 In scope for R1

Security analysis covers:

- `AssuranceKernel`;
- policy registration, sealing, activation, restrictive overlays and authority revocation;
- `IncidentJudgeV1`;
- Evidence Artifact Packages;
- non-deterministic web/LLM execution and Equivalence Principle validation;
- accepted/provisional and finalized decision handling;
- target adapters and `ReferenceAgentProtocol`;
- multi-incident restriction composition;
- remediation and recovery;
- `IncentiveVault`;
- transaction/message causality and fee budgeting;
- policy compiler and hashing/canonicalization;
- protocol SDK and transaction tracker;
- Reporter and Sentinel flows;
- frontend transaction, policy and incident UX where incorrect representation can cause unsafe user action;
- deployment tooling, environment configuration and secrets;
- Studio-dev / chain 61997 toolchain and runner supply chain;
- benchmark, audit and release-evidence integrity.

## 3.2 Out of scope for R1

The following are not treated as implemented production security surfaces in R1:

- production Safe/Base control;
- production Hyperlane route from Studio-dev;
- arbitrary production external EVM execution;
- ERC-7579 production adapter security;
- ERC-8004 production writes;
- production confidential/private semantic evidence;
- autonomous generated-code promotion;
- production self-evolution;
- project-specific token economics;
- enterprise identity, SSO or confidential incident workflows.

If any of these surfaces are introduced into R1, this threat model must be revised before release.

---

# 4. Relationship to governing documents

This file lives under:

```text
docs/security/Threat Model & Security Assurance Plan.md
```

Authority by subject remains:

| Subject | Authority |
|---|---|
| Fundamental trust boundaries and invariants | Research Closure & Architecture Decision Record |
| System topology and component responsibilities | Master Design Package |
| Engineering behaviour and contract mechanics | Implementation Specification |
| Product/user requirements | Product Requirements Document |
| Requirement completion and release evidence | Requirements Traceability Matrix |
| Build phases and external audit gates | Repository Build Master Plan |
| Runtime/RC facts | Studio-dev Toolchain & Network Compatibility Record + machine locks |
| Threat inventory, control mapping, security verification and residual-risk status | **This document** |

This document may be updated during implementation as threats become better understood. It may **not** weaken a governance requirement or invariant.

---

# 5. Threat modelling method

Reclose uses an asset-centric threat model informed by STRIDE-style categories, protocol-economic abuse cases and AI/web-specific adversarial analysis.

Each threat receives:

```text
Threat ID
Asset / boundary
Threat statement
Attack path
Consequence
Initial severity
Required controls
Required verification
Release status
Residual risk
```

## 5.1 Severity

### CRITICAL
A plausible failure can create unauthorized authority, arbitrary execution, unauthorized value movement, Kernel constitutional bypass, or a false restoration that violates a locked safety invariant.

### HIGH
A plausible failure can materially corrupt incident judgment, policy enforcement, recovery, replay safety, target state, or security-critical transaction truth.

### MEDIUM
A failure primarily causes availability degradation, bounded griefing, misleading but recoverable product state, or operational compromise without crossing constitutional authority boundaries.

### LOW
A failure has limited security consequence and is primarily nuisance, diagnostics or low-impact operational quality.

## 5.2 Release treatment

- An unresolved **CRITICAL** threat may not be accepted for R1. The mitigation must be implemented, the attack surface removed, or the relevant feature removed from scope.
- An unresolved **HIGH** threat may not be accepted if it violates a P0 requirement, locked invariant or canonical demo safety property. Other HIGH residual risk requires explicit repository-owner acceptance plus external-review approval.
- MEDIUM/LOW residual risk must be documented with rationale, monitoring and follow-up where relevant.
- “Not reproduced” is not a mitigation.
- A threat cannot be marked `MITIGATED` without the required test/evidence reference.

---

# 6. Security assets

| Asset ID | Asset | Security property |
|---|---|---|
| AS-01 | Kernel constitutional authority | cannot be expanded or bypassed |
| AS-02 | Active policy identity/version | integrity, immutability after sealing, correct activation |
| AS-03 | Protected resource/action bounds | default deny, exact scope |
| AS-04 | Judge identity/version | authentic, immutable/versioned |
| AS-05 | DecisionRecord | authentic, structured, replay-safe, bound to target/policy/rule/evidence |
| AS-06 | Incident lifecycle state | correct provisional/final reconciliation |
| AS-07 | Restriction composition | reason-indexed, monotonic, no cross-incident restore |
| AS-08 | Target enforcement state | matches bounded Kernel action and active restrictions |
| AS-09 | Recovery state | evidence-backed, no authority over-restoration |
| AS-10 | Evidence provenance | independently retrievable where required, tamper-evident identity |
| AS-11 | Reporter nonce / incident identity | uniqueness and replay resistance |
| AS-12 | Vault balances / bonds / bounties | no duplicate settlement/claim or target-control leakage |
| AS-13 | ReferenceAgentProtocol treasury | only authorised economic paths |
| AS-14 | Transaction causal trace | parent/child relationships and execution result integrity |
| AS-15 | Policy canonical hash | deterministic identity across tooling |
| AS-16 | Deployment manifest / addresses | integrity and reproducibility |
| AS-17 | Toolchain/runner locks | supply-chain and reproducibility integrity |
| AS-18 | Owner/deployer/reporting keys | confidentiality and least privilege |
| AS-19 | Frontend authority preview | faithful representation before signature |
| AS-20 | Audit/benchmark evidence | authenticity and non-fabrication |

---

# 7. Trust boundaries

## TB-01 Reporter / Sentinel -> Evidence package

Reporter-controlled input is untrusted. Reporter may select allowed target/rule/resource/evidence fields but must not control executable action, arbitrary system prompt or Judge authority.

## TB-02 Public web -> Judge

All external content is adversarial by default. HTTPS provides transport authenticity, not truth. Sources can change, fail, personalize content, contradict each other or contain instructions intended to manipulate an LLM.

## TB-03 Judge leader result -> validator consensus

A leader may return an incorrect but schema-valid result. Validators must independently assess substantive decision fields under the equivalence rule.

## TB-04 Judge -> Kernel

Only an approved Judge for the active policy/rule may submit a decision. The Kernel must validate sender, target, policy, rule, stage, incident identity and replay state before effect generation.

## TB-05 Kernel -> Target

Kernel output is bounded, but target defense-in-depth still validates caller, action type, resource and parameter bounds. There is no generic arbitrary-call escape hatch.

## TB-06 Wallet / frontend -> GenLayer transaction

The frontend may build and explain transactions but cannot sign for the owner. Before signature, network, target, value, authority effect and fee should be inspectable.

## TB-07 Hosted API/indexer -> consumer

Hosted reads are convenience. They may be stale or unavailable and cannot supersede contract/SDK truth for security-critical decisions.

## TB-08 Sentinel -> protocol

Sentinel improves liveness only. Sentinel compromise must not grant target-control authority or truth-decision authority.

## TB-09 Toolchain / runner registry -> build

A package/version/hash change can alter semantics. Only G0-verified versions and runner hashes become the accepted execution baseline.

## TB-10 Human operator -> deployment/release

Deployment and release operations have privileged access to deployer funds and configuration. Secrets must remain outside Git/logs; manifests and source commits must be immutable references.

---

# 8. Threat actors

| Actor ID | Actor | Capability |
|---|---|---|
| TA-01 | Malicious Reporter | submits adversarial evidence, spam, misleading metadata |
| TA-02 | Compromised Reporter key | authentic submissions under stolen identity |
| TA-03 | Malicious Sentinel operator | high-frequency or biased automated reporting |
| TA-04 | Compromised Reclose Sentinel | source manipulation, report spam, secret exposure |
| TA-05 | Malicious evidence publisher | prompt injection, false data, content mutation |
| TA-06 | Compromised legitimate source | authoritative-looking false evidence |
| TA-07 | Divergent/malicious Judge leader | incorrect schema-valid decision |
| TA-08 | Malicious or buggy validator minority | attempts to accept bad decision or block liveness |
| TA-09 | Malicious target owner | intentionally activates harmful but technically authorised policy |
| TA-10 | Compromised target owner key | policy/override abuse within owner powers |
| TA-11 | Malicious protected target/adapter | tries to bypass intended action semantics |
| TA-12 | Transaction replayer/griefer | retries, duplicates, delays or reorders calls/messages |
| TA-13 | Economic spammer | bond/fee/bounty griefing |
| TA-14 | Frontend attacker | deceptive UI, stale state, malicious injected content |
| TA-15 | RPC/indexer attacker or outage | stale/misleading/unavailable reads |
| TA-16 | Supply-chain attacker | package, runner, dependency or build compromise |
| TA-17 | Compromised deployment operator | secret theft, wrong network, malicious deployment parameters |
| TA-18 | Future malicious module candidate | attempts evolution/upgrade authority expansion |

---

# 9. Explicit security assumptions

Reclose R1 assumes:

1. GenLayer consensus and cryptographic account authorization behave according to the deployed protocol.
2. A sufficiently honest validator majority exists for the tested environment; Reclose does not solve base-layer consensus corruption.
3. Public evidence needed by R1 is independently accessible to validators often enough for the defined rule to operate; source outage remains possible and must fail safely.
4. HTTPS does not imply semantic truth.
5. Owner wallet compromise is outside Reclose's ability to fully prevent; Reclose limits what autonomous protocol paths can do, not what a legitimately authorised compromised owner may intentionally sign.
6. Studio-dev is a preview environment with no persistence guarantee and incomplete external-EVM parity.
7. Hosted Reclose infrastructure may fail or be compromised without becoming protocol authority.
8. Policy authors understand the consequences of the authority they intentionally delegate; the product must nevertheless make authority expansion visible before signing.
9. R1 does not support confidential/private semantic evidence.
10. The project does not claim zero defects or perfect security.

Any implementation that invalidates one of these assumptions must update this document and may require architecture review.

---

# 10. Security invariants

The following are release-blocking invariants. They incorporate the previously locked F01-F10 family and R1 security requirements.

| Invariant | Requirement |
|---|---|
| INV-S01 | No action without an active policy authorised for the target |
| INV-S02 | No action outside the active policy's allowed action/resource/bounds |
| INV-S03 | No autonomous authority expansion |
| INV-S04 | No irreversible, value-moving, external or permanent provisional action |
| INV-S05 | One action ID / replay identity causes at most one semantic/economic effect |
| INV-S06 | Resolving Incident A cannot remove Incident B's restriction |
| INV-S07 | Revoked Kernel/controller authority cannot create future effects |
| INV-S08 | Stale policy cannot silently create new authority effects under an incompatible active policy |
| INV-S09 | Recovery cannot restore authority beyond active policy and unresolved restrictions |
| INV-S10 | Evolution/module replacement cannot enlarge the constitutional envelope |
| INV-S11 | Judge output contains no arbitrary target address/calldata/authority payload |
| INV-S12 | Only the configured Judge for the rule/policy can drive Kernel decision handling |
| INV-S13 | Finality alone is never treated as successful execution |
| INV-S14 | Reporter/Sentinel cannot determine truth or select executable consequence |
| INV-S15 | Hosted API/indexer cannot become the sole security-critical source of truth |
| INV-S16 | External evidence remains untrusted data and cannot alter system instructions/rule semantics |

Any test demonstrating a violation of these invariants is release-blocking.

---

# 11. Threat catalogue

The baseline status for all threats is `OPEN - VERIFY DURING IMPLEMENTATION` unless explicitly closed by referenced evidence.

## 11.1 Authority and policy threats

| ID | Threat | Consequence | Sev | Required controls | Required verification |
|---|---|---|---|---|---|
| TM-AUTH-001 | Kernel accepts action with no active policy | unauthorised target control | CRITICAL | default deny; active-policy check | negative Kernel test |
| TM-AUTH-002 | Policy effect names unsupported action/resource | scope escape | CRITICAL | finite enums; schema validation; default deny | unsupported action/resource tests |
| TM-AUTH-003 | Judge/model supplies arbitrary calldata or target | arbitrary execution | CRITICAL | DecisionRecord contains semantic codes only; typed effect lookup in Kernel | schema/source audit + fuzz |
| TM-AUTH-004 | Policy update expands authority immediately | unreviewed privilege expansion | CRITICAL | timelocked expansion; immediate reduction only | policy activation timing tests |
| TM-AUTH-005 | Sealed policy edited in place | policy identity corruption | HIGH | immutable sealed records/versioning | mutation-negative tests |
| TM-AUTH-006 | Stale policy decision creates effects under new policy | unintended authority | CRITICAL | policy hash/version binding; stale-decision reconciliation rules | stale-policy test matrix |
| TM-AUTH-007 | Revoked controller continues acting | post-revocation authority | CRITICAL | live controller/owner validation; revocation flag | revoke-then-action negative test |
| TM-AUTH-008 | Wrong Judge/module can call Kernel | forged decision authority | CRITICAL | exact sender/module validation per rule/version | wrong-sender tests |
| TM-AUTH-009 | Generic adapter execute function bypasses action catalogue | arbitrary target call | CRITICAL | narrow typed adapter methods; no generic execute | source/schema audit |
| TM-AUTH-010 | Owner safety overlay accidentally broadens authority | bypass timelock | CRITICAL | overlay can only reduce/disable; generation semantics | property tests |
| TM-AUTH-011 | Policy canonicalization differs between SDK/contract/tooling | wrong policy identity | HIGH | RFC 8785 JCS + Keccak; canonical fixtures | cross-language hash vectors |
| TM-AUTH-012 | Identifier collision/composite-key ambiguity | state overwrite/cross-target confusion | HIGH | bounded charset/length/delimiters; canonical keys | collision/fuzz tests |

## 11.2 Evidence, web and LLM threats

| ID | Threat | Consequence | Sev | Required controls | Required verification |
|---|---|---|---|---|---|
| TM-EVID-001 | Evidence contains prompt injection | false semantic decision | HIGH | fixed prompts; evidence bracketed as data; constrained outputs | adversarial benchmark |
| TM-EVID-002 | Reporter authors arbitrary rule/prompt | rule substitution | CRITICAL | fixed R1 rule registry; no reporter prompt field | schema/API negative tests |
| TM-EVID-003 | Malicious source impersonates authoritative source | false evidence | HIGH | per-rule source policy; provenance checks; domain/source class | source-policy tests |
| TM-EVID-004 | Legitimate source compromised | authoritative falsehood | HIGH | multiple/independent sources for critical pattern; UNDETERMINED path | contradictory-source tests |
| TM-EVID-005 | Source changes between leader/validator fetches | consensus divergence | HIGH | extract stable facts; timestamps/hashes; equivalence logic | variance tests |
| TM-EVID-006 | Source unavailable | default-to-CONFIRMED bug | CRITICAL | explicit unavailable state; fail safe to UNDETERMINED/disagreement | outage tests |
| TM-EVID-007 | Personalized/geolocated web result differs | false equivalence | HIGH | stable authoritative endpoints; content normalization; independent validation | simulated variation tests |
| TM-EVID-008 | Redirect/URL trick reaches localhost/private endpoint | SSRF-like access / invalid evidence | HIGH | HTTPS allow rules; reject localhost/private ranges/unsupported redirects | URL adversarial tests |
| TM-EVID-009 | Oversized evidence causes resource exhaustion | liveness/griefing | MEDIUM | strict EAP/source/text size caps | size-boundary tests |
| TM-EVID-010 | Malformed model output is partially accepted | corrupted decision | HIGH | strict structured schema; fail closed | malformed-output tests |
| TM-EVID-011 | Schema-valid but substantively false leader result passes validator | false decision | CRITICAL | custom validator independently reassesses evidence | false-leader consensus test |
| TM-EVID-012 | Old/stale evidence reused for new incident | false current condition | HIGH | observedAt/retrievedAt/evidence age/rule policy | stale-evidence tests |
| TM-EVID-013 | Evidence artifact hash does not bind all decision-relevant fields | substitution | HIGH | canonical EAP hash specification and validation | mutation/hash tests |
| TM-EVID-014 | Private/confidential evidence is accidentally accepted as R1-supported | unverifiable consensus / privacy leak | HIGH | public-access scope guardrails; UI/docs/schema constraints | product/content + source tests |

## 11.3 Consensus, lifecycle and message threats

| ID | Threat | Consequence | Sev | Required controls | Required verification |
|---|---|---|---|---|---|
| TM-LIFE-001 | `Accepted` treated as final | premature irreversible action | CRITICAL | stage-aware policy; Class P only on accepted | lifecycle tests |
| TM-LIFE-002 | `Finalized` treated as execution success | false state / unsafe UX | HIGH | inspect execution result + required post-state | finalized-error E2E |
| TM-LIFE-003 | `TxStatus.Undetermined` conflated with DecisionOutcome.UNDETERMINED | semantic corruption | HIGH | separate types/namespaces | type/fixture/UI tests |
| TM-LIFE-004 | Duplicate Judge->Kernel message repeats effects | duplicate state/economic effect | CRITICAL | incident/action replay maps; idempotent receiver | duplicate delivery tests |
| TM-LIFE-005 | Duplicate Kernel->Target message repeats economic action | duplicate value/service action | CRITICAL | action ID idempotency in target | duplicate target tests |
| TM-LIFE-006 | Child transaction fails but parent shown successful | unsafe false success | HIGH | parent/child tracking; post-state validation | child-failure E2E |
| TM-LIFE-007 | Final REJECTED leaves provisional restriction stuck | unjustified restriction | HIGH | incident-specific provisional reconciliation | reject rollback tests |
| TM-LIFE-008 | Final UNDETERMINED leaves unsafe high-impact containment | indefinite authority reduction | HIGH | defined safe reconciliation / monitor-only outcome | undetermined tests |
| TM-LIFE-009 | Final CONFIRMED temporarily unlocks during provisional->final conversion | race / exposure | CRITICAL | monotonic conversion with no unlock gap | state-transition property test |
| TM-LIFE-010 | Message ordering/retry causes stale state transition | incorrect target state | HIGH | explicit incident/stage checks; monotonic transitions | reorder/delay tests |
| TM-LIFE-011 | Appeal/re-execution creates duplicate settlement/action | duplicate effect | CRITICAL | decision/action IDs bound to final semantic event | appeal/retry tests |
| TM-LIFE-012 | Insufficient child fee budget causes partial causal chain | incomplete enforcement | HIGH | fee profiling + failure visibility + safe state | child-budget tests |

## 11.4 Multi-incident and recovery threats

| ID | Threat | Consequence | Sev | Required controls | Required verification |
|---|---|---|---|---|---|
| TM-REC-001 | Resolving incident A removes restriction from incident B | unsafe restoration | CRITICAL | reason-indexed restriction counts/sets | multi-incident tests |
| TM-REC-002 | Restriction counter underflow/double release | unsafe restoration | CRITICAL | checked state transitions; idempotent release | property/fuzz tests |
| TM-REC-003 | Remediation alone restores capability requiring recovery validation | premature restore | HIGH | release-phase metadata; separate remediation/recovery gates | recovery lifecycle tests |
| TM-REC-004 | Timer alone triggers restore | false recovery | HIGH | evidence-backed recovery only | negative timer test |
| TM-REC-005 | Recovery evidence references wrong parent incident | cross-incident restore | CRITICAL | derive target/resource/policy from parent incident | wrong-parent tests |
| TM-REC-006 | Recovery restores more authority than pre-incident policy | authority expansion | CRITICAL | active-policy bounds + unresolved restriction check | invariant/property tests |
| TM-REC-007 | Old remediation/recovery evidence replayed | false restoration | HIGH | incident-bound nonces/hashes/stages | replay tests |
| TM-REC-008 | Simultaneous incidents create weaker aggregate state than strongest restriction | composition failure | CRITICAL | monotonic strongest-state/reason composition | concurrent incident tests |

## 11.5 Economic and Vault threats

| ID | Threat | Consequence | Sev | Required controls | Required verification |
|---|---|---|---|---|---|
| TM-ECON-001 | Reporter claims bond/bounty twice | fund loss | HIGH | settlement/claim idempotency | duplicate-claim test |
| TM-ECON-002 | Wrong Judge settles bond | fund loss | HIGH | exact Judge authorization | wrong-caller test |
| TM-ECON-003 | Vault receives target-control authority | constitutional boundary leak | CRITICAL | separate authorityless Vault design | source/schema audit |
| TM-ECON-004 | Rejected/undetermined good-faith report is truth-slashed | incentive/griefing defect | MEDIUM | defined settlement policy | economics tests |
| TM-ECON-005 | Reporter spam exhausts protocol/target resources | availability/economic griefing | MEDIUM | fee + configurable anti-spam bond + rate/operator monitoring | load/economic tests |
| TM-ECON-006 | Bounty pool pays beyond configured/funded amount | fund loss | HIGH | balance/accounting checks | property tests |
| TM-ECON-007 | ReferenceAgentProtocol pays wrong provider after restriction | real test-fund misrouting / canonical-demo failure | HIGH | assurance-aware AUTO selection + target checks | economic E2E |
| TM-ECON-008 | Safe-mode spend ceiling bypassed | excessive fund exposure | HIGH | deterministic target limit | boundary tests |

## 11.6 Infrastructure, deployment and supply-chain threats

| ID | Threat | Consequence | Sev | Required controls | Required verification |
|---|---|---|---|---|---|
| TM-INF-001 | Repository accidentally targets 61999 instead of 61997 | invalid demo/deployment | HIGH | network lock + runtime guard | G0 + E2E network tests |
| TM-INF-002 | Stable and RC packages mixed | semantic/tooling incompatibility | HIGH | G0-compatible family locks | installation/build evidence |
| TM-INF-003 | Runner hash changes unnoticed | execution drift | HIGH | runner.lock + change trigger | registry/hash verification |
| TM-INF-004 | Dependency compromise or unexpected transitive update | supply-chain compromise | HIGH | exact locks; dependency review; minimal dependencies | lock diff/security review |
| TM-INF-005 | Studio reset loses deployment state | availability/demo loss | MEDIUM | reproducible one-command deployment + manifests | clean redeployment rehearsal |
| TM-INF-006 | Deployer/owner private key committed/logged | privileged compromise | CRITICAL | env-only secrets; secret scanning; redaction | secret scan + manual audit |
| TM-INF-007 | Sentinel wallet holds owner/treasury powers | server compromise -> target compromise | CRITICAL | least-privilege reporting wallet only | permission inventory/test |
| TM-INF-008 | Hosted API/indexer outage blocks protocol correctness | centralization/liveness failure | HIGH | direct SDK/RPC path | outage integration test |
| TM-INF-009 | Hosted API/indexer serves stale/false safe state | unsafe consumer decision | HIGH | freshness/provenance; security-critical reads verify protocol state | stale-indexer tests |
| TM-INF-010 | Deployment manifest mismatches source/constructor/policy | unverifiable release | HIGH | immutable commit + args + hashes + tx IDs | manifest verification |
| TM-INF-011 | Faucet/account convenience mistaken for production key model | operational security weakness | MEDIUM | explicit dev-only scope | documentation/audit |
| TM-INF-012 | External EVM/Hyperlane capability is claimed but not implemented on Studio | misleading security/product claim | MEDIUM | explicit non-goal and verified-claim gate | A4 content audit |

## 11.7 Frontend and operator-decision threats

| ID | Threat | Consequence | Sev | Required controls | Required verification |
|---|---|---|---|---|---|
| TM-UX-001 | Authority expansion hidden in generic settings UI | unsafe owner signature | HIGH | security diff + explicit authority review | UX snapshot/E2E |
| TM-UX-002 | Wrong network not obvious before signing | wrong-chain transaction | HIGH | chain guard + network display | wrong-network E2E |
| TM-UX-003 | Stale cached state displayed as current | unsafe operator decision | MEDIUM | freshness indicators/refetch | stale-data tests |
| TM-UX-004 | Reporter shown as truth-decider | misleading trust model | MEDIUM | causal copy discipline | content review |
| TM-UX-005 | Provisional shown as final | unsafe operator assumption | HIGH | distinct DecisionStage UI | fixture/E2E |
| TM-UX-006 | Finalized error shown as success | unsafe operator assumption | HIGH | execution result + post-state check | error fixture/E2E |
| TM-UX-007 | Malicious evidence HTML rendered unsafely | browser XSS/content abuse | HIGH | sanitize/escape; safe links; no unsafe HTML injection | frontend security tests |
| TM-UX-008 | Timeout causes automatic transaction resubmission | duplicate write/economic effect | HIGH | persist tx ID; poll/resume; never blind retry | timeout/resume tests |
| TM-UX-009 | Child-message failure hidden | false completion | HIGH | trace parent/child state | UI E2E |
| TM-UX-010 | API result overrides contract truth in frontend | hidden central authority | HIGH | canonical SDK semantics; direct verification path | outage/disagreement tests |

## 11.8 Audit, benchmark and release-integrity threats

| ID | Threat | Consequence | Sev | Required controls | Required verification |
|---|---|---|---|---|---|
| TM-REL-001 | Synthetic fixture presented as live 61997 evidence | misleading release | HIGH | evidence labeling + immutable tx refs | A4 audit |
| TM-REL-002 | Benchmark cherry-picked to exclude failures | misleading assurance | MEDIUM | fixed category coverage + publish class metrics/limitations | benchmark review |
| TM-REL-003 | Requirement marked VERIFIED without evidence | false completeness | HIGH | RTM execution ledger rules | audit script/manual review |
| TM-REL-004 | Audited commit history rewritten after review | invalid audit | HIGH | immutable checkpoint commit; fixes as new commits | Git audit |
| TM-REL-005 | External audit PASS self-authored by Claude | invalid assurance | HIGH | owner-supplied audit decision only | audit register review |
| TM-REL-006 | Submission claims exceed actual implemented scope | misleading product | MEDIUM | claim-to-evidence review | A4 + S1 review |

---

# 12. Highest-consequence attack trees

## 12.1 Goal: execute an unauthorized target action

```text
Unauthorized target action
|
+-- no active policy accepted by Kernel                 TM-AUTH-001
+-- unsupported action/resource accepted               TM-AUTH-002
+-- arbitrary calldata/target smuggled through Judge   TM-AUTH-003
+-- wrong Judge accepted                               TM-AUTH-008
+-- stale policy used                                  TM-AUTH-006
+-- revoked controller still active                    TM-AUTH-007
+-- generic adapter bypass                             TM-AUTH-009
+-- duplicate/replayed message causes second effect    TM-LIFE-004/005/011
+-- recovery expands authority                         TM-REC-006
```

Release condition: every branch has a negative test and no successful unauthorized action in the benchmark/invariant suite.

## 12.2 Goal: cause false incident confirmation

```text
False CONFIRMED
|
+-- prompt injection in evidence                       TM-EVID-001
+-- reporter changes rule/prompt                       TM-EVID-002
+-- fake/compromised authoritative source              TM-EVID-003/004
+-- source variability fools equivalence               TM-EVID-005/007
+-- missing evidence defaults to confirmed             TM-EVID-006
+-- schema-valid false leader result accepted          TM-EVID-011
+-- stale evidence reused                              TM-EVID-012
```

Release condition: ambiguous/unavailable/adversarial evidence cannot silently collapse into CONFIRMED.

## 12.3 Goal: restore unsafe capability

```text
Unsafe restoration
|
+-- incident A removes incident B restriction          TM-REC-001
+-- restriction count underflow                        TM-REC-002
+-- remediation skips recovery validation              TM-REC-003
+-- timer triggers restore                             TM-REC-004
+-- recovery bound to wrong incident                   TM-REC-005
+-- recovery expands authority                         TM-REC-006
+-- old recovery evidence replay                       TM-REC-007
+-- aggregate state weaker than strongest restriction  TM-REC-008
```

Release condition: all recovery transitions are incident-bound, reason-indexed and authority-non-expanding.

## 12.4 Goal: make a failed transaction look successful

```text
False success
|
+-- Accepted interpreted as final                      TM-LIFE-001
+-- Finalized interpreted as execution success         TM-LIFE-002
+-- child failure ignored                              TM-LIFE-006
+-- wrong status namespace used                        TM-LIFE-003
+-- stale indexer/API overrides protocol truth          TM-INF-009/TM-UX-010
+-- frontend hides execution/post-state mismatch        TM-UX-006/009
```

Release condition: user/operator surfaces retain lifecycle, execution result, child state and post-state as separate facts.

---

# 13. Security control families

## SC-01 Constitutional authority controls

- immutable Kernel;
- no upgrader;
- default-deny action/resource semantics;
- finite typed action vocabulary;
- exact Judge sender/module checks;
- target handshake and live owner/controller checks;
- authority expansion timelock;
- immediate authority reduction/revocation;
- no arbitrary calldata.

Maps primarily to `NFR-SEC-001`, `NFR-SEC-002`, `NFR-SEC-003`, `NFR-SEC-007`.

## SC-02 Replay and lifecycle controls

- deterministic incident/action IDs;
- strict reporter nonce;
- accepted/final stage separation;
- idempotent Judge->Kernel and Kernel->Target receivers;
- final reconciliation;
- parent/child trace handling;
- execution-result and post-state validation.

Maps primarily to `NFR-SEC-006` plus lifecycle/reliability requirements.

## SC-03 Evidence and semantic-judgment controls

- exact R1 rule registry;
- deterministic prechecks before nondeterministic execution;
- strict EAP bounds;
- source-class/source-policy rules;
- hostile-evidence treatment;
- fixed prompts;
- strict structured outputs;
- independent validator reassessment;
- defined UNDETERMINED path;
- no consequence selection inside LLM output.

Maps primarily to `NFR-SEC-003`, `NFR-SEC-004`, `NFR-SEC-005`, `NFR-SEC-009`, `NFR-SEC-010`.

## SC-04 Target defense-in-depth

- target validates Kernel caller;
- target validates action/resource/params independently;
- no generic execute;
- target action ID idempotency;
- safe-mode economic bounds;
- owner emergency controls remain explicit and logged.

Maps primarily to `NFR-SEC-007`.

## SC-05 Economic isolation

- Vault has no target-control authority;
- bond/bounty accounting independent of policy consequence;
- claim idempotency;
- configurable zero bond;
- no truth-based slashing for ordinary rejected/undetermined reports;
- child fee/budget failures surfaced.

## SC-06 Infrastructure least privilege

- Sentinel/reporting keys hold no owner/treasury authority;
- hosted API/indexer not authoritative;
- secrets outside repository/logs;
- canonical chain guard;
- exact dependency/runner locks;
- reproducible redeployment.

Maps primarily to `NFR-SEC-008` and compatibility requirements.

## SC-07 Product truth controls

- explicit network and authority preview;
- policy diff classifies authority expansion;
- separate transaction status / DecisionStage / DecisionOutcome / execution result / child state / post-state;
- no blind timeout resubmission;
- hostile evidence rendered safely;
- freshness made visible where relevant.

---

# 14. Required security verification programme

## 14.1 Static/source verification

Must include:

- Kernel schema/source confirms no upgrader;
- no generic target execution entrypoint;
- DecisionRecord contains no arbitrary executable target/calldata;
- canonical action enums/bounds;
- secret scan;
- dependency lock review;
- runner/network/toolchain lock verification;
- schema checks for all externally supplied structures.

## 14.2 Deterministic contract tests

Must include negative tests for:

- no active policy;
- wrong Judge;
- unsupported action/resource;
- sealed policy mutation;
- immediate authority expansion attempt;
- stale policy;
- revoked controller;
- duplicate decision/action;
- multi-incident composition;
- recovery over-restoration;
- wrong parent incident;
- Vault duplicate claim;
- target malformed action.

## 14.3 Judge/adversarial tests

Must include:

- prompt injection;
- Reporter rule injection attempt;
- malicious/false authoritative source;
- source outage;
- conflicting sources;
- stale evidence;
- variable web response;
- malformed model output;
- schema-valid false leader result;
- validator disagreement;
- oversize evidence;
- URL/private-address abuse.

## 14.4 Lifecycle/message tests

Must include:

- Accepted provisional path;
- Finalized CONFIRMED;
- Finalized REJECTED rollback;
- Finalized UNDETERMINED reconciliation;
- duplicate Judge->Kernel;
- duplicate Kernel->Target;
- delayed/reordered messages;
- child transaction failure;
- insufficient child fee budget;
- appeal/re-execution where supported by pinned RC;
- transaction finality with execution error.

## 14.5 Economic tests

Must include:

- Provider A normal payment;
- safe-mode Provider B fallback;
- safe-mode spend limit;
- duplicate service/action prevention;
- bond return/claim paths;
- bounty accounting;
- zero-bond path;
- failed child/value transfer path.

## 14.6 Frontend security/product-truth tests

Must include:

- wrong-network blocking;
- authority-expansion warning;
- provisional vs final presentation;
- finalized error presentation;
- parent/child failure trace;
- stale API/indexer path;
- refresh/resume without resubmission;
- safe rendering of malicious evidence content;
- no Reporter/Sentinel-as-truth copy;
- accessibility of security-critical status information.

## 14.7 Live 61997 tests

At minimum:

- G0 smoke deploy/write;
- real canonical R1 incident lifecycle;
- real test GEN purchase before incident;
- real state restriction/fallback after confirmed incident;
- real remediation/recovery path;
- execution-result/post-state evidence;
- clean redeployment rehearsal.

---

# 15. Threat traceability requirements

Create and maintain:

```text
docs/security/Threat Status.csv
```

Minimum columns:

```text
threat_id,status,severity,control_refs,requirement_refs,implementation_refs,test_refs,evidence_refs,residual_risk,owner,commit,last_updated
```

Allowed statuses:

```text
OPEN
IN PROGRESS
MITIGATED / UNVERIFIED
MITIGATED / VERIFIED
ACCEPTED RESIDUAL RISK
REMOVED FROM SCOPE
BLOCKED
```

Rules:

1. CRITICAL threats cannot be `ACCEPTED RESIDUAL RISK` for R1.
2. HIGH threats violating a P0 requirement or locked invariant cannot be accepted.
3. `MITIGATED / VERIFIED` requires test/evidence references.
4. A security-related implementation commit should cite relevant `TM-*` IDs in its body when practical.
5. A test may cover multiple threats, but each threat still needs explicit traceability.
6. New threats discovered during implementation receive new IDs; old IDs are never reused.
7. Removing a feature from R1 can move a threat to `REMOVED FROM SCOPE` only when the release scope truly removes the attack surface.

The existing RTM execution ledger should add an optional `threat_ref` field or otherwise link relevant security threats to the affected requirement rows.

---

# 16. Baseline RTM mapping

The following P0/R1 security requirements are explicit anchors:

| RTM/PRD ID | Security requirement | Primary threat families |
|---|---|---|
| NFR-SEC-001 | default-deny authority | TM-AUTH-* |
| NFR-SEC-002 | immutable Kernel / no upgrader | TM-AUTH-*, TM-INF-* |
| NFR-SEC-003 | no arbitrary LLM target/calldata/authority | TM-AUTH-003, TM-EVID-* |
| NFR-SEC-004 | hostile external text / constrained prompts | TM-EVID-001, 010, 014 |
| NFR-SEC-005 | validators independently assess evidence | TM-EVID-011 |
| NFR-SEC-006 | idempotent action receivers | TM-LIFE-004/005/011, TM-ECON-001 |
| NFR-SEC-007 | target defense-in-depth | TM-AUTH-009, TM-ECON-007/008 |
| NFR-SEC-008 | server credentials hold no owner/treasury keys | TM-INF-006/007 |
| NFR-SEC-009 | source failure/ambiguity does not default to CONFIRMED | TM-EVID-004/005/006/007 |
| NFR-SEC-010 | R1 public-evidence scope | TM-EVID-014 |

Other lifecycle, reliability, UX, observability and compatibility requirements must also be linked where relevant during S0/C1.

---

# 17. Audit lifecycle

The threat model is not written once and forgotten.

## S0 - Security baseline

Before C1 feature implementation, Claude must:

- read this document in full;
- validate assets/boundaries against the actual repository foundation;
- initialize `Threat Status.csv`;
- map every CRITICAL/HIGH threat to at least one planned control and verification path;
- identify any new threat introduced by F0/F1 choices;
- mark the threat model baseline commit/hash.

## A0 - Foundation audit

External reviewer checks:

- threat model exists and matches architecture;
- no obvious trust boundary is missing;
- CRITICAL/HIGH threats have planned controls/tests;
- toolchain/supply-chain threats are integrated with G0;
- F1 interfaces preserve security distinctions.

## A1 - Core architecture/security audit

Update/review:

- TM-AUTH-*;
- TM-REC-* relevant to Kernel state;
- target defense-in-depth;
- reference economic target;
- owner/controller/replay/stale-policy threats.

A1 packet must contain a threat delta and status export.

## A2 - Consensus/lifecycle/security audit

Update/review:

- TM-EVID-*;
- TM-LIFE-*;
- TM-ECON-*;
- Sentinel/SDK/toolchain threats affected by C2/C3.

A2 must include representative adversarial evidence and message/lifecycle traces.

## A3 - Product/integration audit

Update/review:

- TM-UX-*;
- hosted API/indexer trust;
- transaction truth representation;
- authority preview/signing safety;
- malicious evidence rendering.

## H1 - Hardening

The 50+ scenario benchmark must map adversarial cases back to `TM-*` IDs. New benchmark failures must create or reopen threats.

## A4 - Pre-release audit

A4 must review the full threat register and residual-risk disposition. Release is not authorised if:

- any CRITICAL threat remains unresolved;
- any HIGH threat violates a P0 requirement/invariant;
- any required threat verification is missing;
- a known security finding is omitted from the audit packet;
- a residual-risk acceptance lacks the required owner/reviewer decision.

---

# 18. Residual-risk process

Residual risk must be explicit.

For each unresolved non-blocking threat, record:

```text
Threat ID:
Observed condition:
Why complete mitigation is not in R1:
Remaining exploit path:
Impact:
Likelihood/context:
Compensating controls:
Monitoring/detection:
User/operator disclosure needed?:
Follow-up release:
Owner decision:
External reviewer decision:
Accepted until:
```

## 18.1 Acceptance rules

- CRITICAL: cannot be accepted.
- HIGH that violates P0/invariant: cannot be accepted.
- Other HIGH: owner + external reviewer approval required.
- MEDIUM: owner approval required if user/operator behaviour could be affected.
- LOW: may be recorded and scheduled without blocking release unless aggregate risk is material.

Risk acceptance does not change the underlying PRD/RTM requirement. If a requirement cannot be met, the normal release/deferment and governance processes still apply.

---

# 19. Security findings register

Create:

```text
docs/security/Security Findings.md
```

Each finding should contain:

```text
Finding ID
Date
Threat IDs
Severity
Affected commit/component
Description
Reproduction
Impact
Root cause
Fix
Tests added
Evidence
Residual risk
Status
External review required
```

Statuses:

```text
OPEN
FIX IN PROGRESS
FIXED / UNVERIFIED
FIXED / VERIFIED
ACCEPTED RESIDUAL RISK
DUPLICATE
NOT APPLICABLE
```

Do not delete closed findings merely to make the release appear cleaner.

---

# 20. Supply-chain security requirements

R1 must maintain:

- exact Node/package-manager/Python versions;
- exact GenLayer RC package locks;
- runner hashes;
- dependency lockfiles committed;
- no floating `latest` in release-critical dependencies;
- review of lockfile changes;
- no secret-bearing local configuration committed;
- reproducible install instructions;
- G0 rerun after compatibility-sensitive dependency changes;
- source commit recorded in deployment manifests.

Any unexpected runner/package/API drift opens or reopens the relevant `TM-INF-*` threat and compatibility finding.

---

# 21. Key and secret boundary

Reclose-operated infrastructure may use narrowly scoped keys for actions such as Reporter/Sentinel submissions, but must not custody:

- protected target owner key;
- protected target treasury key;
- deployer seed phrase in repository/logs;
- user wallet private key;
- privileged override key unless the repository owner explicitly controls it outside Reclose-operated infrastructure.

The R1 security evidence must include a non-secret permissions inventory proving the Sentinel/reporting wallet has no target-control authority.

---

# 22. Security of evidence presentation

The frontend may display external evidence but must not treat external HTML/text as trusted markup.

Requirements:

- escape/sanitize evidence content;
- do not execute arbitrary source scripts;
- safe external-link handling;
- clearly distinguish source text from Reclose/GenLayer system copy;
- never render source content in a way that could visually impersonate Reclose authority;
- preserve provenance/source class/timestamps where available;
- label unavailable/stale evidence honestly.

This is a browser-security analogue of the Judge's prompt-injection boundary: **evidence remains data, not instructions or trusted UI**.

---

# 23. Detection and observability

Where practical, the system should make security-relevant events reconstructable:

- target registration;
- policy proposal/seal/activation;
- restrictive overlay/revocation;
- incident submission;
- accepted/final decisions;
- Kernel effect generation;
- target action execution;
- failed child transactions;
- remediation/recovery;
- Vault settlement/claim;
- human override;
- deployment/version changes.

Security observability must not create a new authority layer. Logs/indexers assist reconstruction but contract state and transaction evidence remain authoritative.

---

# 24. Security completion criteria by phase

## Before C1

- S0 baseline completed;
- all CRITICAL/HIGH threats have planned controls/tests;
- no missing constitutional trust boundary;
- G0 supply-chain/runtime threats classified;
- A0 accepted.

## Before A1

- core authority threats implemented/tested;
- Kernel/target source audit complete;
- threat status updated;
- no known CRITICAL core issue unresolved.

## Before A2

- Judge/evidence/lifecycle/economic adversarial tests exist;
- prompt-injection/source-outage/schema-valid-false-leader tests exist;
- replay/child-fee/recovery cases exist;
- new threats documented.

## Before A3

- product truth/security UX tests exist;
- malicious evidence rendering tested;
- API/indexer outage/staleness tested;
- authority expansion/wrong-network/signing flows tested.

## Before A4

- full threat status register exported;
- all CRITICAL threats `MITIGATED / VERIFIED` or `REMOVED FROM SCOPE` with attack surface actually absent;
- blocking HIGH threats verified;
- residual risks documented and decided;
- security findings register current;
- benchmark cases mapped to threats;
- A4 reviewer receives the complete security evidence index.

---

# 25. Required A4 security evidence index

At minimum:

```text
release-evidence/r1/security/
├── threat-status.csv
├── security-findings.md
├── invariant-test-report.*
├── authority-negative-tests.*
├── replay-idempotency-report.*
├── multi-incident-report.*
├── recovery-security-report.*
├── judge-adversarial-report.*
├── prompt-injection-report.*
├── source-outage-variance-report.*
├── lifecycle-child-message-report.*
├── vault-economic-report.*
├── secrets-permissions-review.md
├── dependency-lock-review.md
├── frontend-security-report.*
└── security-evidence-index.md
```

Equivalent filenames are acceptable if the index makes the evidence unambiguous.

---

# 26. Security references

Primary GenLayer references relevant to this threat model include:

1. Prompt Injection: `https://docs.genlayer.com/developers/intelligent-contracts/security-and-best-practices/prompt-injection`
2. Web data access: `https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/web-data-access`
3. Web Access: `https://docs.genlayer.com/developers/intelligent-contracts/features/web-access`
4. Transaction statuses: `https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/transactions/transaction-statuses`
5. Transaction execution: `https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/transactions/transaction-execution`
6. Querying a Transaction: `https://docs.genlayer.com/developers/decentralized-applications/querying-a-transaction`
7. Encoding/signing/submission: `https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/transactions/transaction-encoding-serialization-and-signing`
8. Studio limitations: `https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/limitations`
9. GenVM: `https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/genvm`
10. Reclose `Studio-dev Toolchain & Network Compatibility Record.md`

The exact live RC behaviour remains governed by the G0-verified compatibility record and machine locks.

---

# 27. Permanent security principles

> **GenLayer determines the judgment. Policy determines the consequence. The Kernel enforces the boundary.**

> **Evidence is data, never authority.**

> **Finality is not the same thing as successful execution.**

> **Recovery must prove safety before restoring authority.**

> **A security control is not complete because it exists in code. It is complete when the relevant threat is mitigated, tested and evidenced.**

> **The system may judge an uncertain world, but it may act only inside authority that was made certain beforehand.**
