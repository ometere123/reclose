// Real browser write runtime over the EXACT pinned genlayer-js@2.0.0-rc.1, per the corrected A3
// wallet architecture: injected provider -> genlayer-js write client -> writeContract(). There is
// no Snap layer, no Reclose-custodied key, no homemade calldata signer, and no requirement that a
// host inject a writer for ordinary browser usage - connecting a supported wallet is sufficient.
//
//   injected browser wallet/provider -> connected account -> genlayer-js write client
//     -> writeContract() -> Reclose Kernel / Judge / Vault / Target
//
// The vendor bundle (frontend/vendor/genlayer-client.js, built by
// `npm run frontend:vendor:build` via scripts/build-frontend-vendor.mjs) re-exports this exact
// pinned package's own `createClient`/`studioDevnet` - nothing here reimplements genlayer-js, it
// only wraps the SAME reviewed `PreparedRecloseWrite` draft into the SDK's own `writeContract`
// call shape.
import { createClient, studioDevnet } from "../vendor/reclose-runtime.js";

/**
 * Creates a real GenLayerJS-backed writer for the connected account/provider. Every named method
 * ultimately calls `writePreparedDraft`, which submits EXACTLY `draft.contractAddress`/
 * `draft.functionName`/`draft.args`/`draft.valueWei` (plus the estimator-produced fee structure
 * already embedded in `draft.feeEstimate`, when present) through `writeContract` - never
 * re-encoding or re-deriving the call. The reviewed PreparedRecloseWrite remains the sole source
 * of truth for what gets signed.
 */
export function createGenLayerWriter({ account, provider }) {
  if (!account) throw new Error("createGenLayerWriter requires a connected account address");
  if (!provider) throw new Error("createGenLayerWriter requires an injected provider");
  const client = createClient({ chain: studioDevnet, account, provider });

  // Item 1 (owner-directed remediation pass): `fullFeeDetail` carries the COMPLETE fee data the
  // estimator produced (distribution + the full messageAllocations tree, including any
  // buildNestedMessageAllocationTree composition) with every bigint normalized to a decimal string
  // for JSON/hash safety - converted back to the real bigint shape writeContract's own `fees`
  // argument expects immediately before submission. Never re-estimated here.
  function restoreAllocationNode(node) {
    return {
      ...node,
      parentIndex: node.parentIndex !== undefined ? BigInt(node.parentIndex) : undefined,
      budget: node.budget !== undefined ? BigInt(node.budget) : undefined,
    };
  }

  async function writePreparedDraft(draft, feeQuote = null) {
    if (!draft || typeof draft !== "object" || !draft.contractAddress || !draft.functionName || !Array.isArray(draft.args)) {
      throw new Error("writePreparedDraft requires a complete PreparedRecloseWrite draft (contractAddress/functionName/args)");
    }
    // Fee estimation and the actual write MUST refer to the exact same account/contract/method/
    // args/value - the draft's own feeEstimate (produced by the SDK's estimateTransactionFeesForWrite
    // over this exact call) is passed straight through rather than re-estimated or hand-bisected.
    // Prefer the COMPLETE fullFeeDetail (distribution + messageAllocations) when present; fall back
    // to the lossy distributionSummary-only shape only for a draft built before this remediation.
    const fullFeeDetail = draft.feeEstimate?.fullFeeDetail;
    if (!fullFeeDetail?.distribution || !fullFeeDetail?.feeValue) {
      throw new Error("Refusing to sign: the reviewed draft has no complete SDK-produced fee profile.");
    }
    const normalized = (value) => {
      if (typeof value === "bigint") return value.toString();
      if (Array.isArray(value)) return value.map(normalized);
      if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalized(value[key])]));
      return value;
    };
    if (feeQuote && (BigInt(feeQuote.feeValue) !== BigInt(fullFeeDetail.feeValue)
      || JSON.stringify(normalized(feeQuote.distribution)) !== JSON.stringify(normalized(fullFeeDetail.distribution)))) {
      throw new Error("Refusing to sign: Transaction Kit quote does not match the exact SDK-produced Reclose fee profile.");
    }
    const fees = fullFeeDetail
      ? {
          distribution: feeQuote?.distribution ?? fullFeeDetail.distribution,
          feeValue: feeQuote?.feeValue ?? BigInt(fullFeeDetail.feeValue),
          ...(Array.isArray(fullFeeDetail.messageAllocations)
            ? { messageAllocations: fullFeeDetail.messageAllocations.map(restoreAllocationNode) }
            : {}),
        }
      : draft.feeEstimate?.distributionSummary
        ? { distribution: draft.feeEstimate.distributionSummary }
        : undefined;
    const txHash = await client.writeContract({
      account,
      address: draft.contractAddress,
      functionName: draft.functionName,
      args: draft.args,
      value: BigInt(draft.valueWei ?? "0"),
      ...(fees ? { fees } : {}),
    });
    return { txId: typeof txHash === "string" ? txHash : txHash?.hash ?? txHash?.txId ?? String(txHash) };
  }

  // The Transaction Kit adapter requires a finality tracker. Use GenLayerJS transaction reads
  // under the shared 2.6s Studio-dev request gate instead of the kit's fixed two-second poll loop.
  // Status and execution-result names are read verbatim; timeout never triggers a resubmission.
  async function trackForTransactionKit(txId, onUpdate = () => {}) {
    if (!txId) throw new Error("trackTransaction requires a transaction hash/ID");
    for (let poll = 0; poll < 300; poll++) {
      const tx = await client.getTransaction({ hash: txId });
      const rawStatus = String(tx?.statusName ?? tx?.status ?? "UNKNOWN").toUpperCase();
      const executionResult = tx?.txExecutionResultName ?? tx?.executionResultName ?? null;
      const isFinalized = rawStatus === "FINALIZED" || rawStatus === "CANCELED";
      const phase = isFinalized ? "finalized" : ["ACCEPTED", "UNDETERMINED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"].includes(rawStatus) ? "decided" : "processing";
      const status = {
        phase,
        genlayerTxId: txId,
        statusName: rawStatus,
        executionResultName: executionResult,
        successful: isFinalized && rawStatus === "FINALIZED" && executionResult === "FINISHED_WITH_RETURN",
      };
      onUpdate(status);
      if (isFinalized) return status;
      // The runtime's single shared provider gate also spaces GenLayerJS sub-requests at 2.6s.
      await new Promise((resolve) => setTimeout(resolve, 2600));
    }
    throw new Error(`Timed out waiting for finalization of ${txId}; transaction ID remains saved and must not be resubmitted.`);
  }

  async function trackTransaction(txId) {
    let last;
    await trackForTransactionKit(txId, (status) => { last = status; });
    const isFinal = last?.phase === "finalized";
    const executionResult = last?.executionResultName ?? null;
    return { rawStatus: last?.statusName ?? null, derived: { isFinal, success: last?.successful === true, executionResult }, raw: last };
  }

  return {
    getConnectedChainId: async () => Number(await client.getChainId()),
    getConnectedAccount: () => account,
    provider,
    writePreparedDraft,
    trackForTransactionKit,
    trackTransaction,
    submitIncident: writePreparedDraft,
    submitRecovery: writePreparedDraft,
    submitRemediation: writePreparedDraft,
    registerTarget: writePreparedDraft,
    revokeAuthority: writePreparedDraft,
    disableAction: writePreparedDraft,
    disableResource: writePreparedDraft,
    activatePolicy: writePreparedDraft,
    callKernel: writePreparedDraft,
  };
}
