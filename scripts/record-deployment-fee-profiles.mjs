#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractDeploymentFeeProfile } from "./deployment-fee-evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [manifestArg = "deployment/61997/r1-lifecycle-split-run-a-working-manifest.json",
  outputArg = "release-evidence/r1/c3/fee-profile-report.json"] = process.argv.slice(2);
const manifestPath = path.resolve(ROOT, manifestArg);
const outputPath = path.resolve(ROOT, outputArg);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (manifest.network !== "studio-dev" || Number(manifest.chainId) !== 61997 || manifest.policy?.status !== "active") {
  throw new Error("Refusing fee evidence: the manifest must be the active Studio-dev/61997 generation.");
}
if (!/^[0-9a-f]{40}$/i.test(String(manifest.sourceCommit ?? ""))) throw new Error("Active deployment manifest has no exact sourceCommit.");

const specs = [
  ["kernel-deploy", "AssuranceKernel deploy", "AssuranceKernel", "contracts/assurance_kernel.py", "r1-lifecycle-split-run-a-kernel-deploy.txt"],
  ["judge-deploy", "IncidentJudgeV1 deploy", "IncidentJudgeV1", "contracts/incident_judge_v1.py", "r1-lifecycle-split-run-a-judge-deploy.txt"],
  ["vault-deploy", "IncentiveVault deploy", "IncentiveVault", "contracts/incentive_vault.py", "r1-lifecycle-split-run-a-vault-deploy.txt"],
  ["target-deploy", "ReferenceAgentProtocol deploy", "ReferenceAgentProtocol", "contracts/reference_agent_protocol.py", "r1-lifecycle-split-run-a-reference-agent-deploy.txt"],
];

for (const [, , , sourceFile] of specs) {
  execFileSync("git", ["diff", "--quiet", manifest.sourceCommit, "--", sourceFile], { cwd: ROOT, stdio: "ignore" });
}

const profiles = specs.map(([id, name, contractName, sourceFile, logName]) => {
  const contract = manifest.contracts?.[contractName];
  const logPath = path.join("deployment/61997", logName);
  const logText = fs.readFileSync(path.resolve(ROOT, logPath), "utf8");
  return extractDeploymentFeeProfile({
    id,
    name,
    generation: manifest.generation,
    contract,
    sourceFile,
    evidenceRef: logPath,
    logText,
  });
});

const feeInput = JSON.parse(fs.readFileSync(path.resolve(ROOT, "release-evidence/r1/c3/fee-profile-input.json"), "utf8"));
const retainedFailures = feeInput.filter((profile) => profile.knownFailure).map((profile) => ({
  id: profile.id,
  name: profile.name,
  address: profile.address,
  functionName: profile.functionName,
  deploymentGeneration: profile.deploymentGeneration,
  notes: profile.notes,
  status: profile.knownFailure.status,
  error: profile.knownFailure.error,
  evidenceRef: profile.knownFailure.evidenceRef,
}));
if (feeInput[0]?.deploymentGeneration !== manifest.generation || retainedFailures.some((failure) => failure.deploymentGeneration !== manifest.generation)) {
  throw new Error("Fee-profile input generation does not match the active deployment manifest.");
}
const included = new Set([...profiles, ...retainedFailures].map((profile) => profile.id));
const missingProfiles = feeInput.filter((profile) => !included.has(profile.id)).map((profile) => profile.id);

const report = {
  kind: "fee-profile-partial-evidence",
  network: "studio-dev",
  chainId: 61997,
  deploymentGeneration: manifest.generation,
  sourceCommit: manifest.sourceCommit,
  generatedAt: new Date().toISOString(),
  partial: true,
  profiles: [...profiles, ...retainedFailures],
  missingProfiles,
};
const deploymentOnlyReport = {
  kind: "deployment-fee-evidence",
  network: "studio-dev",
  chainId: 61997,
  deploymentGeneration: manifest.generation,
  sourceCommit: manifest.sourceCommit,
  generatedAt: report.generatedAt,
  evidenceOnly: true,
  profiles,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
const deploymentOnlyPath = path.resolve(ROOT, "release-evidence/r1/c3/deployment-fee-profiles.json");
fs.writeFileSync(deploymentOnlyPath, `${JSON.stringify(deploymentOnlyReport, null, 2)}\n`);
console.log(`Recorded ${profiles.length} current-generation deployment fee profiles and ${retainedFailures.length} retained failure(s); ${missingProfiles.length} profiles remain unavailable. No Studio-dev RPC request was sent.`);
console.log(`Report: ${path.relative(ROOT, outputPath)}`);
