#!/usr/bin/env node
// Submit the exact source-matched incident payload produced by r1-final-run-a-incident-prepare.
// The signer is read only from .env.local and is never printed.
import fs from "node:fs";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";
const prepared = JSON.parse(fs.readFileSync("release-evidence/r1/e1/source-matched-incident-prepared.json", "utf8"));
const key = fs.readFileSync(".env.local", "utf8").match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key ?? "")) throw new Error(".env.local signer is missing or invalid");
const account = createAccount(key);
const client = createClient({ chain: { ...chains.studioDevnet, id: 61997, rpcUrls: { default: { http: ["https://studio-next.genlayer.com/api"] } } }, account });
const distribution = Object.fromEntries(Object.entries(prepared.fees.distribution).map(([k, v]) => [k, Array.isArray(v) ? v.map((x) => BigInt(x)) : BigInt(v)]));
const messageAllocations = prepared.fees.messageAllocations.map((node) => ({ ...node, messageType: 1, parentIndex: BigInt(node.parentIndex), budget: BigInt(node.budget) }));
const hash = await client.writeContract({ address: prepared.deployment.judge, functionName: "submit_incident", args: prepared.args, value: 0n, fees: { feeValue: BigInt(prepared.feeValueWei), distribution, messageAllocations } });
console.log(`submit_incident: ${hash}`);
const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 3000, retries: 100 });
console.log(JSON.stringify({ hash, status: receipt.statusName, execution: receipt.txExecutionResultName, successful: isSuccessful(receipt) }));
if (!isSuccessful(receipt)) process.exit(1);
