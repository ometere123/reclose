# Frontend Contract Review (A0, F1-v4)

Independent cross-check of `docs/execution/Frontend Contract v1.md` (now version F1-v4) against
governance, addressing findings A0-T1, A0-T2, A0-T3 from the third review (A0-R3 and earlier findings
were accepted as closed in prior reviews and are not re-litigated here).

## A0-T1: real compiled shared TypeScript types

**Before (F1-v3):** the frozen interface boundary existed only as Markdown prose and JSON Schema files.
`npm run typecheck` was a no-op echo statement - there was nothing to compile, and no mechanism could
catch a TypeScript-level contradiction (e.g. a type that quietly allowed `NONE` where the schema
prohibited it, or vice versa).

**Finding:** the reviewer determined this did not meet the bar of a genuinely frozen, machine-enforced
F1 contract - a Markdown/JSON-Schema-only "freeze" can drift silently if a future change updates one
representation and not the other.

**After (F1-v4):** `packages/protocol-sdk/` is a real npm workspace package with pinned
`typescript@5.9.3`. `src/types.ts` defines all F1 canonical types (`AssuranceState`, `DecisionOutcome`,
`DecisionStage`, `RuleKind`, `ActionType`, `SourceClass`, `Target`, `PolicySummary`, `PolicyDetail`,
`PolicySecurityDiff`, `Incident`, `EvidenceSource`, `DecisionRecord`, `DecisionView`,
`GenLayerTransactionLifecycle`, raw transaction status/result/execution-result types, child transaction
state, `ActionEnvelope`, `ExecutionReceipt`, effective-capability/recovery structures, `ErrorEnvelope`,
`FeeTransactionPreview`); `src/sdk.ts` defines the type-only `RecloseSDK` interface with all 14 governed
method signatures; `src/networkGuard.ts` implements the NFR-CMP-001 runtime guard (see
`threat-model-review.md`). `npm run typecheck` now runs real `tsc --noEmit`, and `npm run build` emits
real `.d.ts`/`.js` output. `src/__typetests__/decisionRecord.test-d.ts` contains `@ts-expect-error`
compile-time negative fixtures proving `NONE` is rejected by `CanonicalDecisionOutcome`/
`CanonicalDecisionStage` and that `reporter` cannot be omitted.

## A0-T2: canonical `ActionEnvelope`/`ExecutionReceipt` rebuilt to the MDP formal model

**Before (F1-v3):** `ActionEnvelope` only carried `actionId/incidentId/policyHash/actionType/
resourceId/boundedParam/nonce/expiry` - a reduced projection missing target identity
(`targetId`/`targetAddress`), `policyVersion`, `decisionStage`/`decisionReference`, and using a single
scalar `boundedParam` instead of a structured, finite-keyed parameter object. `ExecutionReceipt` lacked
`targetId`, `adapterId`, `parentTxId`, an explicit `executionResult`/`finalStatus`, and pre/post-state
hashes.

**After (F1-v4):** both types rebuilt per Parts 3-4 of the A0 final remediation instruction (see
`schemas/transaction/ActionEnvelope.schema.json` and `ExecutionReceipt.schema.json`, and Section 1.8 of
the Frontend Contract). `boundedParameters` is a typed object - the schema and TypeScript type both
document that it must never become arbitrary calldata, a selector, an arbitrary destination, or an
LLM-generated payload. `ExecutionReceipt.finalStatus` is schema-enforced against `executionResult`:
`FINISHED_WITH_ERROR` can never map to `finalStatus: SUCCESS`.

**Fixture impact:** `action-envelope-restrict.json`, `execution-receipt-success.json`,
`execution-receipt-child-failure.json` rebuilt to the new canonical shape; re-validated with
`npm run schema:validate` (40/40 still pass).

## A0-T3: `DecisionRecord.outcome`/`.decisionStage` prohibit `NONE`

**Before (F1-v3):** `DecisionRecord.outcome` and `.decisionStage` were typed via `$ref` to the full
`DecisionOutcome`/`DecisionStage` enums, both of which include `NONE` as a storage/internal
uninitialized-state value (a legitimate Implementation Specification default-state requirement
elsewhere) - but nothing stopped `NONE` from also validating inside an *emitted* canonical
`DecisionRecord`, which should only ever represent a completed judgment.

**After (F1-v4):** `DecisionRecord.schema.json` now declares `outcome`/`decisionStage` as inline
restricted enums (`CONFIRMED`/`REJECTED`/`UNDETERMINED` and `PROVISIONAL`/`FINAL`) instead of
`$ref`-ing the full enums. `DecisionOutcome.schema.json`/`DecisionStage.schema.json` retain `NONE` for
storage/internal use, with an updated description clarifying the canonical-record restriction lives in
`DecisionRecord.schema.json`. Proven by `scripts/test-decision-record-negative.js` (JSON Schema level,
6/6 pass: valid record passes; `outcome=NONE` rejected; `decisionStage=NONE` rejected; missing
`reporter` rejected; null `reporter` rejected; `genlayerTx` additional property rejected) and
`packages/protocol-sdk/src/__typetests__/decisionRecord.test-d.ts` (TypeScript level, via
`@ts-expect-error`).

## Verification

- `git show c7ace03:packages/protocol-sdk/src/types.ts` and `.../sdk.ts` - real compiled types exist.
- `npm run typecheck` and `npm run build` (run against the audit target in an isolated worktree) both
  succeed - see `commands-and-results.md` items 2, 19.
- `git show c7ace03:schemas/incident/DecisionRecord.schema.json` - `outcome`/`decisionStage` are inline
  restricted enums; `reporter` remains required and non-null (A0-R3, unchanged).
- `git show c7ace03:schemas/transaction/ActionEnvelope.schema.json` and `ExecutionReceipt.schema.json` -
  full canonical field sets present.
- `docs/execution/Interface Change Log.md` - F1-v3 -> F1-v4 entry present with rationale and commit
  reference.
