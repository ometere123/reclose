#!/usr/bin/env node
const assert = require("assert");
const path = require("path");

const { DirectRecloseClient } = require(path.join(__dirname, "..", "packages", "protocol-sdk", "dist", "index.js"));

let failures = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS  ${name}`); }
  catch (error) { failures++; console.error(`FAIL  ${name}\n  ${error.stack || error.message}`); }
}

const ZERO = "0x0000000000000000000000000000000000000000";
const HASH = "0x" + "11".repeat(32);
const TX1 = "0x" + "21".repeat(32);
const TX2 = "0x" + "22".repeat(32);

function transport(overrides = {}) {
  return {
    async getChainId() { return 61997; },
    async getBlockNumber() { return 12345n; },
    async readContract({ functionName, args = [] }) {
      if (functionName === "get_target_details") return [ZERO, ZERO, 0, "", 1710000000, 1, false, false];
      if (functionName === "get_target_incident_count") return 0;
      if (functionName === "get_incident_detail") {
        return ["target-1", "policy-1", 1, "SERVICE_FAILURE_V1", "provider_a", ZERO, ZERO, HASH, "NO_MATERIAL_FAILURE", 0, 2, 4, 1710000000, 1710000100];
      }
      if (functionName === "get_policy_header") return [1, HASH, true, true, false];
      if (functionName === "get_policy_rule") return [ZERO, 7, 1, true, true];
      throw new Error(`unexpected read ${functionName} ${JSON.stringify(args)}`);
    },
    async getTransaction({ hash }) {
      return { txId: hash, status: "FINALIZED", result: "MAJORITY_AGREE", decidedAtBlock: 12000, appealDeadline: null, executionResult: "FINISHED_WITH_RETURN" };
    },
    async getTriggeredTransactionIds() { return []; },
    async resolveActionTransaction() {
      return {
        parentTxId: TX1,
        childTxId: TX2,
        targetId: "target-1",
        adapterId: "reference-agent-protocol",
        executionTime: "2026-09-12T06:00:00.000Z",
        preStateHash: "0x" + "aa".repeat(32),
        postStateHash: "0x" + "bb".repeat(32),
        expectedPostStateRequired: true,
        observedPostState: { assuranceState: "SAFE_MODE", providerAEnabled: false },
        postStateMatchesExpected: true,
      };
    },
    ...overrides,
  };
}

function client(t = transport()) {
  return new DirectRecloseClient(t, { kernel: ZERO, judge: ZERO });
}

async function main() {
  await test("getAssuranceState exposes real transport block height, never fabricated zero", async () => {
    const state = await client().getAssuranceState("target-1");
    assert.strictEqual(state.asOfBlock, 12345);
  });

  await test("CLOSED + final REJECTED is preserved as FINAL_REJECTED", async () => {
    const incident = await client().getIncident("incident-1");
    assert.strictEqual(incident.status, "FINAL_REJECTED");
  });

  await test("CLOSED + final UNDETERMINED is preserved as FINAL_UNDETERMINED", async () => {
    const t = transport({
      async readContract({ functionName }) {
        if (functionName === "get_incident_detail") return ["target-1", "policy-1", 1, "SERVICE_FAILURE_V1", "provider_a", ZERO, ZERO, HASH, "INSUFFICIENT_EVIDENCE", 0, 3, 4, 1710000000, 1710000100];
        if (functionName === "get_target_details") return [ZERO, ZERO, 0, "", 1710000000, 1, false, false];
        if (functionName === "get_target_incident_count") return 0;
        throw new Error(`unexpected read ${functionName}`);
      }
    });
    assert.strictEqual((await client(t).getIncident("incident-2")).status, "FINAL_UNDETERMINED");
  });

  await test("trackActionTrace uses protocol/index target, execution time and state proofs", async () => {
    const receipt = await client().trackActionTrace("action-1");
    assert.strictEqual(receipt.targetId, "target-1");
    assert.strictEqual(receipt.executionTime, "2026-09-12T06:00:00.000Z");
    assert.strictEqual(receipt.expectedPostStateRequired, true);
    assert.strictEqual(receipt.postStateMatchesExpected, true);
    assert.strictEqual(receipt.finalStatus, "SUCCESS");
    assert.ok(receipt.preStateHash && receipt.postStateHash);
  });

  await test("required post-state mismatch cannot be SUCCESS even when child returns", async () => {
    const t = transport({
      async resolveActionTransaction() {
        return { parentTxId: TX1, childTxId: TX2, targetId: "target-1", adapterId: "reference-agent-protocol", executionTime: "2026-09-12T06:00:00.000Z", preStateHash: null, postStateHash: null, expectedPostStateRequired: true, observedPostState: { assuranceState: "NORMAL" }, postStateMatchesExpected: false };
      }
    });
    const receipt = await client(t).trackActionTrace("action-2");
    assert.strictEqual(receipt.finalStatus, "FAILURE");
  });

  await test("trackActionTrace rejects missing protocol-derived execution time", async () => {
    const t = transport({
      async resolveActionTransaction() {
        return { parentTxId: TX1, childTxId: TX2, targetId: "target-1", adapterId: "reference-agent-protocol", executionTime: "", preStateHash: null, postStateHash: null, expectedPostStateRequired: false };
      }
    });
    await assert.rejects(() => client(t).trackActionTrace("action-3"), /executionTime/);
  });

  console.log(`\n${6 - failures}/6 SDK product-truth checks passed.`);
  if (failures) process.exit(1);
}
main();
