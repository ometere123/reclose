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
import { createClient, studioDevnet } from "../vendor/genlayer-client.js";

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

  async function writePreparedDraft(draft) {
    if (!draft || typeof draft !== "object" || !draft.contractAddress || !draft.functionName || !Array.isArray(draft.args)) {
      throw new Error("writePreparedDraft requires a complete PreparedRecloseWrite draft (contractAddress/functionName/args)");
    }
    // Fee estimation and the actual write MUST refer to the exact same account/contract/method/
    // args/value - the draft's own feeEstimate (produced by the SDK's estimateTransactionFeesForWrite
    // over this exact call) is passed straight through rather than re-estimated or hand-bisected.
    // Prefer the COMPLETE fullFeeDetail (distribution + messageAllocations) when present; fall back
    // to the lossy distributionSummary-only shape only for a draft built before this remediation.
    const fullFeeDetail = draft.feeEstimate?.fullFeeDetail;
    const fees = fullFeeDetail
      ? {
          distribution: fullFeeDetail.distribution ?? undefined,
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

  // Item 2 (owner-directed remediation pass): a REAL GenLayerJS-client-backed tracker, used so
  // policy-journey steps get real lifecycle/execution-result confirmation in ordinary browser use
  // (no host-injected `__RECLOSE_PRODUCT_RUNTIME__.trackTransaction` required). This wraps the
  // pinned SDK's own `waitForTransactionReceipt` polling - it never reimplements lifecycle
  // semantics or guesses at a success value; `txExecutionResultName` and `lifecycle.state` are
  // read verbatim from the client's own response shape.
  async function trackTransaction(txId) {
    if (!txId) throw new Error("trackTransaction requires a transaction hash/ID");
    const tx = await client.waitForTransactionReceipt({ hash: txId, waitUntil: "decided", fullTransaction: true });
    const isFinal = tx?.lifecycle?.state === "decided";
    const executionResult = tx?.txExecutionResultName ?? null;
    // "FINISHED_WITH_RETURN" is the pinned genlayer-js package's own ExecutionResult enum value
    // for a successful execution - never a Reclose-invented success string.
    const success = executionResult === "FINISHED_WITH_RETURN";
    return {
      rawStatus: tx?.statusName ?? (tx?.status !== undefined ? String(tx.status) : null),
      derived: { isFinal, success, executionResult },
      raw: tx,
    };
  }

  return {
    getConnectedChainId: async () => Number(await client.getChainId()),
    getConnectedAccount: () => account,
    writePreparedDraft,
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
