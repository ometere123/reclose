#!/usr/bin/env node
// Fresh-deployment remediation-child live verification: submits a real submit_remediation report
// against the parent incident just created on the fresh r1r deployment, to prove the additive
// Judge lineage views (get_incident_parent / get_parent_child_count / get_parent_child_at, added
// in commit 20674c2) work end-to-end against real on-chain state, not just Python unit tests.
// READ-ONLY simulation for fee composition; the actual signed submission is a separate `genlayer
// write` call using the CLI's own keystore, never a private key touched here.

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
const RULE_ID = "REMEDIATION_CONFIRMED_V1";
const PARENT_INCIDENT_ID = "reclose-target-004:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:0";
const REPORTER_NONCE = 1; // confirmed live via get_reporter_nonce after the first incident

async function main() {
  const chain = { ...chains.studioDevnet, id: STUDIO_DEV_CHAIN_ID, rpcUrls: { default: { http: [STUDIO_DEV_RPC] } } };
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
      subject: `Remediation for ${PARENT_INCIDENT_ID} (fresh-deployment lineage-view live verification)`,
      reporter: DEPLOYER,
      observedAt,
      retrievedAt: observedAt,
      sources: [
        {
          sourceId: "genlayer-project-boilerplate",
          url: "https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate/main/README.md",
          sourceClass: "INDEPENDENT_PUBLIC",
          extractedText:
            "Remediation confirmed: ProviderStubA's credentials have been rotated and independently verified as no longer compromised. The operator has published a signed confirmation of remediation.",
          retrievedAt: observedAt,
        },
      ],
    })
  );

  const evidenceHash = eapObject.artifactHash;
  const evidenceJson = JSON.stringify(eapObject);
  const submitArgs = [PARENT_INCIDENT_ID, POLICY_KEY, evidenceHash, evidenceJson, REPORTER_NONCE, ""];

  const judgeAccount = { address: DEPLOYER, type: "json-rpc" };
  const kernelAsJudgeAccount = { address: JUDGE, type: "json-rpc" };

  const tree = await buildJudgeKernelTargetAllocationTree(
    client,
    {
      judge: { address: JUDGE, functionName: "submit_remediation", args: submitArgs, account: judgeAccount },
      kernel: {
        address: KERNEL,
        functionName: "receive_decision",
        account: kernelAsJudgeAccount,
        args: [
          `${TARGET_ID}:${DEPLOYER.toLowerCase()}:${REPORTER_NONCE}`,
          PARENT_INCIDENT_ID,
          TARGET_ID,
          POLICY_KEY,
          1,
          POLICY_HASH,
          RULE_ID,
          "",
          DEPLOYER,
          evidenceHash,
          1, // DECISION_OUTCOME_CONFIRMED
          "REMEDIATION_VERIFIED",
          2, // DECISION_STAGE_FINAL
          1,
        ],
      },
    },
    { rootParentIndex: MESSAGE_ALLOCATION_ROOT_PARENT_INDEX }
  );

  function toBigIntStr(v) { return typeof v === "bigint" ? v.toString() : String(v); }

  const composedMessageAllocationsInput = tree.messageAllocations.map((n) => ({
    messageType: 1,
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
    functionName: "submit_remediation",
    args: submitArgs,
    value: 0n,
    messageAllocations: composedMessageAllocationsInput,
  });

  const writeFeesJson = {
    distribution: Object.fromEntries(
      Object.entries(reEstimate.distribution).map(([k, v]) => [k, Array.isArray(v) ? v.map(toBigIntStr) : toBigIntStr(v)])
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

  const fs = await import("node:fs");
  fs.writeFileSync(new URL("../.r1r-remediation-fees.json", import.meta.url), JSON.stringify(writeFeesJson));
  fs.writeFileSync(new URL("../.r1r-remediation-args.json", import.meta.url), JSON.stringify({ args: submitArgs, feeValue: reEstimate.feeValue.toString() }));
  console.log(JSON.stringify({ feeValue: reEstimate.feeValue.toString(), args: submitArgs }, null, 2));
}

main().catch((err) => {
  console.error("REMEDIATION_RETEST_ESTIMATION_FAILED (exact error, not fabricated):");
  console.error(err?.message ?? String(err));
  if (err?.cause) console.error("cause:", err.cause);
  process.exit(1);
});
