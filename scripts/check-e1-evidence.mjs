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

const EVIDENCE_DIR = path.resolve("release-evidence", "r1", "e1");
const cliArgs = process.argv.slice(2);

function discoverRunFiles() {
  if (!fs.existsSync(EVIDENCE_DIR)) return [];
  return fs.readdirSync(EVIDENCE_DIR)
    .filter((name) => /^run-.*\.json$/i.test(name) && name !== "run-template.json")
    .sort()
    .map((name) => path.join(EVIDENCE_DIR, name));
}

let files;
if (cliArgs.length === 0) files = discoverRunFiles();
else if (cliArgs.length >= 2) files = cliArgs.map((file) => path.resolve(file));
else {
  console.error("Usage: node scripts/check-e1-evidence.mjs [run1.json run2.json ...]");
  console.error("With no arguments the checker auto-discovers release-evidence/r1/e1/run-*.json, excluding run-template.json.");
  process.exit(2);
}

if (files.length < 2) {
  console.error("E1 NOT CLOSED");
  console.error(`- found ${files.length} real run artifact(s); at least two independent clean runs are required`);
  console.error("- run-template.json is never treated as evidence");
  process.exit(1);
}

function load(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error(`${file}: ${error.message}`); }
}

function hasEvidence(step) {
  return (Array.isArray(step.txIds) && step.txIds.length > 0) || (typeof step.evidence === "string" && step.evidence.trim().length > 0);
}

function validateRun(run, label) {
  const errors = [];
  if (!run.runId || /^REPLACE_/i.test(String(run.runId))) errors.push(`${label}: real unique runId missing`);
  if (run.network !== "studio-dev") errors.push(`${label}: network must be studio-dev`);
  if (Number(run.chainId) !== 61997) errors.push(`${label}: chainId must be 61997`);
  if (run.cleanDeployment !== true) errors.push(`${label}: cleanDeployment must be true`);
  if (!run.deploymentManifest || /REPLACE/i.test(String(run.deploymentManifest))) errors.push(`${label}: real deploymentManifest missing`);
  if (!run.sourceCommit || !/^[0-9a-f]{40}$/i.test(String(run.sourceCommit))) errors.push(`${label}: exact 40-hex sourceCommit missing`);
  if (!run.startedAt || !run.completedAt) errors.push(`${label}: startedAt/completedAt evidence missing`);
  if (!Array.isArray(run.steps)) errors.push(`${label}: steps missing`);

  const seen = new Map((run.steps || []).map((s) => [s.id, s]));
  if (seen.size !== (run.steps || []).length) errors.push(`${label}: duplicate step IDs present`);

  for (const id of REQUIRED_STEPS) {
    const step = seen.get(id);
    if (!step) { errors.push(`${label}: required step ${id} missing`); continue; }
    if (step.status !== "PASS") errors.push(`${label}: ${id} status is ${step.status}, expected PASS`);
    if (!hasEvidence(step)) errors.push(`${label}: ${id} has no non-empty txIds/evidence reference`);
  }

  const purchaseA = seen.get("PURCHASE_PROVIDER_A");
  if (purchaseA?.providerUsed !== "provider_a" || purchaseA?.valueMoved !== true) {
    errors.push(`${label}: initial provider_a purchase with real value not proven`);
  }

  const child = seen.get("FINAL_CONFIRMED");
  if (child?.childExecutionResult !== "FINISHED_WITH_RETURN") {
    errors.push(`${label}: Judge -> Kernel finalized child must FINISHED_WITH_RETURN`);
  }

  const target = seen.get("VERIFY_A_RESTRICTED_SAFE_MODE");
  if (target?.providerARestricted !== true || target?.assuranceState !== "SAFE_MODE") {
    errors.push(`${label}: provider A restriction/safe mode not proven`);
  }

  const fallback = seen.get("AUTO_PURCHASE_PROVIDER_B");
  if (fallback?.providerUsed !== "provider_b" || fallback?.valueMoved !== true) {
    errors.push(`${label}: fallback purchase via provider_b with real value not proven`);
  }

  const recovery = seen.get("ENTER_RECOVERY");
  if (recovery?.assuranceState !== "RECOVERY") errors.push(`${label}: RECOVERY state not proven`);

  const restore = seen.get("RESTORE_PROVIDER_A_NORMAL");
  if (restore?.providerAAvailable !== true || restore?.assuranceState !== "NORMAL") {
    errors.push(`${label}: recovery restoration to NORMAL not proven`);
  }

  const finalPurchase = seen.get("FINAL_AUTO_PURCHASE");
  if (finalPurchase?.valueMoved !== true || !["provider_a", "provider_b"].includes(finalPurchase?.providerUsed)) {
    errors.push(`${label}: final AUTO purchase with real value not proven`);
  }

  for (const step of run.steps || []) {
    if (step.status === "PASS" && step.executionResult && step.executionResult !== "FINISHED_WITH_RETURN") {
      errors.push(`${label}: ${step.id} claims PASS with executionResult=${step.executionResult}`);
    }
  }
  return errors;
}

let runs;
try { runs = files.map(load); }
catch (error) {
  console.error("E1 NOT CLOSED");
  console.error(`- ${error.message}`);
  process.exit(1);
}

let errors = [];
runs.forEach((run, index) => { errors.push(...validateRun(run, `run${index + 1}`)); });

const runIds = new Set();
const manifests = new Set();
for (let i = 0; i < runs.length; i++) {
  const run = runs[i];
  if (runIds.has(run.runId)) errors.push(`run${i + 1}: duplicate runId ${run.runId}`);
  runIds.add(run.runId);
  if (manifests.has(run.deploymentManifest)) errors.push(`run${i + 1}: deploymentManifest reused; runs must be independent clean deployments`);
  manifests.add(run.deploymentManifest);
}

if (errors.length) {
  console.error("E1 NOT CLOSED");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`E1 EVIDENCE GATE PASS: ${runs.length} independent clean 61997 canonical runs satisfy all required steps.`);
console.log("This validates supplied evidence records only. The run artifacts and transaction IDs remain the audit source of truth.");
