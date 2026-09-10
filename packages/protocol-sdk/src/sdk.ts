// Type-only RecloseSDK interface per Frontend Contract v1 (F1-v4) Section 2.
// No implementation at this phase (A0-T1): SDK/network calls are C1+ scope.
//
// A0 final remediation (Part A2): fixed two real drift bugs found by external review -
// getAssuranceState() was typed to return the bare AssuranceState enum instead of the
// AssuranceStateSummary object the Frontend Contract actually specifies, and getDecisionView()
// was missing entirely even though it is one of the 14 frozen methods and getDecision() had
// silently absorbed its DecisionView return type instead of returning canonical DecisionRecord.

import type {
  Target,
  AssuranceStateSummary,
  PolicyDetail,
  Incident,
  DecisionRecord,
  DecisionView,
  EffectiveCapabilityStatus,
  ActionEnvelope,
  ExecutionReceipt,
  GenLayerTransactionLifecycle,
  ErrorEnvelope,
} from "./types";

export interface APMDiffResult {
  changedFields: string[];
  authorityExpands: boolean;
}

/** The frozen 14-method SDK boundary (Frontend Contract v1 Section 2). Exactly these methods. */
export interface RecloseSDK {
  getTarget(targetId: string): Promise<Target | ErrorEnvelope>;
  getAssuranceState(targetId: string): Promise<AssuranceStateSummary | ErrorEnvelope>;
  getActivePolicy(targetId: string): Promise<PolicyDetail | ErrorEnvelope>;
  getIncident(incidentId: string): Promise<Incident | ErrorEnvelope>;
  /** Returns the canonical DecisionRecord alone - never the lifecycle-composed DecisionView. */
  getDecision(incidentId: string): Promise<DecisionRecord | ErrorEnvelope>;
  /** Returns the product-facing composition (DecisionRecord + GenLayerTransactionLifecycle). */
  getDecisionView(incidentId: string): Promise<DecisionView | ErrorEnvelope>;
  getEffectiveProviderStatus(targetId: string, resourceId: string): Promise<EffectiveCapabilityStatus | ErrorEnvelope>;
  buildIncidentReport(input: Record<string, unknown>): Promise<Record<string, unknown> | ErrorEnvelope>;
  buildRecoveryReport(input: Record<string, unknown>): Promise<Record<string, unknown> | ErrorEnvelope>;
  validateAPM(apm: Record<string, unknown>): Promise<boolean | ErrorEnvelope>;
  hashAPM(apm: Record<string, unknown>): Promise<string | ErrorEnvelope>;
  diffAPM(fromApm: Record<string, unknown>, toApm: Record<string, unknown>): Promise<APMDiffResult | ErrorEnvelope>;
  trackTransaction(txId: string): Promise<GenLayerTransactionLifecycle | ErrorEnvelope>;
  trackActionTrace(actionId: string): Promise<{ action: ActionEnvelope; receipt: ExecutionReceipt | null } | ErrorEnvelope>;
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
