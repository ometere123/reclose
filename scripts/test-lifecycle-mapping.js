#!/usr/bin/env node
// Runtime unit tests for packages/protocol-sdk/src/lifecycle.ts (C3 Section 31 enforcement).
// Runs against the built dist/ output (npm run build in protocol-sdk first), matching the
// convention of scripts/test-f1-parity.js.

const assert = require("assert");
const path = require("path");

const { mapRawTransaction, isSafeToResubmit } = require(
  path.join(__dirname, "..", "packages", "protocol-sdk", "dist", "lifecycle.js")
);

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

test("FINALIZED with ACCEPTED result maps isFinal=true, no decision outcome claimed beyond what's required", () => {
  const lc = mapRawTransaction({ txId: "0xabc", status: "FINALIZED", result: "MAJORITY_AGREE" });
  assert.strictEqual(lc.derived.isFinal, true);
  assert.strictEqual(lc.protocolDecisionOutcome, null);
  assert.strictEqual(lc.rawStatus, "FINALIZED");
});

test("ACCEPTED status requires protocolDecisionOutcome = 'accepted'", () => {
  const lc = mapRawTransaction({ txId: "0xabc", status: "ACCEPTED", result: "MAJORITY_AGREE" });
  assert.strictEqual(lc.protocolDecisionOutcome, "accepted");
  assert.strictEqual(lc.derived.isFinal, false);
});

test("UNDETERMINED status requires protocolDecisionOutcome = 'undetermined'", () => {
  const lc = mapRawTransaction({ txId: "0xabc", status: "UNDETERMINED", result: "NO_MAJORITY" });
  assert.strictEqual(lc.protocolDecisionOutcome, "undetermined");
});

test("VALIDATORS_TIMEOUT requires protocolDecisionOutcome = 'validators-timeout'", () => {
  const lc = mapRawTransaction({ txId: "0xabc", status: "VALIDATORS_TIMEOUT", result: "TIMEOUT" });
  assert.strictEqual(lc.protocolDecisionOutcome, "validators-timeout");
});

test("LEADER_TIMEOUT requires protocolDecisionOutcome = 'leader-timeout'", () => {
  const lc = mapRawTransaction({ txId: "0xabc", status: "LEADER_TIMEOUT", result: "TIMEOUT" });
  assert.strictEqual(lc.protocolDecisionOutcome, "leader-timeout");
});

test("PENDING (non-terminal-processing) never claims a decision outcome", () => {
  const lc = mapRawTransaction({ txId: "0xabc", status: "PENDING", result: null });
  assert.strictEqual(lc.protocolDecisionOutcome, null);
  assert.strictEqual(lc.derived.isFinal, false);
});

test("CANCELED is terminal but carries no decision outcome", () => {
  const lc = mapRawTransaction({ txId: "0xabc", status: "CANCELED", result: null });
  assert.strictEqual(lc.derived.isFinal, true);
  assert.strictEqual(lc.protocolDecisionOutcome, null);
});

test("isSafeToResubmit is true only for CANCELED, never for a timeout-shaped status (never blindly resubmit on timeout)", () => {
  const canceled = mapRawTransaction({ txId: "0xabc", status: "CANCELED", result: null });
  const timedOut = mapRawTransaction({ txId: "0xabc", status: "VALIDATORS_TIMEOUT", result: "TIMEOUT" });
  const finalized = mapRawTransaction({ txId: "0xabc", status: "FINALIZED", result: "MAJORITY_AGREE" });
  assert.strictEqual(isSafeToResubmit(canceled), true);
  assert.strictEqual(isSafeToResubmit(timedOut), false);
  assert.strictEqual(isSafeToResubmit(finalized), false);
});

test("decidedAtBlock/appealDeadline pass through verbatim, defaulting to null", () => {
  const lc1 = mapRawTransaction({ txId: "0xabc", status: "FINALIZED", result: "MAJORITY_AGREE", decidedAtBlock: 42, appealDeadline: "2026-09-12T00:00:00Z" });
  assert.strictEqual(lc1.decidedAtBlock, 42);
  assert.strictEqual(lc1.appealDeadline, "2026-09-12T00:00:00Z");
  const lc2 = mapRawTransaction({ txId: "0xabc", status: "PENDING", result: null });
  assert.strictEqual(lc2.decidedAtBlock, null);
  assert.strictEqual(lc2.appealDeadline, null);
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll lifecycle mapping tests passed.");
}
