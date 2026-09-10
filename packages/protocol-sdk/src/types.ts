// Canonical F1 shared types for the frozen Reclose interface boundary.
// Mirrors schemas/**/*.schema.json and docs/execution/Frontend Contract v1.md (F1-v3).
// Type-only foundation at this phase (A0-T1): no network calls, no C1 business logic.
// CLAUDE.md Section 9: never collapse these distinct concepts into one field named `status`.

// ---------------------------------------------------------------------------
// Core enums
// ---------------------------------------------------------------------------

export type AssuranceState =
  | "NORMAL"
  | "MONITORED"
  | "RESTRICTED"
  | "SAFE_MODE"
  | "PAUSED"
  | "RECOVERY";

/** Reclose semantic decision outcome (CLAUDE.md 9.2). NONE is storage/internal only. */
export type DecisionOutcome = "NONE" | "CONFIRMED" | "REJECTED" | "UNDETERMINED";
/** Canonical DecisionRecord.outcome prohibits NONE (A0-T3). */
export type CanonicalDecisionOutcome = Exclude<DecisionOutcome, "NONE">;

/** CLAUDE.md 9.3. NONE is storage/internal only. */
export type DecisionStage = "NONE" | "PROVISIONAL" | "FINAL";
/** Canonical DecisionRecord.decisionStage prohibits NONE (A0-T3). */
export type CanonicalDecisionStage = Exclude<DecisionStage, "NONE">;

export type RuleKind =
  | "PROVIDER_COMPROMISE_V1"
  | "SERVICE_FAILURE_V1"
  | "REMEDIATION_CONFIRMED_V1"
  | "RECOVERY_VALIDATED_V1";

export type ActionType =
  | "NO_ACTION"
  | "ALERT"
  | "MONITOR"
  | "RESTRICT"
  | "THROTTLE"
  | "REVOKE_CAPABILITY"
  | "REROUTE"
  | "ENTER_SAFE_MODE"
  | "PAUSE"
  | "ENTER_RECOVERY"
  | "RESTORE";

/** Governed ADR-011 evidence source classes. Never overload with descriptive UI categories. */
export type SourceClass =
  | "AUTHORITATIVE_SIGNED"
  | "AUTHORITATIVE_PUBLIC"
  | "ONCHAIN"
  | "INDEPENDENT_PUBLIC"
  | "CONTENT_ADDRESSED_SNAPSHOT"
  | "DERIVED_DETERMINISTIC";

/** Descriptive, non-security-bearing category. Never a substitute for SourceClass. */
export type SourceType = "OFFICIAL_STATUS_PAGE" | "PROVIDER_API" | "NEWS" | "SOCIAL" | "THIRD_PARTY_MONITOR" | "OTHER";

// ---------------------------------------------------------------------------
// Raw GenLayer transaction truth model (genlayer-js@2.0.0-rc.1, verified at G0)
// ---------------------------------------------------------------------------

export type RawTransactionStatus =
  | "UNINITIALIZED"
  | "PENDING"
  | "PROPOSING"
  | "COMMITTING"
  | "REVEALING"
  | "ACCEPTED"
  | "UNDETERMINED"
  | "FINALIZED"
  | "CANCELED"
  | "APPEAL_REVEALING"
  | "APPEAL_COMMITTING"
  | "VALIDATORS_TIMEOUT"
  | "LEADER_TIMEOUT"
  | "LEADER_REVEALING";

export type RawTransactionResult =
  | "IDLE"
  | "AGREE"
  | "DISAGREE"
  | "TIMEOUT"
  | "DETERMINISTIC_VIOLATION"
  | "NO_MAJORITY"
  | "MAJORITY_AGREE"
  | "MAJORITY_DISAGREE"
  | "MAJORITY_TIMEOUT";

/** genlayer-js's own third distinct concept - never conflated with Reclose DecisionOutcome. */
export type ProtocolDecisionOutcome = "accepted" | "undetermined" | "validators-timeout" | "leader-timeout";

export type ExecutionResult =
  | "NOT_VOTED"
  | "FINISHED_WITH_RETURN"
  | "FINISHED_WITH_ERROR"
  | "TIMEOUT"
  | "NONDET_DISAGREE"
  | "DETERMINISTIC_VIOLATION";

/** Terminal lifecycle states. Only these may set derived.isFinal = true. */
export const TERMINAL_RAW_STATUSES: readonly RawTransactionStatus[] = ["FINALIZED", "CANCELED"];

/** Processing states that cannot simultaneously claim a decided protocolDecisionOutcome. */
export const NON_TERMINAL_PROCESSING_STATUSES: readonly RawTransactionStatus[] = [
  "UNINITIALIZED",
  "PENDING",
  "PROPOSING",
  "COMMITTING",
  "REVEALING",
  "APPEAL_REVEALING",
  "APPEAL_COMMITTING",
];

export interface DerivedLifecycleDisplay {
  /** Human display label only - never replaces the raw fields. */
  displayLabel: string;
  /** Must never contradict rawStatus: true iff rawStatus is FINALIZED or CANCELED. */
  isFinal: boolean;
}

export interface GenLayerTransactionLifecycle {
  txId: string;
  rawStatus: RawTransactionStatus;
  rawResult: RawTransactionResult | null;
  protocolDecisionOutcome: ProtocolDecisionOutcome | null;
  decidedAtBlock: number | null;
  appealDeadline: string | null;
  derived: DerivedLifecycleDisplay;
}

export type ChildTransactionRole = "JUDGE_DECISION" | "KERNEL_EFFECT" | "TARGET_ACTION";

export interface ChildTransactionState {
  txId: string;
  parentTxId: string;
  role: ChildTransactionRole;
  lifecycle: GenLayerTransactionLifecycle;
  executionResult?: ExecutionResult;
}

// ---------------------------------------------------------------------------
// Target / Policy / Incident
// ---------------------------------------------------------------------------

export interface Target {
  targetId: string;
  address: string;
  assuranceState: AssuranceState;
  activePolicyKey: string;
  activePolicyVersion: number;
  controllerMode: string;
}

export interface PolicySummary {
  policyKey: string;
  version: number;
  policyHash: string;
  sealed: boolean;
}

export interface PolicyDetail extends PolicySummary {
  rules: RuleKind[];
  permittedActions: ActionType[];
  provisionalContainment: string[];
}

export interface PolicySecurityDiff {
  fromVersion: number;
  toVersion: number;
  authorityExpands: boolean;
  changedFields: string[];
}

export interface Incident {
  incidentId: string;
  targetId: string;
  resourceId: string;
  ruleId: RuleKind;
  decisionStage: CanonicalDecisionStage;
  outcome: CanonicalDecisionOutcome | null;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export interface EvidenceSource {
  sourceId: string;
  url: string | null;
  sourceClass: SourceClass;
  sourceType?: SourceType;
  retrievedAt: string;
  available: boolean;
}

// ---------------------------------------------------------------------------
// DecisionRecord / DecisionView (A0-003 / A0-R3 / A0-T3)
// ---------------------------------------------------------------------------

export interface DecisionRecord {
  schemaVersion: "1.0.0";
  incidentId: string;
  targetId: string;
  policyHash: string;
  policyVersion: number;
  ruleId: RuleKind;
  affectedResource: string;
  evidenceHash: string;
  /** Required, non-null (A0-R3). No invented system-initiated exception. */
  reporter: string;
  outcome: CanonicalDecisionOutcome;
  conditionCode: string;
  reasonCodes: string[];
  judgeModule: string;
  judgeVersion: number;
  decisionStage: CanonicalDecisionStage;
  generatedAt: string;
}

export interface DecisionView {
  record: DecisionRecord;
  transaction: GenLayerTransactionLifecycle;
}

// ---------------------------------------------------------------------------
// ActionEnvelope / ExecutionReceipt (A0-T2)
// ---------------------------------------------------------------------------

export interface ActionEnvelope {
  schemaVersion: "1.0.0";
  actionId: string;
  targetId: string;
  targetAddress: string;
  incidentId: string;
  policyHash: string;
  policyVersion: number;
  resourceId: string;
  actionType: ActionType;
  /** Typed, bounded, finite parameters only - never arbitrary calldata (TM-AUTH-003/009). */
  boundedParameters: Record<string, unknown>;
  decisionStage: CanonicalDecisionStage;
  decisionReference: string;
  nonce: string;
  expiry: string;
}

export type ExecutionFinalStatus = "SUCCESS" | "FAILURE" | "UNKNOWN";

export interface ExecutionReceipt {
  schemaVersion: "1.0.0";
  actionId: string;
  targetId: string;
  adapterId: string;
  parentTxId: string;
  childTx: ChildTransactionState;
  executionResult: ExecutionResult;
  finalStatus: ExecutionFinalStatus;
  preStateHash: string | null;
  postStateHash: string | null;
  expectedPostStateRequired: boolean;
  observedPostState?: Record<string, unknown> | null;
  postStateMatchesExpected?: boolean | null;
  executionTime: string;
  feeAccounting?: { paidFeeValueWei: string; totalRefundedWei: string } | null;
  displaySummary?: string | null;
}

// ---------------------------------------------------------------------------
// Recovery / restrictions
// ---------------------------------------------------------------------------

export interface EffectiveCapabilityStatus {
  resourceId: string;
  available: boolean;
  restrictingIncidentIds: string[];
}

export interface RecoveryState {
  incidentId: string;
  targetId: string;
  remainingRestrictions: string[];
  remediationRequired: boolean;
  remediationSubmitted: boolean;
  recoveryValidated: boolean;
  restorationPermitted: boolean;
}

// ---------------------------------------------------------------------------
// Error envelope / fee preview
// ---------------------------------------------------------------------------

export interface ErrorEnvelope {
  code: string;
  message: string;
  wrongNetwork?: boolean;
  details?: Record<string, unknown>;
}

export interface FeeTransactionPreview {
  estimatedFeeWei: string;
  branchProfile: string;
}
