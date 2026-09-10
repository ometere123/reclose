// Compile-time-only type fixtures. These must compile; the negative cases are commented
// with the expected tsc error so a reviewer can uncomment and confirm rejection (A0-T3).
import type { DecisionRecord, CanonicalDecisionOutcome, CanonicalDecisionStage } from "../types";

const validOutcome: CanonicalDecisionOutcome = "CONFIRMED";
const validStage: CanonicalDecisionStage = "FINAL";

// @ts-expect-error - NONE is not assignable to CanonicalDecisionOutcome (A0-T3)
const invalidOutcome: CanonicalDecisionOutcome = "NONE";

// @ts-expect-error - NONE is not assignable to CanonicalDecisionStage (A0-T3)
const invalidStage: CanonicalDecisionStage = "NONE";

const record: DecisionRecord = {
  schemaVersion: "1.0.0",
  incidentId: "incident-001",
  targetId: "target-001",
  policyHash: "0xabc",
  policyVersion: 1,
  ruleId: "PROVIDER_COMPROMISE_V1",
  affectedResource: "provider:A",
  evidenceHash: "0xdef",
  reporter: "0x1111111111111111111111111111111111111a",
  outcome: validOutcome,
  conditionCode: "COND_1",
  reasonCodes: [],
  judgeModule: "0x2222222222222222222222222222222222222b",
  judgeVersion: 1,
  decisionStage: validStage,
  generatedAt: "2026-09-10T00:00:00Z",
};

// @ts-expect-error - reporter is required, not optional/nullable (A0-R3)
const missingReporter: DecisionRecord = { ...record, reporter: undefined };

export { record, invalidOutcome, invalidStage, missingReporter };
