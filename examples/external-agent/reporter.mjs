#!/usr/bin/env node
// Minimal external Reporter flow. The external agent owns the signer and supplies
// its own deployment config/evidence URL; no Reclose private key is embedded.
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";
import { buildEap } from "../../packages/protocol-sdk/dist/evidence.js";
import { keccak256Hex } from "../../packages/protocol-sdk/dist/canonical.js";

const rpc = "https://studio-dev.genlayer.com/api", chainId = 61997;
const configPath = process.env.RECLOSE_DEPLOYMENT_CONFIG;
const evidenceUrl = process.env.RECLOSE_EVIDENCE_URL;
const expectedHash = process.env.RECLOSE_EVIDENCE_HASH?.toLowerCase();
if (!configPath || !evidenceUrl || !expectedHash) throw new Error("Set RECLOSE_DEPLOYMENT_CONFIG, RECLOSE_EVIDENCE_URL, and RECLOSE_EVIDENCE_HASH");
const config = JSON.parse(await fs.readFile(configPath, "utf8"));
const key = fsSync.readFileSync(process.env.RECLOSE_SIGNER_ENV_FILE ?? ".env.local", "utf8").match(/^RECLOSE_REPORTER_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
if (!/^0x[0-9a-f]{64}$/i.test(key ?? "")) throw new Error("RECLOSE_REPORTER_PRIVATE_KEY is missing from the signer env file");
const account = createAccount(key);
const client = createClient({ chain: { ...chains.studioDevnet, id: chainId, rpcUrls: { default: { http: [rpc] } } }, account });
if (Number(await client.getChainId()) !== chainId) throw new Error("wrong chain: expected Studio-dev 61997");
const bytes = new Uint8Array(await (await fetch(evidenceUrl)).arrayBuffer());
const contentHash = keccak256Hex(bytes);
if (contentHash.toLowerCase() !== expectedHash) throw new Error(`immutable evidence hash mismatch: ${contentHash}`);
const targetId = config.targetId, policyKey = config.activePolicy?.key ?? config.policy?.key;
const judge = config.contracts.Judge ?? config.contracts.IncidentJudgeV1, ruleId = process.env.RECLOSE_RULE_ID ?? "PROVIDER_COMPROMISE_V1", resourceId = process.env.RECLOSE_RESOURCE_ID ?? "provider_a";
const nonce = Number(await client.readContract({ address: judge, functionName: "get_reporter_nonce", args: [account.address] }));
const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes), observedAt = new Date().toISOString();
const eap = JSON.parse(buildEap({ targetId, policyHash: config.activePolicy?.hash ?? config.policy?.manifestHash, ruleId, subject: process.env.RECLOSE_SUBJECT ?? "External agent incident report", reporter: account.address, observedAt, retrievedAt: observedAt, sources: [{ sourceId: process.env.RECLOSE_SOURCE_ID ?? "reclose-live-evidence", url: evidenceUrl, snapshotRef: evidenceUrl, sourceClass: "CONTENT_ADDRESSED_SNAPSHOT", extractedText: text, retrievedAt: observedAt }] }));
const args = [targetId, policyKey, ruleId, resourceId, eap.artifactHash, JSON.stringify(eap), nonce, ""];
const estimate = await client.estimateTransactionFeesForWrite({ account, address: judge, functionName: "submit_incident", args, value: 0n });
const pendingPath = process.env.RECLOSE_PENDING_FILE ?? "external-agent-pending.json";
const pending = { schema: "reclose-external-reporter-pending-v1", network: { name: "studio-dev", chainId, rpc }, judge, targetId, policyKey, reporter: account.address, nonce, evidence: { url: evidenceUrl, bytes: bytes.length, contentHash }, eapArtifactHash: eap.artifactHash, args, feeEstimate: JSON.parse(JSON.stringify(estimate, (_, v) => typeof v === "bigint" ? v.toString() : v)), lifecycle: "PREPARED" };
await fs.writeFile(pendingPath, JSON.stringify(pending, null, 2) + "\n");
const hash = await client.writeContract({ account, address: judge, functionName: "submit_incident", args, value: 0n, fees: { distribution: estimate.distribution, ...(estimate.messageAllocations?.length ? { messageAllocations: estimate.messageAllocations } : {}) } });
pending.txHash = hash; pending.lifecycle = "SUBMITTED"; await fs.writeFile(pendingPath, JSON.stringify(pending, null, 2) + "\n");
const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 4000, retries: 150 });
pending.receipt = JSON.parse(JSON.stringify(receipt, (_, v) => typeof v === "bigint" ? v.toString() : v)); pending.lifecycle = isSuccessful(receipt) && receipt.txExecutionResultName === "FINISHED_WITH_RETURN" ? "VERIFIED" : "FAILED";
pending.children = await client.getTriggeredTransactionIds({ hash }); await fs.writeFile(pendingPath, JSON.stringify(pending, null, 2) + "\n");
console.log(JSON.stringify({ txHash: hash, lifecycle: pending.lifecycle, children: pending.children, pendingPath }, null, 2));
