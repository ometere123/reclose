# A2-C01 live retest evidence (nested message-allocation tree, real funded signer)

Date: 2026-09-13. Network: GenLayer Studio-dev, chain 61997, RPC
`https://studio-dev.genlayer.com/api`. Signer: CLI keystore account `reclose-deployer`
(`0x24fAe7cD031Ed702Be63BDeA8912141805B996bd`), resolved by account alias only - no private key
material was read, logged, or touched at any point; every write went through `genlayer write`'s own
keystore signing path, identical to `scripts/studio-dev-write.sh`'s established pattern.

This is the first live attempt of the A2-C01 fix (`packages/protocol-sdk/src/feeAllocation.ts`,
commit `f0ad4df`) with a genuinely funded account. It was NOT available in the session that
implemented the fix (`docs/execution/Current Phase.md`'s prior note: "no funded Studio-dev account/
credentials available").

## Deployment used (no redeployment performed, per task scope)

`deployment/61997/r1-manifest.json` - the current R1 deployment. Confirmed usable without any
changes:

- `AssuranceKernel` `0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621`, target `reclose-target-003`
  registered and wired (`register_target` args confirm `reclose-deployer` owns no special role
  beyond being the reporter - the deployer account, not a distinguished "Reporter role", is what
  `submit_incident` already used for the manifest's recorded `zeroBondReport_UNDETERMINED`).
- Active policy confirmed live via `get_active_policy_key(reclose-target-003)` = `policy-r1-004`,
  and `get_policy_header(policy-r1-004)` = `[4, 0xa6d317b0bf867b3cb7e561d84a7338a12b662d7939092e7a8cc8cc2e1754b34b, true, true, true]`
  - **policy_version is live-confirmed as `4`**, not `1` as a naive read of the manifest's
    `constructorArgs`/`supersededGenerations` history might suggest (the policy itself has been
    rebuilt/resealed across this deployment's lifetime even though the Kernel/Judge/Vault
    addresses are final). This matters for any future `receive_decision` simulation - passing
    `policy_version=1` produces a real, distinct `E_KRN_009: STALE_POLICY_VERSION` contract error
    (see attempt 0 below), not a fee-allocation problem.
- `IncidentJudgeV1.get_reporter_nonce(reclose-deployer)` = `1` before this session's attempts (the
  manifest's prior zero-bond UNDETERMINED report used nonce 0; this session's new report used
  nonce 1, confirmed unchanged at `1` after every attempt below - every attempt reverted cleanly,
  no phantom state, consistent with `docs/execution/C2 Live Proof Evidence.md`'s "Reporter nonce
  confirms no false-positive success" finding).
- Zero-bond rule (`PROVIDER_COMPROMISE_V1`, `reportBond=0` in `apm-r1-004.json`) - no bond
  transaction needed, matching the existing manifest proof's shape.

**Conclusion: the existing deployment is fully usable for this retest. No redeployment was
performed or required.**

## Tooling built for this retest

`scripts/a2-c01-live-retest.mjs` (new, committed): builds a real EAP via
`packages/protocol-sdk/dist/evidence.ts`'s `buildEap` (the canonical single EAP implementation,
CLAUDE.md Section 13/15), then calls `buildJudgeKernelTargetAllocationTree` from
`packages/protocol-sdk/dist/feeAllocation.js` against the live Studio-dev RPC to compose the
nested Judge->Kernel->Target allocation tree from two REAL `genlayer-js`
`estimateTransactionFeesForWrite` simulations (root: Judge `submit_incident` simulated as the real
signer; second hop: Kernel `receive_decision` simulated as the Judge, `gl.message.sender_address`
matching the Judge's own call site). No private key was used for either simulation - only bare
`{address, type:"json-rpc"}` viem `Account` structs, since `estimateTransactionFeesForWrite` never
signs.

## Attempt 0 (diagnostic, before the real args were fixed)

Hand-typed `receive_decision` simulation args initially used `policy_version=1`. The live
Kernel simulation genuinely rejected this with a real contract error (not a fee/allocation
problem):

```
E_KRN_009: STALE_POLICY_VERSION: decision references a stale policy_version
```

(base64-decoded from the `sim_estimateTransactionFees` receipt's `result` field). This confirmed
the Kernel simulation path itself works correctly and enforces real invariants - it was fixed by
reading the live `policy_version=4` via `get_policy_header` and re-running.

## Attempt 1: nested tree built successfully; first live write attempt

With `policy_version=4`, `buildJudgeKernelTargetAllocationTree` succeeded and produced a genuine
two-node composed tree from real simulations:

- Node 0 (root, Judge -> Kernel): `parentIndex=<ROOT_SENTINEL>`, `recipient=0x62f0e68...59621`
  (Kernel), `callKey` decodes to `receive_decision`, `budget=120000000000010352`.
- Node 1 (grafted, Kernel -> Target): `parentIndex=0` (correctly re-parented onto node 0, exactly
  as `scripts/test-nested-message-allocation.js`'s unit tests predict), `recipient=0x7b423d9...f0f`
  (ReferenceAgentProtocol), `callKey` decodes to `apply_assurance_action`,
  `budget=120000000000010352`.
- `totalMessageFees = 240000000000020704` (both hops' budgets summed - the exact quantity the
  prior flat, one-level tree never included).

This is the first live confirmation that the grafting logic in `feeAllocation.ts` operates
correctly against the real network, not just the mocked unit tests - the second-hop node
(`apply_assurance_action`) is now present in the tree, which was the entire premise of the A2-C01
fix.

Submitted with `distribution.totalMessageFees` set to the composed total and
`feeValue = rootFeeValue - rootDistribution.totalMessageFees + tree.totalMessageFees =
240627936000031056`:

**Result: a DIFFERENT, NEW live error - `MessageAllocationsNotEqualBudget`** (EVM tx
`0x2379761e777a511dcc352cc0123f56fafa6585df673f6f7f7fb99804185e1a52`, reverted at the EVM
envelope-acceptance layer, before any GenVM execution/lifecycle tracking - `getTriggeredTransactionIds`
was never reached). This is NOT the original `fee no_matching_allocation # internal` defect -
the hand-composed `feeValue` figure (derived by subtracting/adding distribution components) does
not satisfy a consistency check the EVM-level consensus envelope performs between the declared
`feeValue` and the sum of `messageAllocations[].budget`.

## Attempt 2: let genlayer-js itself recompute feeValue/distribution from the composed tree

Per CLAUDE.md Section 34 ("do not invent handwritten fee arithmetic"), rather than hand-deriving
`feeValue` from the two separate per-hop estimates, the composed `messageAllocations` array was
fed back into a THIRD real `estimateTransactionFeesForWrite` call for the root
(`submit_incident`), asking genlayer-js itself to compute the authoritative `feeValue`/
`distribution` consistent with that exact tree.

**Result: the live RPC itself rejects the composed tree at estimation time -
`AllocationTreeBudgetInconsistent`** (`sim_estimateTransactionFees` JSON-RPC error, code
`-32602`). This is a THIRD distinct real error, earlier in the pipeline than attempt 1 - the
estimator will not even accept our externally-grafted tree as a `messageAllocations` input to
re-derive fees from, even though the exact same node shapes were independently valid when
produced as OUTPUT of two separate single-hop estimates.

## Attempt 3: probing the feeValue boundary directly (diagnostic only)

To characterize the gap (not to find a workaround to call the fix "done"), the same Attempt-1 fees
JSON was resubmitted with `feeValue` lowered to exactly `totalMessageFees` (`240000000000020704`,
i.e. zero overhead beyond the two message budgets):

**Result: `InsufficientFees`** (EVM tx `0x8e20cfc85362a24ae283252d2060eb49754e5204c504d7d4f75cc03e20c7286e`).

So the correct `feeValue` lies strictly between `240000000000020704` (too low) and
`240627936000031056` (rejected as `MessageAllocationsNotEqualBudget`, for reasons not yet
determined - not simply "too high", since the error name implies an equality check failing, not a
magnitude check). Root-causing the exact required value/consistency rule was not attempted further
in this session per the task's explicit instruction not to build a minimal repro or hand-bisect
further - this is reported as an open diagnostic finding for the next pass.

## Reporter-side state integrity confirmed across all attempts

`IncidentJudgeV1.get_reporter_nonce(reclose-deployer)` = `1` before and after every attempt above.
No incident record was created on the Judge (`get_incident_outcome`/`get_incident_condition_code`
for the predicted `reclose-target-003:0x24fae7cd031ed702be63bdea8912141805b996bd:1` incident ID
were not reachable - no such incident exists). Every attempt rolled back cleanly; no partial or
inconsistent state was left on any contract, consistent with `docs/execution/C2 Live Proof
Evidence.md`'s precedent finding for this same class of failure.

## Honest conclusion

**A2-C01 is NOT closed by this retest.** The nested-allocation fix's GRAFTING LOGIC is now
live-confirmed correct (the composed tree genuinely contains the previously-missing Kernel ->
Target second-hop node, built from two real simulations, exactly matching the unit-tested
behavior in `scripts/test-nested-message-allocation.js`) - this is new, genuine progress beyond
the prior session's unit-tests-only status. However, submitting that composed tree live surfaces
THREE further real, previously-undocumented Studio-dev/genlayer-js constraints around consuming a
custom-composed `messageAllocations` array for a write:

1. `AllocationTreeBudgetInconsistent` when re-submitting the composed tree to
   `estimateTransactionFeesForWrite` as an input for fee recomputation.
2. `MessageAllocationsNotEqualBudget` when submitting the composed tree directly to `write` with
   a hand-derived `feeValue`.
3. `InsufficientFees` when lowering that `feeValue` to exactly the summed message budgets.

None of these three is the original `fee no_matching_allocation # internal` defect this fix
targeted - that specific failure was NOT reproduced in this session, which is itself evidence the
grafted tree changes the failure surface. But none of the three is `FINISHED_WITH_RETURN` either.
**The original C2/R1 finding (`fee no_matching_allocation # internal` on the Kernel's own child
transaction) therefore remains the last CONFIRMED live behavior for the un-fixed flat tree, and is
preserved unchanged below as regression/historical evidence.** This session's new findings are
additive, narrowing the remaining gap rather than closing it.

## Historical reference (preserved, not deleted) - original A2-C01 failure mode

> The Judge -> Kernel `receive_decision` dispatch's triggered CHILD transaction fails live with
> `fee no_matching_allocation # internal` (child tx
> `0x00d59204565f14677eb5f46bb3877efede739ce91e0bfc73fba836063b9e3087` against the current
> deployment's `zeroBondReport_UNDETERMINED` proof, and originally documented against the
> superseded C2 deployment in `docs/execution/C2 Live Proof Evidence.md`).

This historical failure mode was not re-exercised with the ORIGINAL flat one-level tree in this
session (this session only tested the NEW nested tree) - it remains the documented baseline this
fix is trying to improve on.

## What remains for the next pass

1. Determine the exact rule the EVM-level envelope acceptance check (`MessageAllocationsNotEqualBudget`)
   and the RPC-level `AllocationTreeBudgetInconsistent` check enforce, ideally by inspecting the
   pinned `genlayer`/`genlayer-js@2.0.0-rc.1` source (or asking GenLayer upstream) rather than
   further live hand-bisection from this repository alone.
2. Once that rule is understood, retry this exact script (`scripts/a2-c01-live-retest.mjs`) with a
   corrected `feeValue`/`distribution` derivation (or a corrected way of presenting the composed
   tree to the estimator) and re-attempt the live write.
3. Do not mark A2-C01 `CLOSED` until a live `submit_incident` -> Kernel `receive_decision` child ->
   `ReferenceAgentProtocol.apply_assurance_action` grandchild chain all reach
   `FINISHED_WITH_RETURN`/`execution_result` success and the Kernel's own incident/restriction
   state is confirmed via read-back, per the Master Plan's E1 process.
