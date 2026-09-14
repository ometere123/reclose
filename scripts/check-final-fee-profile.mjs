#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_INPUT = "release-evidence/r1/c3/fee-profile-input.json";
const DEFAULT_REPORT = "release-evidence/r1/c3/fee-profile-report.json";
const DEFAULT_MANIFEST = "deployment/61997/r1-lifecycle-split-run-a-working-manifest.json";
const failures = [];

const requiredIds = [
  "kernel-deploy", "judge-deploy", "vault-deploy", "target-deploy",
  "judge-report-no-provisional", "judge-report-with-provisional", "judge-to-kernel",
  "kernel-to-target-one-effect", "kernel-to-target-two-effects", "remediation",
  "recovery-validation", "vault-payout", "reference-agent-provider-payment",
];

const args = process.argv.slice(2);
let inputPath = DEFAULT_INPUT;
let reportPath = DEFAULT_REPORT;
let manifestPath = DEFAULT_MANIFEST;
if (args.length === 2 || args.length === 3) {
  inputPath = path.resolve(args[0]);
  reportPath = path.resolve(args[1]);
  if (args[2]) manifestPath = path.resolve(args[2]);
} else if (args.length !== 0) {
  console.error("Usage: node scripts/check-final-fee-profile.mjs [input.json report.json [deployment-manifest.json]]");
  process.exit(2);
}

let input;
let report;
let manifest;
try {
  input = JSON.parse(readFileSync(inputPath, "utf8"));
  report = JSON.parse(readFileSync(reportPath, "utf8"));
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  console.error("FINAL FEE PROFILE NOT READY:");
  console.error(`- could not read/parse input, report, or deployment manifest: ${error.message}`);
  process.exit(1);
}

const contractAddress = (name) => String(manifest?.contracts?.[name]?.address ?? "").toLowerCase();
const FINAL = {
  judge: contractAddress("IncidentJudgeV1"),
  kernel: contractAddress("AssuranceKernel"),
  vault: contractAddress("IncentiveVault"),
  target: contractAddress("ReferenceAgentProtocol"),
};
if (manifest?.network !== "studio-dev" || Number(manifest?.chainId) !== 61997) failures.push("deployment manifest is not bound to studio-dev chain 61997");
if (!manifest?.policy || manifest.policy.status !== "active") failures.push("deployment manifest has no active policy");
if (!manifest?.generation) failures.push("deployment manifest generation is missing");
for (const [name, address] of Object.entries(FINAL)) {
  if (!/^0x[0-9a-f]{40}$/.test(address)) failures.push(`deployment manifest has no valid ${name} address`);
}

if (!Array.isArray(input)) failures.push("fee-profile input must be an array");
const byId = new Map((Array.isArray(input) ? input : []).map((x) => [x.id, x]));

for (const id of requiredIds) if (!byId.has(id)) failures.push(`missing input profile ${id}`);

const addressExpectations = {
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
for (const [id, expected] of Object.entries(addressExpectations)) {
  const actual = String(byId.get(id)?.address ?? "").toLowerCase();
  if (actual !== expected) failures.push(`${id}: input address ${actual || "<missing>"} != final R1 address ${expected}`);
}
for (const [id, item] of byId) {
  if (item.deploymentGeneration !== manifest.generation) failures.push(`${id}: input generation ${item.deploymentGeneration || "<missing>"} != active deployment generation ${manifest.generation}`);
}

for (const [id, item] of byId) {
  if (item.knownFailure) {
    if (item.knownFailure.status !== "ESTIMATION_FAILED" || !String(item.knownFailure.error ?? "").trim() || !String(item.knownFailure.evidenceRef ?? "").trim()) {
      failures.push(`${id}: known failure must preserve ESTIMATION_FAILED, exact error and evidenceRef`);
    }
  } else if (item.functionName && (!Array.isArray(item.args) || item.args.length === 0)) {
    failures.push(`${id}: live call arguments are still empty`);
  }
  if (/PLACEHOLDER|REPLACE_WITH/i.test(JSON.stringify(item))) failures.push(`${id}: placeholder text/value remains`);
}

if (Number(report.chainId) !== 61997 || report.network !== "studio-dev") failures.push("report is not bound to studio-dev chain 61997");
if (report.deploymentGeneration !== manifest.generation) failures.push(`fee report generation ${report.deploymentGeneration || "<missing>"} != active deployment generation ${manifest.generation}`);
if (!report.generatedAt || Number.isNaN(Date.parse(report.generatedAt))) failures.push("report generatedAt is missing or invalid");
if (!Array.isArray(report.profiles) || report.profiles.length < requiredIds.length) failures.push(`report has ${report.profiles?.length ?? 0} profiles; expected at least ${requiredIds.length}`);

const profiles = Array.isArray(report.profiles) ? report.profiles : [];
const reportAddresses = profiles.map((p) => String(p.address || "").toLowerCase()).filter(Boolean);
for (const expected of Object.values(FINAL)) {
  if (!reportAddresses.includes(expected)) failures.push(`final address absent from fee report: ${expected}`);
}

for (const p of profiles) {
  if (p.deploymentGeneration !== manifest.generation) failures.push(`report profile ${p.name || "<unnamed>"}: deployment generation ${p.deploymentGeneration || "<missing>"} != active deployment generation ${manifest.generation}`);
  if (!p.name) failures.push("report profile has no name");
  if (!p.status) failures.push(`report profile ${p.name || "<unnamed>"} has no explicit status`);
  if (p.status === "ESTIMATED" && !String(p.feeValue ?? "").match(/^\d+$/)) failures.push(`estimated profile ${p.name} has no decimal feeValue`);
  if (p.status === "ESTIMATION_FAILED" && !String(p.error ?? "").trim()) failures.push(`failed profile ${p.name} has no exact error`);
  if (p.status === "ESTIMATION_FAILED" && !String(p.evidenceRef ?? "").trim()) failures.push(`failed profile ${p.name} has no evidenceRef`);
  if (p.status && !["ESTIMATED", "ESTIMATION_FAILED"].includes(p.status)) failures.push(`report profile ${p.name || "<unnamed>"} has unsupported status ${p.status}`);
}

if (failures.length) {
  console.error("FINAL FEE PROFILE NOT READY:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nThis is an evidence gate, not a unit-test failure. Populate fresh live arguments/output rather than weakening the gate.");
  process.exit(1);
}

console.log("PASS final fee-profile input/report are bound to the final R1 addresses and contain no placeholder call branches.");
