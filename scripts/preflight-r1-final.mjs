import fs from "node:fs/promises";
import { keccak256Hex } from "../packages/protocol-sdk/dist/canonical.js";
import { createClient, chains } from "genlayer-js";

const CHAIN_ID = 61997;
const RPC = "https://studio-dev.genlayer.com/api";
const ANCHOR = "633cc5876815f904acb2006279ab68b01f09e263";
const BASE = `https://raw.githubusercontent.com/ometere123/reclose/${ANCHOR}/release-evidence/r1/e1/e1a-final-fixtures`;
const expected = {
  "provider-a-compromise.md": { bytes: 456, hash: "0x846ae8a7097ff9ebfbf94b3583d3fc44528ddb6838ff647ecd607febe056e80d" },
  "provider-a-remediation.md": { bytes: 594, hash: "0xd857b55e34d5dc975f882092d0f34e513628cedf7610bbd7830be9474ed9e876" },
  "provider-a-recovery.md": { bytes: 633, hash: "0x0ca0871f4fb12cbc9dff6c84dd1e6329c7559f36211ee00f5bd94bdab9bfc16b" },
};
const local = async name => { try { return await fs.readFile(`release-evidence/r1/e1/e1a-final-fixtures/${name}`); } catch { return null; } };
const fixtures = {};
for (const [name, want] of Object.entries(expected)) {
  const url = `${BASE}/${name}`;
  const response = await fetch(url);
  if (response.status !== 200) throw new Error(`${name}: expected HTTP 200, got ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const hash = keccak256Hex(bytes);
  if (bytes.byteLength !== want.bytes || hash.toLowerCase() !== want.hash.toLowerCase()) throw new Error(`${name}: frozen byte assertion failed: ${bytes.byteLength}/${hash}`);
  const localBytes = await local(name);
  fixtures[name] = { url, httpStatus: response.status, bytes: bytes.byteLength, hash, localByteComparison: localBytes ? { exact: Buffer.from(bytes).equals(localBytes), normalizedTextEqual: Buffer.from(bytes).toString().replace(/\r\n/g, "\n") === localBytes.toString().replace(/\r\n/g, "\n") } : "LOCAL_MISSING" };
}
const client = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } } });
const chainId = Number(await client.getChainId());
if (chainId !== CHAIN_ID) throw new Error(`wrong chain id ${chainId}`);
const out = { schema: "reclose-r1-final-preflight-v1", generatedAt: new Date().toISOString(), network: { rpc: RPC, chainId: CHAIN_ID }, fixtureAnchor: ANCHOR, fixtures };
await fs.writeFile("release-evidence/r1/e1/r1-final-preflight.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
