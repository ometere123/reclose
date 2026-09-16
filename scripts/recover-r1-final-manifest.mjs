import fs from "node:fs/promises";
import { createClient, chains, isSuccessful } from "genlayer-js";
const RPC = "https://studio-dev.genlayer.com/api";
const CHAIN_ID = 61997;
const FILE = "deployment/61997/r1-final-generation-manifest.json";
const safe = v => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === "bigint" ? x.toString() : x));
const manifest = JSON.parse(await fs.readFile(FILE, "utf8"));
const client = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } } });
if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error("wrong chain");
for (const [name, record] of Object.entries(manifest.contracts)) {
  if (record.lifecycle !== "SUBMITTED" || !record.deploymentTx) continue;
  console.log(`Recovering ${name} ${record.deploymentTx}`);
  const receipt = await client.waitForTransactionReceipt({ hash: record.deploymentTx, waitUntil: "finalized", interval: 4000, retries: 150 });
  if (!isSuccessful(receipt)) throw new Error(`${name} execution failed: ${JSON.stringify(safe(receipt))}`);
  const address = receipt.contractAddress ?? receipt.contract_address ?? receipt.data?.contract_address;
  if (!address) throw new Error(`${name} finalized without address`);
  manifest.contracts[name] = { ...record, address, receipt: safe(receipt), executionResult: "SUCCESS", lifecycle: "FINALIZED" };
  await fs.writeFile(FILE, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${name}: ${address}`);
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest.contracts).map(([k,v])=>[k,{lifecycle:v.lifecycle,address:v.address,tx:v.deploymentTx}])), null, 2));
