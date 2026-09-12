Current phase: **A3 ATTEMPT 2 SUBMITTED - AWAITING EXTERNAL REVIEW.**

## A2-C01 status update (nested message-allocation investigation)

**A2-C01: REOPENED — LIKELY RECLOSE MESSAGE-ALLOCATION-TREE DEFECT, fix implemented and
unit-tested, live verification pending (no funded Studio-dev account/credentials available in this
execution environment — only `.env.example` is present, no `.env`).**

Investigation finding: the live `fee no_matching_allocation # internal` failure
(`docs/execution/C2 Live Proof Evidence.md`) occurs inside the Kernel-side CHILD transaction that
`IncidentJudgeV1.submit_incident` genuinely triggers (`receive_decision`), specifically when that
decision is FINAL/CONFIRMED and `AssuranceKernel._apply_final_incident` dispatches an effect,
which synchronously emits a FURTHER outbound internal message from the Kernel to
`ReferenceAgentProtocol.apply_assurance_action` (`contracts/assurance_kernel.py::_dispatch_action`).
Inspected the real pinned `genlayer-js@2.0.0-rc.1` shipped types
(`node_modules/genlayer-js/dist/index-BT1ApAqQ.d.ts`, `node_modules/genlayer-js/dist/index.d.ts`):
`estimateTransactionFeesForWrite` builds its `messageAllocations` tree from a single
`simulateWriteContract` of ONLY the root call - it has no way to recursively observe the Kernel's
own later, separately-triggered child transaction's outbound message. The existing
`scripts/fee-profile.mjs` / `DirectRecloseClient.feePreview` path therefore produces a flat,
one-level allocation tree (Judge -> Kernel only), which is exactly the shape that leaves the
Kernel's own Kernel -> Target message without a matching allocation node at the child's
execution time.

Fix implemented: `packages/protocol-sdk/src/feeAllocation.ts` exports
`buildNestedMessageAllocationTree` (generic, reusable for any call-chain topology - no-effect,
one-effect, multi-effect, bonded, remediation, recovery) and the convenience wrapper
`buildJudgeKernelTargetAllocationTree` for the exact Judge->Kernel->Target case. It estimates the
root call, then separately estimates each further hop (simulated AS the real upstream caller, e.g.
the Kernel call simulated as the Judge, so `gl.message.sender_address == rule.judge` holds), and
grafts each hop's own allocation nodes under the correct node in the merged tree by rewriting
`parentIndex` - real genlayer-js-computed budgets/feeParams throughout, no hand-invented fee
arithmetic (CLAUDE.md Section 34). Unit-tested in
`scripts/test-nested-message-allocation.js` (7/7 passing, wired into `verify:js` via
`npm run nested-message-allocation:test`): correct parentIndex nesting, duplicate call-key safety,
specific-vs-wildcard node ordering, total nested budget coverage, the no-effect degenerate case, and
a loud failure (never a silent drop) when a hop has no addressable graft target.

**Not yet done / explicitly unverified:** no live Studio-dev re-submission of
`submit_incident` with the new nested tree has been attempted from this environment - there is no
funded test account or `PRIVATE_KEY`/credentials configured (only `.env.example`). The hypothesis
that this grafted tree resolves the live child failure therefore remains UNVERIFIED IN PRODUCTION
until someone with Studio-dev credentials runs the real end-to-end flow and confirms the Kernel
child transaction reaches `FINISHED_WITH_RETURN` instead of `fee no_matching_allocation # internal`.
Do not treat A2-C01 as CLOSED until that live run is captured as evidence per the Master Plan's E1
process.

A3 attempt 1 (`264c14af8f83cbd2bcf0176c87d9950baf0b275a` on `chatgpt/r1-product-release`) remains
**FAIL**, preserved unchanged at `docs/execution/audit-packets/A3/AUDIT_DECISION.md`.

A3 attempt 2 target: `98b98cc6ddc3d36292914e79c8fe4c8bc0d48209` on branch
`claude/r1-product-final` (fourth and final remediation sub-pass, completing the final
source-remediation directive: real genlayer-js browser write runtime, signer-identity binding,
strict sequential policy construction/activation, judgeVersion-aware diff, the non-zero bond
journey, an additive recovery-lineage indexer hook, and the getEffectiveProviderStatus fix. Exact
target CI: run `34715269007`, SUCCESS. Supersedes the prior checkpoint
`fa76e8409940dc836bc12fc0dc1144196d2531ee`, CI run `34710541702`, which superseded
`ad38a3920892c5c0681e4d603afc8ef07254228d`, CI run
`34707671490`, SUCCESS - which itself superseded `7f032af5921eff258c4c69a2f381861b003bd898`, CI
run `34686497909`, which superseded `7d1bf1eb317761c2b660e2e5c3b1b39b41d8388e`, CI run
`34684832850`). Exact-target GitHub Actions run `34710541702` - **SUCCESS**
(https://github.com/ometere123/reclose/actions/runs/34710541702). Full packet:
`docs/execution/audit-packets/A3-attempt-2/`.

## What this third sub-pass fixed (real defects the independent audit found, not relabeling)

1. **Trace-identity bug:** `decisionId` (a record identity) was displayed as a transaction ID in
   the live Incident Explorer trace. Fixed to use the real resolved `decisionView.transaction.txId`.
2. **Action-identity bug:** transaction/action tracking used the bare `incidentId`, which is not a
   valid Kernel action identity. `protocol-sdk::listIncidentActionIds` now derives the real
   per-effect `action_id` mirroring `contracts/assurance_kernel.py::_dispatch_action`'s `_ck(...)`
   formula exactly, and the live adapter tracks each dispatched action individually.
3. **Reduced policy diff:** replaced with `_classify_expansion`-equivalent semantics - rule-
   identity/bounty comparison and effect-tuple subset comparison exactly mirror the Kernel, so
   bounty increases, parameter changes and release-phase changes now correctly drive expansion
   classification.
4. **Unvalidated resources:** `buildIncidentReport` now rejects a `resourceId` not governed by an
   enabled effect of the chosen rule; the report form filters resources per rule.
5. **No browser wallet/reporter-identity path:** `frontend/lib/wallet.js` is a real connect-wallet
   integration; incident/recovery previews bind `reporterAddress` to the connected address and
   refuse to preview in live mode without one.
6. **Single-button policy "construction":** replaced with a real multi-transaction journey
   (`previewPolicyConstruction`, bridging the canonical `@reclose/policy-compiler`), one prepared
   write per `begin_policy`/`add_policy_resource`/`add_policy_rule`/`add_policy_effect`/
   `seal_policy`/`activate_policy` call.
7. **Reduced signing-boundary review:** every write-preview panel now exposes every security-
   bearing field (chainId, contract, method, full args, value, semanticKind, reviewHash).
8. **Recovery surface:** populated from real restriction reads where possible
   (`protocol-sdk::getIncidentOwnRestrictions`); the genuine Kernel read-gap preventing full
   remediation/recovery-validation chain reconstruction (no `parent_incident_id`/child-incident
   view) is explicitly diagnosed and documented, not glossed over.

See `docs/execution/audit-packets/A3-attempt-2/findings-closure.md`'s addendum and
`known-limitations.md` for full detail, including what remains genuinely open (A3-H08's remaining
policy-level export scope, the protocol read-gap above, and everything A2-C01-dependent).

## Finding status after this sub-pass

- **CLOSED:** A3-H01 (CRITICAL), A3-H02, A3-H03, A3-H05, A3-H06, A3-H07, A3-H10, A3-H11, A3-H12.
- **CLOSED (code-complete, not live-proven, blocked only by A2-C01):** A3-H04.
- **PARTIALLY CLOSED:** A3-H08 (per-incident export + real restriction-based recovery reads done;
  policy-level/cross-incident export and the remediation-chain protocol read-gap remain open),
  A3-H09 (packet-local mapping now mirrors the full canonical set for every Section 16 category;
  the canonical 156-row ledger itself deliberately deferred to R1-wide reconciliation).

## A2 condition status

Unchanged:

- **A2-C01 OPEN / E1 BLOCKER:** Studio-dev Judge -> Kernel triggered child still fails live with
  `fee no_matching_allocation # internal`. Independently blocks E1/R1 closure AND live proof of
  A3-H04's Kernel -> Target second hop (a failed first hop never triggers a second).
- **A2-C02/A2-C03/A2-C04:** unchanged from the A3 attempt-1 record.

## H1 / E1 / A4 / R1 / S1 status

Unchanged - not attempted, per FINAL_REMEDIATION.md Section 17's explicit sequencing.

## Next sequence

1. Await the owner's/an independent reviewer's decision on A3 attempt 2 (now at
   `fa76e8409940dc836bc12fc0dc1144196d2531ee`).
2. If further remediation is requested: close A3-H08's remaining scope (policy-level/cross-incident
   export; consider a Kernel view or indexer mapping for the remediation-chain read-gap), and
   reconcile the canonical R1 requirements ledger if the owner wants that pulled forward.
3. Only after A3 passes: live fee-profile closure, A2-C01 retest, two clean E1 runs, H1 live
   scenarios, A4, and R1/S1 closure - in that order, per the standing master directive.
