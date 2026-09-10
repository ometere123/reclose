#!/usr/bin/env node
// Executable negative tests for ActionEnvelope.schema.json (A0-T2/A4, corrected at C1R/A0-U01
// to restore the canonical boundedParameters field name) and ExecutionReceipt.schema.json (A5):
// prove arbitrary calldata-shaped keys are rejected, and prove the executionResult/finalStatus/
// post-state cross-field constraints are enforced.

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

// Register every schema under schemas/ up front so $ref resolution works regardless of load order.
function walkSchemas(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSchemas(full);
    else if (entry.name.endsWith(".schema.json")) {
      const schema = JSON.parse(fs.readFileSync(full, "utf8"));
      if (!ajv.getSchema(schema.$id)) ajv.addSchema(schema, schema.$id);
    }
  }
}
walkSchemas(SCHEMAS_DIR);

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

// --- ActionEnvelope (A4) ---

const validateAction = ajv.getSchema("https://reclose.internal/schemas/transaction/ActionEnvelope.schema.json");

const validAction = {
  schemaVersion: "1.0.0",
  actionId: "action-001",
  targetId: "target-001",
  targetAddress: "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
  incidentId: "incident-001",
  policyHash: "0xabc",
  policyVersion: 1,
  resourceId: "provider:A",
  actionType: "RESTRICT",
  boundedParameters: { paramU256: null, paramStr: "provider:A:write" },
  decisionStage: "FINAL",
  decisionReference: "incident-001:PROVIDER_COMPROMISE_V1:FINAL",
  nonce: "1",
  expiry: "2026-09-08T00:00:00Z",
};

test("a valid ActionEnvelope with closed boundedParameters passes", () => {
  assert.strictEqual(validateAction(validAction), true, JSON.stringify(validateAction.errors));
});

test("arbitrary top-level 'calldata' key is rejected (closed shape, A0-T2/A4)", () => {
  const bad = { ...validAction, calldata: "0xdeadbeef" };
  assert.strictEqual(validateAction(bad), false, "expected calldata key to be rejected");
});

test("arbitrary top-level 'selector' key is rejected", () => {
  const bad = { ...validAction, selector: "0x12345678" };
  assert.strictEqual(validateAction(bad), false, "expected selector key to be rejected");
});

test("arbitrary top-level 'method' key is rejected", () => {
  const bad = { ...validAction, method: "transfer" };
  assert.strictEqual(validateAction(bad), false, "expected method key to be rejected");
});

test("arbitrary top-level 'destination' key is rejected", () => {
  const bad = { ...validAction, destination: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" };
  assert.strictEqual(validateAction(bad), false, "expected destination key to be rejected");
});

test("a nested free-form execution payload object at top level is rejected", () => {
  const bad = { ...validAction, executionPayload: { to: "0x0", data: "0x0", value: "0" } };
  assert.strictEqual(validateAction(bad), false, "expected nested free-form payload to be rejected");
});

test("an unrecognized/unknown top-level key is rejected (additionalProperties: false)", () => {
  const bad = { ...validAction, someUnknownField: "x" };
  assert.strictEqual(validateAction(bad), false, "expected unknown key to be rejected");
});

test("missing boundedParameters is rejected (required)", () => {
  const bad = { ...validAction };
  delete bad.boundedParameters;
  assert.strictEqual(validateAction(bad), false, "expected missing boundedParameters to be rejected");
});

test("missing paramU256/paramStr inside boundedParameters is rejected (both required, even if null)", () => {
  const bad = { ...validAction, boundedParameters: {} };
  assert.strictEqual(validateAction(bad), false, "expected missing nested paramU256/paramStr to be rejected");
});

test("a non-numeric paramU256 string is rejected (must be a decimal u256)", () => {
  const bad = { ...validAction, boundedParameters: { paramU256: "not-a-number", paramStr: null } };
  assert.strictEqual(validateAction(bad), false, "expected non-numeric paramU256 to be rejected");
});

test("boundedParameters.calldata is rejected (nested closed shape)", () => {
  const bad = { ...validAction, boundedParameters: { paramU256: null, paramStr: null, calldata: "0xdeadbeef" } };
  assert.strictEqual(validateAction(bad), false, "expected boundedParameters.calldata to be rejected");
});

test("boundedParameters.selector is rejected", () => {
  const bad = { ...validAction, boundedParameters: { paramU256: null, paramStr: null, selector: "0x12345678" } };
  assert.strictEqual(validateAction(bad), false, "expected boundedParameters.selector to be rejected");
});

test("boundedParameters.method is rejected", () => {
  const bad = { ...validAction, boundedParameters: { paramU256: null, paramStr: null, method: "transfer" } };
  assert.strictEqual(validateAction(bad), false, "expected boundedParameters.method to be rejected");
});

test("boundedParameters.destination is rejected", () => {
  const bad = { ...validAction, boundedParameters: { paramU256: null, paramStr: null, destination: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" } };
  assert.strictEqual(validateAction(bad), false, "expected boundedParameters.destination to be rejected");
});

test("boundedParameters.payload (nested arbitrary object) is rejected", () => {
  const bad = { ...validAction, boundedParameters: { paramU256: null, paramStr: null, payload: { to: "0x0", data: "0x0" } } };
  assert.strictEqual(validateAction(bad), false, "expected boundedParameters.payload to be rejected");
});

test("boundedParameters with an extra unknown nested field is rejected", () => {
  const bad = { ...validAction, boundedParameters: { paramU256: null, paramStr: null, extra: "x" } };
  assert.strictEqual(validateAction(bad), false, "expected extra nested field to be rejected");
});

// --- ExecutionReceipt (A5) ---

const validateReceipt = ajv.getSchema("https://reclose.internal/schemas/transaction/ExecutionReceipt.schema.json");

const validLifecycle = {
  txId: "0x" + "6".repeat(64),
  rawStatus: "FINALIZED",
  rawResult: "MAJORITY_AGREE",
  protocolDecisionOutcome: "accepted",
  decidedAtBlock: 1,
  appealDeadline: null,
  derived: { displayLabel: "Finalized", isFinal: true },
};

const validReceipt = {
  schemaVersion: "1.0.0",
  actionId: "action-001",
  targetId: "target-001",
  adapterId: "adapter-001",
  parentTxId: "0x" + "2".repeat(64),
  childTx: { txId: "0x" + "6".repeat(64), parentTxId: "0x" + "2".repeat(64), role: "TARGET_ACTION", lifecycle: validLifecycle, executionResult: "FINISHED_WITH_RETURN" },
  executionResult: "FINISHED_WITH_RETURN",
  finalStatus: "SUCCESS",
  preStateHash: "0xa",
  postStateHash: "0xb",
  expectedPostStateRequired: true,
  observedPostState: { x: 1 },
  postStateMatchesExpected: true,
  executionTime: "2026-09-08T00:05:00Z",
};

test("a valid ExecutionReceipt (SUCCESS + FINISHED_WITH_RETURN + post-state proven) passes", () => {
  assert.strictEqual(validateReceipt(validReceipt), true, JSON.stringify(validateReceipt.errors));
});

for (const badResult of ["TIMEOUT", "NONDET_DISAGREE", "DETERMINISTIC_VIOLATION"]) {
  test(`executionResult=${badResult} cannot claim finalStatus SUCCESS (A5)`, () => {
    const bad = { ...validReceipt, executionResult: badResult, finalStatus: "SUCCESS" };
    assert.strictEqual(validateReceipt(bad), false, `expected ${badResult}+SUCCESS to be rejected`);
  });
}

test("executionResult=NOT_VOTED cannot claim finalStatus SUCCESS (A5)", () => {
  const bad = { ...validReceipt, executionResult: "NOT_VOTED", finalStatus: "SUCCESS" };
  assert.strictEqual(validateReceipt(bad), false, "expected NOT_VOTED+SUCCESS to be rejected");
});

test("finalStatus SUCCESS is rejected unless executionResult is FINISHED_WITH_RETURN (A5)", () => {
  const bad = { ...validReceipt, executionResult: "FINISHED_WITH_ERROR", finalStatus: "SUCCESS" };
  assert.strictEqual(validateReceipt(bad), false, "expected finalStatus SUCCESS with non-matching executionResult to be rejected");
});

test("SUCCESS requires postStateMatchesExpected=true when expectedPostStateRequired=true (A5)", () => {
  const bad = { ...validReceipt, postStateMatchesExpected: false };
  assert.strictEqual(validateReceipt(bad), false, "expected SUCCESS without proven post-state match to be rejected");
});

test("SUCCESS is allowed without post-state proof when expectedPostStateRequired=false", () => {
  const ok = { ...validReceipt, expectedPostStateRequired: false, postStateMatchesExpected: null };
  assert.strictEqual(validateReceipt(ok), true, JSON.stringify(validateReceipt.errors));
});

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
