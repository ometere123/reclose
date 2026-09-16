import fs from "node:fs/promises";
import { createClient, chains } from "genlayer-js";
const RPC = "https://studio-dev.genlayer.com/api"; const CHAIN_ID = 61997;
const FILE = "deployment/61997/r1-final-generation-manifest.json"; const targetId = "reclose-target-r1-e1a-final";
const m = JSON.parse(await fs.readFile(FILE, "utf8")); const c = m.contracts;
const client = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } } });
if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error("wrong chain");
async function read(address, functionName, args = []) { try { return { ok: true, value: await client.readContract({ address, functionName, args }) }; } catch (e) { return { ok: false, error: String(e?.message ?? e) }; } }
const readbacks = {
  providerA: { owner: await read(c.ProviderStubA.address, "get_owner"), totalReceived: await read(c.ProviderStubA.address, "get_total_received"), fulfilled: await read(c.ProviderStubA.address, "is_fulfilled", [""]) },
  providerB: { owner: await read(c.ProviderStubB.address, "get_owner"), totalReceived: await read(c.ProviderStubB.address, "get_total_received"), fulfilled: await read(c.ProviderStubB.address, "is_fulfilled", [""]) },
  target: { owner: await read(c.ReferenceAgentProtocol.address, "get_assurance_owner"), targetId: await read(c.ReferenceAgentProtocol.address, "get_assurance_target_id"), controller: await read(c.ReferenceAgentProtocol.address, "get_assurance_controller"), state: await read(c.ReferenceAgentProtocol.address, "get_state"), revoked: await read(c.ReferenceAgentProtocol.address, "is_assurance_authority_revoked"), providerA: await read(c.ReferenceAgentProtocol.address, "get_provider_a"), providerB: await read(c.ReferenceAgentProtocol.address, "get_provider_b") },
  judge: { moduleType: await read(c.IncidentJudgeV1.address, "get_module_type"), kernel: await read(c.IncidentJudgeV1.address, "get_kernel"), version: await read(c.IncidentJudgeV1.address, "get_module_version"), registry: await read(c.IncidentJudgeV1.address, "get_source_registry_hash"), nonce: await read(c.IncidentJudgeV1.address, "get_reporter_nonce", [m.deployer]) },
  vault: { moduleType: await read(c.IncentiveVault.address, "get_module_type"), kernel: await read(c.IncentiveVault.address, "get_kernel"), judge: await read(c.IncentiveVault.address, "get_judge") },
  kernelTarget: await read(c.AssuranceKernel.address, "get_target_details", [targetId])
};
await fs.writeFile("deployment/61997/r1-final-stack-readback.json", JSON.stringify({ generatedAt: new Date().toISOString(), network: { rpc: RPC, chainId: CHAIN_ID }, targetId, addresses: Object.fromEntries(Object.entries(c).map(([k,v])=>[k,v.address])), readbacks }, null, 2) + "\n");
console.log(JSON.stringify(readbacks, null, 2));
