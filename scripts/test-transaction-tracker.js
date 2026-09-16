#!/usr/bin/env node
// Runtime unit tests for @reclose/transaction-tracker (C3), using a fake TrackerClient so these
// run without a live RPC. Verifies CLAUDE.md Section 31's concrete, checkable rules: persist
// immediately, survive re-poll, never claim children before a decision, never auto-resubmit on
// timeout.

const assert = require("assert");
const path = require("path");

const { TransactionTracker, InMemoryTransactionStore, inferRoleFromFunctionName, buildTransactionTrace } = require(
  path.join(__dirname, "..", "packages", "transaction-tracker", "dist", "index.js")
);

let failures = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}`);
    console.error("  " + e.message);
    failures++;
  }
}

function fakeClient(responses) {
  return {
    async getTransaction({ hash }) {
      const r = responses.get(hash);
      if (!r) throw new Error(`no fake response registered for ${hash}`);
      return r;
    },
    async getTriggeredTransactionIds({ hash }) {
      const r = responses.get(hash);
      return r && r.__children ? r.__children : [];
    },
  };
}

async function main() {
  await test("trace resolver recognizes both lifecycle-specific Kernel decision entrypoints", async () => {
    assert.strictEqual(inferRoleFromFunctionName("receive_provisional_decision"), "JUDGE_DECISION");
    assert.strictEqual(inferRoleFromFunctionName("receive_final_decision"), "JUDGE_DECISION");
    assert.strictEqual(inferRoleFromFunctionName("receive_decision"), "JUDGE_DECISION");
  });

  await test("track() persists a placeholder immediately, before any poll", async () => {
    const tracker = new TransactionTracker(fakeClient(new Map()), new InMemoryTransactionStore());
    const record = await tracker.track("0xabc", { label: "submit_incident" });
    assert.strictEqual(record.txId, "0xabc");
    assert.strictEqual(record.lifecycle.rawStatus, "UNINITIALIZED");
    assert.strictEqual(record.lastPolledAt, null);
    const reloaded = await tracker.get("0xabc");
    assert.strictEqual(reloaded.txId, "0xabc");
  });

  await test("track() is idempotent - calling it twice does not reset an already-polled record", async () => {
    const responses = new Map([["0xabc", { txId: "0xabc", status: "PENDING", result: null }]]);
    const tracker = new TransactionTracker(fakeClient(responses), new InMemoryTransactionStore());
    await tracker.track("0xabc");
    await tracker.poll("0xabc");
    await tracker.track("0xabc"); // should not wipe the PENDING state back to UNINITIALIZED
    const record = await tracker.get("0xabc");
    assert.strictEqual(record.lifecycle.rawStatus, "PENDING");
  });

  await test("poll() throws for an untracked transaction (never silently starts tracking late)", async () => {
    const tracker = new TransactionTracker(fakeClient(new Map()));
    let threw = false;
    try {
      await tracker.poll("0xnevertracked");
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes("untracked"));
    }
    assert.ok(threw);
  });

  await test("poll() does not fetch children for a non-terminal, non-decided status", async () => {
    let childCallCount = 0;
    const client = {
      async getTransaction() {
        return { txId: "0xabc", status: "PENDING", result: null };
      },
      async getTriggeredTransactionIds() {
        childCallCount++;
        return ["0xchild"];
      },
    };
    const tracker = new TransactionTracker(client);
    await tracker.track("0xabc");
    const record = await tracker.poll("0xabc");
    assert.strictEqual(childCallCount, 0);
    assert.strictEqual(record.children.length, 0);
  });

  await test("poll() fetches and maps children once the parent is finalized", async () => {
    const responses = new Map([
      ["0xparent", { txId: "0xparent", status: "FINALIZED", result: "MAJORITY_AGREE", __children: ["0xchild1"] }],
      ["0xchild1", { txId: "0xchild1", status: "ACCEPTED", result: "MAJORITY_AGREE" }],
    ]);
    const tracker = new TransactionTracker(fakeClient(responses));
    await tracker.track("0xparent");
    const record = await tracker.poll("0xparent");
    assert.strictEqual(record.children.length, 1);
    assert.strictEqual(record.children[0].txId, "0xchild1");
    assert.strictEqual(record.children[0].lifecycle.protocolDecisionOutcome, "accepted");
  });

  await test("poll() also fetches children once ACCEPTED (decided but not yet final)", async () => {
    const responses = new Map([
      ["0xparent", { txId: "0xparent", status: "ACCEPTED", result: "MAJORITY_AGREE", __children: ["0xchild1"] }],
      ["0xchild1", { txId: "0xchild1", status: "PENDING", result: null }],
    ]);
    const tracker = new TransactionTracker(fakeClient(responses));
    await tracker.track("0xparent");
    const record = await tracker.poll("0xparent");
    assert.strictEqual(record.children.length, 1);
  });

  await test("poll() persists a recursive graph and reports emitted messages awaiting materialization", async () => {
    const responses = new Map([
      ["0xroot", { txId: "0xroot", status: "FINALIZED", result: "MAJORITY_AGREE", emittedMessages: [{}, {}], __children: ["0xchild"] }],
      ["0xchild", { txId: "0xchild", status: "FINALIZED", result: "MAJORITY_AGREE", emittedMessages: [{}], __children: ["0xgrandchild"] }],
      ["0xgrandchild", { txId: "0xgrandchild", status: "PENDING", result: null }],
    ]);
    const store = new InMemoryTransactionStore();
    const tracker = new TransactionTracker(fakeClient(responses), store);
    await tracker.track("0xroot");
    const record = await tracker.poll("0xroot");
    assert.strictEqual(record.childMaterialization, "AWAITING_MATERIALIZATION");
    assert.strictEqual((await tracker.get("0xchild")).children[0].txId, "0xgrandchild");
    assert.strictEqual((await tracker.get("0xgrandchild")).parentTxId, "0xchild");
  });

  await test("phase-aware ledger waits for finalized messages without misclassifying accepted-only progress", async () => {
    const responses = new Map([
      ["0xphase-root", {
        txId: "0xphase-root", status: "ACCEPTED", result: "MAJORITY_AGREE",
        messages: [{ onAcceptance: true }, { onAcceptance: false }], __children: ["0xaccepted-child"],
      }],
      ["0xaccepted-child", { txId: "0xaccepted-child", status: "FINALIZED", result: "MAJORITY_AGREE" }],
      ["0xfinal-child", { txId: "0xfinal-child", status: "PENDING", result: null }],
    ]);
    const tracker = new TransactionTracker(fakeClient(responses));
    await tracker.track("0xphase-root");
    const accepted = await tracker.poll("0xphase-root");
    assert.strictEqual(accepted.childMaterialization, "MATERIALIZED");
    assert.deepStrictEqual(accepted.expectedMessages.map((message) => message.triggerPhase), ["ACCEPTED", "FINALIZED"]);

    responses.set("0xphase-root", {
      txId: "0xphase-root", status: "FINALIZED", result: "MAJORITY_AGREE",
      messages: [{ onAcceptance: true }, { onAcceptance: false }], __children: ["0xaccepted-child", "0xfinal-child"],
    });
    const finalized = await tracker.poll("0xphase-root");
    assert.strictEqual(finalized.childMaterialization, "MATERIALIZED");
    assert.strictEqual(finalized.children.length, 2);
  });

  await test("bounded missing-child state becomes stalled without resubmission", async () => {
    const responses = new Map([
      ["0xstalled", { txId: "0xstalled", status: "FINALIZED", result: "MAJORITY_AGREE", messages: [{ onAcceptance: false }], __children: [] }],
    ]);
    const tracker = new TransactionTracker(fakeClient(responses), new InMemoryTransactionStore(), { materializationStallPolls: 2 });
    await tracker.track("0xstalled");
    assert.strictEqual((await tracker.poll("0xstalled")).childMaterialization, "AWAITING_MATERIALIZATION");
    assert.strictEqual((await tracker.poll("0xstalled")).childMaterialization, "MATERIALIZATION_STALLED");
    assert.strictEqual(await tracker.isReadyForResubmitDecision("0xstalled"), false);
  });

  await test("trace completion requires successful execution for every discovered descendant", async () => {
    const responses = new Map([
      ["0xtrace-root", { txId: "0xtrace-root", status: "FINALIZED", result: "MAJORITY_AGREE", executionResult: "FINISHED_WITH_RETURN", __children: ["0xtrace-child"] }],
      ["0xtrace-child", { txId: "0xtrace-child", status: "PENDING", result: null, executionResult: null }],
    ]);
    const trace = await buildTransactionTrace(fakeClient(responses), "0xtrace-root");
    assert.strictEqual(trace.complete, false);
    assert.strictEqual(trace.hasExecutionFailure, false);
  });

  await test("isReadyForResubmitDecision is true only for CANCELED, never for a timeout status (Section 31 rule 3)", async () => {
    const responses = new Map([
      ["0xcanceled", { txId: "0xcanceled", status: "CANCELED", result: null }],
      ["0xtimedout", { txId: "0xtimedout", status: "VALIDATORS_TIMEOUT", result: "TIMEOUT" }],
    ]);
    const tracker = new TransactionTracker(fakeClient(responses));
    await tracker.track("0xcanceled");
    await tracker.poll("0xcanceled");
    await tracker.track("0xtimedout");
    await tracker.poll("0xtimedout");
    assert.strictEqual(await tracker.isReadyForResubmitDecision("0xcanceled"), true);
    assert.strictEqual(await tracker.isReadyForResubmitDecision("0xtimedout"), false);
  });

  await test("list() returns every tracked transaction", async () => {
    const responses = new Map([
      ["0xa", { txId: "0xa", status: "PENDING", result: null }],
      ["0xb", { txId: "0xb", status: "PENDING", result: null }],
    ]);
    const tracker = new TransactionTracker(fakeClient(responses));
    await tracker.track("0xa");
    await tracker.track("0xb");
    const all = await tracker.list();
    assert.strictEqual(all.length, 2);
  });

  if (failures > 0) {
    console.error(`\n${failures} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nAll transaction-tracker tests passed.");
  }
}

main();
