#!/usr/bin/env node
// Deploy a disposable Parent->Child noop reproduction on Studio-dev, then read-only simulate
// accepted and finalized internal messages with exact estimator-produced mode-2 allocations.
// RPC calls are strictly sequential and every Node process loads the shared 2.6s throttle.

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createClient,
  chains,
  MessageType,
  MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
  deriveInternalMessageCallKey,
  encodeInternalMessageFeeParams,
} from "genlayer-js";
import { installStudioDevRpcThrottle } from "./studio-dev-rpc-throttle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(ROOT, "release-evidence", "r1", "diagnostics", "accepted-message-repro");
const CHILD_SOURCE = path.join(ROOT, "release-evidence", "r1", "diagnostics", "accepted-message-child.py");
const PARENT_SOURCE = path.join(ROOT, "release-evidence", "r1", "diagnostics", "accepted-message-parent.py");
const RPC = "https://studio-next.genlayer.com/api";
const CHAIN_ID = 61997;
const CLI_JS = path.join(process.env.APPDATA ?? "", "npm", "node_modules", "genlayer", "dist", "index.js");
const THROTTLE_URL = pathToFileURL(path.join(ROOT, "scripts", "studio-dev-rpc-throttle.mjs")).href;

await fs.mkdir(EVIDENCE_DIR, { recursive: true });
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
    maxBuffer: 128 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
  });
  const output = scrubText(`${result.stdout ?? ""}${result.stderr ?? ""}`);
  await fs.writeFile(path.join(EVIDENCE_DIR, `${label}.txt`), output, "utf8");
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} exited ${result.status}; full output saved in diagnostics evidence.`);
  return output;
}

function parseJsonOutput(output, label) {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("{"));
  if (!lines.length) throw new Error(`${label} returned no JSON object.`);
  return JSON.parse(lines.at(-1));
}

function parseDeployOutput(output, label) {
  const address = output.match(/'Contract Address':\s*'(0x[0-9a-fA-F]{40})'/)?.[1]
    ?? output.match(/Contract Address:\s*(0x[0-9a-fA-F]{40})/)?.[1];
  const txHash = output.match(/'Transaction Hash':\s*'(0x[0-9a-fA-F]{64})'/)?.[1]
    ?? output.match(/Transaction Hash[^\r\n]*?(0x[0-9a-fA-F]{64})/)?.[1];
  if (!address || !txHash || !/Contract deployed successfully/i.test(output)) {
    throw new Error(`${label} output did not prove successful deployment with address and transaction hash.`);
  }
  return { address, txHash };
}

async function deploy(source, label, feeEstimate, args = []) {
  const fees = JSON.stringify({ distribution: feeEstimate.distribution });
  const output = await runCli([
    "deploy", "--contract", source, "--rpc", RPC,
    "--fees", fees, "--fee-value", String(feeEstimate.feeValue),
    ...(args.length ? ["--args", ...args] : []),
  ], label);
  return parseDeployOutput(output, label);
}

async function main() {
  if (!(await fs.stat(CLI_JS).catch(() => null))) throw new Error(`GenLayer CLI not found at ${CLI_JS}`);
  if (process.argv[2] === "receipt") {
    const txHash = process.argv[3];
    if (!/^0x[0-9a-f]{64}$/i.test(txHash ?? "")) throw new Error("Usage: script receipt <64-byte transaction hash>");
    const output = await runCli(["receipt", txHash, "--stdout", "--stderr"], "failed-child-deploy-receipt");
    process.stdout.write(output);
    return;
  }
  const chain = { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } };
  const client = createClient({ chain });
  const reportedChainId = Number(await client.getChainId());
  if (reportedChainId !== CHAIN_ID) throw new Error(`Expected chain ${CHAIN_ID}; RPC reported ${reportedChainId}.`);

  // The deployer account must already be unlocked. No password or key material is read here.
  const networkInfo = await runCli(["network", "info"], "network-info");
  if (!networkInfo.includes("61997")) throw new Error("GenLayer CLI is not configured for Studio-dev chain 61997.");

  const feeText = await runCli(["estimate-fees", "--rpc", RPC, "--json"], "deployment-fee-estimate");
  const deploymentFees = parseJsonOutput(feeText, "deployment fee estimation");
  if (!deploymentFees.distribution || deploymentFees.feeValue === undefined) throw new Error("Deployment fee estimator returned no usable fee preset.");
  await fs.writeFile(path.join(EVIDENCE_DIR, "deployment-fee-estimate.json"), `${JSON.stringify(jsonSafe(deploymentFees), null, 2)}\n`);

  const reuseChild = process.argv[2] === "--reuse-child";
  const childDeployment = reuseChild
    ? { address: process.argv[3], txHash: process.argv[4] }
    : await deploy(CHILD_SOURCE, "child-deploy", deploymentFees);
  if (!/^0x[0-9a-f]{40}$/i.test(childDeployment.address ?? "") || !/^0x[0-9a-f]{64}$/i.test(childDeployment.txHash ?? "")) {
    throw new Error("Reused child requires its verified deployment address and transaction hash.");
  }
  const childPing = await client.readContract({ address: childDeployment.address, functionName: "ping", args: [] });
  if (childPing !== true) throw new Error(`Child deployment readback failed: ping returned ${String(childPing)}.`);

  const parentDeployment = await deploy(PARENT_SOURCE, "parent-deploy", deploymentFees, [childDeployment.address]);
  const parentChildReadback = await client.readContract({ address: parentDeployment.address, functionName: "get_child", args: [] });
  if (String(parentChildReadback).toLowerCase() !== childDeployment.address.toLowerCase()) {
    throw new Error(`Parent child-address readback mismatch: ${String(parentChildReadback)}.`);
  }

  const targetAccount = { address: parentDeployment.address, type: "json-rpc" };
  const childAccount = { address: parentDeployment.address, type: "json-rpc" };
  const childEstimate = await client.estimateTransactionFeesForWrite({
    account: childAccount,
    address: childDeployment.address,
    functionName: "noop",
    args: [],
    value: 0n,
  });
  if (!childEstimate.distribution || childEstimate.feeValue === undefined) throw new Error("Child noop fee estimate is incomplete.");
  const encodedFeeParams = encodeInternalMessageFeeParams(childEstimate.distribution);
  const outputs = [];
  for (const [phase, method, onAcceptance] of [
    ["accepted", "emit_accepted", true],
    ["finalized", "emit_finalized", false],
  ]) {
    const allocation = {
      messageType: MessageType.Internal,
      onAcceptance,
      parentIndex: BigInt(MESSAGE_ALLOCATION_ROOT_PARENT_INDEX),
      recipient: childDeployment.address,
      callKey: deriveInternalMessageCallKey("noop"),
      budget: BigInt(childEstimate.feeValue),
      feeParams: encodedFeeParams,
    };
    const call = {
      account: targetAccount,
      address: parentDeployment.address,
      functionName: method,
      args: [],
      value: 0n,
      messageAllocations: [allocation],
    };
    try {
      const estimate = await client.estimateTransactionFeesForWrite(call);
      outputs.push({
        phase,
        method,
        success: true,
        allocationInput: jsonSafe(allocation),
        feeValue: String(estimate.feeValue),
        distribution: jsonSafe(estimate.distribution),
        messageAllocations: jsonSafe(estimate.messageAllocations ?? []),
      });
    } catch (error) {
      outputs.push({
        phase,
        method,
        success: false,
        allocationInput: jsonSafe(allocation),
        error: {
          name: error?.name ?? null,
          message: error?.message ?? String(error),
          cause: error?.cause?.message ?? null,
          response: error?.cause?.data ?? error?.data ?? null,
        },
      });
    }
  }
  const evidence = {
    evidenceType: "DISPOSABLE_STUDIO_DEV_PARENT_CHILD_NOOP_FEE_SIMULATION",
    createdAt: new Date().toISOString(),
    chainId: CHAIN_ID,
    rpc: RPC,
    deployer: "reclose-deployer",
    deployments: { child: childDeployment, parent: parentDeployment },
    readbacks: { childPing, parentChild: parentChildReadback },
    childNoopFeeEstimate: {
      feeValue: String(childEstimate.feeValue),
      distribution: jsonSafe(childEstimate.distribution),
      encodedFeeParams,
      callKey: deriveInternalMessageCallKey("noop"),
    },
    simulations: outputs,
    incidentWriteSubmitted: false,
  };
  await fs.writeFile(path.join(EVIDENCE_DIR, "simulation-results.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  if (outputs.some((item) => !item.success)) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`ACCEPTED_MESSAGE_REPRO_FAILED: ${error?.stack ?? String(error)}`);
  process.exitCode = 1;
});
