#!/usr/bin/env node
"use strict";
const assert = require("assert");
const path = require("path");
const cli = require(path.join(__dirname, "..", "packages", "cli", "dist", "index.js"));

let failures = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS  ${name}`); }
  catch (error) { failures++; console.error(`FAIL  ${name}\n  ${error.message}`); }
}

const evidenceSources = [{
  sourceClass: "AUTHORITATIVE_PUBLIC",
  url: "https://status.example.invalid/incident",
  fetchedAt: "2026-09-12T00:00:00.000Z",
  observedAt: "2026-09-12T00:00:00.000Z",
  contentHash: `0x${"11".repeat(32)}`,
  availability: "AVAILABLE",
  rejectionReason: null,
}];

(async () => {
  await test("incident prepare delegates exactly once to SDK builder", async () => {
    let captured = null;
    const sdk = {
      async buildIncidentReport(input) {
        captured = input;
        return { report: { kind: "INCIDENT_REPORT_DRAFT" }, feePreview: { chainId: 61997 } };
      },
    };
    const input = { targetId: "target-1", ruleId: "PROVIDER_COMPROMISE_V1", resourceId: "provider_a", evidenceSources };
    const result = await cli.runIncidentReportPrepare(sdk, input);
    assert.strictEqual(result.exitCode, 0);
    assert.deepStrictEqual(captured, input);
    assert.match(result.output, /INCIDENT_REPORT_DRAFT/);
  });

  await test("recovery prepare delegates exactly once to SDK builder", async () => {
    let captured = null;
    const sdk = {
      async buildRecoveryReport(input) {
        captured = input;
        return { report: { kind: "RECOVERY_REPORT_DRAFT" }, feePreview: { chainId: 61997 } };
      },
    };
    const input = { incidentId: "target-1:reporter:0", evidenceSources };
    const result = await cli.runRecoveryPrepare(sdk, input);
    assert.strictEqual(result.exitCode, 0);
    assert.deepStrictEqual(captured, input);
    assert.match(result.output, /RECOVERY_REPORT_DRAFT/);
  });

  await test("builder errors become non-zero CLI results without a retry", async () => {
    let calls = 0;
    const sdk = {
      async buildIncidentReport() { calls++; throw new Error("fee estimation unavailable"); },
    };
    const result = await cli.runIncidentReportPrepare(sdk, { targetId: "t", ruleId: "r", resourceId: "x", evidenceSources: [] });
    assert.strictEqual(result.exitCode, 1);
    assert.strictEqual(calls, 1);
    assert.match(result.output, /fee estimation unavailable/);
  });

  console.log(`\n${3 - failures}/3 CLI report-preparation checks passed.`);
  if (failures) process.exit(1);
})();
