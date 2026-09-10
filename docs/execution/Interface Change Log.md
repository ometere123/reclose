# Interface Change Log

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
