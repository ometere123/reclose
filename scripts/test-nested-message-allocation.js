"use strict";

// A2-C01 fix coverage: proves packages/protocol-sdk/src/feeAllocation.ts's
// buildNestedMessageAllocationTree composes a CORRECT nested allocation tree from a chain of
// mocked per-call estimates (mocking genlayer-js's own estimateTransactionFeesForWrite responses -
// never hand-inventing fee arithmetic, just proving the GRAFTING logic is right). No live network
// access is required or attempted here.

const assert = require("node:assert/strict");
const path = require("node:path");
const sdk = require(path.join(__dirname, "..", "packages", "protocol-sdk", "dist", "index.js"));

let passed = 0;
const total = 7;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

// The exact value of genlayer-js's MESSAGE_ALLOCATION_ROOT_PARENT_INDEX sentinel does not matter to
// these tests - only that it is used CONSISTENTLY (as the real caller must import it from
// genlayer-js itself, never guess it - see feeAllocation.ts's NestedAllocationConstants doc).
const ROOT_PARENT_INDEX = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
const CONSTANTS = { rootParentIndex: ROOT_PARENT_INDEX };

const JUDGE = "0x1111111111111111111111111111111111111111";
const KERNEL = "0x2222222222222222222222222222222222222222";
const TARGET = "0x3333333333333333333333333333333333333333";

function makeClient(responsesByAddress) {
  const calls = [];
  return {
    calls,
    async estimateTransactionFeesForWrite(args) {
      calls.push(args);
      const response = responsesByAddress[args.address.toLowerCase()];
      if (!response) throw new Error(`unexpected estimate call for ${args.address}`);
      return response;
    },
  };
}

async function main() {
  await test("no-effect chain degenerates to the existing flat one-level tree", async () => {
    const client = makeClient({
      [JUDGE.toLowerCase()]: {
        distribution: {},
        feeValue: 1000n,
        messageAllocations: [
          { messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: KERNEL, callKey: "0xaaa", budget: 500n, feeParams: "0x" },
        ],
      },
    });
    const tree = await sdk.buildNestedMessageAllocationTree(client, { address: JUDGE, functionName: "submit_incident" }, [], CONSTANTS);
    assert.equal(tree.messageAllocations.length, 1);
    assert.equal(tree.messageAllocations[0].parentIndex, ROOT_PARENT_INDEX);
    assert.equal(tree.totalMessageFees, 500n);
    assert.equal(client.calls.length, 1);
  });

  await test("Judge -> Kernel -> Target grafts the Kernel's own second-hop node under the Judge->Kernel node", async () => {
    const client = makeClient({
      [JUDGE.toLowerCase()]: {
        distribution: {},
        feeValue: 1000n,
        messageAllocations: [
          { messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: KERNEL, callKey: "0xjudge_to_kernel", budget: 500n, feeParams: "0x" },
        ],
      },
      [KERNEL.toLowerCase()]: {
        distribution: {},
        feeValue: 700n,
        messageAllocations: [
          { messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: TARGET, callKey: "0xkernel_to_target", budget: 300n, feeParams: "0x" },
        ],
      },
    });

    const tree = await sdk.buildNestedMessageAllocationTree(
      client,
      { address: JUDGE, functionName: "submit_incident" },
      [{ address: KERNEL, functionName: "receive_decision", account: JUDGE }],
      CONSTANTS
    );

    assert.equal(tree.messageAllocations.length, 2, "composed tree must contain both the Judge->Kernel node and the grafted Kernel->Target node");
    const judgeToKernel = tree.messageAllocations[0];
    const kernelToTarget = tree.messageAllocations[1];
    assert.equal(judgeToKernel.recipient, KERNEL);
    assert.equal(judgeToKernel.parentIndex, ROOT_PARENT_INDEX, "the root node's own parent must remain the tree root, unchanged by grafting");
    assert.equal(kernelToTarget.recipient, TARGET);
    assert.equal(kernelToTarget.parentIndex, 0n, "the grafted node must be re-parented to index 0 (the Judge->Kernel node), NOT left pointing at the child's own tree root");
    assert.equal(tree.totalMessageFees, 800n, "total nested budget must cover BOTH hops (500 + 300), not just the root-only 500");

    const kernelCall = client.calls.find((c) => c.address === KERNEL);
    assert.equal(kernelCall.account, JUDGE, "the Kernel-level estimate must be simulated AS the Judge (the real upstream caller), for gl.message.sender_address == rule.judge to hold during simulation");
  });

  await test("deeper chains shift deeper parentIndex values by the correct offset, not just re-parenting root-level nodes", async () => {
    const client = makeClient({
      [JUDGE.toLowerCase()]: {
        distribution: {}, feeValue: 1n,
        messageAllocations: [{ messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: KERNEL, callKey: "0xa", budget: 10n, feeParams: "0x" }],
      },
      [KERNEL.toLowerCase()]: {
        distribution: {}, feeValue: 1n,
        messageAllocations: [
          { messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: TARGET, callKey: "0xb", budget: 20n, feeParams: "0x" },
          { messageType: "Internal", parentIndex: 0n, recipient: TARGET, callKey: "0xc", budget: 5n, feeParams: "0x" },
        ],
      },
    });

    const tree = await sdk.buildNestedMessageAllocationTree(
      client,
      { address: JUDGE, functionName: "submit_incident" },
      [{ address: KERNEL, functionName: "receive_decision", account: JUDGE }],
      CONSTANTS
    );

    assert.equal(tree.messageAllocations.length, 3);
    assert.equal(tree.messageAllocations[0].parentIndex, ROOT_PARENT_INDEX);
    assert.equal(tree.messageAllocations[1].parentIndex, 0n);
    assert.equal(tree.messageAllocations[2].parentIndex, 1n, "a node nested under the child's own index 0 must shift to point at 1 (offset 1 + old parentIndex 0) in the merged tree");
  });

  await test("duplicate call-keys across hops are preserved distinctly, never collapsed", async () => {
    const client = makeClient({
      [JUDGE.toLowerCase()]: {
        distribution: {}, feeValue: 1n,
        messageAllocations: [{ messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: KERNEL, callKey: "0xsame", budget: 10n, feeParams: "0x" }],
      },
      [KERNEL.toLowerCase()]: {
        distribution: {}, feeValue: 1n,
        messageAllocations: [{ messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: TARGET, callKey: "0xsame", budget: 20n, feeParams: "0x" }],
      },
    });
    const tree = await sdk.buildNestedMessageAllocationTree(
      client, { address: JUDGE, functionName: "submit_incident" },
      [{ address: KERNEL, functionName: "receive_decision", account: JUDGE }], CONSTANTS
    );
    assert.equal(tree.messageAllocations.length, 2, "two distinct nodes must survive even with an identical callKey string");
    assert.equal(tree.messageAllocations[0].callKey, "0xsame");
    assert.equal(tree.messageAllocations[1].callKey, "0xsame");
    assert.notEqual(tree.messageAllocations[0].recipient, tree.messageAllocations[1].recipient);
  });

  await test("a specific node placed ahead of a wildcard-style node keeps its own index through grafting", async () => {
    const WILDCARD = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    const client = makeClient({
      [JUDGE.toLowerCase()]: {
        distribution: {}, feeValue: 1n,
        messageAllocations: [
          { messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: KERNEL, callKey: "0xspecific_receive_decision", budget: 10n, feeParams: "0x" },
          { messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: KERNEL, callKey: WILDCARD, budget: 1n, feeParams: "0x" },
        ],
      },
      [KERNEL.toLowerCase()]: {
        distribution: {}, feeValue: 1n,
        messageAllocations: [{ messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: TARGET, callKey: "0xkt", budget: 5n, feeParams: "0x" }],
      },
    });
    const tree = await sdk.buildNestedMessageAllocationTree(
      client, { address: JUDGE, functionName: "submit_incident" },
      [{ address: KERNEL, functionName: "receive_decision", account: JUDGE }], CONSTANTS
    );
    // Grafting must attach under the FIRST node addressed to the next hop (index 0, the specific
    // node) - not the wildcard node that happens to share the same recipient - proving order is
    // preserved and the specific node is never displaced by a later wildcard entry.
    assert.equal(tree.messageAllocations[0].callKey, "0xspecific_receive_decision");
    assert.equal(tree.messageAllocations[1].callKey, WILDCARD);
    assert.equal(tree.messageAllocations[2].parentIndex, 0n, "grafted subtree must attach under index 0 (the specific node), matching genlayer-js's own precedence of a specific call-key match over the wildcard fallback");
  });

  await test("buildJudgeKernelTargetAllocationTree wires the exact A2-C01 topology end to end", async () => {
    const client = makeClient({
      [JUDGE.toLowerCase()]: {
        distribution: {}, feeValue: 1n,
        messageAllocations: [{ messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: KERNEL, callKey: "0xjk", budget: 40n, feeParams: "0x" }],
      },
      [KERNEL.toLowerCase()]: {
        distribution: {}, feeValue: 1n,
        messageAllocations: [{ messageType: "Internal", parentIndex: ROOT_PARENT_INDEX, recipient: TARGET, callKey: "0xkt", budget: 15n, feeParams: "0x" }],
      },
    });
    const tree = await sdk.buildJudgeKernelTargetAllocationTree(
      client,
      { judge: { address: JUDGE, functionName: "submit_incident" }, kernel: { address: KERNEL, functionName: "receive_decision", account: JUDGE } },
      CONSTANTS
    );
    assert.equal(tree.messageAllocations.length, 2);
    assert.equal(tree.totalMessageFees, 55n);
  });

  await test("missing graft target (no node addressed to the next hop) fails loudly instead of silently dropping the hop", async () => {
    const client = makeClient({
      [JUDGE.toLowerCase()]: { distribution: {}, feeValue: 1n, messageAllocations: [] },
    });
    await assert.rejects(
      () => sdk.buildNestedMessageAllocationTree(client, { address: JUDGE, functionName: "submit_incident" }, [{ address: KERNEL, functionName: "receive_decision", account: JUDGE }], CONSTANTS),
      /no allocation node targeting/
    );
  });

  console.log(`\n${passed}/${total} nested message-allocation tests passed`);
  if (passed !== total) process.exit(1);
}

main().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});
