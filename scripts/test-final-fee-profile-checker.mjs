#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// fileURLToPath (not raw .pathname) is required for correct Windows drive-letter handling - see
// scripts/test-e1-evidence-checker.mjs for the full explanation of the corruption this avoids.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(ROOT, "scripts", "check-final-fee-profile.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "reclose-fee-check-"));
let failures = 0;

const FINAL = {
  judge: "0x0000000000000000000000000000000000000011",
  kernel: "0x0000000000000000000000000000000000000022",
  vault: "0x0000000000000000000000000000000000000033",
  target: "0x0000000000000000000000000000000000000044",
};
const GENERATION = "test-r1-generation";

const ids = [
  "kernel-deploy", "judge-deploy", "vault-deploy", "target-deploy",
  "judge-report-no-provisional", "judge-report-with-provisional", "judge-to-kernel",
  "kernel-to-target-one-effect", "kernel-to-target-two-effects", "remediation",
  "recovery-validation", "vault-payout", "reference-agent-provider-payment",
];

function validInput() {
  const addressById = {
    "judge-report-no-provisional": FINAL.judge,
    "judge-report-with-provisional": FINAL.judge,
    "judge-to-kernel": FINAL.judge,
    "kernel-to-target-one-effect": FINAL.kernel,
    "kernel-to-target-two-effects": FINAL.kernel,
    remediation: FINAL.judge,
    "recovery-validation": FINAL.judge,
    "vault-payout": FINAL.vault,
    "reference-agent-provider-payment": FINAL.target,
  };
  return ids.map((id) => {
    if (id.endsWith("-deploy")) return { id, name: id, deploymentGeneration: GENERATION, notes: "clean deployment fee estimate" };
    return { id, name: id, address: addressById[id], functionName: "example_method", args: ["real-dynamic-arg"], value: "0", deploymentGeneration: GENERATION, notes: "fresh live branch" };
  });
}

function validReport() {
  const addresses = [FINAL.judge, FINAL.kernel, FINAL.vault, FINAL.target];
  return {
    network: "studio-dev",
    chainId: 61997,
    deploymentGeneration: GENERATION,
    generatedAt: "2026-09-12T00:30:00.000Z",
    profiles: ids.map((id, index) => ({
      name: id,
      deploymentGeneration: GENERATION,
      address: addresses[index % addresses.length],
      functionName: id.endsWith("-deploy") ? "deploy" : "example_method",
      status: "ESTIMATED",
      feeValue: String(1000 + index),
      distribution: {},
      messageAllocations: [],
    })),
  };
}

function write(name, value) {
  const file = path.join(temp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

function validManifest() {
  return {
    network: "studio-dev",
    chainId: 61997,
    generation: GENERATION,
    policy: { status: "active" },
    contracts: {
      IncidentJudgeV1: { address: FINAL.judge },
      AssuranceKernel: { address: FINAL.kernel },
      IncentiveVault: { address: FINAL.vault },
      ReferenceAgentProtocol: { address: FINAL.target },
    },
  };
}

function invoke(input, report, manifest = validManifest()) {
  return spawnSync(process.execPath, [checker, input, report, write("manifest.json", manifest)], { cwd: ROOT, encoding: "utf8" });
}

function test(name, fn) {
  try { fn(); console.log(`PASS  ${name}`); }
  catch (error) { failures++; console.error(`FAIL  ${name}\n  ${error.message}`); }
}

try {
  const goodInput = validInput();
  const goodReport = validReport();
  const inputFile = write("input-good.json", goodInput);
  const reportFile = write("report-good.json", goodReport);

  test("complete final-address profile evidence passes", () => {
    const p = invoke(inputFile, reportFile);
    if (p.status !== 0) throw new Error(p.stderr || p.stdout);
  });

  test("empty live arguments fail", () => {
    const bad = validInput();
    bad.find((x) => x.id === "judge-to-kernel").args = [];
    const p = invoke(write("input-empty.json", bad), reportFile);
    if (p.status === 0 || !p.stderr.includes("live call arguments are still empty")) throw new Error("empty live args were not rejected");
  });

  test("placeholder values fail", () => {
    const bad = validInput();
    bad.find((x) => x.id === "remediation").notes = "PLACEHOLDER until later";
    const p = invoke(write("input-placeholder.json", bad), reportFile);
    if (p.status === 0 || !p.stderr.includes("placeholder text/value remains")) throw new Error("placeholder content was not rejected");
  });

  test("wrong final contract address fails", () => {
    const bad = validInput();
    bad.find((x) => x.id === "vault-payout").address = "0x0000000000000000000000000000000000000001";
    const p = invoke(write("input-wrong-address.json", bad), reportFile);
    if (p.status === 0 || !p.stderr.includes("!= final R1 address")) throw new Error("wrong address was not rejected");
  });

  test("failed estimate must carry exact error", () => {
    const badReport = validReport();
    badReport.profiles[0].status = "ESTIMATION_FAILED";
    delete badReport.profiles[0].feeValue;
    delete badReport.profiles[0].error;
    const p = invoke(inputFile, write("report-missing-error.json", badReport));
    if (p.status === 0 || !p.stderr.includes("has no exact error")) throw new Error("missing estimation error was not rejected");
  });

  test("deployment manifest must be Studio-dev 61997", () => {
    const bad = validManifest();
    bad.chainId = 61999;
    const p = invoke(inputFile, reportFile, bad);
    if (p.status === 0 || !p.stderr.includes("deployment manifest is not bound to studio-dev chain 61997")) throw new Error("wrong deployment network was not rejected");
  });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(`\n${6 - failures}/6 final fee-profile checker self-tests passed.`);
if (failures) process.exit(1);
