# Audit Register

Tracks every external audit decision. Per CLAUDE.md Section 42, this register (and `AUDIT_DECISION.md` when it
exists) may only reflect review results actually supplied by the repository owner. Claude never authors a `PASS`
here. Full SHAs below are taken from `docs/execution/Current Phase.md` and prior audit-packet `commit.txt` files,
never invented.

## A0 - External Foundation Audit (F0 + F1 + S0)

| Attempt | Audit target commit (full SHA) | Decision | Findings |
|---|---|---|---|
| 1 | `69204d5bb3db0f9b6381f1ebeb7fc304f20a7433` | **FAIL** | A0-001 .. A0-009 |
| 2 | `82b0d7ce50ad3db62aaa34b677bd6d8927dd7b25` | **FAIL** | A0-R1 .. A0-R6 (A0-001, A0-004, A0-007, most of A0-008/A0-009 accepted closed) |
| 3 | `fef26f2c754e401008a7a0342b5b1bd4a1c0b8ff` | **FAIL** | A0-T1 .. A0-T5 |
| 4 | `c7ace037f63029dccff708cde1ac52372c3f642d` | **FAIL** (owner-recorded, A10) | F1 compiled-interface/schema drift, incomplete bounded-parameter enforcement, incomplete lifecycle/receipt semantic constraints, and integrity/status overclaims |
| 5 | see `docs/execution/Current Phase.md` for this submission's audit target SHA | AWAITING EXTERNAL REVIEW (C1 begun under owner execution-schedule override - see note below) | closure of Part A findings A1-A9 claimed; see `docs/execution/audit-packets/A0/` for the closure matrix - not yet independently confirmed |

Detail:

- **Attempt 1** (`69204d5`): first A0 submission. Findings A0-001 (RTM ledger scope/values), A0-002 (threat
  traceability columns/values), A0-003 (DecisionRecord shape mixed lifecycle into canonical record), A0-004
  (EvidenceSource.sourceClass used an invented taxonomy instead of governed ADR-011 classes), A0-005 (GenLayer
  transaction truth model used invented enum values instead of the real pinned SDK), A0-006 (CI swallowed
  failures with `|| true`), A0-007 (contract-discovery boundary too weak), A0-008 (document integrity: schema/
  fixture counts, Frontend Contract circularity, Security Findings severity counts, deployment manifest typo,
  fixtures reusing real G0 hashes), A0-009 (packet incomplete against the Master Plan's required file set).
- **Attempt 2** (`82b0d7c`, plus packet-only commit `e43b666`): fixed A0-001..A0-007 and most of A0-008/A0-009.
  Reviewer explicitly accepted A0-001, A0-004, A0-007 and most of A0-008/A0-009 as closed and told Claude not to
  redo them. New findings: A0-R1 (68/72 CRITICAL/HIGH threats had blank implementation/test refs), A0-R2
  (TM-INF-001 kept as MITIGATED / VERIFIED with only a residual_risk footnote for its missing runtime-guard
  control - rejected as insufficient), A0-R3 (DecisionRecord.reporter made nullable "for convenience" without
  governance authorization), A0-R4 (Gate Verification Status.csv contained stale evidence/commit references),
  A0-R5 (CI/root verification gaps: npm install vs npm ci, Python version mismatch, ambiguous verify command),
  A0-R6 (no executable transaction-truth semantic tests existed).
- **Attempt 3** (`fef26f2`, plus packet commits `7873056`/`0f265bf`): fixed A0-R1..A0-R6. New findings: A0-T1 (F1
  existed only as Markdown/JSON Schema, no real compiled shared TypeScript types), A0-T2 (ActionEnvelope/
  ExecutionReceipt were a reduced/incomplete projection of the MDP formal model), A0-T3 (canonical DecisionRecord
  still permitted `outcome`/`decisionStage` = `NONE`), A0-T4 (NFR-CMP-001 marked VERIFIED without any actual
  runtime chain-ID preflight guard existing - it was VERIFIED only because G0 happened to run against 61997),
  A0-T5 (archive/audit-target integrity process gaps, including the case-insensitive-rename content-loss bug
  discovered and fixed in this same submission's own history).
- **Attempt 4** (`c7ace03`): claimed to address A0-T1..A0-T5. A further external review pass identified
  additional consistency issues before this attempt could be treated as closed: `packages/protocol-sdk/src/
  types.ts`/`sdk.ts` had drifted from both `docs/execution/Frontend Contract v1.md` and `schemas/**/*.schema.json`
  (Target/PolicyDetail/Incident/EvidenceSource/RecoveryState/ErrorEnvelope/FeeTransactionPreview shapes wrong;
  `getAssuranceState()`/`getDecisionView()`/`getDecision()` return-type bugs); `ActionEnvelope.boundedParameters`
  remained an open, unbounded `Record<string,unknown>` despite A0-T2's fix; `ExecutionReceipt`/
  `GenLayerTransactionLifecycle` cross-field semantics were incomplete; `TM-INF-001` was marked `MITIGATED /
  VERIFIED` on unit-test evidence alone, without integration/E2E proof; the A0-integrity governance-immutability
  check silently "best-effort" skipped instead of failing when it could not resolve a baseline. Per the
  repository owner's explicit **A10** instruction, attempt 4 is recorded here as **FAIL** for these reasons -
  this is a self-recorded correction of Claude's own prior overclaim, not an independent external decision, and
  does not constitute or substitute for an external A0 PASS/FAIL.
- **Attempt 5** (this submission): addresses Part A1-A9 of the same remediation instruction (F1 compiled-type
  parity restored via a new deterministic `scripts/test-f1-parity.js` check; `ActionEnvelope` closed to
  `paramU256`/`paramStr`; `ExecutionReceipt`/lifecycle cross-field constraints completed and tested;
  `TM-INF-001` corrected to `MITIGATED / UNVERIFIED`; A0-integrity governance check made strict/non-skippable).
  See `docs/execution/audit-packets/A0/` for the finding-by-finding closure matrix and evidence. Status remains
  **AWAITING EXTERNAL REVIEW** - Claude does not author a PASS decision.

**Owner execution-schedule override (2026-09-10):** the repository owner explicitly authorized proceeding
directly into C1 implementation after Part A closes, without waiting for an external decision on attempt 5, to
avoid repeated stop/review/fix cycles. This is an execution-schedule decision only - it does not mean A0 has
passed, does not authorize weakening security requirements or governance, and does not permit rewriting this
audit history. A0 remains recorded as **not externally passed** until the repository owner (or an independent
reviewer they designate) supplies an actual external A0 decision on attempt 5.

## A1 - External Core Architecture / Security Audit (Kernel + Policy + Reference Target)

| Attempt | Audit target commit (full SHA) | Decision | Notes |
|---|---|---|---|
| 1 | `82421aab595acfda4351c54f6542a071633152ad` (branch `claude/r1-core`) | AWAITING EXTERNAL REVIEW | C1 implemented under the owner execution-schedule override above; see `docs/execution/audit-packets/A1/` |

C1 (AssuranceKernel, ReferenceAgentProtocol, ProviderStubA/B) implemented, 31/31 Direct Mode tests
passing (confirmed on real GitHub Actions Linux CI), and live-deployed to Studio-dev (chain 61997) -
the Master Plan's stated minimum ("at least one real target registration and active-policy flow on
61997") is proven on-chain with transaction hashes and view-call verification (see
`docs/execution/audit-packets/A1/deployment-evidence.md`). C2 (IncidentJudge, IncentiveVault,
Sentinel, frontend) has NOT begun. This packet awaits external review, alongside the still-pending
A0 decision above - proceeding into C1 does not retroactively supply the A0 decision, and does not
constitute an A1 PASS either.

## Later gates

| Gate | Status | Decision date | Decision source | Commit reviewed | Notes |
|---|---|---|---|---|---|
| A2 | not yet reached | - | - | - | - |
| A3 | not yet reached | - | - | - | - |
| A4 | not yet reached | - | - | - | - |
