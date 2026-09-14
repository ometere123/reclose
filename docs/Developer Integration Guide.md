# Developer Integration Guide

This guide describes the supported integration boundary for Reclose R1. The canonical contract, SDK and schema files remain authoritative where this guide is abbreviated.

## Integration shape

An integrating target registers with an AssuranceKernel and exposes a narrow adapter that validates and applies the finite `ActionEnvelope`. It owns its operational state and reports it through read methods. The Judge is configured by an active Kernel policy; callers submit bounded evidence against a target, rule and resource. A Reporter cannot provide an action selector or destination.

```text
target registration -> policy compile/review -> timelocked activation
evidence artifact -> Judge -> Kernel authorization -> typed target action
transaction lifecycle + target readback -> recovery lifecycle
```

Use `@reclose/protocol-sdk` for read models, canonical report construction, policy validation/hash/diff, transaction tracking and action trace resolution. Use `@reclose/policy-compiler` for APM validation and ordered writes. Use `@reclose/evidence-builder` for deterministic EAP validation and construction. Do not treat a successful RPC submission as successful execution.

## Minimal client construction

Implement `RecloseTransport` using a GenLayer client adapter and provide the deployed Kernel/Judge addresses. Check the chain ID before every signing operation. The canonical SDK is chain-guarded for the R1 chain, 61997. Preserve fee-estimator output, including nested message allocations, unchanged between estimation and signing.

```ts
import { createRecloseClient } from "@reclose/protocol-sdk";

const client = createRecloseClient({
  transport,
  addresses: { kernel: kernelAddress, judge: judgeAddress, vault: vaultAddress },
});
const state = await client.getAssuranceState(targetId);
```

Consult `packages/protocol-sdk/src/client.ts`, `sdk.ts`, `genlayerAdapter.ts` and `types.ts` for exact types and adapter behavior. The SDK interface includes reads for target, assurance state, policy, incident, decision and effective provider status; canonical incident/recovery report builders; APM validation/hash/diff; transaction tracking; and action trace tracking.

## Evidence and write review

For `CONTENT_ADDRESSED_SNAPSHOT`, supply an immutable `snapshotRef` whose fetched bytes match the declared content hash. The Judge independently fetches the body; Reporter prose is not authoritative. Read the Reporter nonce immediately before constructing a signed report. If a rule has a bond, open and verify the bond first, then re-read the nonce before report construction.

Before a write, bind the review hash to the complete semantic payload. Refreshing a fee estimate may change fee data but must not change the reviewed payload. Submit with the estimator-produced distribution and full nested allocations. Track the parent and all triggered children, then verify required target state. A finalized parent or semantic `CONFIRMED` result alone is not proof that containment executed.

## Network and status

Use only Studio-dev / 61997 for the R1 evidence path. The historical `accepted`-phase failure is superseded: an isolated typed-address `emit_decided` Parent→Child simulation succeeded read-only with the saved allocation. The active immutable Kernel/Judge deployment predates that source correction, so the canonical Judge→Kernel→Target path and E1 Run A remain unverified. Do not work around the mismatch with guessed fees or a live incident write. See the [saved simulation and historical diagnostics](../release-evidence/r1/diagnostics/accepted-message-repro/) and [current handoff](execution/HANDOFF.md).
