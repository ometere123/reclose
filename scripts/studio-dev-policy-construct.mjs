#!/usr/bin/env node
// Sequential Studio-dev policy construction. Each write is preceded by its exact live
// fee simulation and followed by finalized transaction status plus authoritative item readback.
// The shared RPC preload serializes requests within this process and every CLI child process.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createClient, chains } from "genlayer-js";

const ROOT = process.cwd();
const MANIFEST_PATH = "deployment/61997/r1-fresh-run-a-manifest.json";
const COMPILED_PATH = "deployment/61997/apm-r1-fresh-run-a-compiled.json";
const LOG_PREFIX = "deployment/61997/r1-fresh-run-a-policy";
const RPC = "https://studio-next.genlayer.com/api";
const CHAIN_ID = 61997;
const CLI_JS = path.join(process.env.APPDATA ?? "", "npm", "node_modules", "genlayer", "dist", "index.js");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safe = (value) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));

function writeManifest(manifest) {
  if (!manifest.deployer || !/^0x[0-9a-f]{40}$/i.test(manifest.deployer)) {
    throw new Error("Refusing to persist fresh policy manifest without verified deployer identity.");
  }
  const temp = `${MANIFEST_PATH}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.renameSync(temp, MANIFEST_PATH);
}

function cli(args, logPath) {
  const output = execFileSync(process.execPath, [CLI_JS, ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  fs.writeFileSync(logPath, output);
  return output;
}

function jsonLine(output, label) {
  const line = output.split(/\r?\n/).filter((value) => value.trimStart().startsWith("{")).at(-1);
  if (!line) throw new Error(`${label} produced no JSON fee estimate; full output is retained.`);
  return JSON.parse(line);
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  if (typeof value === "string" && /^0x[0-9a-f]+$/i.test(value)) return value.toLowerCase();
  return String(value);
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(normalize(actual)) !== JSON.stringify(normalize(expected))) {
    throw new Error(`${label} mismatch; expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function waitForFinalized(client, txHash) {
  let last = null;
  for (const delay of [5000, 10000, 20000, 30000]) {
    await pause(delay);
    last = await client.getTransaction({ hash: txHash });
    const status = last.statusName ?? last.status;
    if (status === "FINALIZED") {
      const execution = last.txExecutionResultName ?? last.executionResultName ?? last.execution_result;
      if (execution !== "FINISHED_WITH_RETURN") {
        throw new Error(`Transaction ${txHash} finalized but execution result is ${String(execution)}; required FINISHED_WITH_RETURN.`);
      }
      return last;
    }
    if (status === "CANCELED") throw new Error(`Transaction ${txHash} was canceled; no retry submitted.`);
  }
  throw new Error(`Transaction ${txHash} did not reach FINALIZED after bounded backoff; last status ${last?.statusName ?? last?.status}.`);
}

async function itemReadback(client, kernel, call, counts, effectIndex) {
  const policyKey = call.functionName === "begin_policy" ? call.args[1] : call.args[0];
  const args = call.functionName === "begin_policy" ? call.args.slice(2) : call.args.slice(1);
  switch (call.functionName) {
    case "begin_policy": {
      const lifecycle = await client.readContract({ address: kernel, functionName: "get_policy_lifecycle", args: [policyKey] });
      assertEqual(lifecycle.slice(0, 3), [call.args[0], 1, call.args[2]], "begin_policy lifecycle identity");
      assertEqual(lifecycle.slice(7, 10), [false, false, false], "begin_policy lifecycle flags");
      return { lifecycle: safe(lifecycle), counts: safe(counts) };
    }
    case "add_policy_resource": {
      const index = Number(counts[1]) - 1;
      const resource = await client.readContract({ address: kernel, functionName: "get_policy_resource_at", args: [policyKey, index] });
      assertEqual(resource, args[0], "policy resource readback");
      const registered = await client.readContract({ address: kernel, functionName: "is_policy_resource", args: [policyKey, args[0]] });
      assertEqual(registered, true, "policy resource membership");
      return { index, resource, registered, counts: safe(counts) };
    }
    case "add_policy_rule": {
      const ruleId = args[0];
      const [judge, judgeVersion, ruleKind, provisionalAllowed, enabled] = await client.readContract({ address: kernel, functionName: "get_policy_rule", args: [policyKey, ruleId] });
      const economics = await client.readContract({ address: kernel, functionName: "get_policy_rule_economics", args: [policyKey, ruleId] });
      assertEqual([judge, judgeVersion, ruleKind, provisionalAllowed, enabled], [args[1], args[2], args[3], args[4], true], `${ruleId} rule readback`);
      assertEqual(economics, [args[5], args[6]], `${ruleId} economics readback`);
      return { ruleId, judge, judgeVersion, ruleKind, provisionalAllowed, enabled, economics: safe(economics), counts: safe(counts) };
    }
    case "add_policy_effect": {
      const [ruleId, actionType, resourceId, paramU256, paramString, releasePhase] = args;
      const index = effectIndex;
      const effect = await client.readContract({ address: kernel, functionName: "get_policy_effect_at", args: [policyKey, index] });
      assertEqual(effect, [ruleId, actionType, resourceId, paramU256, paramString, releasePhase, true], `policy effect ${index} readback`);
      return { index, effect: safe(effect), counts: safe(counts) };
    }
    case "seal_policy": {
      const lifecycle = await client.readContract({ address: kernel, functionName: "get_policy_lifecycle", args: [policyKey] });
      const header = await client.readContract({ address: kernel, functionName: "get_policy_header", args: [policyKey] });
      assertEqual(lifecycle.slice(0, 3), ["reclose-target-r1-run-a", 1, "0x2d5f1f26612b7e5a031387a18b518270415fec65fdf062c0b8569eda1186737b"], "sealed lifecycle identity");
      assertEqual(lifecycle.slice(7, 10), [true, false, false], "sealed lifecycle flags");
      assertEqual(header.slice(0, 4), [1, "0x2d5f1f26612b7e5a031387a18b518270415fec65fdf062c0b8569eda1186737b", true, false], "sealed header");
      assertEqual(counts, [3, 2, 4], "sealed policy counts");
      return { lifecycle: safe(lifecycle), header: safe(header), counts: safe(counts) };
    }
    default:
      throw new Error(`Unexpected compiled policy method ${call.functionName}`);
  }
}

async function main() {
  if (!fs.existsSync(CLI_JS)) throw new Error(`Pinned CLI not found at ${CLI_JS}`);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const compiled = JSON.parse(fs.readFileSync(COMPILED_PATH, "utf8"));
  const kernel = manifest.contracts.AssuranceKernel.address;
  const deployer = manifest.deployer;
  if (!/^0x[0-9a-f]{40}$/i.test(deployer)) throw new Error("Fresh manifest deployer is missing or invalid; refusing policy estimation.");
  const targetOwner = await (async () => {
    const verifyClient = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } } });
    return verifyClient.readContract({ address: manifest.contracts.ReferenceAgentProtocol.address, functionName: "get_assurance_owner", args: [] });
  })();
  assertEqual(targetOwner, deployer, "fresh target owner/deployer identity");
  if (!kernel || manifest.contracts.IncidentJudgeV1.readbacks.sourceRegistryHash !== manifest.sourceRegistry.canonicalHash) {
    throw new Error("Fresh stack manifest is incomplete or source registry readback mismatches; refusing policy writes.");
  }
  if (Number((await (async () => {
    const verifyClient = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } } });
    return verifyClient.getChainId();
  })())) !== CHAIN_ID) throw new Error("RPC is not Studio-dev chain 61997; refusing writes.");

  const client = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } } });
  const policy = manifest.policy;
  if (compiled.manifestHash !== policy.manifestHash || compiled.calls.length !== 11) throw new Error("Compiled canonical policy hash/call count differs from the working manifest.");
  policy.status = "constructing";
  policy.steps ??= [];
  writeManifest(manifest);
  let effectIndex = policy.steps.filter((step) => step.functionName === "add_policy_effect").length;

  const finishPending = async (pending) => {
    const tx = await waitForFinalized(client, pending.txHash);
    const counts = await client.readContract({ address: kernel, functionName: "get_policy_counts", args: [policy.policyKey] });
    const readback = await itemReadback(client, kernel, pending.call, counts, effectIndex);
    if (pending.call.functionName === "add_policy_effect") effectIndex++;
    const record = {
      index: pending.index + 1,
      functionName: pending.call.functionName,
      args: pending.call.args,
      description: pending.call.description,
      estimate: pending.estimate,
      txHash: pending.txHash,
      transactionStatus: tx.statusName ?? tx.status,
      transactionOutcome: tx.lifecycle?.outcome ?? tx.resultName ?? tx.result ?? null,
      executionResult: tx.txExecutionResultName ?? tx.executionResultName ?? tx.execution_result,
      cliExecutionAssertion: "FINISHED_WITH_RETURN from authoritative transaction read",
      readback,
      logFiles: pending.logFiles,
      completedAt: new Date().toISOString(),
    };
    policy.steps.push(record);
    policy.pendingWrite = null;
    policy.status = record.functionName === "seal_policy" ? "sealed" : "constructing";
    manifest.events.push({ operation: record.functionName, txHash: record.txHash, status: record.transactionStatus, executionResult: record.executionResult, readback, timestamp: record.completedAt });
    writeManifest(manifest);
    console.log(JSON.stringify({ step: record.index, method: record.functionName, txHash: record.txHash, status: record.transactionStatus, readback }));
  };

  if (policy.pendingWrite) {
    const pending = policy.pendingWrite;
    if (pending.index !== policy.steps.length || compiled.calls[pending.index]?.functionName !== pending.call?.functionName) {
      throw new Error("Manifest pending write does not match the next compiled policy call; refusing to sign anything.");
    }
    await finishPending(pending);
  }

  for (let index = policy.steps.length; index < compiled.calls.length; index++) {
    const call = compiled.calls[index];
    const base = `${LOG_PREFIX}-${String(index + 1).padStart(2, "0")}-${call.functionName}`;
    const argText = call.args.map((value) => typeof value === "string" ? value : JSON.stringify(value));

    await pause(3000);
    const bigintIndexes = call.functionName === "add_policy_rule" ? [6, 7] : call.functionName === "add_policy_effect" ? [4] : [];
    const estimateOutput = execFileSync(process.execPath, [path.join(ROOT, "scripts", "estimate-studio-dev-write.mjs"), kernel, call.functionName, "--account", deployer, "--args", JSON.stringify(call.args), ...bigintIndexes.flatMap((index) => ["--bigint-arg-index", String(index)])], { cwd: ROOT, env: process.env, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    fs.writeFileSync(`${base}-estimate.txt`, estimateOutput);
    const estimate = JSON.parse(estimateOutput);
    if (!estimate.distribution || !estimate.feeValue) throw new Error(`${call.functionName} estimator returned no usable fee preset.`);

    const feeOptions = { distribution: estimate.distribution };
    if (Array.isArray(estimate.messageAllocations) && estimate.messageAllocations.length) feeOptions.messageAllocations = estimate.messageAllocations;
    await pause(3000);
    const writeOutput = cli([
      "write", kernel, call.functionName, "--rpc", RPC,
      "--fees", JSON.stringify(feeOptions), "--fee-value", String(estimate.feeValue),
      "--args", ...argText,
    ], `${base}-write.txt`);
    const txHash = writeOutput.match(/tx_id:\s*'?(0x[a-fA-F0-9]{64})'?/)?.[1]
      ?? writeOutput.match(/Transaction ID[^\r\n]*?(0x[a-fA-F0-9]{64})/)?.[1]
      ?? writeOutput.match(/Transaction Hash[^\r\n]*?(0x[a-fA-F0-9]{64})/)?.[1];
    if (!txHash) throw new Error(`${call.functionName} execution succeeded but no transaction ID was captured; stop without retry.`);
    policy.pendingWrite = {
      index,
      call,
      estimate: { feeValue: String(estimate.feeValue), distribution: safe(estimate.distribution), messageAllocations: safe(estimate.messageAllocations ?? []) },
      txHash,
      cliExecutionAssertion: /txExecutionResultName:\s*['"]FINISHED_WITH_RETURN/.test(writeOutput)
        ? "FINISHED_WITH_RETURN in CLI receipt"
        : "execution assertion deferred to authoritative transaction read",
      logFiles: { estimate: `${base}-estimate.txt`, write: `${base}-write.txt` },
      submittedAt: new Date().toISOString(),
    };
    writeManifest(manifest);
    await pause(3000);
    await finishPending(policy.pendingWrite);
  }
}

main().catch((error) => {
  console.error(`POLICY CONSTRUCTION STOPPED: ${error?.stack ?? String(error)}`);
  process.exitCode = 1;
});
