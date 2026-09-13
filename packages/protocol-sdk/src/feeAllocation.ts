/**
 * A2-C01 fix: nested/composed message-allocation tree builder.
 *
 * Context (see docs/execution/C2 Live Proof Evidence.md and
 * docs/execution/audit-packets/A3-attempt-2): on Studio-dev (chain 61997, pinned genlayer-js
 * 2.0.0-rc.1), `IncidentJudgeV1.submit_incident` genuinely triggers a child transaction that calls
 * `AssuranceKernel.receive_decision` (confirmed live via `getTriggeredTransactionIds`). That CHILD
 * transaction's own execution fails with the exact payload `fee no_matching_allocation # internal`
 * whenever the decision is FINAL/CONFIRMED and the Kernel's own `_apply_final_incident` path goes
 * on to dispatch an effect, which synchronously emits a FURTHER outbound internal message from the
 * Kernel to `ReferenceAgentProtocol.apply_assurance_action`
 * (contracts/assurance_kernel.py::_dispatch_action, `gl.contract.get_at(...).emit(...).apply_assurance_action(...)`).
 *
 * `genlayer-js@2.0.0-rc.1`'s `estimateTransactionFeesForWrite` simulates only the ROOT call
 * (Judge.submit_incident) and builds a message-allocation tree from that single simulation's own
 * `feeReport`/`feeAccounting`. It has no way to know, from that one simulation, that the CHILD
 * transaction it triggers will itself need to emit a second-hop message - the Kernel's
 * `receive_decision` execution (and therefore its own outbound call) happens in a LATER,
 * separate consensus transaction, never recursively simulated by the root's own
 * `simulateWriteContract`. The root-level allocation tree this repo's existing
 * `scripts/fee-profile.mjs`/`DirectRecloseClient.feePreview` path produces is therefore flat/
 * one-level: it contains an allocation node for the Judge -> Kernel message, but NOTHING for the
 * Kernel's own further Kernel -> Target message, which is exactly the node the child transaction's
 * execution-time fee lookup cannot find - producing `no_matching_allocation # internal`.
 *
 * This module fixes that by composing the tree explicitly:
 *  1. Estimate/simulate the ROOT call (e.g. Judge.submit_incident) to get its own one-level
 *     allocation tree - this already contains the Judge -> Kernel node.
 *  2. Separately estimate/simulate the CHILD call the root triggers (Kernel.receive_decision),
 *     USING THE JUDGE AS THE SIMULATED CALLER (since `gl.message.sender_address` inside the Kernel
 *     must be the Judge for `receive_decision` to pass `_require(gl.message.sender_address == rule.judge, ...)`),
 *     to get the allocation nodes the CHILD's OWN execution needs for its Kernel -> Target message.
 *  3. Graft those child-level nodes underneath the root tree's Judge -> Kernel node by rewriting
 *     `parentIndex`: any child node whose `parentIndex` was the child's own tree root
 *     (`MESSAGE_ALLOCATION_ROOT_PARENT_INDEX`) is re-parented to point at the absolute index of the
 *     Judge -> Kernel node in the MERGED array; every other child node's `parentIndex` is shifted by
 *     the same offset, preserving the child's own internal nesting.
 *
 * The composed tree is a flat `MessageFeeAllocationNode[]` (parentIndex-addressed, per
 * genlayer-js's own `MessageFeeAllocationNode`/`normalizeMessageFeeAllocations` model) that can be
 * passed straight back into the REAL top-level write/estimate call via `fees.messageAllocations` -
 * this module never hand-invents fee arithmetic (CLAUDE.md Section 34); every budget/feeParams
 * value it grafts is one genlayer-js itself already computed from a real simulation.
 *
 * This generalizes beyond the two-hop Judge->Kernel->Target case: `composeNestedCalls` accepts an
 * arbitrary chain of calls (no-effect stops after the root; one-effect/multi-effect/bonded/
 * remediation/recovery all differ only in which calls are included in the chain and what args they
 * carry), so it is reusable for every message topology described in CLAUDE.md Section 20/37, not a
 * one-off script.
 */

/** Local structural alias - this package's `types.ts` does not define a `Hex` type of its own, and
 * genlayer-js's own `Hex` is an internal RC detail this module should not import directly. */
export type Hex = `0x${string}`;

export interface MessageFeeAllocationNodeLike {
  messageType: unknown;
  onAcceptance: boolean;
  parentIndex: bigint;
  recipient: string;
  callKey: Hex;
  budget: bigint;
  feeParams: Hex;
}

export interface NestedAllocationCallSpec {
  /** Contract address this call is made against. */
  address: string;
  functionName: string;
  args?: unknown[];
  value?: bigint;
  /** Account/caller identity to simulate the call as - REQUIRED for every call except the root,
   * since the callee's own authorization checks (e.g. Kernel's WRONG_JUDGE check) depend on the
   * real upstream caller's identity, not the tree's ultimate root signer. */
  account?: unknown;
}

/**
 * Structural subset of the genlayer-js@2.0.0-rc.1 client this module needs. Kept structural (like
 * `RecloseTransport`/`GenLayerJsClientLike`) so this module never depends on genlayer-js's full
 * exported client type, only the exact real methods it calls.
 */
export interface NestedFeeEstimationClient {
  estimateTransactionFeesForWrite(args: {
    account?: unknown;
    address: string;
    functionName: string;
    args?: unknown[];
    value?: unknown;
  }): Promise<{
    distribution: unknown;
    messageAllocations?: Array<{
      messageType: unknown;
      onAcceptance?: boolean;
      parentIndex?: unknown;
      recipient: string;
      callKey?: Hex;
      budget?: unknown;
      feeParams?: Hex;
    }>;
    feeValue: unknown;
  }>;
}

/** Mirrors genlayer-js's own `MESSAGE_ALLOCATION_ROOT_PARENT_INDEX` sentinel value exactly - the
 * caller MUST pass the real constant genlayer-js exports (`import { MESSAGE_ALLOCATION_ROOT_PARENT_INDEX } from "genlayer-js"`)
 * rather than this module guessing it, since the exact sentinel is an internal genlayer-js detail
 * this package does not own and must not re-derive independently (CLAUDE.md Section 21: do not
 * duplicate protocol semantics independently). */
export interface NestedAllocationConstants {
  rootParentIndex: bigint;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  return 0n;
}

function normalizeNode(raw: {
  messageType: unknown;
  onAcceptance?: boolean;
  parentIndex?: unknown;
  recipient: string;
  callKey?: Hex;
  budget?: unknown;
  feeParams?: Hex;
}): MessageFeeAllocationNodeLike {
  return {
    messageType: raw.messageType,
    onAcceptance: Boolean(raw.onAcceptance),
    parentIndex: toBigInt(raw.parentIndex ?? 0),
    recipient: raw.recipient,
    callKey: (raw.callKey ?? "0x") as Hex,
    budget: toBigInt(raw.budget ?? 0),
    feeParams: (raw.feeParams ?? "0x") as Hex,
  };
}

/** A single grafted estimation step's result, kept for diagnostics/tests - never swallowed. */
export interface NestedAllocationStepResult {
  address: string;
  functionName: string;
  allocations: MessageFeeAllocationNodeLike[];
  feeValue: bigint;
}

export interface NestedAllocationTree {
  /** The composed, parentIndex-nested allocation array - pass this directly as
   * `fees.messageAllocations` on the REAL root write/estimate call. */
  messageAllocations: MessageFeeAllocationNodeLike[];
  /** Sum of every node's budget in the composed tree - the full nested fee budget the root
   * transaction must fund, independent of whatever `feeValue`/`distribution.totalMessageFees` the
   * root-only simulation alone reported. */
  totalMessageFees: bigint;
  /** Root-call-only estimate, returned as observed (diagnostics / regression evidence). */
  rootFeeValue: bigint;
  /** Per-step raw results, in call order, for audit/evidence logging. */
  steps: NestedAllocationStepResult[];
}

/**
 * Composes a nested message-allocation tree for an arbitrary chain of calls: `root` is the
 * top-level write (e.g. Judge.submit_incident); `chain` is the ordered list of further calls each
 * triggers in turn (e.g. [Kernel.receive_decision, ...] - each entry's `account` MUST be the
 * upstream caller that would actually invoke it on-chain, e.g. the Judge contract's own address for
 * the Kernel call, so the callee's own sender-identity checks are satisfied during simulation).
 *
 * An empty `chain` degenerates to exactly today's existing flat one-level estimate (no-effect /
 * provisional-only branches that never reach a second hop) - this function is a strict superset of
 * the current behaviour, not a replacement that could regress a working branch.
 */
export async function buildNestedMessageAllocationTree(
  client: NestedFeeEstimationClient,
  root: NestedAllocationCallSpec,
  chain: NestedAllocationCallSpec[],
  constants: NestedAllocationConstants
): Promise<NestedAllocationTree> {
  const steps: NestedAllocationStepResult[] = [];

  const rootEstimate = await client.estimateTransactionFeesForWrite({
    account: root.account,
    address: root.address,
    functionName: root.functionName,
    args: root.args ?? [],
    value: root.value ?? 0n,
  });
  let merged: MessageFeeAllocationNodeLike[] = (rootEstimate.messageAllocations ?? []).map(normalizeNode);
  steps.push({ address: root.address, functionName: root.functionName, allocations: merged, feeValue: toBigInt(rootEstimate.feeValue) });
  const rootFeeValue = toBigInt(rootEstimate.feeValue);

  // The node representing "root's own call into the NEXT hop" is whichever node in the current
  // merged tree targets the next hop's own address - this is exactly the node the next hop's own
  // grafted subtree must be re-parented under, since that node IS the message that delivers the
  // next hop's triggering call.
  let previousCallAddress = root.address;
  for (const step of chain) {
    const parentNodeIndex = merged.findIndex((n) => n.recipient.toLowerCase() === step.address.toLowerCase());
    if (parentNodeIndex === -1) {
      throw new Error(
        `buildNestedMessageAllocationTree: no allocation node targeting ${step.address} (function "${step.functionName}") was found in the tree produced so far (from ${previousCallAddress}) - cannot graft its nested subtree under a node that does not exist. This means the upstream call's own estimate did not report an outbound message to this recipient at all; re-check the call chain order and arguments before assuming this is the A2-C01 second-hop gap.`
      );
    }

    const stepEstimate = await client.estimateTransactionFeesForWrite({
      account: step.account,
      address: step.address,
      functionName: step.functionName,
      args: step.args ?? [],
      value: step.value ?? 0n,
    });
    const stepAllocations = (stepEstimate.messageAllocations ?? []).map(normalizeNode);
    steps.push({ address: step.address, functionName: step.functionName, allocations: stepAllocations, feeValue: toBigInt(stepEstimate.feeValue) });

    const offset = BigInt(merged.length);
    const grafted = stepAllocations.map((node) => ({
      ...node,
      parentIndex: node.parentIndex === constants.rootParentIndex ? BigInt(parentNodeIndex) : offset + node.parentIndex,
    }));
    merged = merged.concat(grafted);
    previousCallAddress = step.address;
  }

  const rolledUp = rollUpNestedBudgets(merged, constants.rootParentIndex);

  // A2-C01 live retest (release-evidence/r1/a2-c01-live-retest-evidence.md, attempts 1-3) showed
  // the PRE-FIX tree - grafted parentIndex relinking with every node's budget left exactly as its
  // own single-hop simulation reported - is rejected live as `MessageAllocationsNotEqualBudget`
  // (direct write) and `AllocationTreeBudgetInconsistent` (re-estimation). The root cause: a
  // parent node's budget, as reported by simulating ONLY that node's own hop, covers only that
  // node's own message cost - it was never told it would also need to fund every message grafted
  // beneath it. Studio-dev's on-chain envelope-acceptance check enforces that a parent allocation's
  // budget is sufficient to cover its own cost PLUS everything nested under it (the invariant
  // CLAUDE.md Section 34 requires us to satisfy via the estimator's own numbers, not hand-invented
  // arithmetic - every figure rolled up here is still exactly one of genlayer-js's own per-hop
  // `budget` values, just summed bottom-up instead of left flat). `rollUpNestedBudgets` performs
  // that summation; `totalMessageFees` is then the sum of only the TOP-LEVEL (root-parented) nodes'
  // post-rollup budgets, since those top-level budgets already transitively include every nested
  // node's budget exactly once - summing every node in the flat array (the pre-fix behaviour) would
  // double-count nested costs and is itself a contributor to the live budget-mismatch failures.
  const totalMessageFees = rolledUp
    .filter((n) => n.parentIndex === constants.rootParentIndex)
    .reduce((sum, n) => sum + n.budget, 0n);
  return { messageAllocations: rolledUp, totalMessageFees, rootFeeValue, steps };
}

/**
 * Rolls up every node's budget so that a parent's budget equals its own originally-estimated cost
 * plus the (already rolled-up) budget of every node grafted beneath it, transitively. Nodes are
 * always appended to `merged` in an order where every node's parentIndex refers to a LOWER index
 * (a node can only be grafted under a node that already exists in the merged array), so iterating
 * from the last index to the first guarantees a node's own rollup is finalized (all of ITS children
 * already folded in) before that node's budget is folded into ITS parent - a single backward pass
 * is sufficient, no recursion needed.
 */
function rollUpNestedBudgets(
  nodes: MessageFeeAllocationNodeLike[],
  rootParentIndex: bigint
): MessageFeeAllocationNodeLike[] {
  const rolled = nodes.map((n) => ({ ...n }));
  for (let i = rolled.length - 1; i >= 0; i--) {
    const node = rolled[i];
    if (!node || node.parentIndex === rootParentIndex) continue;
    const parentIdx = Number(node.parentIndex);
    if (!Number.isInteger(parentIdx) || parentIdx < 0 || parentIdx >= rolled.length) continue;
    const parent = rolled[parentIdx];
    if (!parent) continue;
    rolled[parentIdx] = { ...parent, budget: parent.budget + node.budget };
  }
  return rolled;
}

/**
 * Convenience wrapper for the exact A2-C01 topology (Judge -> Kernel -> Target): builds the nested
 * tree and returns the composed `messageAllocations` ready to pass as `fees.messageAllocations` on
 * the real `submit_incident` write, plus the budget total for evidence logging. Still generic
 * underneath (`buildNestedMessageAllocationTree`) - this wrapper only fixes the call order/shape
 * specific to the Judge->Kernel->Target dispatch, so no-effect/remediation/recovery callers should
 * use `buildNestedMessageAllocationTree` directly with their own chain.
 */
export async function buildJudgeKernelTargetAllocationTree(
  client: NestedFeeEstimationClient,
  args: {
    judge: NestedAllocationCallSpec;
    kernel: NestedAllocationCallSpec;
    target?: NestedAllocationCallSpec;
  },
  constants: NestedAllocationConstants
): Promise<NestedAllocationTree> {
  const chain: NestedAllocationCallSpec[] = [args.kernel];
  if (args.target) chain.push(args.target);
  return buildNestedMessageAllocationTree(client, args.judge, chain, constants);
}
