# Frontend Contract Review (A0, F1-v2)

Independent cross-check of `docs/execution/Frontend Contract v1.md` (now version F1-v2) against
governance, specifically addressing findings A0-003, A0-004, A0-005 and the schema-count part of
A0-008.

## A0-003: DecisionRecord

**Before:** centred `decisionId`, `ruleKind`, `judge`, `decidedAt`, `genlayerTx` - missing
consensus/policy/evidence binding fields, and embedded GenLayer transaction lifecycle inside the
canonical protocol record.

**After:** `schemas/incident/DecisionRecord.schema.json` now requires `schemaVersion`, `incidentId`,
`targetId`, `policyHash`, `policyVersion`, `ruleId`, `affectedResource`, `evidenceHash`, `outcome`,
`conditionCode`, `reasonCodes`, `judgeModule`, `judgeVersion`, `decisionStage`, `generatedAt` (plus
optional `decisionId`, `reporter`). Transaction lifecycle moved to the new
`schemas/incident/DecisionView.schema.json` (`{ record, transaction }`). Verify:
`git show 82b0d7c:schemas/incident/DecisionRecord.schema.json` contains no `genlayerTx`/lifecycle
field; `tests/frontend-fixtures/decision-view-*.json` (3 fixtures) validate against `DecisionView`.

## A0-004: EvidenceSource.sourceClass

**Before:** `OFFICIAL_STATUS_PAGE`/`PROVIDER_API`/`NEWS`/`SOCIAL`/`THIRD_PARTY_MONITOR`/`OTHER` -
not the ADR-011 governed classes.

**After:** `sourceClass` enum is exactly `AUTHORITATIVE_SIGNED`, `AUTHORITATIVE_PUBLIC`, `ONCHAIN`,
`INDEPENDENT_PUBLIC`, `CONTENT_ADDRESSED_SNAPSHOT`, `DERIVED_DETERMINISTIC`. The old descriptive
values moved to a new, separate, `additionalProperties`-safe `sourceType` field with no bearing on
trust semantics. Verify: `schemas/evidence/EvidenceSource.schema.json`;
`tests/frontend-fixtures/evidence-source-*.json` (3 fixtures, one per distinct `sourceClass` used).

## A0-005: GenLayerTransactionLifecycle

**Before:** invented raw values `SUBMITTED`/`FINALIZED_ACCEPTED`/`REVERTED_PRE_FINALITY` and an
invented result `SPLIT`, none of which exist in the pinned `genlayer-js@2.0.0-rc.1` package.

**After:** `rawStatus` (14 values), `rawResult` (9 values, nullable), `protocolDecisionOutcome` (4
values, nullable) are taken verbatim from the pinned package's own type definitions (independently
re-extracted from the published tarball during this remediation - see `compatibility-findings.md`).
An explicitly-derived, optional `derived.displayLabel`/`derived.isFinal` object remains available for
UI convenience without contaminating the raw fields. Three new fixtures
(`decision-view-final-confirmed.json`, `decision-view-accepted-not-final.json`,
`decision-view-outcome-undetermined-vs-raw-finalized.json`) concretely prove: raw `ACCEPTED` !=
`FINALIZED`; a Reclose `DecisionOutcome.UNDETERMINED` can coexist with a cleanly `FINALIZED`/
`MAJORITY_AGREE` transaction (proving the two "undetermined"-shaped concepts are independent); and
`child-transaction-failed.json` proves `FINALIZED` + `FINISHED_WITH_ERROR` is a failure.

## A0-008 (schema-count / freeze-identification part)

- Schema file count corrected: 19 (was stated as 16, and was actually 18 even before this
  remediation's new `DecisionView.schema.json`). Verify: `find schemas -type f | wc -l` at the audit
  target commit.
- Frontend Contract v1.md no longer identifies itself by a commit hash (which risks either circularity
  or staleness on every subsequent commit). It now uses a stable human version label (`F1-v2`) plus a
  freeze date, with commit/hash assertions kept out of the frozen document and into this audit packet
  instead (`commit.txt`, `content-hashes.txt`).
- Fixture hygiene: all fixtures that previously reused real G0 transaction hashes or real G0 fee
  amounts now use clearly synthetic placeholder values (`0x1111...` through `0x7777...`, round fee
  amounts). The conceptually invalid `tx-lifecycle-wrong-network.json` fixture (there is no such thing
  as a "wrong network" transaction lifecycle value) was removed; wrong-network coverage remains via
  `error-wrong-network.json` (`ErrorEnvelope`), which is the semantically correct representation of a
  client-side pre-submission check.

## Outstanding / not yet addressed by this packet

`docs/security/Security Findings.md`'s `TM-INF-001` finding text and `Threat Status.csv`'s
`TM-INF-001` row were both corrected in the prior commit (`82b0d7c`) to note that `MITIGATED /
VERIFIED` there covers only the network-lock half of the required control, not the SDK/frontend
runtime-guard half (which remains open, tracked under `TM-UX-002`). This is a known limitation, not a
contradiction - see `known-limitations.md`.
