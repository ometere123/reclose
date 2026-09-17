import fs from "node:fs/promises";
import { createClient, chains } from "genlayer-js";

const RPC = "https://studio-dev.genlayer.com/api";
const MANIFEST = "deployment/61997/r1-run-a7-manifest.json";
const OUT = "release-evidence/r1/e1/run-e1a-final.json";
const m = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
const c = m.contracts;
const reporter = m.deployer;
const root = `${m.targetId}:${reporter}:0`;
const remediation = `${m.targetId}:${reporter}:1`;
const recovery = `${m.targetId}:${reporter}:2`;
const client = createClient({ chain: { ...chains.studioDevnet, id: 61997, rpcUrls: { default: { http: [RPC] } } } });
const safe = (v) => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === "bigint" ? x.toString() : x));
const read = (address, functionName, args = []) => client.readContract({ address, functionName, args });
const load = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const graph = async (p) => load(p);
const compromise = await load("release-evidence/r1/e1/live-evidence/run-a7-compromise-root.json");
const remediationEvidence = await load("release-evidence/r1/e1/live-evidence/run-a7-remediation/remediation.json");
const remediationGraph = await graph("release-evidence/r1/e1/live-evidence/run-a7-remediation/remediation-graph-postreset.json");
const recoveryPending = await load("release-evidence/r1/e1/live-evidence/run-a7-recovery/recovery-pending.json");
const recoveryPreflight = await load("release-evidence/r1/e1/live-evidence/run-a7-recovery/recovery-preflight.json");
const recoveryGraph = await graph("release-evidence/r1/e1/live-evidence/run-a7-recovery/recovery-graph.json");
const recoveryReceipt = await client.getTransactionReceipt({ hash: recoveryPending.txHash });
const valueB = await load("release-evidence/r1/e1/live-evidence/run-a7-containment-purchase.json");
const valueA = await load("release-evidence/r1/e1/live-evidence/run-a7-final-provider-a-purchase.json");
const probe = await load("release-evidence/r1/e1/live-evidence/run-a7-recovery-probe-frozen-ref.json");
if (Number(await client.getChainId()) !== 61997) throw new Error("wrong chain");
const [targetState, effectiveProvider, rootStatus, recoveryCondition, recoveryOutcome, targetReadiness] = await Promise.all([
  read(c.ReferenceAgentProtocol.address, "get_state"), read(c.ReferenceAgentProtocol.address, "get_effective_provider"),
  read(c.AssuranceKernel.address, "get_incident_status", [root]),
  read(c.IncidentJudgeV1.address, "get_incident_condition_code", [recovery]), read(c.IncidentJudgeV1.address, "get_incident_outcome", [recovery]),
  read(c.ReferenceAgentProtocol.address, "get_recovery_readiness"),
]);
if (Number(targetState) !== 0 || Number(effectiveProvider) !== 1 || Number(rootStatus) !== 4 || String(recoveryCondition) !== "RECOVERY_VERIFIED" || Number(recoveryOutcome) !== 1) {
  throw new Error(`A7 final state mismatch: ${JSON.stringify({ targetState, effectiveProvider, rootStatus, recoveryCondition, recoveryOutcome })}`);
}
const artifact = {
  schema: "reclose-r1-e1-final-v2",
  runId: "r1-e1-run-a7",
  network: { name: "studio-dev", chainId: 61997, rpc: RPC },
  sourceCommit: m.sourceCommit,
  deploymentManifest: MANIFEST,
  targetId: m.targetId,
  policy: { key: m.policy.key, version: m.policy.version, manifestHash: m.policy.manifestHash },
  contracts: Object.fromEntries(Object.entries(c).map(([name, value]) => [name, value.address])),
  incidents: { root, remediation, recovery },
  transactions: {
    compromise: { root: compromise.txHash, graph: "release-evidence/r1/e1/live-evidence/run-a7-compromise-graph.json", decision: compromise.judgeResult, feeEvidence: compromise.receipt?.data?.fee_accounting ?? null },
    remediation: { root: remediationEvidence.txHash, graph: "release-evidence/r1/e1/live-evidence/run-a7-remediation/remediation-graph-postreset.json", decision: remediationEvidence.judgeResult, action: remediationEvidence.action, feeEvidence: remediationEvidence.receipt?.data?.fee_accounting ?? null },
    recoveryValidation: { root: recoveryPending.txHash, graph: "release-evidence/r1/e1/live-evidence/run-a7-recovery/recovery-graph.json", decision: { conditionCode: recoveryCondition, outcome: recoveryOutcome }, action: recoveryPreflight.action, feeEvidence: recoveryGraph.nodes[0]?.transaction?.data?.fee_accounting ?? null },
    recoveryProbe: { txHash: probe.hash, requestRef: probe.ref, value: probe.value, readback: probe.readback },
    continuityProviderB: { txHash: valueB.txHash, value: valueB.value, readback: valueB.readback },
    finalProviderA: { txHash: valueA.txHash, value: valueA.value, readback: valueA.readback },
  },
  postState: { targetState: Number(targetState), targetStateName: "NORMAL", effectiveProvider: Number(effectiveProvider), rootIncidentStatus: Number(rootStatus), targetReadiness: safe(targetReadiness) },
  actionIdentityProof: { remediationRestoreActionId: remediationEvidence.action?.actionId, remediationParamU256: "5", recoveryRestoreActionId: recoveryPreflight.action.actionId, recoveryParamU256: "0", distinct: remediationEvidence.action?.actionId !== recoveryPreflight.action.actionId },
  evidence: { remediation: "release-evidence/r1/e1/live-evidence/run-a7-remediation/remediation.json", recoveryPreflight: "release-evidence/r1/e1/live-evidence/run-a7-recovery/recovery-preflight.json", recovery: "release-evidence/r1/e1/live-evidence/run-a7-recovery/recovery.json (to be regenerated from recovered receipt)", graphs: ["release-evidence/r1/e1/live-evidence/run-a7-compromise-graph.json", "release-evidence/r1/e1/live-evidence/run-a7-remediation/remediation-graph-postreset.json", "release-evidence/r1/e1/live-evidence/run-a7-recovery/recovery-graph.json"] },
};
await fs.writeFile("release-evidence/r1/e1/live-evidence/run-a7-recovery/recovery.json", JSON.stringify(safe({ ...recoveryPreflight, txHash: recoveryPending.txHash, receipt: recoveryReceipt, executionResult: recoveryGraph.nodes[0]?.transaction?.data?.genvm_result?.execution_result ?? "SUCCESS", lifecycle: "VERIFIED", judgeResult: { conditionCode: recoveryCondition, outcome: recoveryOutcome }, targetStateAfterChildren: Number(targetState) }), null, 2) + "\n");
await fs.writeFile(OUT, JSON.stringify(safe(artifact), null, 2) + "\n");
console.log(JSON.stringify({ out: OUT, finalState: artifact.postState, roots: artifact.incidents, distinctActionIds: artifact.actionIdentityProof.distinct }, null, 2));
