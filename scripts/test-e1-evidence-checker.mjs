#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// fileURLToPath (not raw .pathname) is required for correct Windows drive-letter handling -
// path.resolve("/C:/...", "..") corrupts into "C:\C:\..." because path.resolve treats a leading
// POSIX-style slash as relative to the current drive root and re-prepends it.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(ROOT, "scripts", "check-e1-evidence.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "reclose-e1-check-"));
let failures = 0;

const ids = [
  "DEPLOY_VERIFY", "REGISTER_TARGET", "ACTIVATE_POLICY", "FUND_REFERENCE_AGENT",
  "PURCHASE_PROVIDER_A", "SUBMIT_COMPROMISE_REPORT", "OBSERVE_GENLAYER_LIFECYCLE",
  "PROVISIONAL_CONTAINMENT", "FINAL_CONFIRMED", "VERIFY_A_RESTRICTED_SAFE_MODE",
  "AUTO_PURCHASE_PROVIDER_B", "SUBMIT_REMEDIATION", "ENTER_RECOVERY", "VALIDATE_RECOVERY",
  "RESTORE_PROVIDER_A_NORMAL", "FINAL_AUTO_PURCHASE", "CAPTURE_CAUSAL_TRACE"
];

function validRun(n) {
  const steps = ids.map((id) => ({ id, status: "PASS", txIds: [`0x${String(n).repeat(64).slice(0, 64)}`], evidence: `evidence/run-${n}/${id}.json` }));
  Object.assign(steps.find((s) => s.id === "PURCHASE_PROVIDER_A"), { providerUsed: "provider_a", valueMoved: true });
  Object.assign(steps.find((s) => s.id === "FINAL_CONFIRMED"), { childExecutionResult: "FINISHED_WITH_RETURN" });
  Object.assign(steps.find((s) => s.id === "VERIFY_A_RESTRICTED_SAFE_MODE"), { providerARestricted: true, assuranceState: "SAFE_MODE" });
  Object.assign(steps.find((s) => s.id === "AUTO_PURCHASE_PROVIDER_B"), { providerUsed: "provider_b", valueMoved: true });
  Object.assign(steps.find((s) => s.id === "ENTER_RECOVERY"), { assuranceState: "RECOVERY" });
  Object.assign(steps.find((s) => s.id === "RESTORE_PROVIDER_A_NORMAL"), { providerAAvailable: true, assuranceState: "NORMAL" });
  Object.assign(steps.find((s) => s.id === "FINAL_AUTO_PURCHASE"), { providerUsed: "provider_a", valueMoved: true });
  return {
    runId: `clean-run-${n}`,
    network: "studio-dev",
    chainId: 61997,
    cleanDeployment: true,
    deploymentManifest: `release-evidence/r1/e1/run-${n}/deployment-manifest.json`,
    sourceCommit: "a".repeat(40),
    startedAt: "2026-09-12T00:00:00.000Z",
    completedAt: "2026-09-12T00:30:00.000Z",
    steps,
  };
}

function write(name, value) {
  const file = path.join(temp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

function invoke(...files) {
  return spawnSync(process.execPath, [checker, ...files], { cwd: ROOT, encoding: "utf8" });
}

function test(name, fn) {
  try { fn(); console.log(`PASS  ${name}`); }
  catch (error) { failures++; console.error(`FAIL  ${name}\n  ${error.message}`); }
}

try {
  const run1 = validRun(1);
  const run2 = validRun(2);
  const f1 = write("run-1.json", run1);
  const f2 = write("run-2.json", run2);

  test("two independent complete runs pass", () => {
    const p = invoke(f1, f2);
    if (p.status !== 0) throw new Error(p.stderr || p.stdout);
  });

  test("failed child execution cannot pass E1", () => {
    const bad = validRun(3);
    bad.steps.find((s) => s.id === "FINAL_CONFIRMED").childExecutionResult = "FINISHED_WITH_ERROR";
    const p = invoke(f1, write("bad-child.json", bad));
    if (p.status === 0 || !p.stderr.includes("Judge -> Kernel finalized child")) throw new Error("failed child was not rejected");
  });

  test("empty txIds plus empty evidence cannot satisfy a PASS step", () => {
    const bad = validRun(4);
    const step = bad.steps.find((s) => s.id === "SUBMIT_REMEDIATION");
    step.txIds = [];
    step.evidence = null;
    const p = invoke(f1, write("bad-empty-evidence.json", bad));
    if (p.status === 0 || !p.stderr.includes("no non-empty txIds/evidence reference")) throw new Error("empty evidence was not rejected");
  });

  test("reusing a deployment manifest fails independence", () => {
    const bad = validRun(5);
    bad.deploymentManifest = run1.deploymentManifest;
    const p = invoke(f1, write("bad-same-manifest.json", bad));
    if (p.status === 0 || !p.stderr.includes("deploymentManifest reused")) throw new Error("manifest reuse was not rejected");
  });

  test("missing real source commit fails", () => {
    const bad = validRun(6);
    bad.sourceCommit = "REPLACE_WITH_EXACT_SHA";
    const p = invoke(f1, write("bad-source-commit.json", bad));
    if (p.status === 0 || !p.stderr.includes("sourceCommit")) throw new Error("placeholder source commit was not rejected");
  });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(`\n${5 - failures}/5 E1 evidence-checker self-tests passed.`);
if (failures) process.exit(1);
