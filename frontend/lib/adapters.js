import { benchmark, deployment, incidents, policies, syntheticFixtureBanner, targets, policyDiff } from "./mock-data.js";
import { CHAIN_ID, assertTruthSeparation } from "./domain.js";

const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));

export class MockProductAdapter {
  mode = "mock";
  meta = syntheticFixtureBanner;

  async getOverview() {
    await delay();
    return {
      targets: clone(targets),
      incidents: clone(incidents),
      benchmark: clone(benchmark),
      deployment: clone(deployment)
    };
  }
  async listTargets() { await delay(); return clone(targets); }
  async getTarget(targetId) {
    await delay();
    const target = targets.find((item) => item.targetId === targetId);
    if (!target) throw new Error(`Unknown synthetic target ${targetId}`);
    return clone(target);
  }
  async getAssuranceState(targetId) {
    const target = await this.getTarget(targetId);
    return { targetId, state: target.assuranceState, activeRestrictions: clone(target.restrictions), effectiveCapabilities: clone(target.effectiveCapabilities), asOfBlock: null };
  }
  async getPolicy(targetId) {
    await delay();
    if (!policies[targetId]) throw new Error(`No synthetic policy for ${targetId}`);
    return clone(policies[targetId]);
  }
  async getPolicyDiff() { await delay(); return clone(policyDiff); }
  async listIncidents() { await delay(); return clone(incidents); }
  async getIncident(incidentId) {
    await delay();
    const incident = incidents.find((item) => item.incidentId === incidentId);
    if (!incident) throw new Error(`Unknown synthetic incident ${incidentId}`);
    assertTruthSeparation(incident.judgmentTx);
    return clone(incident);
  }
  async getBenchmark() { await delay(); return clone(benchmark); }
  async getDeployment() { await delay(); return clone(deployment); }
  async previewIncident(input) {
    await delay();
    return {
      network: "studio-dev",
      chainId: CHAIN_ID,
      estimatedFeeValueWei: "120000000000000000",
      isEstimate: true,
      bondWei: "0",
      distributionSummary: null,
      draft: clone(input),
      synthetic: true
    };
  }
  async previewRecovery(input) {
    await delay();
    return { network: "studio-dev", chainId: CHAIN_ID, estimatedFeeValueWei: "100000000000000000", isEstimate: true, bondWei: null, distributionSummary: null, draft: clone(input), synthetic: true };
  }
  async submitWrite() {
    throw new Error("Fixture mode never submits transactions. Switch to a host-provided live Reclose SDK writer.");
  }
}

/**
 * Product adapter over the frozen RecloseSDK. It delegates protocol semantics to the SDK and does
 * not recreate policy/Judge logic in the browser. Write methods are deliberately separate from
 * the read SDK because the frozen 14-method RecloseSDK is read/build/track oriented. A host can
 * inject a least-privilege writer that signs with the user's wallet.
 */
export class SdkProductAdapter {
  mode = "live";
  meta = { mode: "live", label: "Live SDK", note: "Reads are sourced through RecloseSDK on chain 61997." };

  constructor(sdk, writer = null, indexer = null) {
    if (!sdk) throw new Error("SdkProductAdapter requires a RecloseSDK instance");
    this.sdk = sdk;
    this.writer = writer;
    this.indexer = indexer;
  }

  async getOverview() {
    if (!this.indexer?.listTargetIds || !this.indexer?.listIncidentIds) {
      throw new Error("Overview discovery requires an optional index adapter. Direct target/incident routes remain available without it.");
    }
    const targetIds = await this.indexer.listTargetIds();
    const incidentIds = await this.indexer.listIncidentIds();
    const liveTargets = await Promise.all(targetIds.map(async (id) => ({ ...(await this.sdk.getTarget(id)), ...(await this.sdk.getAssuranceState(id)) })));
    const liveIncidents = await Promise.all(incidentIds.map((id) => this.sdk.getIncident(id)));
    return { targets: liveTargets, incidents: liveIncidents, benchmark: null, deployment: null };
  }

  async listTargets() {
    if (!this.indexer?.listTargetIds) throw new Error("Target discovery requires an optional index adapter");
    return Promise.all((await this.indexer.listTargetIds()).map(async (id) => ({ ...(await this.sdk.getTarget(id)), ...(await this.sdk.getAssuranceState(id)) })));
  }

  async getTarget(targetId) {
    const [target, assurance] = await Promise.all([this.sdk.getTarget(targetId), this.sdk.getAssuranceState(targetId)]);
    return { ...target, restrictions: assurance.activeRestrictions, effectiveCapabilities: assurance.effectiveCapabilities, asOfBlock: assurance.asOfBlock };
  }

  getAssuranceState(targetId) { return this.sdk.getAssuranceState(targetId); }
  getPolicy(targetId) { return this.sdk.getActivePolicy(targetId); }
  async getPolicyDiff(fromApm, toApm) { return this.sdk.diffAPM(fromApm, toApm); }

  async listIncidents() {
    if (!this.indexer?.listIncidentIds) throw new Error("Incident discovery requires an optional index adapter");
    return Promise.all((await this.indexer.listIncidentIds()).map((id) => this.getIncident(id)));
  }

  /**
   * A3-H04: reconstructs as much of the causal trace as the injected index adapter actually
   * proves, never unconditionally returning an empty trace in live mode. Any link the index
   * cannot resolve is rendered as an explicit UNRESOLVED/NOT_YET_AVAILABLE entry rather than
   * silently omitted (which would read as "no failures exist" instead of "unknown").
   */
  async getIncident(incidentId) {
    const incident = await this.sdk.getIncident(incidentId);
    let finalDecision = null;
    try { finalDecision = await this.sdk.getDecision(`${incidentId}:FINAL`); } catch { /* not final */ }
    let decisionView = null;
    try { if (finalDecision) decisionView = await this.sdk.getDecisionView(`${incidentId}:FINAL`); } catch { /* index mapping may be unavailable */ }

    const trace = [];
    if (decisionView?.transaction) {
      trace.push({
        role: "Judge parent (report submission)",
        txId: decisionView.record?.decisionId ?? "unavailable",
        rawStatus: decisionView.transaction.rawStatus,
        executionResult: decisionView.transaction.executionResult ?? null,
        finalStatus: decisionView.transaction.executionResult === "FINISHED_WITH_ERROR" ? "FAILURE" : decisionView.transaction.derived?.isFinal ? "SUCCESS" : "UNKNOWN"
      });
      try {
        const childReceipt = await this.sdk.trackActionTrace(incidentId);
        trace.push({
          role: "Judge -> Kernel child",
          txId: childReceipt.childTx?.txId ?? "unavailable",
          rawStatus: childReceipt.childTx?.lifecycle?.rawStatus ?? "UNKNOWN",
          executionResult: childReceipt.executionResult ?? null,
          finalStatus: childReceipt.finalStatus ?? "UNKNOWN",
          error: childReceipt.finalStatus === "FAILURE" ? "Execution failed downstream of judgment - see known live limitation" : undefined
        });
      } catch {
        // A3-H04: no fabricated child. The index/trace layer cannot currently resolve this
        // incident's action ID to a child transaction - render that explicitly.
        trace.push({ role: "Judge -> Kernel child", txId: "unavailable", rawStatus: "NOT_YET_AVAILABLE", executionResult: null, finalStatus: "UNKNOWN" });
      }
    }
    return { ...incident, finalOutcome: finalDecision?.outcome ?? null, decisionStage: finalDecision?.decisionStage ?? null, judgmentTx: decisionView?.transaction ?? null, trace };
  }

  async getBenchmark() {
    if (!this.indexer?.getBenchmarkSummary) throw new Error("Benchmark data is release evidence, not protocol state, and requires an evidence adapter");
    return this.indexer.getBenchmarkSummary();
  }
  async getDeployment() {
    if (!this.indexer?.getDeployment) throw new Error("Deployment metadata requires a manifest/evidence adapter");
    return this.indexer.getDeployment();
  }

  async previewIncident(input) {
    const built = await this.sdk.buildIncidentReport(input);
    return { ...built.feePreview, draft: built.report, synthetic: false };
  }
  async previewRecovery(input) {
    const built = await this.sdk.buildRecoveryReport(input);
    return { ...built.feePreview, draft: built.report, synthetic: false };
  }

  /**
   * A3-H01: `payload` MUST be the exact PreparedRecloseWrite draft the caller previewed and
   * reviewed - never a caller-reconstructed or empty object. A3-H03: the connected writer's
   * network is re-checked HERE, immediately before signing, not only at page load - a static
   * "Studio-dev" label is never treated as a write guard. Fails closed if the writer cannot
   * report its connected chain ID at all, since an unverifiable network is not a safe network.
   */
  async submitWrite(kind, payload) {
    if (!this.writer) throw new Error("No wallet writer is connected. Reclose will not simulate a successful submission.");
    if (!payload || typeof payload !== "object" || !payload.reviewHash || !Array.isArray(payload.args)) {
      throw new Error("Refusing to sign: no valid reviewed draft was supplied. Preview the write again.");
    }
    if (typeof this.writer.getConnectedChainId !== "function") {
      throw new Error("Refusing to sign: the connected writer cannot report its network. Network safety cannot be verified.");
    }
    const observedChainId = Number(await this.writer.getConnectedChainId());
    if (observedChainId !== CHAIN_ID) {
      throw new Error(`Wrong network: wallet is on chain ${observedChainId}, Reclose requires ${CHAIN_ID} (${"studio-dev"}). Switch networks and preview again.`);
    }
    const method = {
      incident: "submitIncident",
      remediation: "submitRemediation",
      recovery: "submitRecovery",
      activatePolicy: "activatePolicy",
      registerTarget: "registerTarget"
    }[kind];
    if (!method || typeof this.writer[method] !== "function") throw new Error(`Writer does not support ${kind}`);
    return this.writer[method](payload);
  }
}

export function selectProductAdapter() {
  const injected = globalThis.__RECLOSE_PRODUCT_RUNTIME__;
  if (injected?.sdk) return new SdkProductAdapter(injected.sdk, injected.writer ?? null, injected.indexer ?? null);
  return new MockProductAdapter();
}
