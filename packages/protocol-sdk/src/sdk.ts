// Type-only RecloseSDK interface per Frontend Contract v1 (F1-v3) Section 2.
// No implementation at this phase (A0-T1): SDK/network calls are C1+ scope.

import type {
  Target,
  AssuranceState,
  PolicyDetail,
  Incident,
  DecisionView,
  EffectiveCapabilityStatus,
  ActionEnvelope,
  ExecutionReceipt,
  ErrorEnvelope,
} from "./types";

export interface APMDiffResult {
  changedFields: string[];
  authorityExpands: boolean;
}

export interface RecloseSDK {
  getTarget(targetId: string): Promise<Target | ErrorEnvelope>;
  getAssuranceState(targetId: string): Promise<AssuranceState | ErrorEnvelope>;
  getActivePolicy(targetId: string): Promise<PolicyDetail | ErrorEnvelope>;
  getIncident(incidentId: string): Promise<Incident | ErrorEnvelope>;
  getDecision(incidentId: string): Promise<DecisionView | ErrorEnvelope>;
  getEffectiveProviderStatus(targetId: string, resourceId: string): Promise<EffectiveCapabilityStatus | ErrorEnvelope>;
  buildIncidentReport(input: Record<string, unknown>): Promise<Record<string, unknown> | ErrorEnvelope>;
  buildRecoveryReport(input: Record<string, unknown>): Promise<Record<string, unknown> | ErrorEnvelope>;
  validateAPM(apm: Record<string, unknown>): Promise<boolean | ErrorEnvelope>;
  hashAPM(apm: Record<string, unknown>): Promise<string | ErrorEnvelope>;
  diffAPM(fromApm: Record<string, unknown>, toApm: Record<string, unknown>): Promise<APMDiffResult | ErrorEnvelope>;
  trackTransaction(txId: string): Promise<unknown | ErrorEnvelope>;
  trackActionTrace(actionId: string): Promise<{ action: ActionEnvelope; receipt: ExecutionReceipt | null } | ErrorEnvelope>;
}
