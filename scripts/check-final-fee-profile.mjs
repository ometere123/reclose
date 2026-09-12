#!/usr/bin/env node
import { readFileSync } from "node:fs";

const INPUT = "release-evidence/r1/c3/fee-profile-input.json";
const REPORT = "release-evidence/r1/c3/fee-profile-report.json";
const FINAL = {
  judge: "0x7D9a32BDA22B7C4c1C487Cc2983A816A6f75FFc0".toLowerCase(),
  kernel: "0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621".toLowerCase(),
  vault: "0xB3476a8881e8866a6d92c8252a840a08004d02c3".toLowerCase(),
  target: "0x7B423D9787aeACC303467dE82A2D193D77155f0f".toLowerCase(),
};

const requiredIds = [
  "kernel-deploy", "judge-deploy", "vault-deploy", "target-deploy",
  "judge-report-no-provisional", "judge-report-with-provisional", "judge-to-kernel",
  "kernel-to-target-one-effect", "kernel-to-target-two-effects", "remediation",
  "recovery-validation", "vault-payout", "reference-agent-provider-payment",
];

const input = JSON.parse(readFileSync(INPUT, "utf8"));
const report = JSON.parse(readFileSync(REPORT, "utf8"));
const failures = [];
const byId = new Map(input.map((x) => [x.id, x]));

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
  if (item.functionName && (!Array.isArray(item.args) || item.args.length === 0)) failures.push(`${id}: live call arguments are still empty`);
  if (/PLACEHOLDER/i.test(JSON.stringify(item))) failures.push(`${id}: placeholder text/value remains`);
}

if (report.chainId !== 61997 || report.network !== "studio-dev") failures.push("report is not bound to studio-dev chain 61997");
if (!Array.isArray(report.profiles) || report.profiles.length < requiredIds.length) failures.push(`report has ${report.profiles?.length ?? 0} profiles; expected at least ${requiredIds.length}`);

const reportAddresses = (report.profiles || []).map((p) => String(p.address || "").toLowerCase()).filter(Boolean);
for (const expected of Object.values(FINAL)) {
  if (!reportAddresses.includes(expected)) failures.push(`final address absent from fee report: ${expected}`);
}

for (const p of report.profiles || []) {
  if (!p.status) failures.push(`report profile ${p.name || "<unnamed>"} has no explicit status`);
  if (p.status === "ESTIMATED" && !String(p.feeValue ?? "").match(/^\d+$/)) failures.push(`estimated profile ${p.name} has no decimal feeValue`);
  if (p.status === "ESTIMATION_FAILED" && !p.error) failures.push(`failed profile ${p.name} has no exact error`);
}

if (failures.length) {
  console.error("FINAL FEE PROFILE NOT READY:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nThis is an evidence gate, not a unit-test failure. Populate fresh live arguments/output rather than weakening the gate.");
  process.exit(1);
}

console.log("PASS final fee-profile input/report are bound to the final R1 addresses and contain no placeholder call branches.");
