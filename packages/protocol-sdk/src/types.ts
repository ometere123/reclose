// Canonical F1 shared types for the frozen Reclose interface boundary.
// Mirrors schemas/**/*.schema.json and docs/execution/Frontend Contract v1.md field-by-field.
// Type-only foundation at this phase: no network calls, no C1 business logic.
// CLAUDE.md Section 9: never collapse these distinct concepts into one field named `status`.
//
// A0 final remediation (Part A1): this file previously drifted from the JSON Schemas it is
// supposed to mirror (Target/PolicyDetail/Incident/EvidenceSource/etc used incompatible ad hoc
// shapes). Every type below is now audited field-by-field against its schema counterpart; see
// scripts/test-f1-parity.js for the automated drift check.

// ---------------------------------------------------------------------------
// Core enums
// ---------------------------------------------------------------------------

/** schemas/core/Target.schema.json#/definitions/AssuranceState */
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

/**
 * The governed Judge rule FAMILY-KIND classification (schemas/policy/PolicyDetail.schema.json
 * rules[].ruleKind) - distinct from RuleId, the specific rule implementation identifier
 * (schemas/incident/DecisionRecord.schema.json ruleId). Never conflate the two (A0 final
 * remediation Part A1: this distinction was previously missing from types.ts entirely).
 */
export type RuleKind = "INCIDENT" | "REMEDIATION" | "RECOVERY_VALIDATION";

/** The specific governed R1 Judge rule implementation (CLAUDE.md Section 14). */
export type RuleId =
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

/** Descriptive, non-security-bearing category (schemas/evidence/EvidenceSource.schema.json). */
export type SourceType = "STATUS_PAGE" | "PROVIDER_API" | "NEWS" | "SOCIAL" | "THIRD_PARTY_MONITOR" | "OTHER";

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

/**
 * Mid-flight processing states that carry no consensus round yet and therefore cannot claim a
 * decided protocolDecisionOutcome (A0 final remediation A6 - LEADER_REVEALING added; ACCEPTED/
 * UNDETERMINED/VALIDATORS_TIMEOUT/LEADER_TIMEOUT are each required to carry their OWN specific
 * protocolDecisionOutcome, so they are intentionally excluded from this "no outcome yet" list).
 */
export const NON_TERMINAL_PROCESSING_STATUSES: readonly RawTransactionStatus[] = [
  "UNINITIALIZED",
  "PENDING",
  "PROPOSING",
  "COMMITTING",
  "REVEALING",
  "APPEAL_REVEALING",
  "APPEAL_COMMITTING",
  "LEADER_REVEALING",
];

/** Required 1:1 rawStatus -> protocolDecisionOutcome mapping enforced by the JSON Schema (A6). */
export const REQUIRED_PROTOCOL_DECISION_OUTCOME: Partial<Record<RawTransactionStatus, ProtocolDecisionOutcome>> = {
  ACCEPTED: "accepted",
  UNDETERMINED: "undetermined",
  VALIDATORS_TIMEOUT: "validators-timeout",
  LEADER_TIMEOUT: "leader-timeout",
};

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
  derived?: DerivedLifecycleDisplay | null;
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
// Target (schemas/core/Target.schema.json) - rebuilt A0 final remediation A1
// ---------------------------------------------------------------------------

export interface Target {
  targetId: string;
  targetAddress: string;
  /** Optional cached on-chain owner read; live checks remain authoritative (CLAUDE.md Section 12). */
  cachedOwner?: string;
  assuranceState: AssuranceState;
  activePolicyKey: string;
  /** Monotonic policy activation counter - distinct from PolicySummary.version (A0-T2-adjacent fix). */
  policyGeneration: number;
  authorityRevoked: boolean;
  humanOverrideEnabled: boolean;
  registeredAt: string;
}

// ---------------------------------------------------------------------------
// AssuranceStateSummary (schemas/core/AssuranceState.schema.json) - kept separate from the bare
// AssuranceState enum per A0 final remediation A1: getAssuranceState() returns THIS, not the enum.
// ---------------------------------------------------------------------------

export interface ActiveRestriction {
  incidentId: string;
  actionType: "MONITOR" | "RESTRICT" | "THROTTLE" | "REVOKE_CAPABILITY" | "REROUTE" | "ENTER_SAFE_MODE" | "PAUSE";
  resourceId: string;
}

export interface AssuranceStateSummary {
  targetId: string;
  state: AssuranceState;
  activeRestrictions: ActiveRestriction[];
  effectiveCapabilities: string[];
  asOfBlock: number;
}

// ---------------------------------------------------------------------------
// Policy (schemas/policy/*.schema.json) - rebuilt A0 final remediation A1
// ---------------------------------------------------------------------------

export interface PolicySummary {
  policyKey: string;
  targetId: string;
  version: number;
  manifestHash: string;
  creator?: string;
  createdAt?: string;
  activationNotBefore?: string;
  activatedAt?: string | null;
  sealed: boolean;
  active: boolean;
  superseded: boolean;
  ruleCount: number;
  resourceCount: number;
  effectCount: number;
  humanOverrideEnabled: boolean;
}

export interface PolicyRule {
  ruleId: RuleId;
  judge: string;
  ruleKind: RuleKind;
  provisionalAllowed: boolean;
  /** u256 as decimal string. */
  reportBond: string;
  /** u256 as decimal string. */
  confirmedBounty: string;
  enabled: boolean;
}

export type PolicyEffectReleasePhase = "PROVISIONAL" | "REMEDIATION_CONFIRMED" | "RECOVERY_VALIDATED";

export interface PolicyEffect {
  actionType: ActionType;
  resourceId: string;
  /** u256 as decimal string, or null - closed bounded parameter, never arbitrary calldata. */
  paramU256: string | null;
  paramStr: string | null;
  releasePhase: PolicyEffectReleasePhase;
  enabled: boolean;
}

export interface PolicyDetail {
  summary: PolicySummary;
  rules: PolicyRule[];
  effects: PolicyEffect[];
}

export type PolicySecurityDiffChangeKind =
  | "ACTION_ADDED"
  | "ACTION_REMOVED"
  | "RESOURCE_ADDED"
  | "RESOURCE_REMOVED"
  | "BOUND_WIDENED"
  | "BOUND_NARROWED"
  | "JUDGE_CHANGED"
  | "HUMAN_OVERRIDE_CHANGED";

export interface PolicySecurityDiffChange {
  kind: PolicySecurityDiffChangeKind;
  description: string;
  isExpansion?: boolean;
}

export interface PolicySecurityDiff {
  fromVersion: number | null;
  toVersion: number;
  authorityExpands: boolean;
  /** Non-null when authorityExpands is true - expansion is always delayed (TM-AUTH-004). */
  activationDelaySeconds?: number | null;
  changes: PolicySecurityDiffChange[];
}

// ---------------------------------------------------------------------------
// Incident (schemas/incident/Incident.schema.json) - rebuilt A0 final remediation A1
// ---------------------------------------------------------------------------

export type IncidentStatus =
  | "OPEN"
  | "PROVISIONAL_APPLIED"
  | "FINAL_CONFIRMED"
  | "FINAL_REJECTED"
  | "FINAL_UNDETERMINED"
  | "REMEDIATION_PENDING"
  | "RECOVERY"
  | "CLOSED";

export interface Incident {
  incidentId: string;
  targetId: string;
  policyKey: string;
  ruleId: RuleId;
  resourceId: string;
  reporter: string;
  judge: string;
  evidenceHash: string;
  conditionCode: string;
  status: IncidentStatus;
  createdAt: string;
  closedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Evidence (schemas/evidence/EvidenceSource.schema.json) - rebuilt A0 final remediation A1
// ---------------------------------------------------------------------------

export type EvidenceAvailability = "AVAILABLE" | "UNAVAILABLE" | "VARIANT_CONTENT" | "REJECTED_BY_POLICY";

export interface EvidenceSource {
  sourceId: string;
  url: string;
  sourceClass: SourceClass;
  sourceType?: SourceType | null;
  fetchedAt: string;
  observedAt?: string | null;
  contentHash?: string | null;
  availability: EvidenceAvailability;
  rejectionReason?: string | null;
}

// ---------------------------------------------------------------------------
// DecisionRecord / DecisionView (A0-003 / A0-R3 / A0-T3)
// ---------------------------------------------------------------------------

export interface DecisionRecord {
  schemaVersion: "1.0.0";
  /** Optional internal indexing identity - never a substitute for incidentId/ruleId/decisionStage identity. */
  decisionId?: string | null;
  incidentId: string;
  targetId: string;
  policyHash: string;
  policyVersion: number;
  ruleId: RuleId;
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
// ActionEnvelope / ExecutionReceipt (A0-T2, closed further at A0 final remediation A4/A5)
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
  /**
   * Closed bounded-parameter representation (A0 final remediation A4). An open
   * `Record<string, unknown>` was itself still an unbounded container and was rejected by
   * external review - this mirrors PolicyDetail.effects' own paramU256/paramStr fields exactly,
   * so there is no key namespace in which calldata/selector/method/destination could be smuggled.
   */
  paramU256: string | null;
  paramStr: string | null;
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
  /**
   * FINISHED_WITH_ERROR/TIMEOUT/NONDET_DISAGREE/DETERMINISTIC_VIOLATION -> FAILURE;
   * NOT_VOTED -> never SUCCESS; SUCCESS is reachable ONLY via FINISHED_WITH_RETURN, and only
   * when expectedPostStateRequired is false or postStateMatchesExpected is true (A0 final
   * remediation A5; schema-enforced via allOf/if/then).
   */
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
// Recovery (schemas/recovery/RecoveryState.schema.json) - rebuilt A0 final remediation A1
// ---------------------------------------------------------------------------

export interface RemainingRestriction {
  incidentId: string;
  actionType: string;
  resourceId: string;
}

export interface RecoveryState {
  incidentId: string;
  targetId: string;
  remainingRestrictions: RemainingRestriction[];
  remediationRequired: boolean;
  remediationSubmitted: boolean;
  remediationDecision?: DecisionOutcome | null;
  recoveryValidationRequired: boolean;
  recoveryValidated: boolean;
  restorationAvailable?: boolean;
  restorationExecuted?: boolean;
}

/** Legacy alias kept only for the effective-capability convenience shape used by trackActionTrace. */
export interface EffectiveCapabilityStatus {
  resourceId: string;
  available: boolean;
  restrictingIncidentIds: string[];
}

// ---------------------------------------------------------------------------
// Error envelope / fee preview (schemas/core/ErrorEnvelope.schema.json,
// schemas/transaction/FeeTransactionPreview.schema.json) - rebuilt A0 final remediation A1
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "UNAUTHORIZED_CALLER"
  | "INACTIVE_POLICY"
  | "STALE_POLICY"
  | "INVALID_EVIDENCE"
  | "WRONG_JUDGE"
  | "TRANSACTION_EXECUTION_ERROR"
  | "CHILD_TRANSACTION_FAILED"
  | "AUTHORITY_REVOKED"
  | "WRONG_NETWORK"
  | "FEE_VALUE_MUST_BE_NONZERO"
  | "FEES_DISTRIBUTION_MISSING"
  | "UNKNOWN";

export interface ErrorEnvelope {
  code: ErrorCode;
  message: string;
  nextSteps?: string | null;
  sourceTxId?: string | null;
}

export interface FeeDistributionSummary {
  leaderTimeunitsAllocation: string;
  validatorTimeunitsAllocation: string;
  appealRounds: string;
}

export interface FeeTransactionPreview {
  network: "studio-dev";
  chainId: 61997;
  estimatedFeeValueWei: string;
  isEstimate: true;
  bondWei?: string | null;
  distributionSummary?: FeeDistributionSummary | null;
}
