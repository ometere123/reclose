#!/usr/bin/env node
// One serialized read-only balance check for the lifecycle-split Run A ReferenceAgent.
import fs from "node:fs/promises";
import { createClient, chains } from "genlayer-js";
import { installStudioDevRpcThrottle } from "./studio-dev-rpc-throttle.mjs";

const RPC = "https://studio-dev.genlayer.com/api";
const CHAIN_ID = 61997;
const MANIFEST_PATH = "deployment/61997/r1-lifecycle-split-run-a-working-manifest.json";
const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
const target = manifest.contracts.ReferenceAgentProtocol.address;
installStudioDevRpcThrottle({ rpcUrl: RPC });
const client = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } } });
const balance = await client.readContract({ address: target, functionName: "get_treasury_balance", args: [] });
const output = {
  observedAt: new Date().toISOString(),
  network: "studio-dev",
  chainId: CHAIN_ID,
  contract: target,
  functionName: "get_treasury_balance",
  treasuryBalanceWei: String(balance),
  treasuryBalanceGen: (Number(balance) / 1e18).toString(),
  userFundingTransactionHash: null,
  fundingTransactionHashNote: "The user-provided console screenshot displayed a truncated transaction ID; no hash is inferred. The live contract balance is independently read back here.",
};
await fs.writeFile("release-evidence/r1/diagnostics/run-a-treasury-readback.json", `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
