#!/usr/bin/env node
// Runtime unit tests for @reclose/sentinel (C3), using a fake fetch so these run without real
// network access. Verifies CLAUDE.md Section 33's invariants: Sentinel detects CANDIDATE
// conditions only (deterministic pattern match, never a judgment), exports health metrics, and
// never produces anything beyond a submittable EAP - it has no method that sends a transaction
// or touches key material.

const assert = require("assert");
const path = require("path");

const { checkSource, checkAllSources, SentinelMonitor, buildCandidateReport } = require(
  path.join(__dirname, "..", "packages", "sentinel", "dist", "index.js")
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

function fakeFetch(responsesByUrl) {
  return async (url) => {
    const r = responsesByUrl.get(url);
    if (!r) throw new Error(`no fake response for ${url}`);
    if (r.networkError) throw new Error(r.networkError);
    return { status: r.status, async text() { return r.body; } };
  };
}

async function main() {
  await test("checkSource detects a candidate when the pattern matches fetched content", async () => {
    const fetchImpl = fakeFetch(new Map([["https://status.example.com/a", { status: 200, body: "Provider A is reporting unauthorized access." }]]));
    const result = await checkSource({ url: "https://status.example.com/a", sourceClass: "INDEPENDENT_PUBLIC", pattern: "unauthorized access" }, fetchImpl);
    assert.strictEqual(result.candidateDetected, true);
    assert.strictEqual(result.error, undefined);
  });

  await test("checkSource reports no candidate when the pattern does not match", async () => {
    const fetchImpl = fakeFetch(new Map([["https://status.example.com/a", { status: 200, body: "All systems operational." }]]));
    const result = await checkSource({ url: "https://status.example.com/a", sourceClass: "INDEPENDENT_PUBLIC", pattern: "unauthorized access" }, fetchImpl);
    assert.strictEqual(result.candidateDetected, false);
  });

  await test("checkSource refuses to fetch a URL the Judge's own rules would reject (never even attempts it)", async () => {
    let fetchCalled = false;
    const fetchImpl = async () => { fetchCalled = true; return { status: 200, async text() { return ""; } }; };
    const result = await checkSource({ url: "https://localhost/a", sourceClass: "INDEPENDENT_PUBLIC", pattern: "x" }, fetchImpl);
    assert.strictEqual(fetchCalled, false);
    assert.strictEqual(result.candidateDetected, false);
    assert.ok(result.error.includes("rejected"));
  });

  await test("checkSource reports a structured error for a network failure, never throws (source outage must be observable, not fatal)", async () => {
    const fetchImpl = fakeFetch(new Map([["https://status.example.com/a", { networkError: "ECONNREFUSED" }]]));
    const result = await checkSource({ url: "https://status.example.com/a", sourceClass: "INDEPENDENT_PUBLIC", pattern: "x" }, fetchImpl);
    assert.strictEqual(result.candidateDetected, false);
    assert.strictEqual(result.error, "ECONNREFUSED");
  });

  await test("checkSource reports a non-200 status as a structured error", async () => {
    const fetchImpl = fakeFetch(new Map([["https://status.example.com/a", { status: 503, body: "" }]]));
    const result = await checkSource({ url: "https://status.example.com/a", sourceClass: "INDEPENDENT_PUBLIC", pattern: "x" }, fetchImpl);
    assert.strictEqual(result.candidateDetected, false);
    assert.ok(result.error.includes("503"));
  });

  await test("checkAllSources runs every configured source independently", async () => {
    const fetchImpl = fakeFetch(new Map([
      ["https://a.example.com", { status: 200, body: "alert triggered" }],
      ["https://b.example.com", { status: 200, body: "nothing to see" }],
    ]));
    const results = await checkAllSources([
      { url: "https://a.example.com", sourceClass: "INDEPENDENT_PUBLIC", pattern: "alert" },
      { url: "https://b.example.com", sourceClass: "INDEPENDENT_PUBLIC", pattern: "alert" },
    ], fetchImpl);
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].candidateDetected, true);
    assert.strictEqual(results[1].candidateDetected, false);
  });

  await test("SentinelMonitor accumulates health metrics across repeated runs", async () => {
    const fetchImpl = fakeFetch(new Map([["https://a.example.com", { status: 200, body: "alert triggered" }]]));
    const monitor = new SentinelMonitor([{ url: "https://a.example.com", sourceClass: "INDEPENDENT_PUBLIC", pattern: "alert" }], fetchImpl);
    await monitor.runOnce();
    await monitor.runOnce();
    const metrics = monitor.getHealthMetrics();
    assert.strictEqual(metrics.sourcesConfigured, 1);
    assert.strictEqual(metrics.checksPerformed, 2);
    assert.strictEqual(metrics.candidatesDetected, 2);
    assert.strictEqual(metrics.sourceErrors, 0);
    assert.ok(metrics.lastCheckAt !== null);
  });

  await test("buildCandidateReport produces a Judge-submittable EAP from triggered sources only", async () => {
    const fetchImpl = fakeFetch(new Map([
      ["https://a.example.com", { status: 200, body: "unauthorized access detected" }],
      ["https://b.example.com", { status: 200, body: "all clear" }],
    ]));
    const results = await checkAllSources([
      { url: "https://a.example.com", sourceClass: "INDEPENDENT_PUBLIC", pattern: "unauthorized" },
      { url: "https://b.example.com", sourceClass: "INDEPENDENT_PUBLIC", pattern: "unauthorized" },
    ], fetchImpl);
    const report = buildCandidateReport("provider_a possible compromise", results);
    assert.strictEqual(report.triggeredSources.length, 1);
    assert.strictEqual(report.triggeredSources[0].url, "https://a.example.com");
    const parsed = JSON.parse(report.eapJson);
    assert.strictEqual(parsed.sources.length, 1);
  });

  await test("buildCandidateReport throws when no source triggered (never fabricates a report)", async () => {
    const fetchImpl = fakeFetch(new Map([["https://a.example.com", { status: 200, body: "all clear" }]]));
    const results = await checkAllSources([{ url: "https://a.example.com", sourceClass: "INDEPENDENT_PUBLIC", pattern: "unauthorized" }], fetchImpl);
    assert.throws(() => buildCandidateReport("x", results), /No candidate-triggering sources/);
  });

  await test("Sentinel module exposes no submission/signing capability - it has no method touching a private key or sending a transaction", () => {
    const sentinel = require(path.join(__dirname, "..", "packages", "sentinel", "dist", "index.js"));
    const exported = Object.keys(sentinel);
    const suspicious = exported.filter((name) => /sign|submit|send|privateKey|key/i.test(name));
    assert.deepStrictEqual(suspicious, [], `Sentinel must never export key/submission handling, found: ${suspicious.join(", ")}`);
  });

  if (failures > 0) {
    console.error(`\n${failures} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nAll Sentinel tests passed.");
  }
}

main();
