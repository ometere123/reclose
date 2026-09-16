#!/usr/bin/env node
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { fileURLToPath } from "node:url";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";

const CHAIN_ID = 61997, RPC = "https://studio-dev.genlayer.com/api", RUN = (process.env.RECLOSE_RUN_ID ?? "a").toLowerCase();
if (!/^[ab]$/.test(RUN)) throw new Error("RECLOSE_RUN_ID must be a or b");
const FILE = `deployment/61997/r1-run-${RUN}-manifest.json`, safe = v => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === "bigint" ? x.toString() : x));
const m = JSON.parse(await fs.readFile(FILE, "utf8")), kernel = m.contracts.AssuranceKernel.address, policyKey = m.policy.key;
const env = fsSync.readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8"), key = env.match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
if (!/^0x[0-9a-f]{64}$/i.test(key ?? "")) throw new Error("invalid signer");
const account = createAccount(key), client = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } }, account });
if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error("wrong chain before activation");
if (m.policy.activation?.lifecycle === "VERIFIED") { console.log("activation already verified"); process.exit(0); }
let pending = m.policy.activation?.lifecycle === "SUBMITTED" ? m.policy.activation : null;
const lifecycle = await client.readContract({ address: kernel, functionName: "get_policy_lifecycle", args: [policyKey] }), now = Math.floor(Date.now() / 1000);
if (Number(lifecycle[5]) > now) throw new Error(`real policy timelock not elapsed: ${lifecycle[5]} > ${now}`);
async function save() { await fs.writeFile(FILE, JSON.stringify(m, null, 2) + "\n"); }
if (!pending) {
  const estimate = await client.estimateTransactionFeesForWrite({ account, address: kernel, functionName: "activate_policy", args: [policyKey] });
  const hash = await client.writeContract({ account, address: kernel, functionName: "activate_policy", args: [policyKey], fees: { distribution: estimate.distribution, ...(estimate.messageAllocations?.length ? { messageAllocations: estimate.messageAllocations } : {}) } });
  pending = { txHash: hash, estimate: safe(estimate), lifecycle: "SUBMITTED", submittedAt: new Date().toISOString() }; m.policy.activation = pending; await save();
}
const receipt = await client.waitForTransactionReceipt({ hash: pending.txHash, waitUntil: "finalized", interval: 4000, retries: 150 }), execution = receipt.txExecutionResultName ?? receipt.executionResultName ?? receipt.execution_result;
if (!isSuccessful(receipt) || execution !== "FINISHED_WITH_RETURN") throw new Error(`activation failed: ${JSON.stringify(safe(receipt))}`);
const header = await client.readContract({ address: kernel, functionName: "get_policy_header", args: [policyKey] }), identity = await client.readContract({ address: kernel, functionName: "get_target_policy_identity", args: [m.targetId] });
if (header[3] !== true || String(identity[0]) !== policyKey || String(identity[2]).toLowerCase() !== String(m.policy.manifestHash).toLowerCase()) throw new Error(`activation readback failed: ${JSON.stringify({ header, identity })}`);
m.policy.activation = { ...pending, receipt: safe(receipt), executionResult: execution, lifecycle: "VERIFIED", readback: { header: safe(header), identity: safe(identity) } }; await save();
console.log(JSON.stringify({ run: RUN.toUpperCase(), policyKey, txHash: pending.txHash, header: safe(header), identity: safe(identity) }, null, 2));
