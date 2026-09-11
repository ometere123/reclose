#!/usr/bin/env node
// Runtime unit tests for @reclose/cli's pure command implementations (C3), plus an end-to-end
// invocation of the real bin/reclose.js executable for the offline commands (policy compile,
// evidence build) - proving the actual CLI a user/agent would run, not just its library internals.
// tx track is NOT end-to-end tested here (it is the one command that makes a live network call);
// its pure polling/formatting logic is covered via a fake TrackerClient instead.

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");

const { runPolicyCompile, runEvidenceBuild, runTxTrack, formatTrackedTransaction } = require(
  path.join(__dirname, "..", "packages", "cli", "dist", "index.js")
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

const JUDGE = "0x0A519837D3983272A14710d5b6b2108bC27D2D96";

async function main() {
  await test("runPolicyCompile: valid manifest compiles with exitCode 0", () => {
    const result = runPolicyCompile(JSON.stringify({
      targetId: "t1", policyKey: "p1", resources: [],
      rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }],
      effects: [],
    }));
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.output.includes("manifestHash:"));
    assert.ok(result.output.includes("seal_policy"));
  });

  await test("runPolicyCompile: invalid JSON returns exitCode 1, not a thrown exception", () => {
    const result = runPolicyCompile("{not json");
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.output.includes("Invalid JSON"));
  });

  await test("runPolicyCompile: a Kernel-rejectable manifest returns exitCode 1 with the on-chain error code cited", () => {
    const result = runPolicyCompile(JSON.stringify({
      targetId: "t1", policyKey: "p1", resources: [],
      rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }],
      effects: [{ ruleId: "R", actionType: "RESTRICT", resourceId: "", releasePhase: "REMEDIATION_CONFIRMED" }],
    }));
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.output.includes("RESOURCE_REQUIRED"));
  });

  await test("runEvidenceBuild: valid EAP input builds with exitCode 0", () => {
    const result = runEvidenceBuild(JSON.stringify({
      subject: "x",
      sources: [{ url: "https://example.com/a", sourceClass: "INDEPENDENT_PUBLIC", extractedText: "t" }],
    }));
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.output.startsWith("{"));
  });

  await test("runEvidenceBuild: rejected evidence returns exitCode 1 with every violation listed", () => {
    const result = runEvidenceBuild(JSON.stringify({ subject: "x", sources: [] }));
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.output.includes("sources"));
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

  await test("bin/reclose.js end-to-end: policy compile on a real manifest file", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reclose-cli-test-"));
    const manifestPath = path.join(tmpDir, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({
      targetId: "t1", policyKey: "p1", resources: ["r1"],
      rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }],
      effects: [{ ruleId: "R", actionType: "RESTRICT", resourceId: "r1", releasePhase: "REMEDIATION_CONFIRMED" }],
    }));
    const binPath = path.join(__dirname, "..", "packages", "cli", "bin", "reclose.js");
    const output = execFileSync(process.execPath, [binPath, "policy", "compile", manifestPath], { encoding: "utf8" });
    assert.ok(output.includes("manifestHash:"));
    assert.ok(output.includes("add_policy_effect"));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await test("bin/reclose.js end-to-end: evidence build on a real EAP input file", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reclose-cli-test-"));
    const inputPath = path.join(tmpDir, "eap-input.json");
    fs.writeFileSync(inputPath, JSON.stringify({
      subject: "x",
      sources: [{ url: "https://example.com/a", sourceClass: "INDEPENDENT_PUBLIC", extractedText: "t" }],
    }));
    const binPath = path.join(__dirname, "..", "packages", "cli", "bin", "reclose.js");
    const output = execFileSync(process.execPath, [binPath, "evidence", "build", inputPath], { encoding: "utf8" });
    assert.ok(output.includes('"subject":"x"'));
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
