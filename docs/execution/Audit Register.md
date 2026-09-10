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
| 5 | see `docs/execution/Current Phase.md` for this submission's audit target SHA | **FAIL** (owner-supplied external review, C1R instruction Section 0) | A0-U01 (canonical `ActionEnvelope.boundedParameters` field flattened to top-level paramU256/paramStr), A0-U02 (compiled RecloseSDK did not match all 14 frozen signatures), A0-U03 (`test-f1-parity.js` overclaimed full SDK parity while checking only a subset mechanically) |
| 6 | see `docs/execution/Current Phase.md` for this submission's audit target SHA | AWAITING EXTERNAL REVIEW | addresses A0-U01/A0-U02/A0-U03 via F1-v6; see `docs/execution/audit-packets/A0-attempt-6/` |

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

**Attempt 5 external findings (2026-09-10, owner-supplied via the C1R hardening instruction, Section 0):**
- **A0-U01**: canonical `ActionEnvelope` field-name drift. The locked Master Design Package specifies
  `boundedParameters` as the canonical field; the F1-v5 remediation closed its contents correctly but deleted the
  field name itself, replacing it with top-level `paramU256`/`paramStr`. This is a real external finding, not a
  self-correction - recorded honestly.
- **A0-U02**: compiled `RecloseSDK` did not match all 14 frozen Frontend Contract v1 signatures (several
  return/input shapes drifted; a blanket `| ErrorEnvelope` union was added to methods the contract does not
  specify it for).
- **A0-U03**: `scripts/test-f1-parity.js` claimed to prove "full SDK parity" while mechanically checking only
  method names plus three hand-written regex signatures for the other 11 methods - an overclaim relative to what
  it actually verified.

Attempt 5 is recorded as **FAIL** for these findings, per the owner's explicit C1R instruction. Attempt 6
(F1-v6) addresses all three; see `docs/execution/audit-packets/A0-attempt-6/`. Attempt 5's packet
(`docs/execution/audit-packets/A0/`) is preserved unchanged as historical evidence.

**Owner execution-schedule override (2026-09-10):** the repository owner explicitly authorized proceeding
directly into C1 implementation after Part A closes, without waiting for an external decision on attempt 5, to
avoid repeated stop/review/fix cycles. This is an execution-schedule decision only - it does not mean A0 has
passed, does not authorize weakening security requirements or governance, and does not permit rewriting this
audit history. A0 remains recorded as **not externally passed** until the repository owner (or an independent
reviewer they designate) supplies an actual external A0 decision on attempt 5.

## A1 - External Core Architecture / Security Audit (Kernel + Policy + Reference Target)

| Attempt | Audit target commit (full SHA) | Decision | Notes |
|---|---|---|---|
| 1 | `82421aab595acfda4351c54f6542a071633152ad` (branch `claude/r1-core`) | **FAIL** (owner-supplied external review, C1R instruction Section 0) | findings A1-H01..A1-H12 below; see `docs/execution/audit-packets/A1/` for the attempt-1 packet (preserved unchanged) and `docs/execution/audit-packets/A1-attempt-2/` for the closure work |
| 2 | see `docs/execution/Current Phase.md` for this submission's audit target SHA (branch `claude/r1-core-hardening`) | AWAITING EXTERNAL REVIEW | C1R hardening pass; see `docs/execution/audit-packets/A1-attempt-2/findings-closure.md` for finding-by-finding closure |

**Attempt 1 findings (2026-09-10, owner-supplied via the C1R hardening instruction, Section 0):**

- **A1-H01** unauthenticated remediation/recovery state changes - `apply_remediation_decision()`/
  `apply_recovery_validation()` existed as independent public entry points rather than routing through
  authenticated `receive_decision()`.
- **A1-H02** caller-controlled security timestamps/timelock bypass - `register_target`/`begin_policy`/the
  activation lifecycle accepted a caller-supplied `now` parameter instead of using GenLayer's deterministic
  transaction time, allowing an attacker-controlled security clock.
- **A1-H03** count-based authority-expansion detection is insufficient - classifying expansion by comparing
  rule/effect counts allows same-count substitutions (e.g. MONITOR -> PAUSE) to be silently misclassified as
  reduction/no-change.
- **A1-H04** `disable_action`/`disable_resource` overlays are not enforced in the execution path - they recorded
  data without being checked before dispatch.
- **A1-H05** effects are not bound to a `rule_id` - `_effects_for_rule()` returned every policy effect sharing a
  release phase, not effects scoped to the specific rule that triggered the decision.
- **A1-H06** `PolicyRuleRecord.provisional_allowed` is stored but not enforced at the provisional-action gate.
- **A1-H07** remediation/recovery release semantics and target-state recomputation are incomplete/incorrect -
  `_set_state_floor()` cannot correctly move state back down as multiple incidents resolve in different orders.
- **A1-H08** live `receive_decision -> Kernel -> Target` dispatch has not succeeded (`AllocationTreeMalformed`,
  recorded honestly in the attempt-1 packet, not worked around).
- **A1-H09** identifier/composite-key hardening is incomplete - no shared validation helper, no canonical
  collision-safe composite-key encoding.
- **A1-H10** the `genvm-lint` exception is too broad relative to the single confirmed-stale diagnostic it is
  meant to waive.
- **A1-H11** `judge_version`/policy hash/version binding is incomplete in `receive_decision`.
- **A1-H12** tests prove weaker properties than several security claims imply (e.g. Direct Mode monkeypatched
  cross-contract proxy is not the same as a real live wire-format proof).

Attempt 1 is recorded as **FAIL** for these findings, per the owner's explicit C1R instruction. This is a real
external finding set, not a self-correction. C1 (AssuranceKernel, ReferenceAgentProtocol, ProviderStubA/B) had
been implemented, 31/31 Direct Mode tests passing (confirmed on real GitHub Actions Linux CI), and live-deployed
to Studio-dev (chain 61997) with a real target registration and active-policy flow proven on-chain - that
evidence remains valid as a record of what was achieved, but does not constitute an A1 PASS, and the findings
above must be closed before this audit gate can be considered ready for re-review. C2 (IncidentJudge,
IncentiveVault, Sentinel, frontend) has NOT begun and remains out of scope for the closure work.

## Later gates

| Gate | Status | Decision date | Decision source | Commit reviewed | Notes |
|---|---|---|---|---|---|
| A2 | not yet reached | - | - | - | - |
| A3 | not yet reached | - | - | - | - |
| A4 | not yet reached | - | - | - | - |
