#!/usr/bin/env node
// Two deliberately separate stages:
//   --preflight: read-only Studio-dev checks and deployment fee estimate; always stops.
//   --deploy: requires the saved preflight, its reviewed deployer address, and a separate
//             explicit approval before deploying the disposable Parent and simulating once.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createClient,
  chains,
  MessageType,
  MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
  deriveInternalMessageCallKey,
} from "genlayer-js";
import { installStudioDevRpcThrottle } from "./studio-dev-rpc-throttle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "tests", "fixtures", "emit_internal_message_probe.py");
const ORIGINAL = path.join(ROOT, "release-evidence", "r1", "diagnostics", "accepted-message-repro", "simulation-results.json");
const OUTPUT_DIR = path.join(ROOT, "release-evidence", "r1", "diagnostics", "accepted-message-repro", "corrected-run-once");
const RPC = "https://studio-next.genlayer.com/api";
const CHAIN_ID = 61997;
const DEPLOYER_ALIAS = "reclose-deployer";
const AUTHORIZED_MAX_FEE_VALUE_WEI = 100000000000010352n;
const CHILD = "0x763289C8d65316032e3717C32A84b33c8DaB5020";
const CHILD_DEPLOY_TX = "0xbdb989f368f96f877ef0275431fc9b3985e694eaaa804386188bed5ff13895aa";
const CLI_JS = path.join(process.env.APPDATA ?? "", "npm", "node_modules", "genlayer", "dist", "index.js");
const THROTTLE_URL = pathToFileURL(path.join(ROOT, "scripts", "studio-dev-rpc-throttle.mjs")).href;

const [mode, ...modeArgs] = process.argv.slice(2);
if (mode !== "--preflight" && mode !== "--deploy") {
  throw new Error("No action taken. Choose --preflight (read-only; separately authorized) or --deploy (requires separate deployment approval).");
}

if (!(await fs.stat(OUTPUT_DIR).catch(() => null))) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}
installStudioDevRpcThrottle({ rpcUrl: RPC });

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (/private[_-]?key|secret|api[_-]?key|mnemonic/i.test(key)) return "[REDACTED]";
    return typeof item === "bigint" ? item.toString() : item;
  }));
}

function scrubText(text) {
  return text.replace(/(['"]?private[_-]?key['"]?\s*:\s*)(['"])[^'"\r\n]*\2/gi, '$1"[REDACTED]"')
    .replace(/(['"]?(?:secret|api[_-]?key|mnemonic)['"]?\s*:\s*)(['"])[^'"\r\n]*\2/gi, '$1"[REDACTED]"');
}

async function runCli(args, label) {
  const env = {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${THROTTLE_URL}`].filter(Boolean).join(" "),
    RECLOSE_STUDIO_RPC_THROTTLE: "1",
  };
  const result = spawnSync(process.execPath, [CLI_JS, ...args], {
    cwd: ROOT,
    env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
  });
  const output = scrubText(`${result.stdout ?? ""}${result.stderr ?? ""}`);
  await fs.writeFile(path.join(OUTPUT_DIR, `${label}.txt`), output, "utf8");
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} exited ${result.status}; output saved in ${OUTPUT_DIR}.`);
  return output;
}

function parseJsonOutput(output, label) {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("{"));
  if (!lines.length) throw new Error(`${label} returned no JSON object.`);
  return JSON.parse(lines.at(-1));
}

function parseDeployOutput(output) {
  const address = output.match(/'Contract Address':\s*'(0x[0-9a-fA-F]{40})'/)?.[1]
    ?? output.match(/Contract Address:\s*(0x[0-9a-fA-F]{40})/)?.[1];
  const txHash = output.match(/'Transaction Hash':\s*'(0x[0-9a-fA-F]{64})'/)?.[1]
    ?? output.match(/Transaction Hash[^\r\n]*?(0x[0-9a-fA-F]{64})/)?.[1];
  if (!address || !txHash || !/Contract deployed successfully/i.test(output)
      || !/FINISHED_WITH_RETURN/.test(output)) {
    throw new Error("Parent deployment output did not prove FINISHED_WITH_RETURN with address and tx hash.");
  }
  return { address, txHash };
}

function extractActiveDeployer(output) {
  const clean = output.replace(/\u001b\[[0-9;]*m/g, "");
  const escapedAlias = DEPLOYER_ALIAS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = clean.match(new RegExp(`^\\s*\\*\\s*${escapedAlias}\\s+(0x[0-9a-fA-F]{40})\\b.*\\(active\\).*?$`, "m"));
  if (!match) throw new Error(`CLI account list does not show ${DEPLOYER_ALIAS} as the active deployer; no deployment is allowed.`);
  return match[1];
}

function formatGen(wei) {
  const value = BigInt(wei);
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

async function loadAndValidateLocalInputs() {
  const original = JSON.parse(await fs.readFile(ORIGINAL, "utf8"));
  if (original.chainId !== CHAIN_ID || original.deployments?.child?.address?.toLowerCase() !== CHILD.toLowerCase()
      || original.deployments?.child?.txHash?.toLowerCase() !== CHILD_DEPLOY_TX.toLowerCase()) {
    throw new Error("Retained reproduction does not match the pinned no-op Child; stopping.");
  }
  const priorAccepted = original.simulations?.find((item) => item.phase === "accepted");
  const saved = priorAccepted?.allocationInput;
  if (!saved || Number(saved.messageType) !== Number(MessageType.Internal)
      || saved.onAcceptance !== true
      || String(saved.parentIndex) !== String(MESSAGE_ALLOCATION_ROOT_PARENT_INDEX)
      || saved.recipient.toLowerCase() !== CHILD.toLowerCase()
      || saved.callKey !== deriveInternalMessageCallKey("noop") || !saved.budget || !saved.feeParams) {
    throw new Error("The retained accepted allocation is incomplete or does not match the Child noop call.");
  }
  return { original, saved };
}

function preflightReportPath() {
  const index = modeArgs.indexOf("--report");
  return index >= 0 && modeArgs[index + 1] ? path.resolve(modeArgs[index + 1]) : null;
}

async function runPreflight({ saved }) {
  if (await fs.stat(path.join(OUTPUT_DIR, "preflight.json")).catch(() => null)) {
    throw new Error(`Refusing to overwrite existing preflight evidence in ${OUTPUT_DIR}.`);
  }
  if (!(await fs.stat(CLI_JS).catch(() => null))) throw new Error(`GenLayer CLI not found at ${CLI_JS}`);

  const chain = { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } };
  const client = createClient({ chain });
  const reportedChainId = Number(await client.getChainId());
  if (reportedChainId !== CHAIN_ID) throw new Error(`Expected chain ${CHAIN_ID}; RPC reported ${reportedChainId}.`);
  const networkInfo = await runCli(["network", "info"], "preflight-network-info");
  if (!networkInfo.includes(String(CHAIN_ID))) throw new Error("GenLayer CLI is not configured for Studio-dev chain 61997.");

  // Confirm the account used by the CLI's default signing path before estimating anything.
  const accounts = await runCli(["account", "list"], "preflight-accounts");
  const deployerAddress = extractActiveDeployer(accounts);
  const childPing = await client.readContract({ address: CHILD, functionName: "ping", args: [] });
  if (childPing !== true) throw new Error(`Retained no-op Child is not valid (ping=${String(childPing)}); no deployment submitted.`);

  const deploymentFeeOutput = await runCli(["estimate-fees", "--rpc", RPC, "--json"], "parent-deployment-fee-estimate");
  const deploymentFees = parseJsonOutput(deploymentFeeOutput, "Parent deployment fee estimation");
  if (!deploymentFees.distribution || deploymentFees.feeValue === undefined) {
    throw new Error("Deployment estimator returned no usable fee preset; no deployment submitted.");
  }
  const report = {
    evidenceType: "OB014_CORRECTED_DISPOSABLE_PARENT_READ_ONLY_PREFLIGHT",
    chainId: CHAIN_ID,
    rpc: RPC,
    deployerAlias: DEPLOYER_ALIAS,
    deployerAddress,
    child: { address: CHILD, deploymentTx: CHILD_DEPLOY_TX, ping: childPing },
    correctedParentSource: path.relative(ROOT, SOURCE).replaceAll("\\", "/"),
    correctedParentSourceSha256: crypto.createHash("sha256").update(await fs.readFile(SOURCE)).digest("hex"),
    deploymentFeeEstimate: jsonSafe(deploymentFees),
    estimatedFeeValueWei: String(deploymentFees.feeValue),
    estimatedFeeValueGEN: formatGen(deploymentFees.feeValue),
    allocationToUseAfterSeparateApproval: jsonSafe({
      messageType: MessageType.Internal,
      onAcceptance: true,
      parentIndex: BigInt(MESSAGE_ALLOCATION_ROOT_PARENT_INDEX),
      recipient: CHILD,
      callKey: deriveInternalMessageCallKey("noop"),
      budget: BigInt(saved.budget),
      feeParams: saved.feeParams,
    }),
    deploymentSubmitted: false,
    simulationRun: false,
  };
  const reportFile = path.join(OUTPUT_DIR, "preflight.json");
  await fs.writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ ...report, reportFile }, null, 2)}\n`);
  process.stdout.write("READ-ONLY PREFLIGHT COMPLETE: stopped before deployment; no simulation or write was submitted.\n");
}

async function main() {
  const { saved } = await loadAndValidateLocalInputs();
  if (mode === "--preflight") return runPreflight({ saved });

  const reportPath = preflightReportPath();
  const approvedDeployerArg = modeArgs.find((arg) => /^0x[0-9a-fA-F]{40}$/.test(arg));
  if (!modeArgs.includes("--owner-approved-deploy") || !reportPath || !approvedDeployerArg) {
    throw new Error("Deployment stopped before RPC. Require --owner-approved-deploy, --report <preflight.json>, and the separately reviewed deployer address.");
  }
  const preflight = JSON.parse(await fs.readFile(reportPath, "utf8"));
  const sourceSha256 = crypto.createHash("sha256").update(await fs.readFile(SOURCE)).digest("hex");
  if (preflight.evidenceType !== "OB014_CORRECTED_DISPOSABLE_PARENT_READ_ONLY_PREFLIGHT"
      || preflight.chainId !== CHAIN_ID
      || String(preflight.deployerAddress).toLowerCase() !== approvedDeployerArg.toLowerCase()
      || preflight.child?.address?.toLowerCase() !== CHILD.toLowerCase()
      || preflight.child?.ping !== true
      || preflight.correctedParentSourceSha256 !== sourceSha256
      || !preflight.deploymentFeeEstimate?.distribution
      || preflight.deploymentFeeEstimate?.feeValue === undefined) {
    throw new Error("Preflight report is stale, incomplete, or does not match the reviewed deployer/source; deployment stopped.");
  }
  if (BigInt(preflight.deploymentFeeEstimate.feeValue) > AUTHORIZED_MAX_FEE_VALUE_WEI) {
    throw new Error(`Required fee ${preflight.deploymentFeeEstimate.feeValue} wei exceeds the separately approved cap ${AUTHORIZED_MAX_FEE_VALUE_WEI} wei; deployment stopped.`);
  }
  if (await fs.stat(path.join(OUTPUT_DIR, "corrected-parent-deploy.txt")).catch(() => null)) {
    throw new Error(`Refusing to deploy twice or overwrite deployment evidence in ${OUTPUT_DIR}.`);
  }
  if (!(await fs.stat(CLI_JS).catch(() => null))) throw new Error(`GenLayer CLI not found at ${CLI_JS}`);

  const chain = { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } };
  const client = createClient({ chain });
  const reportedChainId = Number(await client.getChainId());
  if (reportedChainId !== CHAIN_ID) throw new Error(`Expected chain ${CHAIN_ID}; RPC reported ${reportedChainId}.`);
  const networkInfo = await runCli(["network", "info"], "network-info");
  if (!networkInfo.includes(String(CHAIN_ID))) throw new Error("GenLayer CLI is not configured for Studio-dev chain 61997.");
  const activeDeployer = extractActiveDeployer(await runCli(["account", "list"], "deployment-account-check"));
  if (activeDeployer.toLowerCase() !== approvedDeployerArg.toLowerCase()) {
    throw new Error(`Active CLI deployer changed after preflight (${activeDeployer}); deployment stopped.`);
  }

  // Revalidate the reused Child after separate deployment approval and immediately before deploy.
  const childPing = await client.readContract({ address: CHILD, functionName: "ping", args: [] });
  if (childPing !== true) throw new Error(`Retained no-op Child is not valid (ping=${String(childPing)}); no deployment submitted.`);

  const deploymentFees = preflight.deploymentFeeEstimate;

  const deployOutput = await runCli([
    "deploy", "--contract", SOURCE, "--rpc", RPC,
    "--fees", JSON.stringify({ distribution: deploymentFees.distribution }),
    "--fee-value", String(deploymentFees.feeValue),
  ], "corrected-parent-deploy");
  const parent = parseDeployOutput(deployOutput);

  const allocation = {
    messageType: MessageType.Internal,
    onAcceptance: true,
    parentIndex: BigInt(MESSAGE_ALLOCATION_ROOT_PARENT_INDEX),
    recipient: CHILD,
    callKey: deriveInternalMessageCallKey("noop"),
    budget: BigInt(saved.budget),
    feeParams: saved.feeParams,
  };
  const account = { address: parent.address, type: "json-rpc" };
  // Exactly one read-only simulation, using the exact saved allocation and corrected runner spelling.
  let estimate;
  try {
    estimate = await client.estimateTransactionFeesForWrite({
      account,
      address: parent.address,
      functionName: "emit_decided",
      args: [CHILD],
      value: 0n,
      messageAllocations: [allocation],
    });
  } catch (error) {
    const failure = {
      evidenceType: "OB014_CORRECTED_DISPOSABLE_PARENT_SINGLE_ACCEPTED_SIMULATION_FAILURE",
      chainId: CHAIN_ID,
      rpc: RPC,
      child: { address: CHILD, deploymentTx: CHILD_DEPLOY_TX, ping: childPing },
      correctedParent: parent,
      simulationRequest: {
        method: "emit_decided",
        args: [CHILD],
        value: "0",
        allocation: jsonSafe(allocation),
      },
      error: {
        name: error?.name ?? null,
        message: error?.message ?? String(error),
        cause: error?.cause?.message ?? null,
        response: error?.cause?.data ?? error?.data ?? null,
      },
      incidentWriteSubmitted: false,
    };
    await fs.writeFile(path.join(OUTPUT_DIR, "simulation-failure.json"), `${JSON.stringify(jsonSafe(failure), null, 2)}\n`);
    throw error;
  }
  if (!estimate.distribution || estimate.feeValue === undefined) {
    throw new Error("Corrected accepted-path simulation returned no usable fee result.");
  }
  const returned = estimate.messageAllocations ?? [];
  const matched = returned.find((item) => item.onAcceptance === true
    && String(item.recipient).toLowerCase() === CHILD.toLowerCase()
    && String(item.callKey).toLowerCase() === allocation.callKey.toLowerCase()
    && BigInt(item.budget) === BigInt(saved.budget)
    && String(item.feeParams).toLowerCase() === String(saved.feeParams).toLowerCase());
  if (!matched) throw new Error("Simulation succeeded without authoritative readback of the accepted Child allocation.");

  const result = {
    evidenceType: "OB014_CORRECTED_DISPOSABLE_PARENT_SINGLE_ACCEPTED_SIMULATION",
    chainId: CHAIN_ID,
    rpc: RPC,
    child: { address: CHILD, deploymentTx: CHILD_DEPLOY_TX, ping: childPing },
    correctedParent: parent,
    parentDeploymentFinishedWithReturn: true,
    simulation: {
      method: "emit_decided",
      outcome: "SIMULATION_SUCCEEDED",
      pinnedRunnerPayloadTest: {
        testRef: "tests/runner/test_emit_internal_message_wire.py",
        on: "decided",
        address: CHILD,
        calldata: { "": "noop" },
        value: "0",
        use_balance: false,
      },
      allocationInput: jsonSafe(allocation),
      authoritativeReturnedAllocation: jsonSafe(matched),
      feeEstimate: jsonSafe(estimate),
    },
    incidentWriteSubmitted: false,
  };
  await fs.writeFile(path.join(OUTPUT_DIR, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`OB014_CORRECTED_SIMULATION_FAILED: ${error?.stack ?? String(error)}`);
  process.exitCode = 1;
});
