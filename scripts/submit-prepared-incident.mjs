#!/usr/bin/env node
// Submit the exact source-matched incident payload produced by r1-final-run-a-incident-prepare.
// The signer is read only from .env.local and is never printed.
import fs from "node:fs";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";
const preparedPath = process.env.RECLOSE_PREPARED ?? "release-evidence/r1/e1/source-matched-incident-prepared.json";
const prepared = JSON.parse(fs.readFileSync(preparedPath, "utf8"));
const key = fs.readFileSync(".env.local", "utf8").match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key ?? "")) throw new Error(".env.local signer is missing or invalid");
const account = createAccount(key);
const RPC = "https://studio-dev.genlayer.com/api";
const client = createClient({ chain: { ...chains.studioDevnet, id: 61997, rpcUrls: { default: { http: [RPC] } } }, account });
if (Number(await client.getChainId()) !== 61997) throw new Error("wrong chain");
const liveNonce = Number(await client.readContract({ address: prepared.deployment.judge, functionName: "get_reporter_nonce", args: [account.address] }));
if (liveNonce !== Number(prepared.reporterNonce)) throw new Error(`prepared nonce ${prepared.reporterNonce} is stale; live nonce is ${liveNonce}`);
const distribution = Object.fromEntries(Object.entries(prepared.fees.distribution).map(([k, v]) => [k, Array.isArray(v) ? v.map((x) => BigInt(x)) : BigInt(v)]));
const messageAllocations = prepared.fees.messageAllocations.map((node) => ({ ...node, messageType: 1, parentIndex: BigInt(node.parentIndex), budget: BigInt(node.budget) }));
const artifact = process.env.RECLOSE_ROOT_ARTIFACT ?? "release-evidence/r1/e1/fresh-fixed-cycle/compromise-root.json";
const pending = { schema: "reclose-r1-root-transaction-v1", stage: "COMPROMISE", network: { rpc: RPC, chainId: 61997 }, incidentId: prepared.predictedIncidentId, reporterNonce: liveNonce, args: prepared.args, feeValueWei: prepared.feeValueWei, fees: prepared.fees, lifecycle: "SUBMITTING" };
const hash = await client.writeContract({ address: prepared.deployment.judge, functionName: "submit_incident", args: prepared.args, value: 0n, fees: { feeValue: BigInt(prepared.feeValueWei), distribution, messageAllocations } });
pending.txHash = hash; pending.lifecycle = "SUBMITTED"; fs.writeFileSync(artifact, JSON.stringify(pending, null, 2) + "\n");
console.log(`submit_incident: ${hash}`);
const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 3000, retries: 100 });
pending.receipt = JSON.parse(JSON.stringify(receipt, (_k, v) => typeof v === "bigint" ? v.toString() : v)); pending.lifecycle = isSuccessful(receipt) && receipt.txExecutionResultName === "FINISHED_WITH_RETURN" ? "VERIFIED" : "FAILED"; fs.writeFileSync(artifact, JSON.stringify(pending, null, 2) + "\n");
console.log(JSON.stringify({ hash, status: receipt.statusName, execution: receipt.txExecutionResultName, successful: isSuccessful(receipt) }));
if (!isSuccessful(receipt)) process.exit(1);
