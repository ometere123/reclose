#!/usr/bin/env node
// Read-only forensic capture for the historical remediation attempt. Deliberately records
// receipt/fee/message fields and debug output, but excludes consensus validator payloads and keys.
import fs from "node:fs/promises";
import { createClient, chains } from "genlayer-js";

const RPC = "https://studio-next.genlayer.com/api";
const ROOT = "0x5884d33f08ce765b94705d4723f44a033ade2cadce7e77167179f7f6e5edfc3d";
const client = createClient({ chain: { ...chains.studioDevnet, id: 61997, rpcUrls: { default: { http: [RPC] } } } });

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));
}
function safeTransaction(tx, triggered) {
  return jsonSafe({
    hash: tx.hash, txId: tx.tx_id, from: tx.from_address, to: tx.to_address,
    status: tx.status, statusName: tx.statusName, result: tx.result, resultName: tx.result_name,
    txExecutionResult: tx.txExecutionResult, txExecutionResultName: tx.txExecutionResultName,
    triggeredBy: tx.triggered_by, triggeredOn: tx.triggered_on, triggeredTransactions: triggered,
    fees: tx.fees, messages: tx.messages ?? [],
    lifecycle: tx.lifecycle, blockNumber: tx.blockNumber, createdAt: tx.created_at,
  });
}

const root = await client.getTransaction({ hash: ROOT });
const rootChildren = await client.getTriggeredTransactionIds({ hash: ROOT });
const nodes = [{ role: "REMEDIATION_ROOT", txId: ROOT, tx: safeTransaction(root, rootChildren) }];
for (const childId of rootChildren) {
  const child = await client.getTransaction({ hash: childId });
  const descendants = await client.getTriggeredTransactionIds({ hash: childId });
  let debugTrace = null;
  try { debugTrace = jsonSafe(await client.debugTraceTransaction({ hash: childId })); }
  catch (error) { debugTrace = { unavailable: true, error: String(error?.message ?? error) }; }
  nodes.push({ role: "KERNEL_CHILD", txId: childId, tx: safeTransaction(child, descendants), debugTrace });
  for (const descendantId of descendants) {
    const descendant = await client.getTransaction({ hash: descendantId });
    const grandChildren = await client.getTriggeredTransactionIds({ hash: descendantId });
    nodes.push({ role: "TARGET_DESCENDANT", txId: descendantId, tx: safeTransaction(descendant, grandChildren) });
  }
}
const output = {
  schema: "reclose-old-remediation-forensics-v1",
  capturedAt: new Date().toISOString(),
  network: "studio-dev", chainId: 61997, rpc: RPC,
  rootTxId: ROOT,
  classification: rootChildren.length === 1 && nodes[1]?.tx?.messages?.length === 0 && nodes[1]?.tx?.triggeredTransactions?.length === 0
    ? "KERNEL_SUCCESS_NO_EMITTED_TARGET_MESSAGE_OBSERVED" : "REQUIRES_REVIEW",
  nodes,
  notes: [
    "Receipt fields are captured without consensus validator payloads.",
    "messageFeesConsumed and messageFeesBudgetTotal are preserved under each node's fees.consumed.",
    "An empty messages array plus no triggered child is not classified as delayed materialization.",
  ],
};
const path = "release-evidence/r1/e1/forensics/old-remediation-0x5884d33f.json";
await fs.mkdir("release-evidence/r1/e1/forensics", { recursive: true });
await fs.writeFile(path, JSON.stringify(output, null, 2) + "\n");
console.log(`Wrote ${path}`);
console.log(JSON.stringify({ rootTxId: ROOT, directChildren: rootChildren, classification: output.classification }));
