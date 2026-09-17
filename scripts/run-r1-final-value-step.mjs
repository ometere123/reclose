import fs from "node:fs/promises";
import fsSync from "node:fs";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";

const [mode = "fund"] = process.argv.slice(2);
const FILE = process.env.RECLOSE_MANIFEST ?? "deployment/61997/r1-final-generation-manifest.json";
const RPC = "https://studio-dev.genlayer.com/api";
const CHAIN_ID = 61997;
const safe = value => JSON.parse(JSON.stringify(value, (_k, v) => typeof v === "bigint" ? v.toString() : v));
const manifest = JSON.parse(await fs.readFile(FILE, "utf8"));
const env = fsSync.readFileSync(".env.local", "utf8");
const key = env.match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("missing STUDIO_NEXT_PRIVATE_KEY");
const account = createAccount(key);
const client = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } }, account });
if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error("wrong chain");
const target = manifest.contracts.ReferenceAgentProtocol.address;
const amount = 50_000_000_000_000_000n;
const requestRef = process.env.RECLOSE_REQUEST_REF ?? (mode === "purchase-a" ? "e1a-final-initial-provider-a-001" : mode === "purchase-b" ? "e1a-final-fallback-provider-b-001" : "e1a-final-recovery-provider-a-001");
const call = mode === "fund"
  ? { functionName: "fund_treasury", args: [], value: 150_000_000_000_000_000n, requestRef: null }
  : { functionName: "purchase_service", args: [requestRef, amount], value: 0n, requestRef: mode };
const estimate = await client.estimateTransactionFeesForWrite({ account, address: target, functionName: call.functionName, args: call.args, value: call.value });
const fees = { distribution: estimate.distribution, ...(estimate.messageAllocations?.length ? { messageAllocations: estimate.messageAllocations } : {}) };
const artifactPath = process.env.RECLOSE_VALUE_ARTIFACT ?? `release-evidence/r1/e1/fresh-fixed-cycle/value-${mode}.json`;
const pending = { schema: "reclose-r1-value-step-v1", mode, network: { rpc: RPC, chainId: CHAIN_ID }, target, functionName: call.functionName, args: safe(call.args), value: call.value.toString(), estimate: safe(estimate), fees: safe(fees), lifecycle: "SUBMITTING", submittedAt: new Date().toISOString() };
await fs.mkdir("release-evidence/r1/e1/fresh-fixed-cycle", { recursive: true });
const txHash = await client.writeContract({ account, address: target, functionName: call.functionName, args: call.args, value: call.value, fees });
pending.txHash = txHash; pending.lifecycle = "SUBMITTED"; await fs.writeFile(artifactPath, JSON.stringify(pending, null, 2) + "\n");
const receipt = await client.waitForTransactionReceipt({ hash: txHash, waitUntil: "finalized", interval: 4000, retries: 150 });
const execution = receipt.txExecutionResultName ?? receipt.executionResultName ?? receipt.execution_result;
pending.receipt = safe(receipt); pending.executionResult = execution; pending.lifecycle = isSuccessful(receipt) && execution === "FINISHED_WITH_RETURN" ? "VERIFIED" : "FAILED";
const provider = mode === "purchase-b" ? manifest.contracts.ProviderStubB.address : manifest.contracts.ProviderStubA.address;
pending.readback = { treasuryBalance: safe(await client.readContract({ address: target, functionName: "get_treasury_balance", args: [] })), effectiveProvider: safe(await client.readContract({ address: target, functionName: "get_effective_provider", args: [] })), selectedProvider: provider, providerTotalReceived: safe(await client.readContract({ address: provider, functionName: "get_total_received", args: [] })), providerFulfilled: mode === "fund" ? null : safe(await client.readContract({ address: provider, functionName: "is_fulfilled", args: [requestRef] })), targetState: safe(await client.readContract({ address: target, functionName: "get_state", args: [] })) };
await fs.writeFile(artifactPath, JSON.stringify(pending, null, 2) + "\n");
if (pending.lifecycle !== "VERIFIED") throw new Error(`value step failed: ${JSON.stringify(pending)}`);
console.log(JSON.stringify({ mode, txHash, execution, readback: pending.readback }, null, 2));
