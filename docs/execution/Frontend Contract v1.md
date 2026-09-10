# Frontend Contract v1

**Status:** FROZEN
**Version:** F1-v5 (F1-v1 superseded by F1-v2 per external A0 review findings A0-003/A0-004/A0-005/A0-008;
F1-v2 superseded by F1-v3 per external A0 re-audit finding A0-R3; F1-v3 superseded by F1-v4 per A0-T1/A0-T2/A0-T3;
F1-v4 superseded by F1-v5 after a further external review found that THIS document had always been correct, but
`packages/protocol-sdk/src/types.ts`/`sdk.ts` had drifted from it - see Part A1/A2 of the A0 final remediation
instruction and the Interface Change Log entry below for the exact drift found and fixed, plus the new
`scripts/test-f1-parity.js` deterministic drift check now wired into `npm run verify`)
**Freeze verification:** this document identifies itself by a stable human version label (`F1-v5`) and a freeze
date, not by any commit hash - including its own containing commit's hash, which cannot be known from inside the
file that would record it. Content-unchanged-ness between any two points in time is verified externally, by
running `git diff <commit-a> <commit-b> -- "docs/execution/Frontend Contract v1.md"` between two already-existing
commits, and by comparing the git blob hash / SHA-256 recorded in
`docs/execution/audit-packets/A0/content-hashes.txt` (computed and stored in a file outside this one, generated
from an already-existing commit after that commit exists). This document never claims a commit recorded its own
hash before that commit existed.
**Owner and consumer:** Claude Code (both protocol and frontend sides)
**Governs:** the interface boundary between Reclose protocol/SDK semantics and all future product/frontend
implementation (D1+), per CLAUDE.md Section 22 and Repository Build Master Plan Section 13.

This document is F1 deliverable. It defines stable **types**, **SDK method signatures**, the **transaction truth
model**, the **error envelope**, fixture locations, known implementation gaps, and the interface change procedure.
Every semantic field below is derived from the six locked governance documents (ADR, MDP, Implementation
Specification, Naming & Brand Decision Record, PRD, RTM), from real G0 execution evidence, and - for the
transaction-lifecycle types in Section 1.7 - from the actual pinned `genlayer-js@2.0.0-rc.1` package's own type
definitions (independently extracted from the published npm tarball, not invented or guessed from stale examples).
Where a field is illustrated with a fixture, the fixture is synthetic (clearly labeled, using clearly-fake
placeholder IDs/hashes rather than real G0 transaction hashes) and does not assert live protocol truth.

Do not bypass this document's discipline merely because one agent owns both the protocol and frontend sides
(CLAUDE.md Section 22).

---

## 1. Canonical types

All types are defined here as JSON Schema (source of truth, machine-checkable) under `schemas/`, with a
TypeScript projection below for SDK/frontend implementers. The JSON Schema is authoritative; the TypeScript is a
convenience mirror and must be kept in sync via the Interface Change Log procedure (Section 8).

### 1.1 `Target` - `schemas/core/Target.schema.json`

Mirrors `TargetRecord` (Implementation Specification Section 11).

```ts
type AssuranceStateEnum = "NORMAL" | "MONITORED" | "RESTRICTED" | "SAFE_MODE" | "PAUSED" | "RECOVERY";

interface Target {
  targetId: string;
  targetAddress: `0x${string}`;
  cachedOwner?: `0x${string}`; // display/audit only - never used for authorization (Implementation Spec Section 19)
  assuranceState: AssuranceStateEnum;
  activePolicyKey: string;
  policyGeneration: number;
  authorityRevoked: boolean;
  humanOverrideEnabled: boolean;
  registeredAt: string; // ISO 8601
}
```

### 1.2 `AssuranceState` (summary) - `schemas/core/AssuranceState.schema.json`

The frontend-facing summary of what is actually restricted right now - never just the enum label
(CLAUDE.md Section 28).

```ts
interface AssuranceStateSummary {
  targetId: string;
  state: AssuranceStateEnum;
  activeRestrictions: Array<{ incidentId: string; actionType: ActionTypeEnum; resourceId: string }>;
  effectiveCapabilities: string[];
  asOfBlock: number;
}
```

### 1.3 Policy summary/detail/security diff - `schemas/policy/*.schema.json`

Mirrors `PolicyHeader`, `PolicyRuleRecord`, `EffectRecord` (Implementation Specification Sections 12-14).

```ts
type RuleKindEnum = "INCIDENT" | "REMEDIATION" | "RECOVERY_VALIDATION";
type ActionTypeEnum =
  | "NO_ACTION" | "ALERT" | "MONITOR" | "RESTRICT" | "THROTTLE"
  | "REVOKE_CAPABILITY" | "REROUTE" | "ENTER_SAFE_MODE" | "PAUSE"
  | "ENTER_RECOVERY" | "RESTORE";
type ReleasePhaseEnum = "PROVISIONAL" | "REMEDIATION_CONFIRMED" | "RECOVERY_VALIDATED";

interface PolicySummary {
  policyKey: string;
  targetId: string;
  version: number;
  manifestHash: string;
  creator?: `0x${string}`;
  createdAt?: string;
  activationNotBefore?: string;
  activatedAt?: string | null;
  sealed: boolean;
  active: boolean;
  superseded: boolean;
  ruleCount: number;
  resourceCount: number;
  effectCount: number; // total effects in policy; MAX_EFFECTS_PER_DECISION=4 bounds a single decision, not this total
  humanOverrideEnabled: boolean;
}

interface PolicyDetail {
  summary: PolicySummary;
  rules: Array<{
    ruleId: string; judge: `0x${string}`; ruleKind: RuleKindEnum;
    provisionalAllowed: boolean; reportBond: string; confirmedBounty: string; enabled: boolean;
  }>;
  effects: Array<{
    actionType: ActionTypeEnum; resourceId: string; paramU256: string | null; paramStr: string | null;
    releasePhase: ReleasePhaseEnum; enabled: boolean;
  }>;
}

interface PolicySecurityDiff {
  fromVersion: number | null;
  toVersion: number;
  authorityExpands: boolean;
  activationDelaySeconds: number | null; // non-null whenever authorityExpands (TM-AUTH-004)
  changes: Array<{
    kind: "ACTION_ADDED" | "ACTION_REMOVED" | "RESOURCE_ADDED" | "RESOURCE_REMOVED"
        | "BOUND_WIDENED" | "BOUND_NARROWED" | "JUDGE_CHANGED" | "HUMAN_OVERRIDE_CHANGED";
    description: string;
    isExpansion?: boolean;
  }>;
}
```

### 1.4 `Incident` - `schemas/incident/Incident.schema.json`

```ts
interface Incident {
  incidentId: string;
  targetId: string;
  policyKey: string;
  ruleId: string;
  resourceId: string;
  reporter: `0x${string}`;
  judge: `0x${string}`;
  evidenceHash: string;
  conditionCode: string; // <= 64 chars per Implementation Spec Section 9
  status: "OPEN" | "PROVISIONAL_APPLIED" | "FINAL_CONFIRMED" | "FINAL_REJECTED"
        | "FINAL_UNDETERMINED" | "REMEDIATION_PENDING" | "RECOVERY" | "CLOSED";
  createdAt: string;
  closedAt: string | null;
}
```

### 1.5 Evidence/source representation - `schemas/evidence/EvidenceSource.schema.json`

Evidence is hostile/untrusted data by default (CLAUDE.md Section 15). This type carries only provenance/fetch
metadata, never executable instructions.

**Corrected per A0-004:** `sourceClass` now uses the exact ADR-011 governed source classes instead of an invented
descriptive taxonomy. Descriptive/display categories (status page, news, social, etc.) live in the separate,
non-security-bearing `sourceType` field.

```ts
type SourceClass =
  | "AUTHORITATIVE_SIGNED" | "AUTHORITATIVE_PUBLIC" | "ONCHAIN"
  | "INDEPENDENT_PUBLIC" | "CONTENT_ADDRESSED_SNAPSHOT" | "DERIVED_DETERMINISTIC";
type SourceType = "STATUS_PAGE" | "PROVIDER_API" | "NEWS" | "SOCIAL" | "THIRD_PARTY_MONITOR" | "OTHER" | null;

interface EvidenceSource {
  sourceId: string;
  url: `https://${string}`;
  sourceClass: SourceClass; // security/trust classification (ADR-011) - never overloaded with UI categories
  sourceType?: SourceType;  // optional descriptive/provenance-grouping metadata (PRD-REP-004), not a trust class
  fetchedAt: string;
  observedAt: string | null;
  contentHash: string | null;
  availability: "AVAILABLE" | "UNAVAILABLE" | "VARIANT_CONTENT" | "REJECTED_BY_POLICY";
  rejectionReason: string | null;
}
```

### 1.6 `DecisionRecord`, `DecisionView`, `DecisionOutcome`, `DecisionStage` - `schemas/incident/*.schema.json`

**Rebuilt per A0-003, corrected further per A0-R3.** The canonical `DecisionRecord` carries the governed Reclose
semantic identity and never embeds GenLayer transaction lifecycle state (that was the A0-003 defect: the previous
version centred `decisionId`/`ruleKind`/`judge`/`decidedAt`/`genlayerTx` and was missing consensus/policy/evidence
binding fields). A separate product-facing `DecisionView` composes the canonical record with its transaction
lifecycle for UI convenience, without contaminating the protocol-semantic record itself. `reporter` is a
**required** field (not optional/nullable): Master Design Package Section 21 lists it as a plain field in the
canonical DecisionRecord with no null/optional annotation and no documented system-initiated exception, so every
DecisionRecord - including a `RECOVERY_VALIDATED_V1` decision - carries the address that submitted it (the target
owner/operator MAY act as their own Reporter for a remediation/recovery submission, but the field is never
absent).

```ts
type DecisionOutcome = "NONE" | "CONFIRMED" | "REJECTED" | "UNDETERMINED";
type DecisionStage = "NONE" | "PROVISIONAL" | "FINAL";
type RuleId = "PROVIDER_COMPROMISE_V1" | "SERVICE_FAILURE_V1" | "REMEDIATION_CONFIRMED_V1" | "RECOVERY_VALIDATED_V1";

interface DecisionRecord {
  schemaVersion: "1.0.0";
  decisionId?: string | null;       // optional internal indexing convenience only
  incidentId: string;
  targetId: string;
  policyHash: string;               // canonical policy hash at decision time (ADR-010, TM-AUTH-011)
  policyVersion: number;
  ruleId: RuleId;                   // the governed Judge rule family (CLAUDE.md Section 14); Reporter cannot set this (TM-EVID-002)
  affectedResource: string;
  evidenceHash: string;             // binds the EAP evaluated (TM-EVID-013)
  reporter: `0x${string}`;          // required canonical field (MDP Section 21); no null - see A0-R3
  outcome: DecisionOutcome;
  conditionCode: string;            // rule-specific semantic result, distinct from `outcome`
  reasonCodes: string[];            // reason-indexed restriction linkage (CLAUDE.md Section 17, TM-REC-001/008)
  judgeModule: `0x${string}`;
  judgeVersion: number;
  decisionStage: DecisionStage;
  generatedAt: string;
}

// Product-facing composition only - never the canonical protocol record itself.
interface DecisionView {
  record: DecisionRecord;
  transaction: GenLayerTransactionLifecycle;
}
```

**`DecisionOutcome`/`DecisionStage` are never collapsed into a single `status` field, and are never conflated with
`GenLayerTransactionLifecycle` or `ExecutionResult` below (CLAUDE.md Section 9, TM-LIFE-003). In particular,
`GenLayerTransactionLifecycle.rawStatus` can itself be the string `"UNDETERMINED"` (a raw GenLayer protocol
lifecycle value) - this is a completely different concept from `DecisionOutcome.UNDETERMINED` (a Reclose semantic
outcome about evidence/rule confidence) and the two must never be rendered or tested as if they were the same
field. See `tests/frontend-fixtures/decision-view-outcome-undetermined-vs-raw-finalized.json` for a fixture that
deliberately pairs a Reclose `UNDETERMINED` outcome with a cleanly `FINALIZED`/`MAJORITY_AGREE` transaction to
make this independence concrete.**

### 1.7 GenLayer transaction lifecycle, execution result, child transaction state

`schemas/transaction/{GenLayerTransactionLifecycle,ExecutionResult,ChildTransactionState}.schema.json`

**Rebuilt per A0-005.** The previous version invented raw lifecycle values (`FINALIZED_ACCEPTED`,
`REVERTED_PRE_FINALITY`) that do not exist in the pinned `genlayer-js@2.0.0-rc.1` package. The values below were
extracted directly from that package's own type definitions (`dist/index-BT1ApAqQ.d.ts` in the published
`genlayer-js@2.0.0-rc.1` npm tarball, inspected 2026-09-10) and are reproduced verbatim.

```ts
// Verbatim genlayer-js@2.0.0-rc.1 TransactionStatus - raw protocol lifecycle state only.
// FINALIZED is a terminal lifecycle state; it says nothing on its own about whether the retained
// result was accepted, and nothing about execution success (see ExecutionResult below).
type RawTransactionStatus =
  | "UNINITIALIZED" | "PENDING" | "PROPOSING" | "COMMITTING" | "REVEALING"
  | "ACCEPTED" | "UNDETERMINED" | "FINALIZED" | "CANCELED"
  | "APPEAL_REVEALING" | "APPEAL_COMMITTING" | "VALIDATORS_TIMEOUT"
  | "LEADER_TIMEOUT" | "LEADER_REVEALING";

// Verbatim genlayer-js@2.0.0-rc.1 TransactionResult - the retained consensus round result.
// Never invent values such as "SPLIT"; these 9 are the actual enum members.
type RawTransactionResult =
  | "IDLE" | "AGREE" | "DISAGREE" | "TIMEOUT" | "DETERMINISTIC_VIOLATION"
  | "NO_MAJORITY" | "MAJORITY_AGREE" | "MAJORITY_DISAGREE" | "MAJORITY_TIMEOUT"
  | null;

// Verbatim genlayer-js@2.0.0-rc.1 consumer-oriented TransactionDecisionOutcome (lowercase/hyphenated
// in the SDK's own types) - a THIRD distinct concept from both fields above and from Reclose's own
// DecisionOutcome. Never conflate any of these three.
type ProtocolDecisionOutcome = "accepted" | "undetermined" | "validators-timeout" | "leader-timeout" | null;

interface GenLayerTransactionLifecycle {
  txId: `0x${string}`;
  rawStatus: RawTransactionStatus;
  rawResult?: RawTransactionResult;
  protocolDecisionOutcome?: ProtocolDecisionOutcome;
  decidedAtBlock?: number | null;
  appealDeadline?: string | null;
  // Optional UI-convenience label, explicitly derived, never a substitute for the raw fields above.
  derived?: { displayLabel: string; isFinal: boolean } | null;
}
// A0 final remediation A6 (schema-enforced, see GenLayerTransactionLifecycle.schema.json allOf):
//   - mid-flight processing statuses (UNINITIALIZED/PENDING/PROPOSING/COMMITTING/REVEALING/
//     APPEAL_REVEALING/APPEAL_COMMITTING/LEADER_REVEALING) must have protocolDecisionOutcome === null;
//   - ACCEPTED -> protocolDecisionOutcome === "accepted" (exactly, not merely non-null);
//   - UNDETERMINED -> protocolDecisionOutcome === "undetermined";
//   - VALIDATORS_TIMEOUT -> protocolDecisionOutcome === "validators-timeout";
//   - LEADER_TIMEOUT -> protocolDecisionOutcome === "leader-timeout";
//   - CANCELED -> protocolDecisionOutcome === null (never invented - no "canceled" value exists in genlayer-js);
//   - FINALIZED intentionally has no schema-forced protocolDecisionOutcome value: it is reached from
//     whichever prior status the transaction was in, and conservatively retains that status's outcome.

// Enum values confirmed live at G0 via `genlayer receipt` (txExecutionResultName field) and cross-checked
// against the pinned genlayer-js@2.0.0-rc.1 ExecutionResult enum (identical set, no change needed here);
// see release-evidence/r1/g0/deploy-success-pinned/smoke-deployment-receipt.txt
type ExecutionResult = "NOT_VOTED" | "FINISHED_WITH_RETURN" | "FINISHED_WITH_ERROR"
                      | "TIMEOUT" | "NONDET_DISAGREE" | "DETERMINISTIC_VIOLATION";

interface ChildTransactionState {
  txId: `0x${string}`;
  parentTxId: `0x${string}`;
  role: "JUDGE_DECISION" | "KERNEL_EFFECT" | "TARGET_ACTION";
  lifecycle: GenLayerTransactionLifecycle;
  executionResult?: ExecutionResult;
}
```

A finalized transaction may still have failed execution (CF-005, G0-verified; see also
`tests/frontend-fixtures/child-transaction-failed.json`, where `lifecycle.rawStatus` is `FINALIZED` while
`executionResult` is `FINISHED_WITH_ERROR`). **`rawStatus`, `rawResult`, `protocolDecisionOutcome` and
`executionResult` are always inspected and displayed as separate fields, never merged.** The real G0-observed CLI
display string `"Finalized · Accepted"` is a derived UI label (see `derived.displayLabel` above), not a raw SDK
enum value - do not reintroduce it as if it were one.

### 1.8 `ActionEnvelope`, `ExecutionReceipt` (rebuilt F1-v4, A0-T2; closed further at F1-v5, A0 final remediation A4/A5)

`schemas/transaction/{ActionEnvelope,ExecutionReceipt}.schema.json`, rebuilt against the locked Master Design
Package formal model per external A0-T2 finding: the prior F1-v3 shape was a reduced/incomplete projection
(`actionId/incidentId/policyHash/actionType/resourceId/boundedParam/nonce/expiry`) that dropped canonical target
identity and used a single scalar `boundedParam`. The F1-v4 fix replaced it with `boundedParameters: Record<string,
unknown>`, which external review correctly identified as still an unbounded, free-form container - an open map
can carry arbitrary keys just as easily as a single scalar could. **F1-v5 closes this properly**: `paramU256`/
`paramStr` are the ONLY parameter slots, mirroring `PolicyDetail.effects`' own representation exactly, so there is
no key namespace in which calldata/a selector/a method name/a destination could be smuggled in - proven by
`scripts/test-action-envelope-negative.js` (17/17: calldata/selector/method/destination/nested-payload/unknown-key
all rejected). Mirrored 1:1 in `@reclose/protocol-sdk`'s compiled `ActionEnvelope`/`ExecutionReceipt` TypeScript
types.

```ts
interface ActionEnvelope {
  schemaVersion: "1.0.0";
  actionId: string;
  targetId: string;
  targetAddress: string;
  incidentId: string;
  policyHash: string;
  policyVersion: number;
  resourceId: string;
  actionType: ActionTypeEnum;
  paramU256: string | null; // closed bounded-parameter slot - decimal u256 string, or null
  paramStr: string | null;  // closed bounded-parameter slot - short string, or null
  decisionStage: "PROVISIONAL" | "FINAL";
  decisionReference: string;
  nonce: string;
  expiry: string;
}

interface ExecutionReceipt {
  schemaVersion: "1.0.0";
  actionId: string;
  targetId: string;
  adapterId: string;
  parentTxId: string;
  childTx: ChildTransactionState;
  executionResult: ExecutionResultEnum;
  finalStatus: "SUCCESS" | "FAILURE" | "UNKNOWN"; // SUCCESS reachable ONLY via FINISHED_WITH_RETURN, and only
                                                    // when post-state is proven where required (A5); every other
                                                    // non-success executionResult (incl. NOT_VOTED) maps to FAILURE
  preStateHash: string | null;
  postStateHash: string | null;
  expectedPostStateRequired: boolean;
  observedPostState?: Record<string, unknown> | null;
  postStateMatchesExpected?: boolean | null; // derived convenience only
  executionTime: string;
  feeAccounting?: { paidFeeValueWei: string; totalRefundedWei: string } | null; // derived convenience only
  displaySummary?: string | null; // derived convenience only
}
```

### 1.9 Active restrictions / effective capabilities

See `AssuranceStateSummary.activeRestrictions` / `.effectiveCapabilities` above (Section 1.2). Restrictions are
always reason-indexed by `incidentId` (CLAUDE.md Section 17) - resolving one incident must never silently clear
another incident's restriction on the same resource.

### 1.10 `RecoveryState` - `schemas/recovery/RecoveryState.schema.json`

A timer alone is never recovery proof (TM-REC-004).

```ts
interface RecoveryState {
  incidentId: string;
  targetId: string;
  remainingRestrictions: Array<{ incidentId: string; actionType: string; resourceId: string }>;
  remediationRequired: boolean;
  remediationSubmitted: boolean;
  remediationDecision?: DecisionOutcome;
  recoveryValidationRequired: boolean;
  recoveryValidated: boolean;
  restorationAvailable?: boolean;
  restorationExecuted?: boolean;
}
```

### 1.11 `ErrorEnvelope` - `schemas/core/ErrorEnvelope.schema.json`

Stable protocol error codes mapped to human explanations (CLAUDE.md Section 39). Two codes
(`FEE_VALUE_MUST_BE_NONZERO`, `FEES_DISTRIBUTION_MISSING`) are taken directly from real on-chain revert reasons
observed at G0 (CF-009, CF-011).

```ts
type ErrorCode =
  | "UNAUTHORIZED_CALLER" | "INACTIVE_POLICY" | "STALE_POLICY" | "INVALID_EVIDENCE"
  | "WRONG_JUDGE" | "TRANSACTION_EXECUTION_ERROR" | "CHILD_TRANSACTION_FAILED"
  | "AUTHORITY_REVOKED" | "WRONG_NETWORK" | "FEE_VALUE_MUST_BE_NONZERO"
  | "FEES_DISTRIBUTION_MISSING" | "UNKNOWN";

interface ErrorEnvelope {
  code: ErrorCode;
  message: string;
  nextSteps?: string | null;
  sourceTxId?: `0x${string}` | null;
}
```

### 1.12 `FeeTransactionPreview` - `schemas/transaction/FeeTransactionPreview.schema.json`

Always a live estimate, never a hard-coded constant (CLAUDE.md Section 34), derived only via the SDK's own
`estimateTransactionFees` path (G0-proven, CF-011).

```ts
interface FeeTransactionPreview {
  network: "studio-dev";
  chainId: 61997;
  estimatedFeeValueWei: string;
  isEstimate: true;
  bondWei?: string | null; // Reporter bond - economically separate from network fee estimate
  distributionSummary?: { leaderTimeunitsAllocation: string; validatorTimeunitsAllocation: string; appealRounds: string } | null;
}
```

---

## 2. Governed SDK-facing interfaces

Stable method signatures. Implementations land at C1-C3; F1 freezes only the shape. Every method returns data
derived from real protocol/SDK reads - none of these stubs may fabricate protocol truth (CLAUDE.md Section 21/23).

```ts
interface RecloseSDK {
  getTarget(targetId: string): Promise<Target>;
  getAssuranceState(targetId: string): Promise<AssuranceStateSummary>;
  getActivePolicy(targetId: string): Promise<PolicyDetail>;
  getIncident(incidentId: string): Promise<Incident>;
  getDecision(decisionId: string): Promise<DecisionRecord>;
  getDecisionView(decisionId: string): Promise<DecisionView>; // added F1-v2 (A0-003)
  getEffectiveProviderStatus(targetId: string, resourceId: string): Promise<{
    resourceId: string;
    available: boolean;
    reason: ErrorEnvelope | null;
  }>;

  buildIncidentReport(input: {
    targetId: string; ruleId: string; resourceId: string; evidenceSources: EvidenceSource[];
  }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }>;

  buildRecoveryReport(input: {
    incidentId: string; evidenceSources: EvidenceSource[];
  }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }>;

  validateAPM(apm: unknown): Promise<{ valid: boolean; errors: string[] }>;
  hashAPM(apm: unknown): Promise<string>; // canonical hash per Section 13 (RFC 8785 JCS + Keccak, TM-AUTH-011)
  diffAPM(fromApm: unknown, toApm: unknown): Promise<PolicySecurityDiff>;

  trackTransaction(txId: `0x${string}`): Promise<GenLayerTransactionLifecycle & { executionResult?: ExecutionResult }>;
  trackActionTrace(actionId: string): Promise<ExecutionReceipt>;
}
```

`validateAPM`/`hashAPM`/`diffAPM` operate on the canonicalized Active Policy Manifest form (CLAUDE.md Section 13);
their exact input type is finalized at C1 alongside the Policy contract, but their signatures and role in the
Policy UX flow (Section 27) are frozen here.

`getDecisionView` was added in F1-v2 (A0-003) as the SDK entry point for the composed product-facing view; it does
not replace `getDecision`, which returns the canonical protocol-semantic `DecisionRecord` alone.

---

## 3. Transaction truth model

At least **six** distinct concepts, never collapsed into one `status` field (CLAUDE.md Section 9). Rebuilt per
A0-005 to reflect the pinned SDK's actual raw enums instead of invented ones, and to keep the SDK's own
`protocolDecisionOutcome` concept separate from Reclose's `DecisionOutcome`.

| Concept | Type | Meaning |
|---|---|---|
| GenLayer raw transaction status | `GenLayerTransactionLifecycle.rawStatus` | verbatim protocol consensus lifecycle state (`FINALIZED` = terminal, says nothing about accepted/undetermined or execution success) |
| GenLayer raw transaction result | `GenLayerTransactionLifecycle.rawResult` | verbatim retained consensus round result (`MAJORITY_AGREE`, `NO_MAJORITY`, etc.) |
| GenLayer protocol decision outcome | `GenLayerTransactionLifecycle.protocolDecisionOutcome` | the SDK's own consumer-level accepted/undetermined/timeout classification - NOT Reclose's DecisionOutcome |
| `DecisionOutcome` | `DecisionRecord.outcome` | Reclose semantic outcome: CONFIRMED / REJECTED / UNDETERMINED |
| `DecisionStage` | `DecisionRecord.decisionStage` | PROVISIONAL / FINAL |
| Execution result | `ChildTransactionState.executionResult` | did the transaction's code execute successfully |
| Child transaction state | `ChildTransactionState` | Judge -> Kernel -> Target as separate async steps |
| Target post-state | `ExecutionReceipt.observedPostState` / `.postStateMatchesExpected` | did the target actually reach the expected state |

The frontend/SDK must never be more certain than the protocol (CLAUDE.md Section 23): a `FINALIZED` lifecycle with
`executionResult: "FINISHED_WITH_ERROR"` must render as a finalized **failure**, not a success. A raw
`rawStatus: "UNDETERMINED"` transaction must never be displayed or tested as if it were a
`DecisionOutcome.UNDETERMINED` decision - they are unrelated facts that happen to share an English word.

---

## 4. Error envelope

See Section 1.11. High-consequence errors (`AUTHORITY_REVOKED`, `WRONG_NETWORK`, `TRANSACTION_EXECUTION_ERROR`,
`CHILD_TRANSACTION_FAILED`) must always surface `nextSteps`.

---

## 5. Fixture locations

All F1 fixtures live under `tests/frontend-fixtures/`, indexed by `tests/frontend-fixtures/manifest.json`
(fixture file -> schema file). Validate with `npm run schema:validate` (`scripts/validate-fixtures.js`, using
`ajv`). Current coverage (40/40 passing as of F1-v3):

```text
normal / monitored / restricted / safe-mode / paused / recovery targets
confirmed / rejected / undetermined / provisional decisions (DecisionRecord, decision-only)
DecisionView composition proving raw ACCEPTED != FINALIZED, and raw UNDETERMINED != DecisionOutcome.UNDETERMINED
  (decision-view-*.json)
transaction success / failure (execution-receipt-*, child-transaction-*)
child failure with a FINALIZED lifecycle but FINISHED_WITH_ERROR execution result (child-transaction-failed.json,
  execution-receipt-child-failure.json)
multi-incident (assurance-state-multi-incident.json)
authority expansion (policy-security-diff-expansion.json)
wrong-network (error-wrong-network.json only - there is no such thing as a "wrong-network" GenLayer transaction
  lifecycle value; wrong network is a client-side pre-submission check represented via ErrorEnvelope, not a
  transaction lifecycle fixture, per A0-008 correction)
```

Every fixture is clearly synthetic test data (fake IDs/hashes such as `0x1111...`, `0x2222...`, never a reused
real G0 transaction hash) and does not assert live protocol behaviour.

**Executable semantic tests (A0-R6):** schema validation alone proves each fixture has the right shape, not that
the cross-field truth-model relationships in Section 3 actually hold. `scripts/test-transaction-truth-model.js`
(run via `npm run truth-model:test`, part of the canonical `npm run verify`) asserts against the real fixtures
above that: `ACCEPTED` is never final; `FINALIZED` is final but does not by itself imply execution success;
`FINALIZED` + `FINISHED_WITH_RETURN` is a genuine success while `FINALIZED` + `FINISHED_WITH_ERROR` is a failure;
raw `UNDETERMINED` is distinct from `DecisionOutcome.UNDETERMINED`; `derived.isFinal` never contradicts
`rawStatus`; and a `derived.displayLabel` never substitutes for the raw fields. The `isFinal`-vs-`rawStatus`
relationship is additionally enforced at the JSON Schema level itself via `allOf`/`if`/`then` conditionals in
`schemas/transaction/GenLayerTransactionLifecycle.schema.json`, so a fixture with a self-contradictory `derived`
object fails `npm run schema:validate` directly, not only the semantic test script.

---

## 6. Known implementation gaps at F1-v3 freeze time

- No AssuranceKernel, Policy, Judge, Vault, or ReferenceAgentProtocol contract exists yet (C1-C3 scope). All types
  above describe the *intended* shape derived from governance documents, not an already-running system.
- `validateAPM`/`hashAPM`/`diffAPM`'s exact APM input shape is not yet finalized (depends on the C1 Policy
  contract's canonical manifest format).
- Fee/gas numeric fields are represented as decimal strings (u256-safe); exact precision/rounding rules for
  frontend display are a D-phase product decision, not frozen here.
- `EvidenceSource.sourceType` (the descriptive, non-security-bearing category) may gain values once the product
  UI's evidence-presentation design (C4) is implemented; `sourceClass` (the ADR-011 governed security
  classification) does not change without a governance-level ADR-011 revision.
- Hosted API/indexer response shapes (if any) are explicitly out of scope for this contract - they are convenience
  infrastructure, never a correctness dependency (CLAUDE.md Section 32).
- `GenLayerTransactionLifecycle.derived` is a UI-convenience field; its exact display-string wording is a D-phase
  product decision, not frozen here - only its existence and non-authoritative nature are frozen.

---

## 7. Interface change procedure

After this freeze, any breaking change to a type or SDK signature defined above MUST:

1. be recorded in `docs/execution/Interface Change Log.md` with rationale, affected schema/fixture files, and the
   commit that introduces it;
2. update the corresponding JSON Schema(s) under `schemas/`;
3. update or add fixtures under `tests/frontend-fixtures/` and re-run `npm run schema:validate`;
4. update this document's TypeScript projection to match;
5. update any frontend tests that assert the old shape.

A non-breaking addition (new optional field, new enum value that doesn't change existing semantics) does not
require a change-log entry but SHOULD be noted in this document's revision history.

The F1-v1 -> F1-v2 change documented in this file's own Section 1.5/1.6/1.7 is itself an example of this
procedure being followed: see `docs/execution/Interface Change Log.md` for the corresponding entry.

---

## 8. Freeze record

```text
Frozen by: Claude Code (F1 phase; F1-v5 revision during A0 final remediation)
Version: F1-v5
Freeze date: 2026-09-10
Schema files: 19 (see schemas/ tree; includes DecisionView.schema.json added in F1-v2)
Fixture files: 43 (tests/frontend-fixtures/, all passing npm run schema:validate)
Compiled TypeScript package: packages/protocol-sdk (real, compiling; npm run typecheck / npm run build both pass;
  npm run f1-parity:test deterministically proves it matches this document and schemas/ field-by-field)
SDK methods frozen: 14 (getTarget, getAssuranceState, getActivePolicy, getIncident, getDecision, getDecisionView,
  getEffectiveProviderStatus, buildIncidentReport, buildRecoveryReport, validateAPM, hashAPM, diffAPM,
  trackTransaction, trackActionTrace)
Governing sources: docs/governance/Research Closure & Architecture Decision Record.md,
  docs/governance/Master Design Package.md (Section 21 DecisionRecord field list),
  docs/governance/Implementation Specification.md (Sections 9-14, 68),
  docs/governance/Product Requirements Document.md, docs/governance/Requirements Traceability Matrix.md,
  CLAUDE.md Sections 6, 9, 13, 15, 17, 21-34, 39; genlayer-js@2.0.0-rc.1 package type definitions (Section 1.7)
History:
  F1-v1: content stabilized in commit 23fb711 (superseded - contained a circular self-reference bug, fixed in
    69204d5, and the A0-003/A0-004/A0-005 defects described throughout this document)
  F1-v2: produced during the first A0 remediation pass to fix findings A0-003, A0-004, A0-005 and A0-008.
  F1-v3: produced during A0 re-audit remediation to fix finding A0-R3 (DecisionRecord.reporter
    made required/non-null, matching Master Design Package Section 21 exactly).
  F1-v4: produced during A0 final remediation to fix A0-T1 (real compiled
    @reclose/protocol-sdk TypeScript package, Section 1 above), A0-T2 (ActionEnvelope/ExecutionReceipt rebuilt to
    their full canonical MDP shape, Section 1.8) and A0-T3 (DecisionRecord.outcome/.decisionStage now prohibit
    NONE at both the JSON Schema and TypeScript level, with executable negative tests in
    scripts/test-decision-record-negative.js and packages/protocol-sdk/src/__typetests__/).
  F1-v5: this revision, produced after a further external review found that this document's own field
    definitions had always been correct, but packages/protocol-sdk/src/types.ts and sdk.ts had drifted from it -
    Target/PolicyDetail/Incident/EvidenceSource/RecoveryState/ErrorEnvelope/FeeTransactionPreview used ad hoc
    shapes instead of mirroring this document and schemas/ exactly, getAssuranceState() returned the bare
    AssuranceState enum instead of AssuranceStateSummary, getDecisionView() was missing from the compiled
    interface, and ActionEnvelope.boundedParameters was still an open Record<string,unknown> rather than the
    closed paramU256/paramStr representation. All fixed; a new deterministic parity check
    (scripts/test-f1-parity.js) is now wired into npm run verify to catch this class of drift automatically,
    and scripts/test-action-envelope-negative.js proves the closed ActionEnvelope/ExecutionReceipt semantics.
    Exact commit identity is intentionally not claimed inside this file - see
    docs/execution/audit-packets/A0/commit.txt for the audit target commit this version is verified against, and
    docs/execution/Interface Change Log.md for all change entries with their introducing commits.
Content hash: see docs/execution/audit-packets/A0/content-hashes.txt (computed from an already-existing commit,
  after that commit exists)
```
