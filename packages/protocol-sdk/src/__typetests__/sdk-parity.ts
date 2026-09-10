// Compile-time-only F1-v6 SDK parity contract (C1R fix for A0-U03: scripts/test-f1-parity.js
// previously claimed "full SDK parity" while mechanically checking only method names plus three
// hand-written regex signatures - an overclaim the owner's external review correctly flagged).
//
// This file independently re-declares the FROZEN F1-v6 contract (CLAUDE.md Section 22,
// docs/execution/Frontend Contract v1.md Section 2) as ExpectedRecloseSDK, without importing
// RecloseSDK's own declaration, then asserts BIDIRECTIONAL structural assignability against the
// real compiled `RecloseSDK` interface in ../sdk.ts. If a future change adds/removes a method,
// changes a parameter's shape, or changes a return type, `npm run typecheck` fails here -
// this is the actual "full parity" proof; scripts/test-f1-parity.js's method-name check is now
// a secondary/fast pre-typecheck gate only, not the primary proof.
//
// Must not import RecloseSDK/APMDiffResult from ../sdk - only the plain data types from ../types,
// so this really is an independent re-statement of the frozen contract, not a copy of the same
// interface under a new name.
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
} from "../types";
import type { RecloseSDK } from "../sdk";

export interface ExpectedRecloseSDK {
  getTarget(targetId: string): Promise<Target>;
  getAssuranceState(targetId: string): Promise<AssuranceStateSummary>;
  getActivePolicy(targetId: string): Promise<PolicyDetail>;
  getIncident(incidentId: string): Promise<Incident>;
  getDecision(decisionId: string): Promise<DecisionRecord>;
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
  }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }>;
  buildRecoveryReport(input: {
    incidentId: string;
    evidenceSources: EvidenceSource[];
  }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }>;
  validateAPM(apm: unknown): Promise<{ valid: boolean; errors: string[] }>;
  hashAPM(apm: unknown): Promise<string>;
  diffAPM(fromApm: unknown, toApm: unknown): Promise<PolicySecurityDiff>;
  trackTransaction(
    txId: `0x${string}`
  ): Promise<GenLayerTransactionLifecycle & { executionResult?: ExecutionResult }>;
  trackActionTrace(actionId: string): Promise<ExecutionReceipt>;
}

// Bidirectional structural assignability: both directions must typecheck, or this file fails to
// compile and `npm run typecheck` (part of `npm run verify`) fails the build.
declare const realSdk: RecloseSDK;
declare const expectedSdk: ExpectedRecloseSDK;

const _expectedIsAssignableToReal: RecloseSDK = expectedSdk;
const _realIsAssignableToExpected: ExpectedRecloseSDK = realSdk;

export { _expectedIsAssignableToReal, _realIsAssignableToExpected };
