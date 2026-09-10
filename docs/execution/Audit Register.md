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
| 4 | see `docs/execution/Current Phase.md` for this submission's audit target SHA | AWAITING EXTERNAL REVIEW | closure of A0-T1..A0-T5 claimed; see `docs/execution/audit-packets/A0/` for the closure matrix - not yet independently confirmed |

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
- **Attempt 4** (this submission): addresses A0-T1..A0-T5 per the A0 final remediation instruction. See
  `docs/execution/audit-packets/A0/` for the finding-by-finding closure matrix and evidence. Status remains
  **AWAITING EXTERNAL REVIEW** - Claude does not author a PASS decision.

## Later gates

| Gate | Status | Decision date | Decision source | Commit reviewed | Notes |
|---|---|---|---|---|---|
| A1 | not yet reached | - | - | - | - |
| A2 | not yet reached | - | - | - | - |
| A3 | not yet reached | - | - | - | - |
| A4 | not yet reached | - | - | - | - |
