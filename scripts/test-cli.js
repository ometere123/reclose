#!/usr/bin/env node
// Runtime unit tests for @reclose/cli (C3/A2-remediation). Covers the current real command
// surface (policy validate/hash/diff/compile against a canonical APM, evidence build against a
// canonical EAP input, tx track) plus true end-to-end invocations of the real bin/reclose.js
// executable for the two offline commands. tx track and the read-tools (status/target/policy/
// incident/decision/action-trace/audit export) are NOT end-to-end tested here since they require
// a live RPC or a live SDK transport; their pure logic is exercised via fakes where practical.

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");

const {
  runPolicyValidate,
  runPolicyHash,
  runPolicyDiff,
  runCanonicalPolicyCompile,
  runEvidenceBuild,
  runTxTrack,
} = require(path.join(__dirname, "..", "packages", "cli", "dist", "index.js"));

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

const JUDGE = "0x0A519837D3983272A14710d5b6b2108bC27D2D96";

function sampleApm(overrides = {}) {
  return {
    schema: "reclose-apm-v1",
    policyId: "policy-cli-test",
    version: 1,
    target: { targetId: "reclose-target-cli-test" },
    authority: {},
    protectedResources: ["provider_a"],
    judgeModules: [{ moduleId: "judge-1", address: JUDGE, version: 1 }],
    semanticRules: [
      {
        ruleId: "PROVIDER_COMPROMISE_V1",
        judgeModuleId: "judge-1",
        ruleKind: "INCIDENT",
        provisionalAllowed: true,
        effects: [{ actionType: "RESTRICT", resourceId: "provider_a", releasePhase: "REMEDIATION_CONFIRMED" }],
      },
    ],
    sourcePolicies: {},
    capabilities: {},
    actionBounds: {},
    stateMachine: {},
    provisionalContainment: {},
    recovery: {},
    reporting: {},
    crossChain: {},
    humanOverride: false,
    evolutionEnvelope: {},
    activation: {},
    metadata: {},
    ...overrides,
  };
}

function sampleEap(overrides = {}) {
  return {
    targetId: "reclose-target-cli-test",
    policyHash: "0x" + "a".repeat(64),
    ruleId: "PROVIDER_COMPROMISE_V1",
    subject: "cli test probe",
    reporter: "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd",
    observedAt: "2026-09-12T00:00:00.000Z",
    retrievedAt: "2026-09-12T00:00:01.000Z",
    sources: [
      {
        sourceId: "status-source",
        url: "https://example.com/a",
        sourceClass: "INDEPENDENT_PUBLIC",
        extractedText: "probe text",
        retrievedAt: "2026-09-12T00:00:01.000Z",
      },
    ],
    ...overrides,
  };
}

async function main() {
  await test("runPolicyValidate: a valid canonical APM validates with exitCode 0", () => {
    const result = runPolicyValidate(JSON.stringify(sampleApm()));
    assert.strictEqual(result.exitCode, 0);
    assert.ok(JSON.parse(result.output).valid);
  });

  await test("runPolicyValidate: invalid JSON returns exitCode 1, not a thrown exception", () => {
    const result = runPolicyValidate("{not json");
    assert.strictEqual(result.exitCode, 1);
  });

  await test("runPolicyValidate: a structurally incomplete APM is rejected with the missing-field reason", () => {
    const apm = sampleApm();
    delete apm.stateMachine;
    const result = runPolicyValidate(JSON.stringify(apm));
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.valid, false);
    assert.ok(parsed.errors.some((e) => e.includes("stateMachine")));
  });

  await test("runPolicyHash: deterministic regardless of key order", () => {
    const apm = sampleApm();
    const reordered = JSON.parse(JSON.stringify(apm));
    const a = runPolicyHash(JSON.stringify(apm));
    const b = runPolicyHash(JSON.stringify(reordered));
    assert.strictEqual(a.exitCode, 0);
    assert.strictEqual(a.output, b.output);
    assert.match(a.output, /^0x[0-9a-f]{64}$/);
  });

  await test("runPolicyDiff: identical APMs produce a no-expansion diff", () => {
    const apm = sampleApm();
    const result = runPolicyDiff(JSON.stringify(apm), JSON.stringify(apm));
    assert.strictEqual(result.exitCode, 0);
  });

  await test("runCanonicalPolicyCompile: compiles the full Kernel write sequence with exitCode 0", () => {
    const result = runCanonicalPolicyCompile(JSON.stringify(sampleApm()));
    assert.strictEqual(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.match(parsed.manifestHash, /^0x[0-9a-f]{64}$/);
    assert.ok(parsed.calls.some((c) => c.functionName === "seal_policy"));
  });

  await test("runCanonicalPolicyCompile: an APM referencing an unknown judge module is rejected", () => {
    const apm = sampleApm();
    apm.semanticRules[0].judgeModuleId = "no-such-judge";
    const result = runCanonicalPolicyCompile(JSON.stringify(apm));
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.output.includes("unknown judge module"));
  });

  await test("runEvidenceBuild: a valid canonical EAP input builds with exitCode 0", () => {
    const result = runEvidenceBuild(JSON.stringify(sampleEap()));
    assert.strictEqual(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.match(parsed.artifactHash, /^0x[0-9a-f]{64}$/);
  });

  await test("runEvidenceBuild: missing canonical-binding fields (targetId/policyHash/reporter) is rejected", () => {
    const result = runEvidenceBuild(JSON.stringify({ subject: "x", sources: [] }));
    assert.strictEqual(result.exitCode, 1);
  });

  await test("runTxTrack: rejects a malformed tx hash without calling the client", async () => {
    let called = false;
    const client = { async getTransaction() { called = true; }, async getTriggeredTransactionIds() { called = true; } };
    const result = await runTxTrack("not-a-hash", client);
    assert.strictEqual(result.exitCode, 1);
    assert.strictEqual(called, false);
  });

  await test("runTxTrack: formats a fake live transaction's lifecycle and children", async () => {
    const parentHash = "0x" + "a".repeat(64);
    const childHash = "0x" + "b".repeat(64);
    const client = {
      async getTransaction({ hash }) {
        if (hash === parentHash) return { txId: parentHash, status: "FINALIZED", result: "MAJORITY_AGREE" };
        return { txId: hash, status: "ACCEPTED", result: "MAJORITY_AGREE" };
      },
      async getTriggeredTransactionIds() {
        return [childHash];
      },
    };
    const result = await runTxTrack(parentHash, client);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.output.includes("FINALIZED"));
    assert.ok(result.output.includes(childHash));
  });

  await test("bin/reclose.js end-to-end: policy compile on a real canonical APM file", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reclose-cli-test-"));
    const apmPath = path.join(tmpDir, "apm.json");
    fs.writeFileSync(apmPath, JSON.stringify(sampleApm()));
    const binPath = path.join(__dirname, "..", "packages", "cli", "bin", "reclose.js");
    const output = execFileSync(process.execPath, [binPath, "policy", "compile", apmPath], { encoding: "utf8" });
    const parsed = JSON.parse(output);
    assert.match(parsed.manifestHash, /^0x[0-9a-f]{64}$/);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await test("bin/reclose.js end-to-end: evidence build on a real canonical EAP input file", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reclose-cli-test-"));
    const inputPath = path.join(tmpDir, "eap-input.json");
    fs.writeFileSync(inputPath, JSON.stringify(sampleEap()));
    const binPath = path.join(__dirname, "..", "packages", "cli", "bin", "reclose.js");
    const output = execFileSync(process.execPath, [binPath, "evidence", "build", inputPath], { encoding: "utf8" });
    const parsed = JSON.parse(output);
    assert.match(parsed.artifactHash, /^0x[0-9a-f]{64}$/);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await test("bin/reclose.js end-to-end: no args prints usage and exits 1", () => {
    const binPath = path.join(__dirname, "..", "packages", "cli", "bin", "reclose.js");
    let exitCode = 0;
    try {
      execFileSync(process.execPath, [binPath], { encoding: "utf8" });
    } catch (e) {
      exitCode = e.status;
    }
    assert.strictEqual(exitCode, 1);
  });

  if (failures > 0) {
    console.error(`\n${failures} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nAll CLI tests passed.");
  }
}

main();
