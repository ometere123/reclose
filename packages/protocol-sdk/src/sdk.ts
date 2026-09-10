// Type-only RecloseSDK interface per Frontend Contract v1 (F1-v6) Section 2.
// No implementation at this phase: SDK/network calls are C1+ scope.
//
// C1R correction (A0-U02, owner-supplied external finding): the compiled interface had drifted
// from the frozen F1 contract in TWO ways at once - (1) several return/input shapes did not match
// the contract's exact object shapes (getEffectiveProviderStatus, buildIncidentReport,
// buildRecoveryReport, validateAPM, hashAPM, diffAPM, trackTransaction, trackActionTrace), and
// (2) every method had been mutated to return `T | ErrorEnvelope` even though the frozen contract
// (CLAUDE.md Section 22, docs/execution/Frontend Contract v1.md) does not specify that union for
// most of them. ErrorEnvelope remains a canonical type for product/error-handling code paths, but
// it is not spliced into a frozen method's return type just because it exists. Every signature
// below is copied verbatim from the F1-v6 owner instruction and is mechanically checked bidirectionally
// against an independently-declared ExpectedRecloseSDK contract in
// src/__typetests__/sdk-parity.ts (A0-U03 fix - see that file for why this is a real parity proof).

import type {
  Target,
  AssuranceStateSummary,
  PolicyDetail,
  Incident,
  DecisionRecord,
  DecisionView,
  EvidenceSource,
  ErrorEnvelope,
  ExecutionResult,
  ExecutionReceipt,
  FeeTransactionPreview,
  PolicySecurityDiff,
  GenLayerTransactionLifecycle,
} from "./types";

/** The frozen 14-method SDK boundary (Frontend Contract v1 F1-v6 Section 2). Exactly these methods. */
export interface RecloseSDK {
  getTarget(targetId: string): Promise<Target>;

  getAssuranceState(targetId: string): Promise<AssuranceStateSummary>;

  getActivePolicy(targetId: string): Promise<PolicyDetail>;

  getIncident(incidentId: string): Promise<Incident>;

  /** Returns the canonical DecisionRecord alone - never the lifecycle-composed DecisionView. */
  getDecision(decisionId: string): Promise<DecisionRecord>;

  /** Returns the product-facing composition (DecisionRecord + GenLayerTransactionLifecycle). */
  getDecisionView(decisionId: string): Promise<DecisionView>;

  getEffectiveProviderStatus(
    targetId: string,
    resourceId: string
  ): Promise<{
    resourceId: string;
    available: boolean;
    reason: ErrorEnvelope | null;
  }>;

  buildIncidentReport(input: {
    targetId: string;
    ruleId: string;
    resourceId: string;
    evidenceSources: EvidenceSource[];
  }): Promise<{
    report: unknown;
    feePreview: FeeTransactionPreview;
  }>;

  buildRecoveryReport(input: {
    incidentId: string;
    evidenceSources: EvidenceSource[];
  }): Promise<{
    report: unknown;
    feePreview: FeeTransactionPreview;
  }>;

  validateAPM(apm: unknown): Promise<{
    valid: boolean;
    errors: string[];
  }>;

  hashAPM(apm: unknown): Promise<string>;

  diffAPM(fromApm: unknown, toApm: unknown): Promise<PolicySecurityDiff>;

  trackTransaction(
    txId: `0x${string}`
  ): Promise<GenLayerTransactionLifecycle & { executionResult?: ExecutionResult }>;

  trackActionTrace(actionId: string): Promise<ExecutionReceipt>;
}

/** The exact 14 frozen method names, for automated parity checking (scripts/test-f1-parity.js). */
export const RECLOSE_SDK_METHOD_NAMES = [
  "getTarget",
  "getAssuranceState",
  "getActivePolicy",
  "getIncident",
  "getDecision",
  "getDecisionView",
  "getEffectiveProviderStatus",
  "buildIncidentReport",
  "buildRecoveryReport",
  "validateAPM",
  "hashAPM",
  "diffAPM",
  "trackTransaction",
  "trackActionTrace",
] as const;
