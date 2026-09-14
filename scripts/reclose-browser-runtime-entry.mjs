// Browser runtime build entry. `__RECLOSE_DEPLOYMENT__` is injected from the committed,
// address-bearing Studio-dev generation manifest by build-frontend-vendor.mjs.
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { createTransactionKit } from "@genlayer/transaction-kit";
import { FeeReceipt, HoldToSign, Timeline, VerifyBadge, useTransactionFlow } from "@genlayer/transaction-kit-react";
import { createGenLayerTransport } from "../packages/protocol-sdk/src/genlayerAdapter.ts";
import { createRecloseClient } from "../packages/protocol-sdk/src/client.ts";
import { compileCanonicalApm } from "../packages/policy-compiler/src/canonicalApm.ts";
import { SdkProductAdapter } from "../frontend/lib/adapters.js";

const DEPLOYMENT = __RECLOSE_DEPLOYMENT__;
const RPC_SPACING_MS = 2600;
const RPC_TIMEOUT_MS = 15000;
let requestQueue = Promise.resolve();
let nextStudioRequestAt = 0;
let rpcSequence = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export { createClient, studioDevnet };

/** A single shared FIFO request gate. It serializes all Studio-dev calls made by the UI and keeps
 * request starts at least 2.6s apart (under 24/min); failures are returned as-is and never spawn
 * retry loops. */
function scheduleStudioRequest(operation) {
  const scheduled = requestQueue.then(async () => {
    const wait = Math.max(0, nextStudioRequestAt - Date.now());
    if (wait) await sleep(wait);
    nextStudioRequestAt = Date.now() + RPC_SPACING_MS;
    return operation();
  });
  requestQueue = scheduled.catch(() => undefined);
  return scheduled;
}

function createHttpRpcProvider(endpoint) {
  return {
    request({ method, params = [] }) {
      return scheduleStudioRequest(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
        let response;
        try {
          response = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcSequence, method, params }),
            signal: controller.signal,
          });
        } catch (error) {
          if (error?.name === "AbortError") throw new Error(`Studio-dev RPC timed out after ${RPC_TIMEOUT_MS / 1000}s (${method}). Check the network or RPC availability and retry.`);
          throw new Error(`Studio-dev RPC request failed (${method}): ${error?.message ?? String(error)}`);
        } finally {
          clearTimeout(timeout);
        }
        if (!response.ok) throw new Error(`Studio-dev RPC HTTP ${response.status}`);
        const payload = await response.json();
        if (payload.error) {
          const error = new Error(payload.error.message || "Studio-dev RPC error");
          error.code = payload.error.code;
          error.data = payload.error.data;
          throw error;
        }
        return payload.result;
      });
    },
  };
}

export function throttleWalletProvider(provider) {
  if (!provider || typeof provider.request !== "function") throw new Error("An EIP-1193 wallet provider is required");
  return {
    request(args) { return scheduleStudioRequest(() => provider.request(args)); },
    on(event, handler) { provider.on?.(event, handler); return this; },
    removeListener(event, handler) { provider.removeListener?.(event, handler); return this; },
  };
}

function makeIndexer(client, kernelAddress, targetId) {
  return {
    async listTargetIds() { return [targetId]; },
    async listIncidentIds() {
      const count = Number(await client.readContract({ address: kernelAddress, functionName: "get_target_incident_count", args: [targetId] }));
      if (!Number.isSafeInteger(count) || count < 0 || count > 500) throw new Error(`Kernel returned an invalid incident count: ${count}`);
      const ids = [];
      for (let index = 0; index < count; index++) {
        ids.push(String(await client.readContract({ address: kernelAddress, functionName: "get_target_incident_at", args: [targetId, index] })));
      }
      return ids;
    },
    getDeployment() {
      return {
        network: DEPLOYMENT.network,
        chainId: DEPLOYMENT.chainId,
        commit: DEPLOYMENT.sourceCommit,
        lastEvidenceAt: null,
        contracts: {
          kernel: DEPLOYMENT.contracts.AssuranceKernel.address,
          judge: DEPLOYMENT.contracts.IncidentJudgeV1.address,
          vault: DEPLOYMENT.contracts.IncentiveVault.address,
          target: DEPLOYMENT.contracts.ReferenceAgentProtocol.address,
          providerA: DEPLOYMENT.providers.providerA.address,
          providerB: DEPLOYMENT.providers.providerB.address,
        },
        liveLimitation: "This deployment manifest is pinned to source commit ac119d78118f2a701312723416b9c150816cd349. Its Judge/Kernel predate the lifecycle-specific decided emission fix. The isolated decided Parent simulation does not prove these deployed contracts match; writes are disabled until a matching deployment is verified.",
      };
    },
  };
}

export function createDefaultProductRuntime() {
  if (Number(DEPLOYMENT.chainId) !== 61997 || DEPLOYMENT.network !== "studio-dev") {
    throw new Error("The committed live deployment config is not the canonical Studio-dev chain 61997 generation.");
  }
  const endpoint = DEPLOYMENT.rpc || studioDevnet.rpcUrls.default.http[0];
  const provider = createHttpRpcProvider(endpoint);
  const client = createClient({ chain: studioDevnet, provider });
  const addresses = {
    kernel: DEPLOYMENT.contracts.AssuranceKernel.address,
    judge: DEPLOYMENT.contracts.IncidentJudgeV1.address,
    vault: DEPLOYMENT.contracts.IncentiveVault.address,
  };
  const sdk = createRecloseClient({ transport: createGenLayerTransport(client), addresses });
  const targetId = DEPLOYMENT.targetId;
  const indexer = makeIndexer(client, addresses.kernel, targetId);
  const writeBlockReason = "the active manifest generation predates the decided-phase contract change; verify or deploy a source-matched stack and policy before signing.";
  const adapter = new SdkProductAdapter(sdk, null, indexer, { compileCanonicalApm }, writeBlockReason);
  return {
    adapter,
    throttleWalletProvider,
    createTransactionKitSession,
    mountTransactionKitReview,
    deployment: DEPLOYMENT,
  };
}

function normalize(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
  return value;
}
function restoreBigInts(value) {
  if (Array.isArray(value)) return value.map(restoreBigInts);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, restoreBigInts(child)]));
  if (typeof value === "string" && /^-?\d+$/u.test(value)) return BigInt(value);
  return value;
}

/** Creates the official core kit for one exact PreparedRecloseWrite. The kit's release omits
 * messageAllocations from its quote fingerprint and built-in submit call. This narrow bridge uses
 * the kit for live fee-policy estimate/verification and React review flow, then submits the exact
 * SDK-produced allocation tree through Reclose's existing signer after checking every root field
 * still matches. No fee numbers or allocations are reconstructed. */
export function createTransactionKitSession({ account, provider, draft, writer, submitReviewedDraft, onSubmitted }) {
  const details = draft?.feeEstimate?.fullFeeDetail;
  if (!details?.distribution || !details.feeValue || (details.messageAllocations !== null && !Array.isArray(details.messageAllocations))) {
    throw new Error("Refusing Transaction Kit review: PreparedRecloseWrite has no complete SDK fee profile and allocation tree.");
  }
  const expectedDistribution = normalize(details.distribution);
  const userValue = BigInt(draft.valueWei ?? "0");
  const tx = { kind: "write", address: draft.contractAddress, method: draft.functionName, args: draft.args };
  const baseKit = createTransactionKit({ chain: studioDevnet, provider, account });

  const kit = {
    allowUnverified: false,
    async estimate(_input) {
      const quote = await baseKit.estimate({
        preset: "standard",
        overrides: restoreBigInts(expectedDistribution),
        userValue,
      }, tx);
      if (JSON.stringify(normalize(quote.distribution)) !== JSON.stringify(expectedDistribution)) {
        throw new Error("Transaction Kit distribution differs from the exact Reclose SDK profile; signing is blocked.");
      }
      if (quote.feeValue !== BigInt(details.feeValue) || quote.userValue !== userValue) {
        throw new Error("Transaction Kit fee/value estimate differs from the exact Reclose SDK profile; signing is blocked.");
      }
      return quote;
    },
    async submit(quote) {
      if (quote.verification.status !== "verified") throw new Error(`Transaction Kit fee policy is ${quote.verification.status}; signing requires a verified current policy.`);
      const result = await submitReviewedDraft(draft, quote);
      if (!result?.txId) throw new Error("Wallet writer returned no GenLayer transaction ID.");
      onSubmitted?.(result);
      return { genlayerTxId: result.txId };
    },
    async track(txId, onUpdate) {
      return writer.trackForTransactionKit(txId, onUpdate);
    },
    async cancel(args) { return baseKit.cancel(args); },
    async topUp(args) { return baseKit.topUp(args); },
    verification(quote, submittedTx) {
      const result = baseKit.verification(quote, submittedTx);
      return { ...result, summary: { ...result.summary, messageAllocationCount: String((details.messageAllocations ?? []).length), allocationTree: "Reclose SDK prepared profile" } };
    },
  };
  return { kit, tx, allocationCount: (details.messageAllocations ?? []).length };
}

function TransactionReview({ kit, tx, allocationCount, writesBlocked, onDone, onError }) {
  const flow = useTransactionFlow({ kit, tx, trackUntil: "finalized" });
  useEffect(() => {
    if (flow.state.step === "done") onDone?.(flow.state.status);
  }, [flow.state, onDone]);
  useEffect(() => {
    if (flow.state.step === "error") onError?.(new Error(flow.state.message));
  }, [flow.state, onError]);
  const busy = ["estimating", "signing", "tracking"].includes(flow.state.step);
  return React.createElement("section", { className: "gltk-panel", "aria-label": "Transaction Kit review" },
    React.createElement("p", { className: "gltk-eyebrow" }, "GenLayer Transaction Kit · 0.1.0-rc.2"),
      React.createElement("p", null, `This reviewed Reclose transaction retains ${allocationCount} estimator-produced nested message allocation(s). The official kit fee-policy check covers the root distribution; Reclose verifies and preserves the nested allocation tree.`),
    flow.state.step === "error" ? React.createElement("pre", { role: "alert" }, flow.state.message) : null,
    flow.state.step === "blocked" ? React.createElement("p", { role: "alert" }, flow.state.message) : null,
    flow.quote ? React.createElement(FeeReceipt, { quote: flow.quote, busy }) : null,
    flow.quote ? React.createElement(VerifyBadge, { feeConfigHash: flow.verification?.feeConfigHash, status: flow.quote.verification.status }) : null,
    flow.state.step === "tracking" || flow.state.step === "done" ? React.createElement(Timeline, { status: flow.state.status }) : null,
    writesBlocked ? React.createElement("p", { role: "alert" }, `Live signing is paused: ${writesBlocked}`) : null,
    flow.state.step === "review" && flow.quote ? React.createElement(HoldToSign, {
      onConfirm: () => void flow.approve(),
      disabled: busy || writesBlocked || flow.quote.verification.status !== "verified",
      label: "Confirm in wallet",
    }) : null,
    flow.state.step === "done" ? React.createElement("p", { role: "status" }, `Final transaction status: ${flow.state.status.statusName || flow.state.status.phase}; execution: ${flow.state.status.executionResultName || "unavailable"}.`) : null,
    flow.state.step === "error" ? React.createElement("button", { type: "button", onClick: flow.reset }, "Re-estimate") : null,
  );
}

export function mountTransactionKitReview(container, props) {
  const root = createRoot(container);
  root.render(React.createElement(TransactionReview, props));
  return () => root.unmount();
}
