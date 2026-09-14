import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(ROOT, "release-evidence/r1/c3/fee-profile-input.json");
const allInputs = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const profiles = allInputs.filter((profile) => profile.kind === "deployment" || profile.knownFailure);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "reclose-deploy-fee-evidence-"));
try {
  const subsetPath = path.join(temp, "input.json");
  const reportPath = path.join(temp, "report.json");
  fs.writeFileSync(subsetPath, JSON.stringify(profiles, null, 2));
  const run = spawnSync(process.execPath, [path.join(ROOT, "scripts/fee-profile.mjs"), subsetPath, "--out", reportPath], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /no RPC re-estimation/);
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.network, "studio-dev");
  assert.equal(report.chainId, 61997);
  assert.equal(report.deploymentGeneration, allInputs[0].deploymentGeneration);
  assert.equal(report.profiles.length, 5);
  assert.equal(report.profiles.filter((profile) => profile.status === "ESTIMATED").length, 4);
  const retained = report.profiles.find((profile) => profile.id === "judge-to-kernel");
  assert.equal(retained.status, "ESTIMATION_FAILED");
  assert.equal(retained.error, "SystemError: 2: inval");
  assert.match(retained.evidenceRef, /accepted-message-repro/);
  const activeAddresses = new Set([
    "0x43c6061FEde8372a3e4c3AB513D32abcfA956e89".toLowerCase(),
    "0x5A271CB03b4833aA485ff13035844ba500c4E536".toLowerCase(),
    "0x10451Cd05cDeD4CE0f40983f4f87FFE42968E701".toLowerCase(),
    "0xdf68B59C5f5Fb8929Ab6360B0024f34aec7a0353".toLowerCase(),
  ]);
  for (const profile of report.profiles.filter((entry) => entry.status === "ESTIMATED")) {
    assert(activeAddresses.has(profile.address.toLowerCase()), `stale deployment address in ${profile.id}`);
    assert.equal(profile.liveResult.transactionHash, profile.deploymentTxHash);
    assert.ok(profile.distribution && profile.feeValue);
  }
  console.log("Deployment fee evidence integration: 5/5 profiles verified offline; no Studio-dev RPC path used");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
