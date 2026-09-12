# Audit Register

Tracks external audit decisions and owner-supplied review decisions. Claude never authors a `PASS` here. A PASS may be recorded only when it is actually supplied by the repository owner or by an independent reviewer the owner has designated. Historical entries are append-only in substance: later work may add context, but must not erase failed attempts or rewrite their decisions.

## A0 - External Foundation Audit (F0 + F1 + S0)

| Attempt | Audit target commit (full SHA) | Decision | Findings |
|---|---|---|---|
| 1 | `69204d5bb3db0f9b6381f1ebeb7fc304f20a7433` | **FAIL** | A0-001 .. A0-009 |
| 2 | `82b0d7ce50ad3db62aaa34b677bd6d8927dd7b25` | **FAIL** | A0-R1 .. A0-R6 (A0-001, A0-004, A0-007, most of A0-008/A0-009 accepted closed) |
| 3 | `fef26f2c754e401008a7a0342b5b1bd4a1c0b8ff` | **FAIL** | A0-T1 .. A0-T5 |
| 4 | `c7ace037f63029dccff708cde1ac52372c3f642d` | **FAIL** (owner-recorded, A10) | F1 compiled-interface/schema drift, incomplete bounded-parameter enforcement, incomplete lifecycle/receipt semantic constraints, and integrity/status overclaims |
| 5 | see historical A0 packet/current-phase record for that submission | **FAIL** (owner-supplied external review, C1R instruction Section 0) | A0-U01, A0-U02, A0-U03 |
| 6 | `55ee2cbccb1be0404b7e4bfb9f265e868d5b93dc` (branch `claude/r1-core-hardening`) | historical submission | F1-v6 closure work; see `docs/execution/audit-packets/A0-attempt-6/` |

Detail:

- **Attempt 1** (`69204d5`): first A0 submission. Findings A0-001 (RTM ledger scope/values), A0-002 (threat traceability columns/values), A0-003 (DecisionRecord shape mixed lifecycle into canonical record), A0-004 (EvidenceSource.sourceClass used an invented taxonomy instead of governed ADR-011 classes), A0-005 (GenLayer transaction truth model used invented enum values instead of the real pinned SDK), A0-006 (CI swallowed failures with `|| true`), A0-007 (contract-discovery boundary too weak), A0-008 (document integrity: schema/fixture counts, Frontend Contract circularity, Security Findings severity counts, deployment manifest typo, fixtures reusing real G0 hashes), A0-009 (packet incomplete against the Master Plan's required file set).
- **Attempt 2** (`82b0d7c`, plus packet-only commit `e43b666`): fixed A0-001..A0-007 and most of A0-008/A0-009. New findings: A0-R1 (68/72 CRITICAL/HIGH threats had blank implementation/test refs), A0-R2 (TM-INF-001 oververified), A0-R3 (DecisionRecord.reporter made nullable without governance authorization), A0-R4 (stale Gate Verification evidence), A0-R5 (CI/root verification gaps), A0-R6 (no executable transaction-truth semantic tests).
- **Attempt 3** (`fef26f2`, plus packet commits `7873056`/`0f265bf`): fixed A0-R1..A0-R6. New findings: A0-T1 (no real compiled shared TypeScript types), A0-T2 (ActionEnvelope/ExecutionReceipt incomplete vs MDP), A0-T3 (canonical DecisionRecord still permitted `NONE`), A0-T4 (wrong-network requirement oververified), A0-T5 (archive/audit-target integrity gaps).
- **Attempt 4** (`c7ace03`): claimed closure, but independent review found TypeScript/schema/frontend-contract drift, open bounded parameters, incomplete receipt/lifecycle cross-field semantics, oververified TM-INF-001, and a best-effort integrity check that could silently skip. Owner instruction A10 recorded the attempt as FAIL.
- **Attempt 5**: addressed the next F1/interface pass but owner-supplied review found A0-U01 (canonical `boundedParameters` field drift), A0-U02 (14-method RecloseSDK signature drift), A0-U03 (parity check overclaimed proof scope). Attempt 5 is preserved as FAIL.
- **Attempt 6**: F1-v6 closure work addressed A0-U01/U02/U03. Later programme work proceeded under the owner's execution-schedule override rather than rewriting the preceding history.

**Owner execution-schedule override (2026-09-10):** the repository owner explicitly authorised proceeding directly into C1 implementation without waiting for another repeated foundation review cycle. This was an execution-schedule decision only, not permission to weaken security requirements or erase audit history.

## A1 - External Core Architecture / Security Audit (Kernel + Policy + Reference Target)

| Attempt | Audit target commit (full SHA) | Decision | Notes |
|---|---|---|---|
| 1 | `82421aab595acfda4351c54f6542a071633152ad` (branch `claude/r1-core`) | **FAIL** (owner-supplied external review) | findings A1-H01..A1-H12; attempt-1 packet preserved at `docs/execution/audit-packets/A1/` |
| 2 | `55ee2cbccb1be0404b7e4bfb9f265e868d5b93dc` (branch `claude/r1-core-hardening`) | historical hardening submission | see `docs/execution/audit-packets/A1-attempt-2/findings-closure.md` |

**Attempt 1 findings:** unauthenticated remediation/recovery state changes; caller-controlled security timestamps; weak count-based authority expansion classification; unenforced owner overlays; effects not bound to rule IDs; `provisional_allowed` not enforced; incomplete recovery/state recomputation; live cross-contract dispatch failure; composite-key/input hardening gaps; overbroad linter exception; incomplete Judge-version/policy binding; and tests proving weaker properties than several claims implied.

The subsequent C1R/C1-FINAL hardening work moved semantic decisions through authenticated `receive_decision`, replaced caller time with deterministic runtime time, implemented structural authority-diffing, enforced overlays/rule binding/provisional opt-in, repaired multi-incident recovery, hardened identifiers and replay handling, bound policy/judge identity, narrowed the linter waiver, added target-side revocation and final-action redispatch safeguards, and expanded Direct Mode/live evidence. Historical A1 attempt 1 remains FAIL regardless of later closure work.

## A2 - External Consensus / Economics / Tooling Audit

| Attempt | Audit target commit (full SHA) | Decision | Decision source | Notes |
|---|---|---|---|---|
| 1 | `ae3a5083e1db805c3fa6692a11661d06e6679ec7` (`claude/r1-tooling`) | **FAIL** | independent review designated by owner | first A2 packet preserved at `docs/execution/audit-packets/A2/`; findings drove the consensus/evidence/Vault/SDK/tooling remediation |
| 2 | `6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5` (`claude/a2-remediation-integration`) | **PASS WITH CONDITIONS** | independent ChatGPT review designated by owner | full decision at `docs/execution/audit-packets/A2-attempt-2/AUDIT_DECISION.md`; D1-D4/I1-I2 authorised; E1 closure not authorised while A2-C01 remains |

### A2 attempt 2 conditions

- **A2-C01:** Studio-dev Judge -> Kernel triggered child still fails with `fee no_matching_allocation # internal`, including estimator-derived allocation data. This is an E1/R1 release blocker unless resolved or governed release scope explicitly changes.
- **A2-C02:** fee-profile coverage IDs exist but real final-deployment profile inputs/output must replace placeholders before A3/E1 closure. Blocked branches must remain blocked, not fabricated.
- **A2-C03:** action-trace/product receipt truth had to stop fabricating/omitting target ID, post-state requirement and execution time. Product/I2 work on `chatgpt/r1-product-release` now implements protocol/index-derived fields and tests them, but final A3 review must verify the integrated runtime adapter.
- **A2-C04:** stale phase/audit/ledger records must be brought forward without rewriting the historical first packet. This register and `Current Phase.md` now record the attempt-2 decision; RTM/threat rows may advance only from concrete evidence.

The PASS WITH CONDITIONS was justified by the materially implemented Judge evidence binding/source registry/independent validation, Kernel authority/replay/recovery controls, Reporter-owned policy-derived Vault economics, concrete SDK/tooling/Sentinel implementation, green exact-target GitHub CI, and a fresh Studio-dev deployment proving deploy/wiring/APM readback/activation and Judge-side real web/LLM execution. It explicitly did **not** claim the downstream live triggered-child path was successful.

## A3 - External Product & Integration Audit

| Attempt | Audit target commit (full SHA) | Decision | Decision source | Notes |
|---|---|---|---|---|
| 1 | `264c14af8f83cbd2bcf0176c87d9950baf0b275a` (`chatgpt/r1-product-release`) | **AWAITING EXTERNAL REVIEW** | - | exact target CI run `34682294856` SUCCESS; packet at `docs/execution/audit-packets/A3/`; browser/accessibility captures remain NOT RUN and must not be fabricated |

The A3 target contains D1-D4/I1-I2 product implementation, SDK product-truth corrections, fixture/live adapter boundary, transaction persistence rules, malicious-evidence rendering protection, bounded agent `skill.md`, CLI incident/recovery preparation wrappers, and the threat-linked benchmark gate. Source CI success is recorded, but source CI is not a substitute for the browser/product evidence required by the Master Plan.

A3 does not close A2-C01. The Studio-dev Judge -> Kernel child limitation continues to block canonical E1 completion.

## Later gates

| Gate | Status | Decision date | Decision source | Commit reviewed | Notes |
|---|---|---|---|---|---|
| A4 | NOT READY FOR EXTERNAL REVIEW | - | - | - | pre-staged packet explicitly waits for A3 decision, browser evidence, final fee profile, H1/E1 evidence and ledger reconciliation |
