#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const REQUIRED_STEPS = [
  "DEPLOY_VERIFY",
  "REGISTER_TARGET",
  "ACTIVATE_POLICY",
  "FUND_REFERENCE_AGENT",
  "PURCHASE_PROVIDER_A",
  "SUBMIT_COMPROMISE_REPORT",
  "OBSERVE_GENLAYER_LIFECYCLE",
  "PROVISIONAL_CONTAINMENT",
  "FINAL_CONFIRMED",
  "VERIFY_A_RESTRICTED_SAFE_MODE",
  "AUTO_PURCHASE_PROVIDER_B",
  "SUBMIT_REMEDIATION",
  "ENTER_RECOVERY",
  "VALIDATE_RECOVERY",
  "RESTORE_PROVIDER_A_NORMAL",
  "FINAL_AUTO_PURCHASE",
  "CAPTURE_CAUSAL_TRACE"
];

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("Usage: node scripts/check-e1-evidence.mjs <run1.json> <run2.json>");
  process.exit(2);
}

function load(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function validateRun(run, label) {
  const errors = [];
  if (run.network !== "studio-dev") errors.push(`${label}: network must be studio-dev`);
  if (Number(run.chainId) !== 61997) errors.push(`${label}: chainId must be 61997`);
  if (!run.cleanDeployment) errors.push(`${label}: cleanDeployment must be true`);
  if (!run.deploymentManifest) errors.push(`${label}: deploymentManifest missing`);
  if (!Array.isArray(run.steps)) errors.push(`${label}: steps missing`);
  const seen = new Map((run.steps || []).map((s) => [s.id, s]));
  for (const id of REQUIRED_STEPS) {
    const step = seen.get(id);
    if (!step) { errors.push(`${label}: required step ${id} missing`); continue; }
    if (step.status !== "PASS") errors.push(`${label}: ${id} status is ${step.status}, expected PASS`);
    if (!Array.isArray(step.txIds) && !step.evidence) errors.push(`${label}: ${id} has no txIds/evidence reference`);
  }
  const child = seen.get("FINAL_CONFIRMED");
  if (child?.childExecutionResult !== "FINISHED_WITH_RETURN") errors.push(`${label}: Judge -> Kernel finalized child must FINISHED_WITH_RETURN`);
  const target = seen.get("VERIFY_A_RESTRICTED_SAFE_MODE");
  if (target?.providerARestricted !== true || target?.assuranceState !== "SAFE_MODE") errors.push(`${label}: provider A restriction/safe mode not proven`);
  const fallback = seen.get("AUTO_PURCHASE_PROVIDER_B");
  if (fallback?.providerUsed !== "provider_b" || fallback?.valueMoved !== true) errors.push(`${label}: fallback purchase via provider_b with real value not proven`);
  const restore = seen.get("RESTORE_PROVIDER_A_NORMAL");
  if (restore?.providerAAvailable !== true || restore?.assuranceState !== "NORMAL") errors.push(`${label}: recovery restoration to NORMAL not proven`);
  for (const step of run.steps || []) {
    if (step.status === "PASS" && step.executionResult && step.executionResult !== "FINISHED_WITH_RETURN") errors.push(`${label}: ${step.id} claims PASS with executionResult=${step.executionResult}`);
  }
  return errors;
}

const runs = args.map(load);
let errors = [...validateRun(runs[0], "run1"), ...validateRun(runs[1], "run2")];
if (runs[0].deploymentManifest === runs[1].deploymentManifest) errors.push("run1/run2 must be independent clean deployments, not the same manifest");
if (runs[0].runId === runs[1].runId) errors.push("run IDs must be distinct");

if (errors.length) {
  console.error("E1 NOT CLOSED");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log("E1 EVIDENCE GATE PASS: two independent clean 61997 canonical runs satisfy all required steps.");
console.log("This validates supplied evidence records only. The run artifacts and transaction IDs remain the audit source of truth.");
