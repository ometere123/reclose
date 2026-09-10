#!/usr/bin/env node
// Executable semantic tests for the transaction truth model, added per external A0 re-audit
// finding A0-R6. JSON Schema alone (schemas/transaction/GenLayerTransactionLifecycle.schema.json,
// schemas/incident/DecisionRecord.schema.json) proves each fixture has the RIGHT SHAPE; it does not
// prove the cross-field semantic relationships CLAUDE.md Section 9 requires. This script asserts
// those relationships directly against the real fixtures under tests/frontend-fixtures/, so a future
// change that breaks one of these invariants fails the build instead of silently passing
// schema:validate.

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const REPO_ROOT = path.join(__dirname, "..");
const FIXTURES_DIR = path.join(REPO_ROOT, "tests", "frontend-fixtures");

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8"));
}

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

// --- 1. ACCEPTED is not final -------------------------------------------------------------
test("rawStatus ACCEPTED is never treated as final", () => {
  const tx = loadFixture("tx-lifecycle-accepted.json");
  assert.strictEqual(tx.rawStatus, "ACCEPTED");
  assert.notStrictEqual(tx.rawStatus, "FINALIZED", "ACCEPTED must never equal FINALIZED");
  if (tx.derived) {
    assert.strictEqual(tx.derived.isFinal, false, "an ACCEPTED (non-terminal) transaction must have derived.isFinal === false");
  }
});

// --- 2. FINALIZED is final but does not by itself imply execution success -----------------
test("rawStatus FINALIZED is a terminal lifecycle state but says nothing about execution success on its own", () => {
  const success = loadFixture("tx-lifecycle-finalized-success.json");
  assert.strictEqual(success.rawStatus, "FINALIZED");
  if (success.derived) {
    assert.strictEqual(success.derived.isFinal, true, "a FINALIZED transaction must have derived.isFinal === true");
  }
  // The lifecycle fixture alone carries no executionResult field - that is a ChildTransactionState
  // concept, proven distinct in the next two tests. This test only proves FINALIZED => isFinal,
  // not FINALIZED => success (that would be the exact TM-LIFE-002 bug).
  assert.ok(!("executionResult" in success), "GenLayerTransactionLifecycle itself must never carry executionResult - that would re-merge the two concepts TM-LIFE-002 requires kept separate");
});

// --- 3. FINALIZED + FINISHED_WITH_ERROR is failure -----------------------------------------
test("FINALIZED lifecycle with FINISHED_WITH_ERROR execution result is a failure, not a success (TM-LIFE-002)", () => {
  const child = loadFixture("child-transaction-failed.json");
  assert.strictEqual(child.lifecycle.rawStatus, "FINALIZED", "this fixture must be lifecycle-final to prove finality != success");
  assert.strictEqual(child.executionResult, "FINISHED_WITH_ERROR");
  const isSuccess = child.lifecycle.rawStatus === "FINALIZED" && child.executionResult === "FINISHED_WITH_RETURN";
  assert.strictEqual(isSuccess, false, "a finalized transaction with FINISHED_WITH_ERROR must never compute as a success");

  const receipt = loadFixture("execution-receipt-child-failure.json");
  assert.strictEqual(receipt.childTx.executionResult, "FINISHED_WITH_ERROR");
  assert.strictEqual(receipt.postStateMatchesExpected, false, "a failed child transaction's receipt must not claim the expected post-state was reached");
});

test("FINALIZED lifecycle with FINISHED_WITH_RETURN execution result is a genuine success (control case)", () => {
  const child = loadFixture("child-transaction-succeeded.json");
  assert.strictEqual(child.lifecycle.rawStatus, "FINALIZED");
  assert.strictEqual(child.executionResult, "FINISHED_WITH_RETURN");
});

// --- 4. Raw protocol UNDETERMINED is distinct from Reclose DecisionOutcome.UNDETERMINED ----
test("raw GenLayer TransactionStatus.UNDETERMINED is distinct from Reclose DecisionOutcome.UNDETERMINED (TM-LIFE-003)", () => {
  const rawUndetermined = loadFixture("tx-lifecycle-raw-undetermined.json");
  assert.strictEqual(rawUndetermined.rawStatus, "UNDETERMINED");
  // This fixture is a bare transaction lifecycle - it has no DecisionRecord.outcome field at all,
  // which is itself part of the proof: the two "UNDETERMINED" values live in disjoint schemas.
  assert.ok(!("outcome" in rawUndetermined), "a raw GenLayerTransactionLifecycle must never carry a DecisionOutcome-shaped `outcome` field");

  const view = loadFixture("decision-view-outcome-undetermined-vs-raw-finalized.json");
  assert.strictEqual(view.record.outcome, "UNDETERMINED", "Reclose DecisionOutcome.UNDETERMINED");
  assert.strictEqual(view.transaction.rawStatus, "FINALIZED", "paired with a cleanly FINALIZED transaction");
  assert.notStrictEqual(
    view.transaction.rawStatus,
    view.record.outcome,
    "a Reclose UNDETERMINED decision outcome must never be inferred from, or confused with, the underlying transaction's raw protocol status"
  );
});

// --- 5. derived.isFinal cannot contradict rawStatus ----------------------------------------
test("derived.isFinal never contradicts rawStatus across all lifecycle-bearing fixtures", () => {
  const lifecycleFixtures = [
    "tx-lifecycle-accepted.json",
    "tx-lifecycle-finalized-success.json",
    "tx-lifecycle-raw-undetermined.json",
  ];
  const TERMINAL = new Set(["FINALIZED", "CANCELED"]);
  for (const f of lifecycleFixtures) {
    const tx = loadFixture(f);
    if (!tx.derived) continue;
    const expectedFinal = TERMINAL.has(tx.rawStatus);
    assert.strictEqual(
      tx.derived.isFinal,
      expectedFinal,
      `${f}: derived.isFinal (${tx.derived.isFinal}) contradicts rawStatus (${tx.rawStatus}) - terminal states are exactly {FINALIZED, CANCELED}`
    );
  }
});

// --- 6. A derived display label never replaces the raw protocol fields --------------------
test("derived.displayLabel is always accompanied by, and never a substitute for, the raw fields", () => {
  const withDerived = [
    "tx-lifecycle-accepted.json",
    "tx-lifecycle-finalized-success.json",
    "tx-lifecycle-raw-undetermined.json",
  ];
  for (const f of withDerived) {
    const tx = loadFixture(f);
    if (!tx.derived) continue;
    assert.ok(typeof tx.derived.displayLabel === "string" && tx.derived.displayLabel.length > 0, `${f}: derived.displayLabel must be a non-empty string when present`);
    // The raw fields must independently exist and be schema-valid regardless of the derived label -
    // i.e. deleting `derived` must still leave a fully meaningful, independently-truthful record.
    assert.ok(typeof tx.rawStatus === "string" && tx.rawStatus.length > 0, `${f}: rawStatus must stand on its own without derived`);
  }
});

// --- 7. Mid-flight processing statuses carry no decided outcome (A0 final remediation A6) ---
test("PENDING (mid-flight processing) cannot simultaneously claim a decided protocolDecisionOutcome", () => {
  const tx = loadFixture("tx-lifecycle-pending-processing.json");
  assert.strictEqual(tx.rawStatus, "PENDING");
  assert.strictEqual(tx.protocolDecisionOutcome, null, "PENDING must not carry a decided outcome");
  assert.strictEqual(tx.derived.isFinal, false);
});

// --- 8. ACCEPTED maps exactly to protocolDecisionOutcome 'accepted' ------------------------
test("rawStatus ACCEPTED carries exactly protocolDecisionOutcome 'accepted'", () => {
  const tx = loadFixture("tx-lifecycle-accepted.json");
  assert.strictEqual(tx.rawStatus, "ACCEPTED");
  assert.strictEqual(tx.protocolDecisionOutcome, "accepted");
});

// --- 9. UNDETERMINED maps exactly to protocolDecisionOutcome 'undetermined' ----------------
test("rawStatus UNDETERMINED carries exactly protocolDecisionOutcome 'undetermined'", () => {
  const tx = loadFixture("tx-lifecycle-raw-undetermined.json");
  assert.strictEqual(tx.rawStatus, "UNDETERMINED");
  assert.strictEqual(tx.protocolDecisionOutcome, "undetermined");
});

// --- 10. VALIDATORS_TIMEOUT maps exactly to protocolDecisionOutcome 'validators-timeout' ---
test("rawStatus VALIDATORS_TIMEOUT carries exactly protocolDecisionOutcome 'validators-timeout'", () => {
  const tx = loadFixture("tx-lifecycle-validators-timeout.json");
  assert.strictEqual(tx.rawStatus, "VALIDATORS_TIMEOUT");
  assert.strictEqual(tx.protocolDecisionOutcome, "validators-timeout");
  assert.strictEqual(tx.derived.isFinal, false, "VALIDATORS_TIMEOUT is not a terminal lifecycle state");
});

// --- 11. CANCELED never invents a protocolDecisionOutcome ----------------------------------
test("rawStatus CANCELED is terminal but never invents a protocolDecisionOutcome (no 'canceled' value exists in genlayer-js)", () => {
  const tx = loadFixture("tx-lifecycle-canceled.json");
  assert.strictEqual(tx.rawStatus, "CANCELED");
  assert.strictEqual(tx.protocolDecisionOutcome, null, "CANCELED must not invent an outcome value that does not exist in the pinned SDK");
  assert.strictEqual(tx.derived.isFinal, true, "CANCELED is one of exactly two terminal rawStatus values");
});

// --- 12. Schema-level enforcement of the rawStatus -> protocolDecisionOutcome mapping ------
test("JSON Schema rejects a mismatched rawStatus/protocolDecisionOutcome pairing (schema-level, not just fixture-level)", () => {
  const Ajv = require("ajv");
  const addFormats = require("ajv-formats");
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const SCHEMAS_DIR = path.join(REPO_ROOT, "schemas");
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".schema.json")) {
        const schema = JSON.parse(fs.readFileSync(full, "utf8"));
        if (!ajv.getSchema(schema.$id)) ajv.addSchema(schema, schema.$id);
      }
    }
  })(SCHEMAS_DIR);
  const validate = ajv.getSchema("https://reclose.internal/schemas/transaction/GenLayerTransactionLifecycle.schema.json");

  const mismatched = { txId: "0x" + "1".repeat(64), rawStatus: "ACCEPTED", rawResult: "MAJORITY_AGREE", protocolDecisionOutcome: "undetermined", decidedAtBlock: 1, appealDeadline: null };
  assert.strictEqual(validate(mismatched), false, "ACCEPTED + protocolDecisionOutcome 'undetermined' must be rejected by the schema");

  const inventedOnCancel = { txId: "0x" + "1".repeat(64), rawStatus: "CANCELED", rawResult: null, protocolDecisionOutcome: "accepted", decidedAtBlock: null, appealDeadline: null };
  assert.strictEqual(validate(inventedOnCancel), false, "CANCELED must never carry an invented protocolDecisionOutcome");

  const processingWithOutcome = { txId: "0x" + "1".repeat(64), rawStatus: "PENDING", rawResult: null, protocolDecisionOutcome: "accepted", decidedAtBlock: null, appealDeadline: null };
  assert.strictEqual(validate(processingWithOutcome), false, "PENDING must never claim a decided outcome");
});

console.log("");
if (failures > 0) {
  console.error(`${failures} transaction-truth-model semantic test(s) FAILED.`);
  process.exitCode = 1;
} else {
  console.log("All transaction-truth-model semantic tests passed.");
}
