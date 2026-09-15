#!/usr/bin/env node
// A2-C01 live retest: build the real EAP for a fresh zero-bond PROVIDER_COMPROMISE_V1 report
// against the current R1 deployment (reclose-target-003 / policy-r1-004), then use the new
// buildJudgeKernelTargetAllocationTree (packages/protocol-sdk/src/feeAllocation.ts) to compose a
// nested Judge->Kernel->Target allocation tree from REAL genlayer-js estimates (never hand-invented
// fee arithmetic), and print the exact --fees JSON / --fee-value / --args for
// `genlayer write <judge> submit_incident ...` (scripts/studio-dev-write.sh's own pattern, with the
// nested tree substituted for the flat one-level estimate that path used before).
//
// READ-ONLY: never signs or sends anything. The `account` objects passed to genlayer-js here are
// bare {address,type} structs used only to make the simulation's `gl.message.sender_address` match
// the real on-chain caller at each hop (Judge at the root, Kernel when simulating the second hop) -
// no private key material is touched, per CLAUDE.md Section 45 and the nested-allocation module's
// own interface contract (NestedAllocationCallSpec.account is a structural `unknown`).

import { createClient, chains, MESSAGE_ALLOCATION_ROOT_PARENT_INDEX } from "genlayer-js";
import { buildJudgeKernelTargetAllocationTree } from "../packages/protocol-sdk/dist/feeAllocation.js";
import { buildEap } from "../packages/protocol-sdk/dist/evidence.js";

const STUDIO_DEV_CHAIN_ID = 61997;
const STUDIO_DEV_RPC = "https://studio-next.genlayer.com/api";

const JUDGE = "0xBB79117f59fF62a83bD5961D58818e0D2575487e";
const KERNEL = "0x056E745A74ABf2A31CbC0796eECE0431Bc5C8c71";
const TARGET_CONTRACT = "0x6475f071238B0af38b0d36b90c6a621D3baeD52D";
const DEPLOYER = "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd";
const TARGET_ID = "reclose-target-004";
const POLICY_KEY = "policy-r1-005";
const POLICY_HASH = "0xa9f270f3d28fdbc8f9d14d571450a47387082460c8fe3a97a09532bb1a8927eb";
const RULE_ID = "PROVIDER_COMPROMISE_V1";
const RESOURCE_ID = "provider_a";
const REPORTER_NONCE = 1; // confirmed via get_reporter_nonce after the first (UNDETERMINED) incident

async function main() {
  const chain = { ...chains.studioDevnet, id: STUDIO_DEV_CHAIN_ID, rpcUrls: { default: { http: [STUDIO_DEV_RPC] } } };
  if (chain.id !== STUDIO_DEV_CHAIN_ID) {
    console.error(`REFUSING: expected chain ID ${STUDIO_DEV_CHAIN_ID}, got ${chain.id}`);
    process.exit(1);
  }
  const client = createClient({ chain });
  const reportedChainId = await client.getChainId();
  if (Number(reportedChainId) !== STUDIO_DEV_CHAIN_ID) {
    console.error(`REFUSING: RPC reports chain ID ${reportedChainId}, expected ${STUDIO_DEV_CHAIN_ID}`);
    process.exit(1);
  }

  const observedAt = new Date().toISOString();
  const eapObject = JSON.parse(
    buildEap({
      targetId: TARGET_ID,
      policyHash: POLICY_HASH,
      ruleId: RULE_ID,
      subject: "Provider A credential compromise (A2-C01 nested-allocation live retest, zero-bond)",
      reporter: DEPLOYER,
      observedAt,
      retrievedAt: observedAt,
      sources: [
        {
          sourceId: "genlayer-project-boilerplate",
          url: "https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate/main/README.md",
          sourceClass: "INDEPENDENT_PUBLIC",
          extractedText:
            "Security bulletin: ProviderStubA operator private key was exposed in a public commit and used by an unauthorized third party to submit unauthorized fulfill() calls. The operator has confirmed credential compromise and rotated keys. This is a confirmed, verified credential compromise, independently corroborated by a second source below.",
          retrievedAt: observedAt,
        },
        {
          sourceId: "reclose-reference-evidence",
          url: "https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate/main/LICENSE",
          sourceClass: "CONTENT_ADDRESSED_SNAPSHOT",
          extractedText:
            "Independent corroboration: ProviderStubA's operator has publicly acknowledged unauthorized third-party control of its private key resulted in unauthorized fulfill() calls being submitted on its behalf. This is confirmed, active credential compromise with unauthorized control of the provider account, not a rumor or unverified report.",
          // ROOT-CAUSE FIX (see docs/execution/Current Phase.md, root-cause diagnostic session):
          // this field was previously ABSENT here. contracts/incident_judge_v1.py's
          // `_parse_and_validate_eap` unconditionally requires a non-empty, registry-bound
          // `snapshotRef` for every CONTENT_ADDRESSED_SNAPSHOT source (independently re-fetched
          // and hash-verified in `_evaluate_once` before it is ever used for judgment) - an EAP
          // missing it is deterministically rejected with `gl.vm.UserError("E_JDG_EVIDENCE:
          // CONTENT_ADDRESSED_SNAPSHOT requires a non-empty snapshotRef")` before any nondet/LLM
          // call is ever made, regardless of `extractedText` content, length, or source position.
          // `packages/protocol-sdk/src/evidence.ts::validateEap` already enforces this identical
          // rule client-side (and `buildEap` already throws on it) - this script had simply gone
          // stale relative to that hardening. Reusing `url` as `snapshotRef` here mirrors this
          // repository's own test fixtures (tests/judge/test_content_snapshot_diagnostic.py).
          snapshotRef: "https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate/main/LICENSE",
          retrievedAt: observedAt,
        },
      ],
    })
  );

  const evidenceHash = eapObject.artifactHash;
  const evidenceJson = JSON.stringify(eapObject);
  const submitArgs = [TARGET_ID, POLICY_KEY, RULE_ID, RESOURCE_ID, evidenceHash, evidenceJson, REPORTER_NONCE, ""];

  const judgeAccount = { address: DEPLOYER, type: "json-rpc" };
  const kernelAsJudgeAccount = { address: JUDGE, type: "json-rpc" };

  const rootEstimateForDistribution = await client.estimateTransactionFeesForWrite({
    account: judgeAccount,
    address: JUDGE,
    functionName: "submit_incident",
    args: submitArgs,
    value: 0n,
  });

  const tree = await buildJudgeKernelTargetAllocationTree(
    client,
    {
      judge: { address: JUDGE, functionName: "submit_incident", args: submitArgs, account: judgeAccount },
      kernel: {
        address: KERNEL,
        functionName: "receive_decision",
        account: kernelAsJudgeAccount,
        // receive_decision's own args are NOT what get dispatched live (the CHILD transaction's
        // real args are produced by the Judge's own on-chain call, not this script) - for
        // SIMULATION purposes only we pass a representative decision shape so genlayer-js can
        // simulate the Kernel's resulting _apply_final_incident -> _dispatch_action outbound
        // message and report its own real allocation nodes. This mirrors exactly what the Judge's
        // actual call site sends (see contracts/incident_judge_v1.py's receive_decision call and
        // contracts/assurance_kernel.py::receive_decision's signature).
        args: [
          `${TARGET_ID}:${DEPLOYER.toLowerCase()}:${REPORTER_NONCE}`,
          "",
          TARGET_ID,
          POLICY_KEY,
          1, // fresh deployment, single seal/activation - policy_generation confirmed 1 via
             // get_target_details against reclose-target-004
          POLICY_HASH,
          RULE_ID,
          RESOURCE_ID,
          DEPLOYER,
          evidenceHash,
          3, // DECISION_OUTCOME_UNDETERMINED
          "INSUFFICIENT_EVIDENCE",
          2, // DECISION_STAGE_FINAL
          1,
        ],
      },
    },
    { rootParentIndex: MESSAGE_ALLOCATION_ROOT_PARENT_INDEX }
  );

  function toBigIntStr(v) {
    return typeof v === "bigint" ? v.toString() : String(v);
  }

  // Do NOT hand-derive feeValue/distribution from the two separate per-hop estimates
  // (CLAUDE.md Section 34 bans hand-invented fee arithmetic). Instead, feed our composed
  // messageAllocations tree BACK into genlayer-js's own estimateTransactionFeesForWrite for the
  // root call, and let it compute the authoritative feeValue/distribution consistent with that
  // exact tree - this is the same "estimator-discovered allocation data, never hand-bisected"
  // principle the A2-C01 investigation already established (docs/execution/R1 Live Proof
  // Evidence.md).
  const composedMessageAllocationsInput = tree.messageAllocations.map((n) => ({
    messageType: 1, // Internal
    onAcceptance: n.onAcceptance,
    parentIndex: n.parentIndex,
    recipient: n.recipient,
    callKey: n.callKey,
    budget: n.budget,
    feeParams: n.feeParams,
  }));

  const reEstimate = await client.estimateTransactionFeesForWrite({
    account: judgeAccount,
    address: JUDGE,
    functionName: "submit_incident",
    args: submitArgs,
    value: 0n,
    messageAllocations: composedMessageAllocationsInput,
  });

  const rootDistribution = reEstimate.distribution;
  const writeFeeValue = BigInt(reEstimate.feeValue);

  const writeFeesJson = {
    distribution: Object.fromEntries(
      Object.entries(rootDistribution).map(([k, v]) => [k, Array.isArray(v) ? v.map(toBigIntStr) : toBigIntStr(v)])
    ),
    messageAllocations: (reEstimate.messageAllocations ?? []).map((n) => ({
      messageType: "internal",
      onAcceptance: Boolean(n.onAcceptance),
      parentIndex: toBigIntStr(n.parentIndex ?? 0),
      recipient: n.recipient,
      callKey: n.callKey,
      budget: toBigIntStr(n.budget ?? 0),
      feeParams: n.feeParams,
    })),
  };

  const output = {
    submitArgs,
    evidenceHash,
    evidenceJsonBytes: Buffer.byteLength(evidenceJson, "utf8"),
    writeFeeValue: writeFeeValue.toString(),
    writeFeesJson,
    tree: {
      messageAllocations: tree.messageAllocations.map((n) => ({
        messageType: String(n.messageType),
        onAcceptance: n.onAcceptance,
        parentIndex: n.parentIndex.toString(),
        recipient: n.recipient,
        callKey: n.callKey,
        budget: n.budget.toString(),
        feeParams: n.feeParams,
      })),
      totalMessageFees: tree.totalMessageFees.toString(),
      rootFeeValue: tree.rootFeeValue.toString(),
    },
    steps: tree.steps.map((s) => ({ address: s.address, functionName: s.functionName, feeValue: s.feeValue.toString(), allocationCount: s.allocations.length })),
  };
  console.log(JSON.stringify(output, null, 2));

  const fs = await import("node:fs");
  fs.writeFileSync(
    new URL("../.a2-c01-retest-fees.json", import.meta.url),
    JSON.stringify(writeFeesJson)
  );
  fs.writeFileSync(
    new URL("../.a2-c01-retest-args.json", import.meta.url),
    JSON.stringify({ args: submitArgs, feeValue: writeFeeValue.toString() })
  );
}

main().catch((err) => {
  console.error("A2_C01_RETEST_ESTIMATION_FAILED (exact error, not fabricated):");
  console.error(err?.message ?? String(err));
  if (err?.cause) console.error("cause:", err.cause);
  process.exit(1);
});
