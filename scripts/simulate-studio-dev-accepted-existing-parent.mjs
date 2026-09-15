#!/usr/bin/env node
// Exactly one read-only fee simulation against the existing corrected Parent.
// No deployment or transaction write exists in this script.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  chains,
  MessageType,
  MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
  deriveInternalMessageCallKey,
} from "genlayer-js";
import { installStudioDevRpcThrottle } from "./studio-dev-rpc-throttle.mjs";
import {
  assertAddressArgumentEncoding,
  calldataAddressFromHex,
  captureWriteCalldataLocally,
} from "./ob014-calldata-address.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGINAL = path.join(ROOT, "release-evidence", "r1", "diagnostics", "accepted-message-repro", "simulation-results.json");
const OUTPUT_DIR = path.join(ROOT, "release-evidence", "r1", "diagnostics", "accepted-message-repro", "typed-address-existing-parent");
const RPC = "https://studio-next.genlayer.com/api";
const CHAIN_ID = 61997;
const PARENT = "0xbd7a6BcFaa8Ab8505e7C62C8Dcfff1Ae40fcA5de";
const CHILD = "0x763289C8d65316032e3717C32A84b33c8DaB5020";
const CHILD_DEPLOY_TX = "0xbdb989f368f96f877ef0275431fc9b3985e694eaaa804386188bed5ff13895aa";
const THROTTLE_URL = pathToFileURL(path.join(ROOT, "scripts", "studio-dev-rpc-throttle.mjs")).href;

if (process.argv[2] !== "--authorized-read-only-simulation") {
  throw new Error("No action taken. This harness requires separate authorization via --authorized-read-only-simulation.");
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (/private[_-]?key|secret|api[_-]?key|mnemonic/i.test(key)) return "[REDACTED]";
    return typeof item === "bigint" ? item.toString() : item;
  }));
}

function savedAllocation(saved) {
  if (!saved || Number(saved.messageType) !== Number(MessageType.Internal)
      || saved.onAcceptance !== true
      || String(saved.parentIndex) !== String(MESSAGE_ALLOCATION_ROOT_PARENT_INDEX)
      || saved.recipient?.toLowerCase() !== CHILD.toLowerCase()
      || saved.callKey !== deriveInternalMessageCallKey("noop")
      || !saved.budget || !saved.feeParams) {
    throw new Error("Saved accepted allocation is incomplete or differs from the retained Child noop allocation.");
  }
  return {
    messageType: MessageType.Internal,
    onAcceptance: true,
    parentIndex: BigInt(saved.parentIndex),
    recipient: CHILD,
    callKey: saved.callKey,
    budget: BigInt(saved.budget),
    feeParams: saved.feeParams,
  };
}

async function main() {
  if (await fs.stat(OUTPUT_DIR).catch(() => null)) {
    throw new Error(`Refusing to overwrite prior evidence: ${OUTPUT_DIR}`);
  }
  const original = JSON.parse(await fs.readFile(ORIGINAL, "utf8"));
  if (original.chainId !== CHAIN_ID
      || original.deployments?.child?.address?.toLowerCase() !== CHILD.toLowerCase()
      || original.deployments?.child?.txHash?.toLowerCase() !== CHILD_DEPLOY_TX.toLowerCase()) {
    throw new Error("Retained evidence does not match the specified Studio-dev Child.");
  }
  const saved = original.simulations?.find((item) => item.phase === "accepted")?.allocationInput;
  const allocation = savedAllocation(saved);
  const childAddress = calldataAddressFromHex(CHILD);
  const chain = { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } };

  // Mandatory offline gate: intercept fetch and decode the SDK's own calldata before RPC.
  const local = await captureWriteCalldataLocally({
    chain,
    parent: PARENT,
    functionName: "emit_decided",
    args: [childAddress],
  });
  assertAddressArgumentEncoding(local.decodedArgs, CHILD);
  const localRequest = {
    parent: PARENT,
    child: CHILD,
    phase: "decided",
    method: "emit_decided",
    transactionType: local.request.params[0].type,
    rpcMethod: local.request.method,
    calldata: local.request.params[0].data,
    decodedArgument: {
      type: "CalldataAddress",
      bytes: Array.from(childAddress.bytes),
    },
    allocation: jsonSafe(allocation),
    networkRequestsMadeForLocalEncodingCheck: 0,
  };
  process.stdout.write(`LOCAL_TYPED_ADDRESS_CHECK_PASSED\n${JSON.stringify(localRequest, null, 2)}\n`);

  // The only network operation in this script is this one read-only fee simulation.
  installStudioDevRpcThrottle({ rpcUrl: RPC });
  const account = { address: PARENT, type: "json-rpc" };
  try {
    const estimate = await local.client.estimateTransactionFeesForWrite({
      account,
      address: PARENT,
      functionName: "emit_decided",
      args: [childAddress],
      value: 0n,
      messageAllocations: [allocation],
    });
    const result = {
      evidenceType: "OB014_EXISTING_PARENT_TYPED_ADDRESS_READ_ONLY_SIMULATION",
      chainId: CHAIN_ID,
      parent: PARENT,
      child: CHILD,
      phase: "decided",
      localRequest,
      outcome: "SIMULATION_SUCCEEDED",
      feeEstimate: jsonSafe(estimate),
      transactionSubmitted: false,
    };
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(path.join(OUTPUT_DIR, "result.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const failure = {
      evidenceType: "OB014_EXISTING_PARENT_TYPED_ADDRESS_READ_ONLY_SIMULATION_FAILURE",
      chainId: CHAIN_ID,
      parent: PARENT,
      child: CHILD,
      phase: "decided",
      localRequest,
      error: {
        name: error?.name ?? null,
        message: error?.message ?? String(error),
        cause: error?.cause?.message ?? null,
        response: error?.cause?.data ?? error?.data ?? null,
      },
      transactionSubmitted: false,
    };
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(path.join(OUTPUT_DIR, "failure.json"), `${JSON.stringify(jsonSafe(failure), null, 2)}\n`, { flag: "wx" });
    throw error;
  }
}

main().catch((error) => {
  console.error(`OB014_TYPED_ADDRESS_READ_ONLY_SIMULATION_FAILED: ${error?.stack ?? String(error)}`);
  process.exitCode = 1;
});
