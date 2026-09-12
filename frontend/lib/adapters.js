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
  async previewOpenBond() {
    throw new Error("Fixture mode never submits transactions. Switch to a host-provided live Reclose SDK writer.");
  }
  async previewRecovery(input) {
    await delay();
    return { network: "studio-dev", chainId: CHAIN_ID, estimatedFeeValueWei: "100000000000000000", isEstimate: true, bondWei: null, distributionSummary: null, draft: clone(input), synthetic: true };
  }
  async previewRegistration(input) {
    await delay();
    return { network: "studio-dev", chainId: CHAIN_ID, estimatedFeeValueWei: "80000000000000000", isEstimate: true, bondWei: null, distributionSummary: null, draft: clone(input), synthetic: true };
  }
  async previewRevokeAuthority(input) {
    await delay();
    return { network: "studio-dev", chainId: CHAIN_ID, estimatedFeeValueWei: "60000000000000000", isEstimate: true, bondWei: null, distributionSummary: null, draft: clone(input), synthetic: true };
  }
  async previewDisableAction(input) {
    await delay();
    return { network: "studio-dev", chainId: CHAIN_ID, estimatedFeeValueWei: "55000000000000000", isEstimate: true, bondWei: null, distributionSummary: null, draft: clone(input), synthetic: true };
  }
  async previewDisableResource(input) {
    await delay();
    return { network: "studio-dev", chainId: CHAIN_ID, estimatedFeeValueWei: "55000000000000000", isEstimate: true, bondWei: null, distributionSummary: null, draft: clone(input), synthetic: true };
  }
  async previewPolicyActivation(input) {
    await delay();
    return { valid: false, errors: ["Fixture mode cannot validate against a live active policy - connect a live SDK."], manifestHash: null, diff: null, synthetic: true };
  }
  async compilePolicyConstruction() {
    throw new Error("Fixture mode has no live SDK + policy-compiler bridge connected. The real multi-transaction policy construction sequence requires both.");
  }
  async buildPolicyConstructionStep() {
    throw new Error("Fixture mode cannot build a real construction step - connect a live SDK + policy-compiler bridge.");
  }
  async buildPolicyActivation() {
    throw new Error("Fixture mode cannot build a real activation write - connect a live SDK.");
  }
  async getPolicyHeaderReadback() {
    throw new Error("Fixture mode cannot read back on-chain policy state - connect a live SDK.");
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

  constructor(sdk, writer = null, indexer = null, policyCompiler = null) {
    if (!sdk) throw new Error("SdkProductAdapter requires a RecloseSDK instance");
    this.sdk = sdk;
    this.writer = writer;
    this.indexer = indexer;
    // The real @reclose/policy-compiler module (compileCanonicalApm), injected by the host exactly
    // like sdk/writer/indexer - the frontend has no bundler/package resolution to import it
    // directly, and protocol-sdk cannot depend on it (policy-compiler already depends on
    // protocol-sdk; the reverse would be circular). This is the ONE canonical compiler
    // implementation, dependency-injected rather than statically imported, never reimplemented.
    this.policyCompiler = policyCompiler;
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
      // Fix (independent audit finding): decisionId is a canonical RECORD identity
      // ("<incidentId>:FINAL"), never a transaction hash - it must never be displayed or treated
      // as a txId. The real parent transaction identity is decisionView.transaction.txId, exactly
      // what trackTransaction resolved the parent tx mapping to.
      trace.push({
        role: "Judge parent (report submission)",
        txId: decisionView.transaction.txId,
        rawStatus: decisionView.transaction.rawStatus,
        executionResult: decisionView.transaction.executionResult ?? null,
        finalStatus: decisionView.transaction.executionResult === "FINISHED_WITH_ERROR" ? "FAILURE" : decisionView.transaction.derived?.isFinal ? "SUCCESS" : "UNKNOWN"
      });

      // Fix (independent audit finding): there is no single "the" action for an incident - the
      // Kernel dispatches one action_id PER enabled effect of the matched rule (up to
      // MAX_EFFECTS_PER_DECISION). Tracking must walk each REAL derived action_id
      // (sdk.listIncidentActionIds), never the bare incidentId, which is not an action identity at
      // all and was never a valid key into the action-dispatch index.
      let actionIds = [];
      if (typeof this.sdk.listIncidentActionIds === "function") {
        try { actionIds = await this.sdk.listIncidentActionIds(incidentId); } catch { /* policy for this incident's policyKey may no longer be resolvable */ }
      }
      if (!actionIds.length) {
        trace.push({ role: "Kernel dispatch", txId: "unavailable", rawStatus: "NOT_YET_AVAILABLE", executionResult: null, finalStatus: "UNKNOWN", error: "No dispatched action_id could be derived for this incident's matched rule/effects." });
      }
      for (const action of actionIds) {
        const label = `${action.actionType}${action.resourceId ? ` on ${action.resourceId}` : ""}`;
        let kernelChildFailed = false;
        try {
          const childReceipt = await this.sdk.trackActionTrace(action.actionId);
          kernelChildFailed = childReceipt.finalStatus === "FAILURE";
          trace.push({
            role: `Judge -> Kernel child (${label})`,
            txId: childReceipt.childTx?.txId ?? "unavailable",
            rawStatus: childReceipt.childTx?.lifecycle?.rawStatus ?? "UNKNOWN",
            executionResult: childReceipt.executionResult ?? null,
            finalStatus: childReceipt.finalStatus ?? "UNKNOWN",
            error: childReceipt.finalStatus === "FAILURE" ? "Execution failed downstream of judgment - see known live limitation" : undefined
          });
        } catch {
          kernelChildFailed = true;
          trace.push({ role: `Judge -> Kernel child (${label})`, txId: "unavailable", rawStatus: "NOT_YET_AVAILABLE", executionResult: null, finalStatus: "UNKNOWN" });
        }
        if (!kernelChildFailed && typeof this.sdk.trackKernelToTargetChild === "function") {
          try {
            const targetChild = await this.sdk.trackKernelToTargetChild(action.actionId);
            trace.push(targetChild
              ? { role: `Kernel -> Target child (${label})`, txId: targetChild.txId, rawStatus: targetChild.rawStatus, executionResult: targetChild.executionResult ?? null, finalStatus: targetChild.executionResult === "FINISHED_WITH_RETURN" ? "SUCCESS" : targetChild.executionResult ? "FAILURE" : "UNKNOWN" }
              : { role: `Kernel -> Target child (${label})`, txId: "unavailable", rawStatus: "NOT_YET_AVAILABLE", executionResult: null, finalStatus: "UNKNOWN" });
          } catch {
            trace.push({ role: `Kernel -> Target child (${label})`, txId: "unavailable", rawStatus: "NOT_YET_AVAILABLE", executionResult: null, finalStatus: "UNKNOWN" });
          }
        }
      }
    }
    // A3-H08 (recovery surface): populate from the incident's REAL own restriction records when
    // the SDK supports reading them - never fabricate the remediation/recovery-validation chain
    // fields the Kernel has no view for (no parent_incident_id on get_incident_detail, no
    // "child incidents of X" enumeration). Those fields are marked explicitly UNKNOWN rather than
    // guessed or silently omitted (which would read as "none" instead of "not derivable").
    let recovery = null;
    if (typeof this.sdk.getIncidentOwnRestrictions === "function") {
      try {
        const restrictions = await this.sdk.getIncidentOwnRestrictions(incidentId);
        const remainingRestrictions = restrictions.filter((r) => r.active).map((r) => `${r.actionType}${r.resourceId ? `:${r.resourceId}` : ""}`);
        recovery = {
          remainingRestrictions,
          remediationRequired: remainingRestrictions.length > 0 ? null : false,
          remediationSubmitted: null,
          remediationDecision: null,
          recoveryValidated: null,
          protocolReadLimitation: "remediationSubmitted/remediationDecision/recoveryValidated could not be resolved: the Kernel exposes no protocol view linking a remediation/recovery-validation incident back to its parent (no parent_incident_id field, no child-incident enumeration), and no indexer.resolveIncidentLineage adapter is connected to supply it off-chain - see known-limitations.md.",
        };
        // Closes the remediation/recovery-validation chain read-gap via the smallest additive
        // piece that doesn't require a contract change: an OPTIONAL indexer-provided lineage
        // mapping (parent incidentId -> its remediation/recovery-validation incident ids), read
        // back against AUTHORITATIVE protocol state (sdk.getIncident/getDecision on those linked
        // ids) rather than trusted as-is from the indexer. An indexer is convenience
        // infrastructure (CLAUDE.md Section 32) - if it supplies a wrong id, the protocol read on
        // that id simply fails/disagrees, it is never taken as truth on its own.
        if (typeof this.indexer?.resolveIncidentLineage === "function") {
          const lineage = await this.indexer.resolveIncidentLineage(incidentId);
          if (lineage?.remediationIncidentId) {
            try {
              const remediation = await this.sdk.getIncident(lineage.remediationIncidentId);
              if (remediation.targetId === incident.targetId) {
                recovery.remediationSubmitted = true;
                try { recovery.remediationDecision = (await this.sdk.getDecision(`${lineage.remediationIncidentId}:FINAL`)).outcome; } catch { /* not final yet */ }
              }
            } catch { /* indexer-supplied id did not resolve to a real incident - ignore it, do not fabricate */ }
          }
          if (lineage?.recoveryValidationIncidentId) {
            try {
              const recoveryIncident = await this.sdk.getIncident(lineage.recoveryValidationIncidentId);
              if (recoveryIncident.targetId === incident.targetId) {
                try { recovery.recoveryValidated = (await this.sdk.getDecision(`${lineage.recoveryValidationIncidentId}:FINAL`)).outcome === "CONFIRMED"; } catch { /* not final yet */ }
              }
            } catch { /* ignore unresolvable indexer id */ }
          }
          if (lineage?.remediationIncidentId || lineage?.recoveryValidationIncidentId) {
            recovery.protocolReadLimitation = null;
          }
        }
      } catch { /* leave recovery null - an unreadable restriction set is not the same as "no recovery data" */ }
    }
    return { ...incident, finalOutcome: finalDecision?.outcome ?? null, decisionStage: finalDecision?.decisionStage ?? null, judgmentTx: decisionView?.transaction ?? null, trace, recovery };
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
  /** FINAL_REMEDIATION.md Section 5: prepares IncentiveVault.open_bond for a non-zero-bond rule -
   * must be signed and confirmed BEFORE the incident/recovery draft that references its bondId. */
  async previewOpenBond(input) {
    if (typeof this.sdk.buildOpenBond !== "function") throw new Error("Connected SDK does not support the bonded reporting journey");
    const built = await this.sdk.buildOpenBond(input);
    return { ...built.feePreview, draft: built.report, bondId: built.bondId, synthetic: false };
  }
  async previewRecovery(input) {
    const built = await this.sdk.buildRecoveryReport(input);
    return { ...built.feePreview, draft: built.report, synthetic: false };
  }
  /** A3-H02: onboarding is a real bounded governed write with the same review-to-sign guarantee
   * as incident/recovery - never presentation-only. */
  async previewRegistration(input) {
    if (typeof this.sdk.buildTargetRegistration !== "function") {
      throw new Error("Connected SDK does not support target registration preparation");
    }
    const built = await this.sdk.buildTargetRegistration(input);
    return { ...built.feePreview, draft: built.report, synthetic: false };
  }
  /** A3-H07: bounded owner controls wired to the real Kernel methods that already exist
   * (revoke_authority/disable_action/disable_resource) through the same preview -> draftRegistry
   * -> sign pipeline as every other write. */
  async previewRevokeAuthority(input) {
    if (typeof this.sdk.buildRevokeAuthority !== "function") throw new Error("Connected SDK does not support authority revocation preparation");
    const built = await this.sdk.buildRevokeAuthority(input);
    return { ...built.feePreview, draft: built.report, synthetic: false };
  }
  async previewDisableAction(input) {
    if (typeof this.sdk.buildDisableAction !== "function") throw new Error("Connected SDK does not support disable-action preparation");
    const built = await this.sdk.buildDisableAction(input);
    return { ...built.feePreview, draft: built.report, synthetic: false };
  }
  async previewDisableResource(input) {
    if (typeof this.sdk.buildDisableResource !== "function") throw new Error("Connected SDK does not support disable-resource preparation");
    const built = await this.sdk.buildDisableResource(input);
    return { ...built.feePreview, draft: built.report, synthetic: false };
  }
  /** A3-H02 (policy-activation half): real validate/hash/diff against the target's current live
   * policy - never a presentation-only stub. */
  async previewPolicyActivation(input) {
    if (typeof this.sdk.buildPolicyActivationReview !== "function") throw new Error("Connected SDK does not support policy activation review");
    return { ...(await this.sdk.buildPolicyActivationReview(input)), synthetic: false };
  }

  /**
   * FINAL_REMEDIATION.md Section 3 (strict sequential state machine): compiles the manifest
   * through the canonical policy-compiler bridge into its PLAN ONLY - the ordered list of Kernel
   * calls (begin_policy, each add_policy_resource, each add_policy_rule, each add_policy_effect,
   * seal_policy). Deliberately does NOT build a PreparedRecloseWrite for every step up front: a
   * later step's call may reference state (the policy_key existing, a resource being registered)
   * that does not exist on-chain until its prerequisite step has actually been submitted and
   * tracked - pre-estimating/pre-signing it earlier would misrepresent readiness. Use
   * `buildPolicyConstructionStep` to prepare exactly ONE step, only when its prerequisites are
   * believed satisfied.
   */
  async compilePolicyConstruction(apm) {
    if (!this.policyCompiler || typeof this.policyCompiler.compileCanonicalApm !== "function") {
      throw new Error("No policy-compiler bridge is connected. The real multi-transaction construction sequence requires the host to inject @reclose/policy-compiler's compileCanonicalApm alongside the SDK/writer.");
    }
    return this.policyCompiler.compileCanonicalApm(apm);
  }

  /** Builds exactly ONE compiled call into a real, fee-estimated, review-hashed
   * PreparedRecloseWrite - called on demand, one step at a time, by the sequential state machine. */
  async buildPolicyConstructionStep(call) {
    const built = await this.sdk.buildPreparedWriteForCall(call, { semanticKind: "POLICY_CONSTRUCTION_STEP" });
    return { description: call.description, draft: built.report, feePreview: built.feePreview, synthetic: false };
  }

  /** The final step, built only once the caller has confirmed seal_policy succeeded - never
   * pre-built alongside the construction steps. */
  async buildPolicyActivation(targetId, policyKey, apm) {
    const activation = await this.sdk.buildPolicyActivationWrite({ targetId, policyKey, apm });
    return { description: `Activate policy "${policyKey}"`, draft: activation.report, feePreview: activation.feePreview, authorityExpands: activation.authorityExpands, diff: activation.diff, synthetic: false };
  }

  /** Real on-chain readback (FINAL_REMEDIATION.md Section 3: "verify on-chain readback") - used
   * after seal_policy and after activate_policy to confirm the Kernel actually recorded what this
   * journey just submitted, rather than trusting the writer's return value alone. */
  async getPolicyHeaderReadback(policyKey) {
    const policy = await this.sdk.getPolicyByKey?.(policyKey, "");
    if (!policy) throw new Error("Connected SDK does not support policy readback by key");
    return policy.summary;
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
    // Signer-binding requirement: when this draft was reviewed/prepared for a specific address
    // (EAP reporter, expected owner, or target's cached owner), the CURRENTLY connected wallet
    // account must match it exactly, checked immediately before this signature - never a stale
    // address captured when the draft was first built. Drafts with no single expected signer
    // (e.g. a policy-construction step) skip this check - there is nothing to bind against.
    if (payload.expectedSigner) {
      if (typeof this.writer.getConnectedAccount !== "function") {
        throw new Error("Refusing to sign: the connected writer cannot report its signing account. Signer identity cannot be verified.");
      }
      const connectedAccount = String(await this.writer.getConnectedAccount()).toLowerCase();
      if (connectedAccount !== String(payload.expectedSigner).toLowerCase()) {
        throw new Error(`Signer mismatch: connected wallet is ${connectedAccount}, but this draft was reviewed for ${payload.expectedSigner}. Reconnect the correct account and preview again.`);
      }
    }
    const method = {
      incident: "submitIncident",
      remediation: "submitRemediation",
      recovery: "submitRecovery",
      activatePolicy: "activatePolicy",
      registerTarget: "registerTarget",
      revokeAuthority: "revokeAuthority",
      disableAction: "disableAction",
      disableResource: "disableResource"
    }[kind];
    if (method) {
      if (typeof this.writer[method] !== "function") throw new Error(`Writer does not support ${kind}`);
      return this.writer[method](payload);
    }
    // Policy construction steps (kind === "policyConstruction:<n>" or "policyActivate") carry their
    // own real functionName (begin_policy/add_policy_resource/add_policy_rule/add_policy_effect/
    // seal_policy/activate_policy) in the draft itself - dispatch generically through a single
    // `callKernel` writer method (which receives the exact payload, including functionName/args)
    // rather than requiring the writer to pre-declare six more named methods.
    if (typeof this.writer.callKernel === "function") return this.writer.callKernel(payload);
    throw new Error(`Writer does not support ${kind} (no callKernel method for generic Kernel calls)`);
  }
}

export function selectProductAdapter() {
  const injected = globalThis.__RECLOSE_PRODUCT_RUNTIME__;
  if (injected?.sdk) return new SdkProductAdapter(injected.sdk, injected.writer ?? null, injected.indexer ?? null, injected.policyCompiler ?? null);
  return new MockProductAdapter();
}
