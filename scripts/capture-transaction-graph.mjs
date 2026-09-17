#!/usr/bin/env node
import fs from "node:fs/promises";
import { createClient, chains } from "genlayer-js";

const root = process.env.RECLOSE_TX_HASH ?? process.argv[2];
const outputPath = process.env.RECLOSE_GRAPH_OUTPUT ?? process.argv[3];
if (!root || !outputPath) throw new Error("usage: RECLOSE_TX_HASH=<root> RECLOSE_GRAPH_OUTPUT=<path> node scripts/capture-transaction-graph.mjs");
const rpc = "https://studio-dev.genlayer.com/api";
const client = createClient({ chain: { ...chains.studioDevnet, id: 61997, rpcUrls: { default: { http: [rpc] } } } });
const safe = value => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));
const nodes = [];
const seen = new Set();
async function walk(hash, parentHash = null, depth = 0) {
  if (seen.has(hash) || depth > 8) return;
  seen.add(hash);
  let transaction = null, children = [], trace = null;
  try { transaction = safe(await client.getTransaction({ hash })); } catch (error) { transaction = { error: String(error?.message ?? error) }; }
  try { children = await client.getTriggeredTransactionIds({ hash }); } catch (error) { children = []; }
  try { trace = safe(await client.debugTraceTransaction({ hash, round: 0 })); } catch (error) { trace = { unavailable: true, error: String(error?.message ?? error) }; }
  nodes.push({ hash, parentHash, depth, transaction, children, trace });
  for (const child of children) await walk(child, hash, depth + 1);
}
await walk(root);
await fs.mkdir(outputPath.substring(0, outputPath.lastIndexOf("/")), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify({ schema: "reclose-transaction-graph-v1", capturedAt: new Date().toISOString(), network: { name: "studio-dev", chainId: 61997, rpc }, root, nodes }, null, 2) + "\n");
console.log(JSON.stringify({ outputPath, root, nodeCount: nodes.length, edges: nodes.reduce((sum, node) => sum + node.children.length, 0) }));
