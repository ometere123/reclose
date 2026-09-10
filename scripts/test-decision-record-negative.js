#!/usr/bin/env node
// Executable negative tests for DecisionRecord.schema.json, added per A0-T3: prove that
// outcome=NONE, decisionStage=NONE, and a missing reporter are all REJECTED by the
// canonical schema, not merely documented as prohibited.

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const REPO_ROOT = path.join(__dirname, "..");
const SCHEMAS_DIR = path.join(REPO_ROOT, "schemas");

function loadSchema(relPath) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, relPath), "utf8"));
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(loadSchema("incident/DecisionOutcome.schema.json"));
ajv.addSchema(loadSchema("incident/DecisionStage.schema.json"));
const decisionRecordSchema = loadSchema("incident/DecisionRecord.schema.json");
const validate = ajv.compile(decisionRecordSchema);

const validBase = {
  schemaVersion: "1.0.0",
  incidentId: "incident-001",
  targetId: "target-001",
  policyHash: "0xabc",
  policyVersion: 1,
  ruleId: "PROVIDER_COMPROMISE_V1",
  affectedResource: "provider:A",
  evidenceHash: "0xdef",
  reporter: "0x1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a",
  outcome: "CONFIRMED",
  conditionCode: "COND_1",
  reasonCodes: [],
  judgeModule: "0x2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b",
  judgeVersion: 1,
  decisionStage: "FINAL",
  generatedAt: "2026-09-10T00:00:00Z",
};

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}`);
    console.error("  " + e.message);
    failures++;
  }
}

test("a valid DecisionRecord passes", () => {
  assert.strictEqual(validate(validBase), true, JSON.stringify(validate.errors));
});

test("outcome = NONE is rejected (A0-T3)", () => {
  const bad = { ...validBase, outcome: "NONE" };
  assert.strictEqual(validate(bad), false, "expected NONE outcome to be rejected");
});

test("decisionStage = NONE is rejected (A0-T3)", () => {
  const bad = { ...validBase, decisionStage: "NONE" };
  assert.strictEqual(validate(bad), false, "expected NONE decisionStage to be rejected");
});

test("missing reporter is rejected (A0-R3)", () => {
  const bad = { ...validBase };
  delete bad.reporter;
  assert.strictEqual(validate(bad), false, "expected missing reporter to be rejected");
});

test("null reporter is rejected (A0-R3, no invented system-initiated exception)", () => {
  const bad = { ...validBase, reporter: null };
  assert.strictEqual(validate(bad), false, "expected null reporter to be rejected");
});

test("genlayerTx / lifecycle fields are not permitted on canonical DecisionRecord (A0-003)", () => {
  const bad = { ...validBase, genlayerTx: { rawStatus: "FINALIZED" } };
  assert.strictEqual(validate(bad), false, "expected additionalProperties:false to reject genlayerTx");
});

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
