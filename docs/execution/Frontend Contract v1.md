# Frontend Contract v1

**Status:** FROZEN
**Frozen at commit:** `fe86a2f7ae8f113956cc4815410b79dd26df3f2d` (branch `claude/r1-foundation`)
**Owner and consumer:** Claude Code (both protocol and frontend sides)
**Governs:** the interface boundary between Reclose protocol/SDK semantics and all future product/frontend
implementation (D1+), per CLAUDE.md Section 22 and Repository Build Master Plan Section 13.

This document is F1 deliverable. It defines stable **types**, **SDK method signatures**, the **transaction truth
model**, the **error envelope**, fixture locations, known implementation gaps, and the interface change procedure.
Every semantic field below is derived from the six locked governance documents (ADR, MDP, Implementation
Specification, Naming & Brand Decision Record, PRD, RTM) and from real G0 execution evidence - none of it is
invented protocol behaviour. Where a field is illustrated with a fixture, the fixture is synthetic (clearly
labeled) and does not assert live protocol truth.

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

```ts
interface EvidenceSource {
  sourceId: string;
  url: `https://${string}`;
  sourceClass: "OFFICIAL_STATUS_PAGE" | "PROVIDER_API" | "NEWS" | "SOCIAL" | "THIRD_PARTY_MONITOR" | "OTHER";
  fetchedAt: string;
  observedAt: string | null;
  contentHash: string | null;
  availability: "AVAILABLE" | "UNAVAILABLE" | "VARIANT_CONTENT" | "REJECTED_BY_POLICY";
  rejectionReason: string | null;
}
```

### 1.6 `DecisionRecord`, `DecisionOutcome`, `DecisionStage` - `schemas/incident/*.schema.json`

`DecisionRecord` contains semantic codes only - never arbitrary calldata/target/authority payloads
(TM-AUTH-003).

```ts
type DecisionOutcome = "NONE" | "CONFIRMED" | "REJECTED" | "UNDETERMINED";
type DecisionStage = "NONE" | "PROVISIONAL" | "FINAL";

interface DecisionRecord {
  decisionId: string;
  incidentId: string;
  ruleKind: RuleKindEnum;
  outcome: DecisionOutcome;
  stage: DecisionStage;
  judge: `0x${string}`;
  policyHash: string;
  decidedAt: string;
  genlayerTx: GenLayerTransactionLifecycle;
}
```

**`DecisionOutcome`/`DecisionStage` are never collapsed into a single `status` field, and are never conflated with
`GenLayerTransactionLifecycle` or `ExecutionResult` below (CLAUDE.md Section 9, TM-LIFE-003).**

### 1.7 GenLayer transaction lifecycle, execution result, child transaction state

`schemas/transaction/{GenLayerTransactionLifecycle,ExecutionResult,ChildTransactionState}.schema.json`

```ts
type GenLayerLifecycleStatus = "SUBMITTED" | "ACCEPTED" | "FINALIZED_ACCEPTED" | "APPEALED" | "REVERTED_PRE_FINALITY";
type ConsensusResultName = "MAJORITY_AGREE" | "SPLIT" | "MAJORITY_DISAGREE" | "TIMEOUT" | null;

interface GenLayerTransactionLifecycle {
  txId: `0x${string}`;
  lifecycleStatus: GenLayerLifecycleStatus;
  consensusResultName: ConsensusResultName;
  decidedAtBlock?: number | null;
  appealDeadline?: string | null;
}

// Enum values confirmed live at G0 via `genlayer receipt` (txExecutionResultName field);
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

A finalized transaction may still have failed execution (CF-005, G0-verified). **`lifecycleStatus` and
`executionResult` are always inspected and displayed as two distinct fields, never merged.**

### 1.8 `ActionEnvelope`, `ExecutionReceipt`

`schemas/transaction/{ActionEnvelope,ExecutionReceipt}.schema.json`. Per Implementation Specification Section 68:
action ID, incident ID, policy hash, typed action, resource, bounded parameter, nonce and expiry - no arbitrary
calldata (TM-AUTH-003/009).

```ts
interface ActionEnvelope {
  actionId: string;
  incidentId: string;
  policyHash: string;
  actionType: ActionTypeEnum;
  resourceId: string;
  boundedParam: string | null;
  nonce: string;
  expiry: string;
}

interface ExecutionReceipt {
  actionId: string;
  childTx: ChildTransactionState;
  expectedPostStateRequired: boolean;
  observedPostState?: Record<string, unknown> | null;
  postStateMatchesExpected?: boolean | null;
  feeAccounting?: { paidFeeValueWei: string; totalRefundedWei: string } | null;
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

---

## 3. Transaction truth model

Five distinct concepts, never collapsed into one `status` field (CLAUDE.md Section 9):

| Concept | Type | Meaning |
|---|---|---|
| GenLayer transaction lifecycle | `GenLayerTransactionLifecycle.lifecycleStatus` | protocol consensus lifecycle state |
| `DecisionOutcome` | `DecisionRecord.outcome` | Reclose semantic outcome: CONFIRMED / REJECTED / UNDETERMINED |
| `DecisionStage` | `DecisionRecord.stage` | PROVISIONAL / FINAL |
| Execution result | `ChildTransactionState.executionResult` | did the transaction's code execute successfully |
| Child transaction state | `ChildTransactionState` | Judge -> Kernel -> Target as separate async steps |
| Target post-state | `ExecutionReceipt.observedPostState` / `.postStateMatchesExpected` | did the target actually reach the expected state |

The frontend/SDK must never be more certain than the protocol (CLAUDE.md Section 23): a `FINALIZED_ACCEPTED`
lifecycle with `executionResult: "FINISHED_WITH_ERROR"` must render as a finalized **failure**, not a success.

---

## 4. Error envelope

See Section 1.11. High-consequence errors (`AUTHORITY_REVOKED`, `WRONG_NETWORK`, `TRANSACTION_EXECUTION_ERROR`,
`CHILD_TRANSACTION_FAILED`) must always surface `nextSteps`.

---

## 5. Fixture locations

All F1 fixtures live under `tests/frontend-fixtures/`, indexed by `tests/frontend-fixtures/manifest.json`
(fixture file -> schema file). Validate with `npm run schema:validate` (`scripts/validate-fixtures.js`, using
`ajv`). Current coverage (36/36 passing as of freeze):

```text
normal / monitored / restricted / safe-mode / paused / recovery targets
confirmed / rejected / undetermined / provisional decisions
transaction success / failure (execution-receipt-*, child-transaction-*)
child failure (child-transaction-failed.json, execution-receipt-child-failure.json)
multi-incident (assurance-state-multi-incident.json)
authority expansion (policy-security-diff-expansion.json)
wrong-network (tx-lifecycle-wrong-network.json, error-wrong-network.json)
```

Every fixture is clearly synthetic test data, not a claim of live protocol behaviour.

---

## 6. Known implementation gaps at F1 freeze time

- No AssuranceKernel, Policy, Judge, Vault, or ReferenceAgentProtocol contract exists yet (C1-C3 scope). All types
  above describe the *intended* shape derived from governance documents, not an already-running system.
- `validateAPM`/`hashAPM`/`diffAPM`'s exact APM input shape is not yet finalized (depends on the C1 Policy
  contract's canonical manifest format).
- Fee/gas numeric fields are represented as decimal strings (u256-safe); exact precision/rounding rules for
  frontend display are a D-phase product decision, not frozen here.
- `EvidenceSource.sourceClass` enum may gain values once the Judge's per-rule source policy (C2) is implemented.
- Hosted API/indexer response shapes (if any) are explicitly out of scope for this contract - they are convenience
  infrastructure, never a correctness dependency (CLAUDE.md Section 32).

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

---

## 8. Freeze record

```text
Frozen by: Claude Code (F1 phase)
Frozen at: 2026-09-10
Schema files: 16 (see schemas/ tree)
Fixture files: 36 (tests/frontend-fixtures/, all passing npm run schema:validate)
SDK methods frozen: 13 (getTarget, getAssuranceState, getActivePolicy, getIncident, getDecision,
  getEffectiveProviderStatus, buildIncidentReport, buildRecoveryReport, validateAPM, hashAPM, diffAPM,
  trackTransaction, trackActionTrace)
Governing sources: docs/governance/Research Closure & Architecture Decision Record.md,
  docs/governance/Master Design Package.md, docs/governance/Implementation Specification.md (Sections 9-14, 68),
  docs/governance/Product Requirements Document.md, docs/governance/Requirements Traceability Matrix.md,
  CLAUDE.md Sections 6, 9, 13, 15, 17, 21-34, 39
Commit at freeze: fe86a2f7ae8f113956cc4815410b79dd26df3f2d
```
