#!/usr/bin/env node
import fs from "node:fs/promises";
import { createClient, chains } from "genlayer-js";

const RPC = "https://studio-next.genlayer.com/api";
const ROOT = "0xe57b28abb3a59c0d09a9b8a5e5817457ae58b7ad36b07283b7e1ec1063316991";
const client = createClient({ chain: { ...chains.studioDevnet, id: 61997, rpcUrls: { default: { http: [RPC] } } } });
const safe = (value) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));

const root = await client.getTransaction({ hash: ROOT });
const children = await client.getTriggeredTransactionIds({ hash: ROOT });
const traces = [];
for (const hash of [ROOT, ...children]) {
  try {
    traces.push({ hash, trace: safe(await client.debugTraceTransaction({ hash, round: 0 })) });
  } catch (error) {
    traces.push({ hash, unavailable: true, error: String(error?.message ?? error) });
  }
}
const output = {
  schema: "reclose-remediation-nonce5-debug-trace-v1",
  capturedAt: new Date().toISOString(),
  network: { name: "studio-dev", chainId: 61997, rpc: RPC },
  rootTxId: ROOT,
  directChildren: children,
  receipt: safe(root),
  traces,
};
const path = "release-evidence/r1/e1/fresh-fixed-cycle/remediation-nonce5-debug-trace.json";
await fs.writeFile(path, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ path, rootTxId: ROOT, directChildren: children, traceCount: traces.length }));
