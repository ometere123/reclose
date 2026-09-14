# Operations Deployment Recovery Runbook

## Before deployment

Confirm branch and source SHA, a clean tree, pinned toolchain, Studio-dev network and chain 61997. Recompute the canonical source-registry hash from the current registry and compare it with Judge constructor input/readback. Validate the deployment manifest, APM, evidence fixtures and source URLs. Do not expose private keys or keystores.

## Deploy and wire

Use the repository's deploy scripts and configured CLI keystore. Record constructor arguments, address, tx hash, finalized lifecycle, `FINISHED_WITH_RETURN`, and authoritative readbacks immediately. Wire Kernel/Judge/Vault/target in the documented order and verify each binding before policy construction. Never redeploy a valid immutable contract just because the session changed.

## Policy recovery

Compile a new identity against the exact deployed Judge and Kernel. Verify every resource/rule/effect write, seal lifecycle and activation deadline. Wait through the genuine timelock, prepare a fresh activation call, then verify active key/hash/version/generation and Judge binding.

## RPC and fee discipline

Serialize Studio-dev requests using `scripts/studio-dev-rpc-throttle.mjs`, with at least the configured inter-request spacing and bounded backoff. Do not start independent poll/retry loops. Simulate the entire nested message path read-only; use the estimator's complete fee preset and message allocations unchanged. The old `on="accepted"` failure is historical and superseded. The corrected isolated `emit_decided` simulation succeeded with typed `CalldataAddress` calldata and the saved allocation; the malformed-string retry failed during argument decoding before message emission. Do not repeat either reproduction. The isolated result does not verify the production Judge→Kernel→Target lifecycle; the active immutable Kernel/Judge source predates the correction. Do not guess fees or submit writes before source parity and transaction approvals are established.

## Transaction and recovery evidence

Require a successful transaction lifecycle and execution result, then read back every relevant contract state. Capture parent, child, grandchild, DecisionRecord, condition/stage/outcome and target post-state. On RPC uncertainty, read the existing transaction; never blindly resubmit. On a reset, deploy a new generation and manifest while preserving old evidence and addresses.

Current deployment and exact resume point are maintained in `docs/execution/HANDOFF.md`, `docs/execution/Current Phase.md` and `docs/execution/Open Blockers.md`.
