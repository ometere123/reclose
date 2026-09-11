#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  checkSource,
  checkAllSources,
  SentinelMonitor,
  buildCandidateReport,
  SentinelRunner,
  InMemorySentinelStateStore,
} = require(path.join(__dirname, "..", "packages", "sentinel", "dist", "index.js"));

let failures = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}`); console.error(error.stack || error.message); }
}
function source(url = "https://status.example.com/a", pattern = "unauthorized") {
  return { sourceId: "status-source", url, sourceClass: "INDEPENDENT_PUBLIC", pattern };
}
function fakeFetch(responses) {
  return async (url) => {
    const r = responses.get(url);
    if (!r) throw new Error(`no fake response for ${url}`);
    if (r.networkError) throw new Error(r.networkError);
    return { status: r.status, async text() { return r.body; } };
  };
}

async function main() {
  await test("detects deterministic candidate", async () => {
    const result = await checkSource(source(), fakeFetch(new Map([["https://status.example.com/a", { status: 200, body: "unauthorized access" }]])));
    assert.equal(result.candidateDetected, true);
    assert.equal(result.sourceId, "status-source");
  });

  await test("refuses unsafe URL before fetch", async () => {
    let called = false;
    const result = await checkSource(source("https://localhost/a", "x"), async () => { called = true; return { status: 200, async text() { return "x"; } }; });
    assert.equal(called, false);
    assert.equal(result.candidateDetected, false);
  });

  await test("source outage is structured uncertainty", async () => {
    const result = await checkSource(source(), fakeFetch(new Map([["https://status.example.com/a", { networkError: "ECONNREFUSED" }]])));
    assert.equal(result.error, "ECONNREFUSED");
    assert.equal(result.candidateDetected, false);
  });

  await test("candidate report is canonical and bound to context", async () => {
    const results = await checkAllSources([source()], fakeFetch(new Map([["https://status.example.com/a", { status: 200, body: "unauthorized access" }]])));
    const report = buildCandidateReport({
      targetId: "target-1",
      policyHash: "0x" + "2".repeat(64),
      ruleId: "PROVIDER_COMPROMISE_V1",
      reporter: "0x1111111111111111111111111111111111111111",
      subject: "provider compromise",
    }, results);
    const parsed = JSON.parse(report.eapJson);
    assert.equal(parsed.targetId, "target-1");
    assert.equal(parsed.sources[0].sourceId, "status-source");
    assert.equal(parsed.artifactHash, report.artifactHash);
  });

  await test("monitor exports extended health metrics", async () => {
    const monitor = new SentinelMonitor([source()], fakeFetch(new Map([["https://status.example.com/a", { status: 200, body: "unauthorized access" }]])));
    await monitor.runOnce();
    monitor.recordReportSubmitted();
    monitor.recordDuplicateSuppressed();
    const metrics = monitor.getHealthMetrics();
    assert.equal(metrics.checksPerformed, 1);
    assert.equal(metrics.reportsSubmitted, 1);
    assert.equal(metrics.duplicateCandidatesSuppressed, 1);
  });

  await test("runner submits once, persists tx immediately, suppresses duplicate", async () => {
    const fetchImpl = fakeFetch(new Map([["https://status.example.com/a", { status: 200, body: "unauthorized access" }]]));
    const monitor = new SentinelMonitor([source()], fetchImpl);
    const store = new InMemorySentinelStateStore();
    const submitted = [];
    const tracked = [];
    const reporter = {
      async getReporterAddress() { return "0x1111111111111111111111111111111111111111"; },
      async getNextReporterNonce() { return 0; },
      async submitIncident(args) { submitted.push(args); return { txId: "0xabc" }; },
    };
    const tracker = {
      async track(txId) { tracked.push(txId); },
      async poll() { return { lifecycle: { rawStatus: "PENDING", derived: { isFinal: false } } }; },
    };
    const runner = new SentinelRunner({
      monitor, reporter, store, tracker,
      context: { targetId: "target-1", policyKey: "policy-1", policyHash: "0x" + "2".repeat(64), ruleId: "PROVIDER_COMPROMISE_V1", resourceId: "provider_a", subject: "provider compromise" },
      cooldownSeconds: 0,
    });
    const first = await runner.runOnce();
    assert.equal(first.submittedTxId, "0xabc");
    assert.equal(submitted.length, 1);
    assert.deepEqual(tracked, ["0xabc"]);
    const stateAfter = await store.load();
    assert.ok(stateAfter.pendingTransactions["0xabc"]);
    const second = await runner.runOnce();
    assert.equal(second.duplicateSuppressed, true);
    assert.equal(submitted.length, 1);
  });

  await test("restart resumes original transaction and never resubmits on polling error", async () => {
    const store = new InMemorySentinelStateStore();
    await store.save({
      seenCandidateKeys: { key: "0xold" },
      pendingTransactions: { "0xold": { submittedAt: new Date().toISOString(), candidateKey: "key" } },
      lastSubmissionAtByRule: {},
    });
    let submitCount = 0;
    const runner = new SentinelRunner({
      monitor: new SentinelMonitor([], async () => { throw new Error("unused"); }),
      reporter: {
        async getReporterAddress() { return "0x1111111111111111111111111111111111111111"; },
        async getNextReporterNonce() { return 1; },
        async submitIncident() { submitCount++; return { txId: "0xnew" }; },
      },
      store,
      tracker: { async track() {}, async poll(txId) { assert.equal(txId, "0xold"); throw new Error("RPC timeout"); } },
      context: { targetId: "target-1", policyKey: "policy-1", policyHash: "0x" + "2".repeat(64), ruleId: "PROVIDER_COMPROMISE_V1", resourceId: "provider_a", subject: "x" },
    });
    await runner.resumePending();
    assert.equal(submitCount, 0);
    assert.ok((await store.load()).pendingTransactions["0xold"]);
  });

  if (failures) process.exit(1);
  console.log("All Sentinel A2 tests passed.");
}
main();
