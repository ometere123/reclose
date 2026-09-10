# Interface Change Log

## 2026-09-10 - F1-v5 -> F1-v6 (C1R hardening: owner-supplied external findings A0-U01/A0-U02/A0-U03)

**Context:** the repository owner's external review of C1/A1 attempt 1 also re-examined the A0 foundation and
found F1-v5 (which this session had itself produced) still contained real interface drift. This is recorded
honestly, not smoothed over: F1-v5's own remediation of the previous drift introduced a new drift.

**A0-U01 - canonical `ActionEnvelope.boundedParameters` field name deleted.** The locked Master Design Package
specifies `boundedParameters` as the canonical field. F1-v4 correctly used that name (with an open
`Record<string,unknown>` body, later found insufficient). F1-v5's fix to close the body's contents went further
than required and *deleted the field name itself*, replacing it with top-level `paramU256`/`paramStr` - a
convenience that broke MDP field-name parity. **Fix:** `boundedParameters` restored as a nested object,
`{ paramU256: string|null, paramStr: string|null }`, with `additionalProperties: false` at both the outer
`ActionEnvelope` level and the inner `boundedParameters` level, so it remains exactly as closed as F1-v5 intended
while using the correct field name. Changed: `schemas/transaction/ActionEnvelope.schema.json`,
`packages/protocol-sdk/src/types.ts` (new `BoundedParameters` interface), `docs/execution/Frontend Contract
v1.md` Section 1.8, `tests/frontend-fixtures/action-envelope-restrict.json`,
`scripts/test-action-envelope-negative.js` (expanded from 17 to 24 cases: every calldata/selector/method/
destination/payload/unknown-key rejection is now proven both at the top level and nested inside
`boundedParameters`), `scripts/test-f1-parity.js`.

**A0-U02 - compiled RecloseSDK did not match all 14 frozen Frontend Contract v1 signatures.** Several methods'
return/input shapes had drifted from the frozen contract text (`getEffectiveProviderStatus`,
`buildIncidentReport`, `buildRecoveryReport`, `validateAPM`, `hashAPM`, `diffAPM`, `trackTransaction`,
`trackActionTrace`), and separately every method had been given a blanket `| ErrorEnvelope` return-type union that
the frozen contract does not specify for most of them. **Fix:** `packages/protocol-sdk/src/sdk.ts` rewritten so
all 14 methods match the frozen signatures in CLAUDE.md/Frontend Contract v1 Section 2 verbatim - object-shaped
inputs/outputs restored exactly (e.g. `buildIncidentReport` takes `{targetId, ruleId, resourceId,
evidenceSources}` and returns `{report, feePreview}`; `trackTransaction` returns
`GenLayerTransactionLifecycle & {executionResult?: ExecutionResult}`), and the erroneous blanket `ErrorEnvelope`
union removed. `ErrorEnvelope` remains a canonical type for product/error-handling code, just not spliced into
every frozen signature.

**A0-U03 - `test-f1-parity.js` overclaimed full SDK parity.** The script's own test name said "full SDK parity"
while mechanically checking only the 14 method NAMES plus three hand-written regex signatures - a real gap
between the claim and the proof. **Fix:** added `packages/protocol-sdk/src/__typetests__/sdk-parity.ts`, a
compile-time-only file that independently re-declares the frozen contract as `ExpectedRecloseSDK` (importing only
plain data types, not `RecloseSDK` itself) and asserts BIDIRECTIONAL structural assignability against the real
`RecloseSDK` interface. This fails `npm run typecheck` (part of `npm run verify`) if any of the 14 signatures
drift in either direction. `scripts/test-f1-parity.js`'s method-name check is now explicitly documented as a fast
secondary check, not the primary parity proof.

**Frontend Contract v1.md → F1-v6.** Not labeled in a way that implies the previous version passed external
audit - F1-v5 did not, and F1-v6 does not either; both await the external A0 decision.

**Tests:** `npm run verify:js` full pass (typecheck, build, f1-parity:test, action-envelope:test 24/24,
schema:validate 43/43) confirmed locally before commit.

## 2026-09-10 - F1-v4 -> F1-v5 (A0 final remediation Parts A1-A9: F1 compiled-interface/schema parity)

**Change:** a further external review found that `docs/execution/Frontend Contract v1.md` (this document) and
`schemas/**/*.schema.json` had been correct and consistent with each other all along, but
`packages/protocol-sdk/src/types.ts`/`sdk.ts` (the compiled TypeScript half of the F1 boundary, added at F1-v4 to
close A0-T1) had drifted from both. This is exactly the class of bug F1-v4's own compiled-types work was meant to
prevent, and it was not caught because no automated check compared the TypeScript against the schema/document -
only `tsc` type-checking the TypeScript against *itself*.

**Drift found and fixed (Part A1):**
- `Target`: TypeScript used `address`/`activePolicyVersion`/`controllerMode` instead of the canonical
  `targetAddress`/`policyGeneration`, and had no `cachedOwner`/`authorityRevoked`/`humanOverrideEnabled`.
- `AssuranceState`/`AssuranceStateSummary`: TypeScript collapsed both into one type; `getAssuranceState()`
  returned the bare enum instead of the summary object.
- `RuleKind` vs `RuleId`: TypeScript had no `RuleKind` (INCIDENT/REMEDIATION/RECOVERY_VALIDATION) at all and used
  a single conflated type for both concepts.
- `PolicySummary`/`PolicyDetail`/`PolicySecurityDiff`, `Incident`, `EvidenceSource`, `RecoveryState`,
  `ErrorEnvelope`, `FeeTransactionPreview`: each used an ad hoc shape instead of mirroring its schema/document
  field-by-field (e.g. `EvidenceSource` was missing `fetchedAt`/`observedAt` naming and used a different
  availability model entirely).
- `DecisionRecord`: missing the optional `decisionId` field present in the schema.
- `GenLayerTransactionLifecycle.derived`: was incorrectly required in TypeScript; schema always had it optional.

**Drift found and fixed (Part A2, RecloseSDK):**
- `getDecision()` returned `DecisionView` (absorbing `getDecisionView`'s own return type).
- `getDecisionView()` was missing entirely from the compiled interface, despite being one of the 14 frozen
  methods documented in this file's own Section 2.
- `getAssuranceState()` returned `AssuranceState` (the bare enum) instead of `AssuranceStateSummary`.
- `trackTransaction()` returned `unknown` instead of `GenLayerTransactionLifecycle`.

**New automated parity check (Part A3):** `scripts/test-f1-parity.js`, wired into `npm run verify`, mechanically
diffs `packages/protocol-sdk/src/types.ts` field sets against `schemas/**/*.schema.json` (field names,
required/optional) and checks `RecloseSDK`'s method list/signatures for `getDecision`/`getDecisionView`/
`getAssuranceState` against the frozen 14-method list. Immediately upon first running it against the corrected
types, it caught one more real drift bug (missing `decisionId`), confirming the tool works.

**`ActionEnvelope.boundedParameters` closed (Part A4):** an open `Record<string, unknown>` (introduced at F1-v4
to fix the prior A0-T2 finding) was itself still an unbounded, free-form container. Replaced with `paramU256:
string | null` / `paramStr: string | null` - the same closed representation `PolicyDetail.effects` already uses -
so there is no key namespace in which `calldata`/`selector`/`method`/`destination`/a nested execution payload
could be smuggled in. Proven by `scripts/test-action-envelope-negative.js` (17 tests).

**`ExecutionReceipt` semantics completed (Part A5):** schema `allOf`/`if`/`then` now enforces:
`FINISHED_WITH_ERROR`/`TIMEOUT`/`NONDET_DISAGREE`/`DETERMINISTIC_VIOLATION` -> `FAILURE`; `NOT_VOTED` can never
claim `SUCCESS`; `SUCCESS` is reachable only via `FINISHED_WITH_RETURN`; and where `expectedPostStateRequired` is
true, `SUCCESS` additionally requires `postStateMatchesExpected === true`.

**`GenLayerTransactionLifecycle` cross-field constraints added (Part A6):** schema `allOf`/`if`/`then` now
enforces the exact `rawStatus` -> `protocolDecisionOutcome` mapping (`ACCEPTED` -> `"accepted"`, `UNDETERMINED`
-> `"undetermined"`, `VALIDATORS_TIMEOUT` -> `"validators-timeout"`, `LEADER_TIMEOUT` -> `"leader-timeout"`,
`CANCELED` -> `null`, never invented), and that mid-flight processing statuses (now including `LEADER_REVEALING`)
never carry a decided outcome. `scripts/test-transaction-truth-model.js` expanded from 7 to 13 executable
semantic tests, plus new fixtures `tx-lifecycle-pending-processing.json`, `tx-lifecycle-canceled.json`,
`tx-lifecycle-validators-timeout.json`.

**`TM-INF-001` corrected again (Part A7, non-breaking to F1 itself but tracked here for completeness):** a
unit-tested-but-not-integration-proven runtime guard does not make the broader threat `MITIGATED / VERIFIED`;
corrected to `MITIGATED / UNVERIFIED`. `NFR-CMP-001`, whose narrower acceptance criterion is satisfied by the
unit-level guard+test, correctly remains `VERIFIED`. See `docs/security/Security Findings.md` F-INF-001.

**A0 integrity check hardened (Part A8, non-breaking to F1 itself but tracked here for completeness):**
`scripts/a0-integrity-check.js`'s governance-immutability check no longer "best-effort" skips when a baseline
ref can't be resolved - it now resolves a hardcoded accepted G0 baseline commit and FAILS (never silently skips)
if that commit or any of the 11 governance/toolchain files can't be hash-compared against it. CI now uses
`fetch-depth: 0` so the baseline commit is always reachable.

**Schema files touched:** `schemas/transaction/ActionEnvelope.schema.json` (`paramU256`/`paramStr` replace
`boundedParameters`), `schemas/transaction/ExecutionReceipt.schema.json` (additional `allOf` rules),
`schemas/transaction/GenLayerTransactionLifecycle.schema.json` (additional `allOf` rules for
rawStatus/protocolDecisionOutcome mapping).
**TypeScript files touched:** `packages/protocol-sdk/src/types.ts` (near-total rewrite for parity),
`packages/protocol-sdk/src/sdk.ts` (added `getDecisionView`, fixed 3 return types).
**Fixtures touched:** `action-envelope-restrict.json` (paramU256/paramStr), plus 3 new fixtures for the expanded
lifecycle truth-model tests.
**Frontend Contract updated:** this document, Sections 1.7, 1.8, 8 (now F1-v5). Sections 1.1-1.6, 1.9-1.10, 2-7
were found to already be correct and did not need content changes - only the freeze-record version bump.
**Commit:** see `docs/execution/audit-packets/A0/commit.txt` for the audit target commit introducing this change.

## 2026-09-10 - F1-v3 -> F1-v4 (A0 final remediation: A0-T1, A0-T2, A0-T3)

**Change:** three fixes required by the A0 final remediation instruction, since the external reviewer determined
F1 was not complete as Markdown/JSON Schema alone.

1. **Compiled shared types (A0-T1):** created `packages/protocol-sdk/` - a real, pinned-TypeScript (`5.9.3`)
   package with `src/types.ts` (all F1 canonical types), `src/sdk.ts` (the type-only `RecloseSDK` interface),
   and `src/networkGuard.ts` (the NFR-CMP-001 wrong-network runtime guard, see below). `npm run typecheck` now
   runs a real `tsc --noEmit` against this package and previously would have failed on the `@ts-expect-error`
   negative type fixtures in `src/__typetests__/` if the NONE-prohibition types were wrong. No network calls or
   C1 business logic were added - this is type/interface foundation only, per instruction.
2. **Canonical `ActionEnvelope`/`ExecutionReceipt` (A0-T2):** rebuilt both against the locked Master Design
   Package formal model. `ActionEnvelope` gained `schemaVersion`, `targetId`, `targetAddress`, `policyVersion`,
   `boundedParameters` (a typed, bounded, finite-keyed object - not a single arbitrary `boundedParam` scalar),
   `decisionStage` and `decisionReference`; the reduced/incomplete prior shape is superseded, not extended in
   place. `ExecutionReceipt` gained `schemaVersion`, `targetId`, `adapterId`, `parentTxId`, `executionResult`,
   `finalStatus` (schema-enforced: `FINISHED_WITH_ERROR` execution result cannot map to `finalStatus: SUCCESS`),
   `preStateHash`, `postStateHash` and `executionTime`, while keeping `postStateMatchesExpected`/`feeAccounting`
   as clearly-derived convenience fields.
3. **`DecisionRecord` NONE prohibition (A0-T3):** `DecisionRecord.outcome` and `.decisionStage` now use inline
   restricted enums (`CONFIRMED`/`REJECTED`/`UNDETERMINED` and `PROVISIONAL`/`FINAL` respectively) instead of
   `$ref`-ing the full `DecisionOutcome`/`DecisionStage` enums, which retain `NONE` for storage/internal
   uninitialized state only (per the Implementation Specification's default-state requirement). Negative tests
   added in both `scripts/test-decision-record-negative.js` (JSON Schema) and
   `packages/protocol-sdk/src/__typetests__/decisionRecord.test-d.ts` (TypeScript, via `@ts-expect-error`).

**Also delivered in this remediation pass (foundation-level, not a breaking F1 type change):** the NFR-CMP-001
wrong-network preflight guard (`packages/protocol-sdk/src/networkGuard.ts`), tested by
`scripts/test-network-guard.js`, which accepts chain ID `61997` and rejects any other chain including the stable
Studionet `61999` (CLAUDE.md Section 10 rule 2). This closes the previously-missing runtime-guard half of
`TM-INF-001`'s required control.

**Schema files touched:** `schemas/incident/DecisionRecord.schema.json` (outcome/decisionStage enums restricted),
`schemas/incident/DecisionOutcome.schema.json` and `schemas/incident/DecisionStage.schema.json` (description
clarifies NONE is storage-only), `schemas/transaction/ActionEnvelope.schema.json` (rebuilt),
`schemas/transaction/ExecutionReceipt.schema.json` (rebuilt, added `allOf`/`if`/`then` cross-field enforcement).
**Fixtures touched:** `action-envelope-restrict.json`, `execution-receipt-success.json`,
`execution-receipt-child-failure.json` (all rebuilt to the new canonical shape; re-verified 40/40 via
`npm run schema:validate`).
**Frontend Contract updated:** `docs/execution/Frontend Contract v1.md` Sections 1 (new), 1.8, 8 (now F1-v4).
**Rationale:** the external A0 final remediation instruction found that a frozen interface boundary expressed
only as Markdown/JSON Schema, with a reduced `ActionEnvelope`/`ExecutionReceipt` shape and a `DecisionRecord`
that still permitted `NONE` outcome/stage values, did not meet the bar of a genuinely frozen, machine-enforced F1
contract (A0-T1/A0-T2/A0-T3).
**Commit:** see `docs/execution/audit-packets/A0/commit.txt` for the audit target commit introducing this change.

## 2026-09-10 - F1-v2 -> F1-v3 (A0 re-audit remediation: A0-R3)

**Change:** `DecisionRecord.reporter` changed from optional/nullable (`` `0x${string}` | null ``) to a required,
non-null field (`` `0x${string}` ``).

**Rationale:** the external A0 re-audit (finding A0-R3) identified that the locked Master Design Package Section
21 lists `reporter` as a plain field in the canonical DecisionRecord field list, with no null/optional annotation
and no documented exception for a system-initiated decision. The F1-v2 schema had made it nullable "for
convenience" (a system-initiated recovery-validation check was assumed to have no Reporter) without citing any
governance authorization for that exception - which the reviewer correctly identified as an invented exception,
not a governed one. No such authorization exists, so the field is now required and non-null: every governed R1
decision, including `RECOVERY_VALIDATED_V1`, is treated as submitted by an identified Reporter address (which may
be the target owner/operator acting as their own Reporter).

**Schema files touched:** `schemas/incident/DecisionRecord.schema.json` (`reporter` moved into `required`, type
narrowed from `["string","null"]` to `"string"`).
**Fixtures touched:** none required changes - all four `decision-*.json` fixtures and all three
`decision-view-*.json` fixtures already used a non-null `reporter` value; re-validated with
`npm run schema:validate` after the schema tightened.
**Frontend Contract updated:** `docs/execution/Frontend Contract v1.md` Section 1.6 (now F1-v3).
**Commit:** see `docs/execution/audit-packets/A0/commit.txt` for the audit target commit introducing this change.

## 2026-09-10 - F1-v1 -> F1-v2 (A0 remediation: A0-003, A0-004, A0-005, A0-008)

**Change:** breaking revision of three canonical types plus their fixtures, following external A0 review.

1. **`DecisionRecord` (A0-003):** removed `decisionId`-centric shape (`decisionId`, `ruleKind`, `judge`,
   `decidedAt`, `genlayerTx`) and replaced it with the governed semantic identity: `schemaVersion`, `incidentId`,
   `targetId`, `policyHash`, `policyVersion`, `ruleId`, `affectedResource`, `evidenceHash`, `reporter`, `outcome`,
   `conditionCode`, `reasonCodes`, `judgeModule`, `judgeVersion`, `decisionStage`, `generatedAt`. GenLayer
   transaction lifecycle state (`genlayerTx`) was removed from the canonical record entirely and now lives only in
   the new `DecisionView` composition (`record` + `transaction`), added as `schemas/incident/DecisionView.schema.json`.
2. **`EvidenceSource.sourceClass` (A0-004):** replaced the invented descriptive taxonomy
   (`OFFICIAL_STATUS_PAGE`/`PROVIDER_API`/`NEWS`/`SOCIAL`/`THIRD_PARTY_MONITOR`/`OTHER`) with the exact ADR-011
   governed source classes (`AUTHORITATIVE_SIGNED`/`AUTHORITATIVE_PUBLIC`/`ONCHAIN`/`INDEPENDENT_PUBLIC`/
   `CONTENT_ADDRESSED_SNAPSHOT`/`DERIVED_DETERMINISTIC`). The old descriptive values were preserved as a new,
   separate, non-security-bearing `sourceType` field.
3. **`GenLayerTransactionLifecycle` (A0-005):** replaced invented raw status values (`SUBMITTED`, `FINALIZED_ACCEPTED`,
   `REVERTED_PRE_FINALITY`) and an invented result value (`SPLIT`) with the pinned `genlayer-js@2.0.0-rc.1`
   package's actual `TransactionStatus` (14 values), `TransactionResult` (9 values) and `TransactionDecisionOutcome`
   (4 values) enums, extracted directly from that package's published type definitions. Renamed
   `lifecycleStatus`/`consensusResultName` to `rawStatus`/`rawResult` to make clear these are verbatim SDK values,
   added `protocolDecisionOutcome` as the SDK's own third distinct concept, and added an explicitly-derived,
   optional `derived.displayLabel`/`derived.isFinal` object for UI convenience only.
4. **Fixture integrity (A0-008):** all fixtures reusing real G0 transaction hashes (e.g.
   `0x83338017fd8376805c722b16a91128abe2a150ccdb9fb812c5023c32942b1c30`) or real G0 fee amounts were replaced with
   clearly synthetic placeholder values (`0x1111...`, `0x2222...`, etc., and round fee amounts). The conceptually
   invalid `tx-lifecycle-wrong-network.json` fixture (there is no "wrong network" transaction lifecycle value - it
   is a client-side pre-submission check) was removed; wrong-network coverage remains via `error-wrong-network.json`
   (`ErrorEnvelope`). Three new `DecisionView` fixtures were added specifically to test-prove: raw `ACCEPTED` !=
   `FINALIZED`; raw `UNDETERMINED` != `DecisionOutcome.UNDETERMINED`; and a `FINALIZED`+`FINISHED_WITH_ERROR` child
   transaction is a failure despite being lifecycle-final.

**Schema files touched:** `schemas/incident/DecisionRecord.schema.json` (rewritten),
`schemas/incident/DecisionView.schema.json` (new), `schemas/evidence/EvidenceSource.schema.json` (rewritten),
`schemas/transaction/GenLayerTransactionLifecycle.schema.json` (rewritten).
**Fixtures touched:** all `decision-*.json`, `evidence-source-*.json`, `tx-lifecycle-*.json`,
`child-transaction-*.json`, `execution-receipt-*.json`, `fee-preview-deploy.json`,
`error-fees-distribution-missing.json`, plus `tests/frontend-fixtures/manifest.json`.
**Frontend Contract updated:** `docs/execution/Frontend Contract v1.md` Sections 1.5, 1.6, 1.7, 2, 3, 5, 6, 8
(now F1-v2).
**Rationale:** external A0 review (findings A0-003, A0-004, A0-005, A0-008) found the F1-v1 shapes for these three
types materially misrepresented governed Reclose/GenLayer semantics, not merely used different names for the same
concepts. Fixed as new implementation content per the reviewer's explicit instruction not to alter F0/F1/S0
content merely to make the audit packet look cleaner - these are genuine corrections, re-verified by re-running
`npm run schema:validate` (40/40 pass) after the change.
**Commit:** see `docs/execution/audit-packets/A0/commit.txt` for the audit target commit introducing this change.

## 2026-09-10 - F1 initial freeze

**Change:** initial freeze of `docs/execution/Frontend Contract v1.md` - not a change from a prior version, the
baseline itself.
**Schema files added:** all files under `schemas/core/`, `schemas/policy/`, `schemas/incident/`,
`schemas/evidence/`, `schemas/transaction/`, `schemas/recovery/` (16 files).
**Fixtures added:** all 36 files under `tests/frontend-fixtures/` plus `manifest.json`.
**Commit:** the frozen content first appears at commit `23fb711` (the commit that added this Interface Change Log
entry itself); it was first *introduced* with placeholder text in `fe86a2f`, which predates and cannot
self-reference `23fb711`. Both are pre-existing commits, independently inspectable via
`git show fe86a2f:"docs/execution/Interface Change Log.md"` and `git show 23fb711:"docs/execution/Interface Change Log.md"`.
**Rationale:** establishes the canonical interface boundary between protocol/SDK semantics and future frontend
implementation before any product UI work begins, per Master Plan Section 13 / CLAUDE.md Section 22.
