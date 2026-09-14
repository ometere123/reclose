Current phase: **E1 RUN A — explicit accepted-allocation preflight unresolved; no incident write submitted.**

**Latest correction (2026-09-13, supersedes earlier open-bucket diagnosis):** the current policy's two accepted Target actions (`RESTRICT provider_a`, `ENTER_SAFE_MODE`) were separately estimated under the serialized Studio-dev throttle. Their SDK-produced `feeParams` differ in `executionBudgetPerRound` (153455400000000 vs 153455100000000), so the proposed single common repeated-message allocation cannot be constructed from these estimates. Studio allocation semantics match by message key, then require exact phase and fee parameters; duplicate sibling keys are rejected. The explicit attempt stopped before Kernel simulation. Evidence: `release-evidence/r1/e1/accepted-target-fee-allocation-mismatch.json`. The older open-bucket EINVAL artifact is historical and does not prove an explicit-allocation platform limitation. No incident write occurred. Keep A2-C01's final-only live-verified result closed and unchanged.

The next step is to establish the exact deployed Studio fee-source revision and determine a supported repeated-emission construction for these estimator outputs. Do not combine differing profiles or submit incident authority. Continue with accepted and finalized Kernel simulations and the Judge root only after that question is resolved. `docs/execution/Open Blockers.md` and the latest section of `docs/execution/HANDOFF.md` contain the current operation boundary.

---

Historical phase entry below; its A2-C01 status was corrected later in the execution ledger.

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

**Update (2026-09-13, funded-signer live retest):** a genuinely funded, unlocked Studio-dev
account (`reclose-deployer`, CLI keystore alias, resolved by alias only - no key material
touched) became available and was used to retest the fix end to end against the existing,
unmodified R1 deployment (`deployment/61997/r1-manifest.json`, target `reclose-target-003`,
active policy `policy-r1-004` at live-confirmed `policy_version=4`). Full evidence:
`release-evidence/r1/a2-c01-live-retest-evidence.md`.

**Update (2026-09-13, budget-rollup fix, live-verified) — A2-C01: CLOSED — RECLOSE NESTED
MESSAGE-ALLOCATION DEFECT FIXED AND LIVE-VERIFIED.**

Root cause of the three further failures recorded immediately above
(`MessageAllocationsNotEqualBudget`, `AllocationTreeBudgetInconsistent`, `InsufficientFees`):
`buildNestedMessageAllocationTree`'s grafting step re-parented each deeper hop's allocation
nodes under the correct parent node, but left every node's own `budget` exactly as reported by
that node's OWN single-hop simulation. A parent node's single-hop simulation has no way to know
it will also need to fund every message grafted beneath it, so the merged tree was internally
inconsistent - Studio-dev's on-chain envelope-acceptance check (and the RPC's own
`AllocationTreeBudgetInconsistent` pre-check) require a parent allocation's budget to cover its own
cost PLUS the full transitive cost of everything nested under it. Fixed by adding
`rollUpNestedBudgets` to `packages/protocol-sdk/src/feeAllocation.ts`: a single backward pass over
the merged, parentIndex-addressed array (children are always appended after their parent, so
iterating from the last index to the first finalizes every node's own rollup before folding it into
its parent) that adds each node's budget into its parent's budget, transitively. `totalMessageFees`
is now the sum of only the TOP-LEVEL (root-parented) nodes' post-rollup budgets - summing every
node in the flat array (the pre-fix behaviour) double-counted nested costs, which was itself part
of the defect. Every figure involved is still exactly one of genlayer-js's own per-hop `budget`
values, just summed bottom-up instead of left flat - no hand-invented fee arithmetic
(CLAUDE.md Section 34). `scripts/test-nested-message-allocation.js` grew from 7 to 9 tests: the two
new tests assert the rollup invariant directly (parent budget == own cost + sum of children's
post-rollup budgets, for a 2-level and a 3-level chain) - all 9/9 pass, and the existing 7 still
pass unchanged (their expected `totalMessageFees` values happened to already equal the correct
top-level-only rollup sum for those fixtures, since the fixtures are all exactly-2-node trees).

**Live retest (fresh nonce, same funded `reclose-deployer` CLI-keystore signer, same unmodified
deployment - `reclose-target-003` / `policy-r1-004` v4, chain 61997,
`https://studio-dev.genlayer.com/api`):** `scripts/a2-c01-live-retest.mjs` rebuilt the composed tree
with the fix in place; this time the estimator's own re-estimation step (feeding the composed tree
back into `estimateTransactionFeesForWrite`, per CLAUDE.md Section 34 - not hand-derived) SUCCEEDED
for the first time (previously `AllocationTreeBudgetInconsistent`), producing
`feeValue=240640224000031056` and a rolled-up root node `budget=240000000000020704` (=
`120000000000010352 * 2`, i.e. its own cost plus the full grafted Kernel->Target cost). Submitting
that exact `--fees`/`--fee-value` via `genlayer write` against `IncidentJudgeV1.submit_incident`
(reporter nonce 1, live-confirmed immediately before submission) produced a genuine three-hop
success chain, all three legs `FINALIZED`/`Accepted` with `execution_result: SUCCESS`:

1. **Judge `submit_incident`** - tx `0x0459ffea984e1b1f825ffb8e5f05801411252ea7b852d7e92ad77ed3c6ddd008`,
   `status_name: FINALIZED`, `result_name: MAJORITY_AGREE`, consensus outcome ACCEPTED. Triggered
   child `0x110a850482b4399354b4fde391132593c855ec6ad18c71645dffaa354256b843`.
2. **Kernel `receive_decision`** (the child that previously failed with
   `fee no_matching_allocation # internal`) - tx
   `0x110a850482b4399354b4fde391132593c855ec6ad18c71645dffaa354256b843`, `execution_result: SUCCESS`,
   `status_name: FINALIZED`, fee accounting `status: settled` (paid `240000000000020704`, refunded
   `119871368000009529`). Emitted the further outbound message to
   `ReferenceAgentProtocol.apply_assurance_action`, triggering grandchild
   `0xc575eee0c2abf75aeeeead0b7565e80e06d76d78733952a7d55b20c67b6187ce`.
3. **Target `apply_assurance_action`** - tx
   `0xc575eee0c2abf75aeeeead0b7565e80e06d76d78733952a7d55b20c67b6187ce`, `execution_result: SUCCESS`,
   `status_name: FINALIZED`, `result: { status: "return", payload: { readable: "null" } }`.

State read-back after finality confirms real, non-phantom state: `get_reporter_nonce(reclose-deployer)`
advanced from `1` to `2` (exactly one genuine new incident recorded, no duplicate/replay);
`get_incident_outcome("reclose-target-003:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:1")` = `3`
(`DECISION_OUTCOME_UNDETERMINED`, matching the simulated decision's `INSUFFICIENT_EVIDENCE`
condition code exactly - `get_incident_condition_code` confirms `INSUFFICIENT_EVIDENCE`). Per
CLAUDE.md Section 14/9.2, `UNDETERMINED` is a valid, non-coerced outcome - the Target leg executing
to `SUCCESS`/`return null` for an `UNDETERMINED` decision is consistent with the Kernel not
expanding or restricting authority on a genuinely inconclusive report.

This satisfies the Master Plan's E1 live-proof bar: Judge parent, Kernel child, and Target
grandchild all reached `FINISHED`/`SUCCESS` with the Kernel's own incident state correctly
persisted and independently read back. The original flat-tree failure mode
(`fee no_matching_allocation # internal`) and the three intermediate budget-mismatch failures
(`MessageAllocationsNotEqualBudget`, `AllocationTreeBudgetInconsistent`, `InsufficientFees`) remain
preserved unchanged above as historical/regression evidence of the debugging path - they are not
deleted, per the task's explicit instruction. Full successful-run evidence appended to
`release-evidence/r1/a2-c01-live-retest-evidence.md`.

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
- **CLOSED (code-complete, now also live-proven via the A2-C01 retest above):** A3-H04.
- **PARTIALLY CLOSED:** A3-H08 (per-incident export + real restriction-based recovery reads done;
  policy-level/cross-incident export and the remediation-chain protocol read-gap remain open),
  A3-H09 (packet-local mapping now mirrors the full canonical set for every Section 16 category;
  the canonical 156-row ledger itself deliberately deferred to R1-wide reconciliation).

## A2 condition status

- **A2-C01: CLOSED (2026-09-13)** — nested message-allocation budget-rollup fix live-verified;
  Judge -> Kernel -> Target chain reaches `FINALIZED`/`SUCCESS` end to end (see above). No longer
  blocks E1/R1 closure or A3-H04's live proof of the Kernel -> Target second hop.
- **A2-C02/A2-C03/A2-C04:** unchanged from the A3 attempt-1 record.

## H1 / E1 / A4 / R1 / S1 status

Unchanged - not attempted, per FINAL_REMEDIATION.md Section 17's explicit sequencing.

## Next sequence

1. Await the owner's/an independent reviewer's decision on A3 attempt 2 (now at
   `fa76e8409940dc836bc12fc0dc1144196d2531ee`).
2. If further remediation is requested: close A3-H08's remaining scope (policy-level/cross-incident
   export; consider a Kernel view or indexer mapping for the remediation-chain read-gap), and
   reconcile the canonical R1 requirements ledger if the owner wants that pulled forward.
3. A2-C01 is now closed (2026-09-13, live-verified). Remaining, per the standing master directive:
   two clean E1 runs (this retest counts as the first full three-hop success; a second independent
   run, ideally covering a CONFIRMED/restriction-triggering decision rather than UNDETERMINED,
   should be captured before declaring E1 fully satisfied), H1 live scenarios, A4, and R1/S1
   closure - in that order, and still gated on the owner's/an independent reviewer's decision on A3
   attempt 2 above.

## Owner-directed post-A2-C01 remediation round (2026-09-13) - status: AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE

Following A2-C01's live closure, the repository owner directed one further remediation round in
live chat (not an external audit finding) covering thirteen previously-identified source gaps.
Worked across several commits (`79e7461`, `4770d5c`, `20674c2`, `bba126c`, `23626d5`, `3ff474e`,
`662df69`, `4d3c91e`, `2d21f06`), all green on exact-target CI. Honest per-item status - nothing
below is marked done merely because a function or screen exists without a verified, tested
pipeline behind it:

**Done, tested, verified:**
1. Bond-ID collision fix - deterministic Keccak-256 identity, regression-tested against
   long/near-colliding target IDs (`79e7461`).
2. Additive Kernel `get_policy_lifecycle` + target-incident enumeration views, Python-tested
   (`4770d5c`); now wired end-to-end into a real chain-derived activation-timelock countdown in
   the frontend policy journey (`4d3c91e`), also reachable via `reclose policy verify-readback`
   (`2d21f06`).
3. Additive Judge recovery-lineage views + parent-child reverse index, Python-tested (`20674c2`);
   now wired into `protocol-sdk::getIncidentLineage` and used authoritatively in the Recovery UI
   to gate recovery-validation behind a genuinely CONFIRMED remediation child (`4d3c91e`).
4. Durable file-based Sentinel state store, with real restart/resume/no-duplicate-submission
   tests (`bba126c`).
5. Complete fee-data (`distribution`/`messageAllocations`/`feeValue`) preservation from SDK
   estimate through to `writeContract`, payable calls estimated at real value, bond-gating
   generalized to incident+recovery reports, policy writes bound to the live (not cached) owner,
   unconditional registration pre-sign handshake, additive tri-state provider-availability helper
   (`23626d5`, `3ff474e`, `662df69` - 59/59 tests).
6. Remediation is a real, distinct on-chain entrypoint (`submit_remediation` /
   `REMEDIATION_CONFIRMED_V1`, confirmed at `contracts/incident_judge_v1.py:752` - it already
   existed and was simply never wired). `buildRemediationReport` added to protocol-sdk, a
   separate Remediation form added to the Recovery UI, and `reclose remediation prepare` added
   to the CLI (`4d3c91e`, `2d21f06`).
7. CLI completeness: added `policy verify-readback`, `remediation prepare`, and a real
   `sentinel run` (genlayer-CLI-keystore-backed ReporterClient, never custodies a key itself);
   documented why `*/report` write commands and `benchmark run` are deliberately not separate CLI
   surface (`2d21f06`).

**Not attempted this round (honest, not fabricated):**
- Evidence/Recovery-queue/Integrations as dedicated top-level nav surfaces (Recovery exists as a
  contextual route with real lineage-backed logic now, but not yet as a global queue view;
  Evidence and Integrations pages were not built).
- A real GenLayerJS-client-backed tracker replacing `globalThis.__RECLOSE_PRODUCT_RUNTIME__
  .trackTransaction` inside the sequential policy-construction journey specifically (the journey's
  step-advancement logic itself was not touched this round beyond the timing-readback wiring).

These two remaining items are the honest gap before this remediation round is fully closed; they
do not block E1 (which exercises the incident/decision/action path, not the policy-construction UI
state machine) but should be picked up before final A3/A4 packet freeze.

**Update (2026-09-13):** both remaining items above were closed in commit `84f73bd`: real
top-level Evidence/Recovery-queue/Integrations nav surfaces (sourced from real SDK reads, with
honest "not determinable from the browser" copy where genuine browser-side introspection isn't
possible - no fabricated green checkmarks), and a real GenLayerJS-client-backed
`trackTransaction` in `genlayerWriter.js` used directly by the policy-construction journey's
step-advancement logic, gated on real lifecycle-final + `FINISHED_WITH_RETURN` + protocol
readback rather than only the optional host-injected tracking hook. 66/66 frontend-remediation
tests passing.

## Fresh R1R deployment (2026-09-13) - required to exercise the new additive Kernel/Judge views live

The two additive contract views landed in this remediation round (`4770d5c`'s
`get_policy_lifecycle`, `20674c2`'s recovery-lineage views) did not exist on the deployment
`r1-manifest.json` describes. A fresh deployment (`deployment/61997/r1r-manifest.json`) was
carried out on Studio-dev using the funded, unlocked `reclose-deployer` CLI keystore signer
(never a raw private key) to exercise them live. `r1-manifest.json` is preserved unchanged as
history; this is an additional generation, not a replacement, using a new target id
(`reclose-target-004`) and policy key (`policy-r1-005`) to avoid registration ambiguity, per this
repo's own established pattern.

**Real, honest outcome (full detail in `r1r-manifest.json`):**

- All five remaining R1 contracts deployed successfully (`FINISHED_WITH_RETURN`/`ACCEPTED`):
  ProviderStubB, AssuranceKernel(1,60), ReferenceAgentProtocol, IncidentJudgeV1, IncentiveVault.
  ProviderStubA was reused from a prior session's cleanest capture after independently verifying
  it live via `get_owner` (see `r1r-manifest.json`'s `priorAttemptNote` for the honest history of
  an earlier accidental triple-deploy of that one contract, self-caught and not compounded).
  Two real deploy attempts failed honestly first with genuine, diagnosed errors before succeeding
  (ReferenceAgentProtocol's real 7-arg constructor was initially assumed to be zero-arg;
  IncidentJudgeV1's `source_registry_json` constructor arg needs the file's actual JSON content,
  not its path) - both documented in `r1r-manifest.json` with the exact failing tx hashes.
- All three wiring calls (`Judge.set_vault`, `Protocol.set_assurance_controller`,
  `Kernel.register_target`) succeeded and were independently verified via read-backs.
- The canonical policy (`policy-r1-005`) was compiled via `@reclose/policy-compiler`,
  constructed on-chain across all 11 real transactions (begin/resources/rules/effects/seal), and
  a REAL wall-clock wait was performed for the genuine 60-second expansion timelock (not
  skipped/faked) before activation. `get_policy_lifecycle` was read live before seal, after seal,
  and after activation, showing real distinct on-chain values at each stage - this is the first
  live proof that this new view works end-to-end. A CLI-side quirk was found and diagnosed: the
  method-specific `genlayer estimate-fees` simulation for `activate_policy` evaluated the
  timelock against a stale/replayed block timestamp and kept rejecting with
  `E_KRN_007: TIMELOCK_NOT_ELAPSED` even ~130s after the real timelock had genuinely elapsed;
  submitting the write directly with the network's baseline fee (bypassing that stale
  method-specific simulation) succeeded immediately. This is a tooling quirk in the fee-estimation
  path, not a Kernel logic bug - the Kernel's own timelock enforcement is real and was observed
  correctly rejecting the too-early attempt.
- A real end-to-end incident was submitted and reached `FINISHED_WITH_RETURN` at all three hops
  (Judge -> Kernel -> Target), proving A2-C01's nested-allocation fix (`eae5e01`) generalizes to a
  fresh deployment, not just the one it was originally verified against. The outcome was
  UNDETERMINED/INSUFFICIENT_EVIDENCE (single-source evidence) - the same outcome class as this
  repo's own prior canonical live proof (`r1-manifest.json`'s `zeroBondReport_UNDETERMINED`), so
  this is a consistent, honest result.
- **Honest remaining gap:** a live remediation-child submission (to prove the new
  `get_incident_parent`/`get_parent_child_count`/`get_parent_child_at` views against a real
  parent->child relationship, not just Python unit tests) was correctly rejected by the Kernel
  with `E_KRN_017: PARENT_NOT_REMEDIATION_ELIGIBLE`, because the test incident's real Judge
  outcome was UNDETERMINED rather than CONFIRMED - a remediation report is only valid against a
  CONFIRMED parent, and this rejection is itself correct protocol behavior, not a bug. A second
  attempt with two corroborating evidence sources to try to reach CONFIRMED failed with an
  undiagnosed evidence-validation exception. Rather than keep iterating on evidence content to
  engineer a favorable Judge outcome - which would risk exactly the benchmark-tuning CLAUDE.md
  Section 37 prohibits - this was stopped and reported honestly. The zero-children/empty-parent
  case for a plain root incident WAS verified live (`get_parent_child_count` = 0,
  `get_incident_parent` = `""`). The parent->child success path itself remains proven only by
  Python unit tests (`20674c2`), not live on-chain evidence - a genuine open item for a future
  session, not claimed closed here.

`npm run verify:js` passes in full on this state. No contract source was modified in this
deployment pass (deploy-only). Full transaction-by-transaction evidence is in
`deployment/61997/r1r-manifest.json`.

## Real bug found: unguarded exception in IncidentJudgeV1._run_judgment's leader path (2026-09-13)

While attempting the full E1 canonical demo's CONFIRMED-outcome step (needed for
restriction/remediation/recovery), certain realistic evidence text reproducibly crashes
`submit_incident` with an unhandled exception (`exit_code 1`, no error message, no controlled
`UserError`) rather than resolving cleanly to a judged outcome. Root-caused and isolated via
direct testing against the fresh `r1r` deployment using the plain `genlayer estimate-fees` CLI
(no custom script involved, ruling out a tooling artifact):

- A 100-character string of repeated `"a"` characters as CONTENT_ADDRESSED_SNAPSHOT evidence
  succeeds cleanly.
- A 13-character trivial string succeeds cleanly.
- A 53-character realistic sentence ("Confirmed active credential compromise, not a rumor.")
  FAILS with exit_code 1.
- A ~330-character realistic security-bulletin-style paragraph FAILS identically, both as the
  sole source and alongside a second source, regardless of position in the sources array.

This rules out source count, text length, and source-class-combination as the trigger - the
common factor across all failing cases is realistic, evidence-like prose content, and the common
factor across all succeeding cases is trivial/repetitive content, suggesting whatever underlying
`gl.nondet.exec_prompt` call `_evaluate_once` makes fails unpredictably for certain real inputs
(most plausibly a non-strict-JSON response from the pinned LLM triggering a raw parse exception
inside GenVM's prompt-execution path, though the exact GenVM-internal failure was not
directly observable from the receipt - `genvm_result.stderr` was empty even though this is
clearly an uncaught exception, meaning the traceback is not being surfaced to the caller either).

**Likely root cause** (contracts/incident_judge_v1.py::_run_judgment): `leader_fn` calls
`self._evaluate_once(rule_id, eap)` with NO exception handling, while the sibling `validator_fn`
wraps its own re-evaluation in `try/except Exception: return False`. This asymmetry means any
exception during the LEADER's real-LLM evaluation propagates uncaught and crashes the whole
transaction, instead of failing gracefully. This should be fixed (wrap `leader_fn`'s body in a
try/except that falls back to `{"condition_code": "INSUFFICIENT_EVIDENCE", "outcome":
int(DECISION_OUTCOME_UNDETERMINED)}` on any exception, matching `_evaluate_once`'s own existing
graceful-degradation philosophy for fetch failures) and redeployed before the full E1 canonical
demo's CONFIRMED/remediation/recovery steps can be completed live.

**Not fixed in this session** - this is a contract-source change requiring its own careful
review, Python test coverage, and a fresh redeployment, which is out of scope for the current
live-deployment/demo session. Filed here as an honest, real, reproducible finding rather than
worked around by further evidence-content iteration (which would risk the benchmark-tuning
CLAUDE.md Section 37 prohibits, and in any case a fix belongs in source, not in evidence wording).

**E1 canonical demo status:** DEPLOY_VERIFY/REGISTER_TARGET/ACTIVATE_POLICY/FUND_REFERENCE_AGENT/
PURCHASE_PROVIDER_A are complete with real evidence (treasury funded to 5 GEN by the repository
owner directly, since the pinned `genlayer` CLI v0.40.0-rc.3 hardcodes `value: 0n` on every
write/deploy call - confirmed by reading its actual source - so it cannot itself send a payable
value; first purchase tx `0x2a324292ce0ed5f92a2d3d70f1a2fec66379e9458e15e8d429a97cb6ff8121f9`,
FINISHED_WITH_RETURN). The remaining steps (CONFIRMED incident onward) are blocked by the bug
above, not by funding or tooling.

## CRITICAL CORRECTION (2026-09-13, later same day): the exec_prompt fix did NOT resolve the multi-source crash

After redeploying a fresh stack (target `reclose-target-005`, policy `policy-r1-006`, Judge
`0xcdC5ce7A17cBecbBDCde4F5FA65E83366B018819` carrying the `_evaluate_once` exec_prompt try/except
fix from commit `595c723`), the exact same multi-source evidence that previously crashed with
`exit_code 1` was retested against the FIXED Judge and **still crashes identically**. This proves
the earlier root-cause hypothesis (an uncaught exception from `gl.nondet.exec_prompt` itself) was
**incomplete or wrong** - the fix is real and defensible on its own merits (it correctly closes a
genuine gap versus `validator_fn`'s existing exception handling, and is covered by a real
regression test), but it does NOT explain or fix the specific multi-source crash observed.

**Honest conclusion:** the true root cause of the multi-source `exit_code 1` crash remains
UNDIAGNOSED. It is reproducible, deterministic (not flaky), and correlated with realistic
English-language prose content in a `CONTENT_ADDRESSED_SNAPSHOT`-classed source specifically
(trivial/repetitive text of the same or greater length never crashes) - but the exact mechanism
was not found before this session's token budget was exhausted. Candidate next steps for a future
session: instrument `_parse_and_validate_eap` and `_authority_for_source` directly (add temporary
print/log statements or bisect by commenting out sections) against a MINIMAL two-line Direct Mode
repro using `gltest` (once the Windows `PermissionError` blocker is worked around, e.g. by running
on Linux/WSL/CI), since the live-chain `exit_code 1` gives no traceback at all and further live
bisection is costly in both GEN and time.

**Practical state:** single-source PROVIDER_COMPROMISE_V1 submissions work correctly on the fixed
Judge and correctly resolve to real LLM-judged outcomes (this session's fresh-stack test:
UNDETERMINED/INSUFFICIENT_EVIDENCE, tx `0x933fd81a4e67043a42df5204031f1c8454debe3c2d4aa1ea88a5769519ed6e01`,
consistent with every prior single-source live test in this repository). Multi-source submissions
remain broken and MUST NOT be used until root-caused. The full E1 canonical demo's CONFIRMED
path was not completed live this session - reaching CONFIRMED via single-source evidence alone
was not achieved either (the real LLM judgment for the tested single-source content resolved to
UNDETERMINED both before and after the Judge redeploy).

**Do not attempt further live incident submissions to chase a CONFIRMED outcome without either
(a) a specific new evidence-quality hypothesis worth testing once, or (b) fixing the multi-source
bug first** - repeated attempts already exhausted this session's reasonable budget without new
signal, and further blind iteration risks the benchmark-tuning CLAUDE.md Section 37 prohibits.

## Judge evidence-authority hardening (2026-09-13, owner-directed, source-only — NOT deployed)

The repository owner identified a real, release-critical gap in the Judge's evidence-authority
model, independent of the crash-bug investigation above (which a concurrent agent worked on in
parallel; this pass avoided `_evaluate_once`/`_parse_and_validate_eap`/`_run_judgment`'s
leader/validator control flow itself except where the fetch-and-verify change below required
touching `_evaluate_once`'s `CONTENT_ADDRESSED_SNAPSHOT` branch specifically). Three issues,
all closed:

1. **Snapshot evidence is now independently fetched and hash-verified, not merely
   self-consistent.** `CONTENT_ADDRESSED_SNAPSHOT` sources previously satisfied `contentHash ==
   keccak(extractedText)` and were then trusted as-is inside `_evaluate_once` - proving only that
   the Reporter hashed their own submitted text correctly, never that the text exists anywhere
   independently checkable. `_parse_and_validate_eap` now requires a non-empty `snapshotRef`
   (bound to the same registered origin/path authority as `url`) for this class, and
   `_evaluate_once` now performs a real `gl.nondet.web.get(snapshotRef)` fetch, hashes the
   REAL fetched bytes, and only uses that fetched content for judgment if the hash matches the
   claimed `contentHash`. A fetch failure, non-200, or hash mismatch contributes nothing
   (UNCERTAINTY) - it never falls back to Reporter-supplied `extractedText`. This is a genuine
   evaluation-semantics change for this one source class, not a purely additive view.
2. **Origin binding narrowed below hostname.** Added an optional `canonicalPathPrefix` field to
   the source-registry schema (`SourceAuthorityRecord.canonical_path_prefix`); `_authority_for_source`
   now calls the new `_url_matches_authority`/`_extract_origin_and_path` helpers, which require the
   URL's path to start with the registered prefix, not just match the hostname. Applied to BOTH
   `url` and (for `CONTENT_ADDRESSED_SNAPSHOT`) `snapshotRef`. `config/source-registry-r1.json`
   (the only source-registry config file in the repo - no other generation-specific variants
   exist) now binds both existing sources to
   `/genlayerlabs/genlayer-project-boilerplate/main/` specifically, rather than the bare
   `raw.githubusercontent.com` hostname (which is shared, multi-tenant infrastructure hosting
   arbitrary attacker-controlled repos). **This changes the registry's canonical hash
   (`_canonical_hash(registry)`), so any future Judge deployment using this registry needs the
   hash recomputed - not done here since no deployment is part of this task.**
3. **Duplicate/correlated sources within one EAP now rejected.** `_parse_and_validate_eap` tracks
   seen `sourceId`s, `url`s (lowercased), and `contentHash`es across the `sources` array in a
   single pass and raises `E_JDG_SOURCE: duplicate sourceId in one EAP` /
   `E_JDG_SOURCE: duplicate URL claimed as independent corroboration` /
   `E_JDG_SOURCE: duplicate contentHash claimed as independent corroboration` on any repeat -
   closing the gap where a Reporter could submit the same evidence multiple times dressed up as
   independent corroboration.
4. **Source-class self-upgrade protection confirmed unchanged.**
   `_authority_for_source`'s `claimed_class == rec.source_class` check was already correct and is
   untouched; `test_source_class_cannot_self_upgrade` (pre-existing) and the new
   `test_source_class_cannot_self_upgrade_still_enforced_after_hardening` both pass.

`get_source_authority`'s return tuple grew from `(origin, sourceClass, ruleIdsCsv, enabled)` to
`(origin, pathPrefix, sourceClass, ruleIdsCsv, enabled)` - a breaking view-signature change,
confirmed to have zero frontend/SDK callers (grepped repo-wide; only the test file called it), so
no other source needed updating for this specific signature change.

**Client-side (`@reclose/evidence-builder` / `packages/protocol-sdk/src/evidence.ts`):**
`validateEap` now rejects a `CONTENT_ADDRESSED_SNAPSHOT` source with an empty/missing or
unsafe-URL `snapshotRef` - previously `snapshotRef` was always-optional/frequently-empty per the
pre-hardening design (`packages/sentinel/src/candidateEap.ts` always set it to `""`). Updated
`candidateEap.ts` so a Sentinel-detected `CONTENT_ADDRESSED_SNAPSHOT` source now sets
`snapshotRef = source.url` (the exact URL Sentinel already independently fetched to produce
`extractedText`), satisfying the new requirement without inventing a second fetch. `client.ts`'s
`buildIncidentReport`/`buildRecoveryReport`/`buildRemediationReport` already threaded a
caller-supplied `snapshotRef` through unchanged - no further client change needed there.

**Tests added** (`tests/judge/test_incident_judge_v1.py`, all passing locally - 45/45 total in
this file, up from 34): narrow-path-binding round-trip proof
(`test_registry_narrows_binding_below_hostname`); attacker-repo-same-hostname rejection under both
`url` and `snapshotRef` (`test_attacker_controlled_repo_same_hostname_rejected`,
`test_snapshot_ref_outside_authority_path_rejected_even_with_good_url`); empty-snapshotRef
rejection (`test_content_addressed_snapshot_requires_nonempty_snapshot_ref`); invented-text
rejection when the independent fetch disagrees with the claimed hash
(`test_invented_snapshot_text_rejected_when_independent_fetch_disagrees`, mocks a fetch returning
different content than claimed and confirms UNDETERMINED/INSUFFICIENT_EVIDENCE rather than the
Reporter's claimed CONFIRMED code); positive-path sanity that a genuinely matching fetch is used
and CAN confirm (`test_snapshot_content_matching_hash_is_used_and_can_confirm`); fetch-outage
never-falls-back proof (`test_snapshot_fetch_outage_never_falls_back_to_reporter_text`, mocks a 404
and confirms no fallback to `extractedText`); duplicate-sourceId/URL/contentHash rejection across
three tests; and a fresh confirmation that source-class self-upgrade is still rejected. Ran via
local `pytest tests/judge/test_incident_judge_v1.py -q` on this Windows environment - the
previously-reported `gltest` Windows `PermissionError: [WinError 32]` did NOT reproduce this
session (45 passed in ~33s); genvm-lint (`node scripts/genvm-lint-wrapper.js
contracts/incident_judge_v1.py`) is clean, `python -c "import ast; ast.parse(...)"` confirms valid
syntax, and the full `npm run verify:js` (lint/typecheck/build/every JS-side test suite including
`evidence-builder:test`, `sentinel:test`, `sdk-product-truth:test`, `a0-integrity`) passes in full
after these changes. CI (Linux) remains authoritative for the real Python test result once pushed,
per this repo's standing practice.

**Not deployed - explicitly out of scope for this task.** This is a genuine semantic change to
`IncidentJudgeV1` (the `CONTENT_ADDRESSED_SNAPSHOT` evaluation branch now performs a real fetch it
previously skipped, plus the narrower registry binding changes the registry's canonical hash), so
none of the live deployments referenced elsewhere in this document
(`r1-manifest.json`/`r1r-manifest.json`/the "r1r2" generation) carry this hardening. **A fresh
Judge deployment is required before this hardening is live-provable**, and per the section above
this same fresh deployment should also carry the concurrent agent's `_run_judgment` leader-path
crash fix (`_evaluate_once`'s `exec_prompt` try/except, commit `595c723`, already confirmed
insufficient alone for the still-undiagnosed multi-source crash) so both hardening passes land
together rather than requiring two more redeploy cycles. Until that redeploy happens and is
live-verified, treat this evidence-authority hardening as CODE-COMPLETE/TESTED, NOT
LIVE-VERIFIED.

### Fresh stack addresses (this redeploy, "r1r2" generation)
- Kernel: `0xa0a967Db641af4E62DB36367F560afb21cc7Ec00`
- ReferenceAgentProtocol (target `reclose-target-005`): `0xC8B75C6a131d601f8C1A3d0a82ffEd4Be2D58AD2`
- IncidentJudgeV1 (fixed): `0xcdC5ce7A17cBecbBDCde4F5FA65E83366B018819`
- IncentiveVault: `0x33A1DD29572136d1a4B443b3ebF5F3A08F35B90C`
- Providers reused from r1r: ProviderStubA `0x17fb724D936c930f6e42C92283cF51dB661e97f5`, ProviderStubB `0x4CD612D701902355836bC3C182eac724B1487A4f`
- Policy: `policy-r1-006`, sealed+activated (activatedAt=1789294172), all wiring verified live.
- Full construction/wiring tx hashes captured in shell history this session; a formal manifest
  file (`deployment/61997/r1r2-manifest.json`) was NOT written before the token budget ran out -
  this is an honest documentation gap for the next session to close using the tx hashes above.

## Windows local-pytest blocker fixed; multi-source crash root-caused via Direct Mode (2026-09-13, later same day)

This pass was asked to root-cause the `submit_incident` multi-source `exit_code 1` crash from
scratch, following the owner-specified diagnostic ladder (deterministic precheck -> prompt
construction -> raw exec_prompt -> JSON-mode exec_prompt -> full leader/validator path). While
building the Direct Mode harness, this pass discovered that a **concurrent session was working the
same finding in parallel on this same branch/working tree** (commits `6fb4404`, `43a597c`,
`0ce9049`, `298a970` landed mid-session - see the "Judge evidence-authority hardening" section
directly above, which that session wrote). This section records what THIS pass independently
found/verified, most of which corroborates that section rather than duplicating it.

**1. The Windows `gltest` `PermissionError: [WinError 32]` blocker is now fixed, locally, for
everyone working in this checkout.** Root cause (read directly from
`.venv-c1/Lib/site-packages/gltest/direct/loader.py::_inject_message_to_fd0`): the function
`tempfile.mkstemp()`s a temp file, `os.dup2`s it onto fd 0 for the GenVM subprocess to read, then
immediately `os.unlink()`s the path in a `finally` block. On POSIX this is safe (unlink-while-open
is the standard idiom). On Windows, `os.unlink` fails while any handle to the file remains open,
and the dup'd fd 0 handle is **never closed/restored anywhere in the installed package** (searched
the whole `gltest/direct/` module for `_original_stdin_fd` - it is only ever assigned, never read
back), so a retry-with-backoff around the unlink would never succeed either. Fix: a new
**repository-root `conftest.py`** (new file, not shipped/installed - it only monkeypatches this
already-installed local venv's `os.unlink` in-process, for the life of the pytest run) that
swallows `PermissionError` specifically when `winerror == 32`, leaving a harmless orphaned temp
file instead of crashing the test collection. Any other `PermissionError` still propagates
unchanged. Verified: `pytest tests/` now passes **218/218** locally on this Windows machine in
~138s (previously: 0 tests could even run). This is a pre-existing bug in the third-party `gltest`
package, not in Reclose's own code, and this workaround does not change any shipped artifact.

**2. Direct Mode confirms the deterministic precheck is content-agnostic (rules it OUT as a
length/content-dependent trigger) and reproduces the exact `scripts/r1r-fresh-incident-retest2.mjs`
failure exactly.** New file `tests/judge/test_content_snapshot_diagnostic.py` (6 tests, all
passing) builds a Direct Mode registry mirroring `config/source-registry-r1.json`'s real
`reclose-reference-evidence` `CONTENT_ADDRESSED_SNAPSHOT` source and drives `submit_incident` with
the owner's four specified content variants (A: trivial ~100-char repeat; B: the 53-char realistic
sentence; C: a ~330-char realistic security-bulletin paragraph; D: the exact two-source shape from
`scripts/r1r-fresh-incident-retest2.mjs`). Findings:
   - With a correctly-populated `snapshotRef` (and a mocked independent fetch returning matching
     content), **variants A, B, C, and D all pass `_parse_and_validate_eap` and reach a real judged
     outcome identically** - i.e. the deterministic precheck (hash/authority/registry validation)
     does not discriminate on evidence text content or length at all. This rules out
     `_parse_and_validate_eap`/`_authority_for_source`/prompt-construction as a
     content-dependent crash source.
   - **Root cause for the specific `scripts/r1r-fresh-incident-retest2.mjs` reproduction, confirmed
     directly**: that script's `CONTENT_ADDRESSED_SNAPSHOT` source (`sourceId:
     "reclose-reference-evidence"`) never set a `snapshotRef` field at all (grep the script before
     this session's fix - confirmed absent). The hardened `_parse_and_validate_eap` (already present
     on HEAD via the concurrent session's `6fb4404`) unconditionally requires a non-empty
     `snapshotRef` for that source class and raises `gl.vm.UserError("E_JDG_EVIDENCE:
     CONTENT_ADDRESSED_SNAPSHOT requires a non-empty snapshotRef")` - deterministically, before any
     nondet/LLM call, identical for every content variant and every source position. Test
     `test_snapshot_ref_missing_reproduces_the_exact_live_crash` reproduces this exact failure
     byte-for-byte in Direct Mode. Fixed the script itself (small, safe, additive:
     `scripts/r1r-fresh-incident-retest2.mjs` now sets `snapshotRef` to the same URL it already
     used as `url` for that source, mirroring `packages/sentinel/src/candidateEap.ts`'s already-
     fixed pattern) so it no longer builds a structurally-invalid EAP if re-run.
   - **This explains "no error message" as a CLI/tooling display gap, not a genuine unhandled
     crash**: `gl.vm.UserError` DOES carry a message; the most likely explanation for prior reports
     of a bare `exit_code 1` with nothing decoded is that manual, hand-crafted `genlayer
     estimate-fees ... --args ...` invocations (bypassing `packages/protocol-sdk/src/evidence.ts`'s
     `buildEap`, which already independently validates and would have thrown a clear local error
     for a missing `snapshotRef` before ever touching the chain - confirmed by reading
     `validateEap`) do not surface the VM's structured revert reason the way `buildEap`'s own
     client-side validation would have.
   - **Honest limitation, confirmed directly by reading the installed package**:
     `.venv-c1/Lib/site-packages/gltest/direct/wasi_mock.py::_handle_llm_request` intercepts
     `gl.nondet.exec_prompt` unconditionally in Direct Mode and returns whatever the test itself
     registered via `mock_llm(pattern, response)` - it never makes a real network call and never
     depends on real model behaviour. Direct Mode is therefore structurally **incapable** of
     reproducing a crash whose root cause lives inside the real pinned LLM's real response to real
     prompt content (stage 3/4 of the owner's diagnostic ladder). `test_direct_mode_llm_mock_ignores_prompt_content`
     pins this down explicitly so a future session does not re-discover it. **This means: if a
     single-source, snapshotRef-correct EAP still crashes live with realistic prose content (not
     yet re-tested live this session, since this session deliberately avoided further live
     writes/estimate-fees calls per the owner's cost-consciousness instruction and the concurrent
     session's fix is not yet deployed), that residual failure mode - a real Stage 3/4,
     model-response-dependent bug - would NOT be visible in Direct Mode at all and can only be
     confirmed or ruled out by a live retest against a freshly redeployed Judge carrying commit
     `6fb4404`/`43a597c`'s hardening.**

**3. No further contract-level bug was found or fixed in `contracts/incident_judge_v1.py` by this
pass beyond what the concurrent session already committed** (`6fb4404`/`43a597c`/`0ce9049`). This
pass's own read of `_evaluate_once`, `_parse_and_validate_eap`, `_authority_for_source`, and
`_run_judgment` (post-hardening) found the CONTENT_ADDRESSED_SNAPSHOT independent-fetch-and-verify
logic, the path-prefix authority binding, and the duplicate-source rejection to be correctly
implemented and already covered by that session's `test_incident_judge_v1.py` additions. Per
CLAUDE.md's honesty requirements, this pass did not invent an additional contract change merely to
satisfy a "must edit the contract" expectation once no further contract defect was found.

**Practical state after this pass**: local Direct Mode testing is fully unblocked on Windows
(218/218 passing, `conftest.py` fix), the specific `retest2.mjs` reproduction is root-caused and
fixed at the script level, and the hardening needed to fix it in the actual protocol was already
implemented (by the concurrent session) but **still requires a fresh live Judge deployment and a
real live retest before the multi-source crash can be marked LIVE-VERIFIED CLOSED** - this pass did
not deploy anything (out of scope for this task) and did not spend further live GEN/time on
speculative live retests, per the owner's explicit cost-consciousness instruction for this task.

## Frontend-only 21-item audit re-verification (2026-09-13, later same day, `frontend/` only)

Owner directed a frontend-only re-verification pass of a 21-item checklist covering the wallet
writer, signer/owner-binding, fee-detail threading, bond gating, policy journey, recovery/
remediation lineage, tri-state provider truth, nav surfaces, Sentinel persistence, CLI coverage,
and an accessibility/security browser sweep - explicitly scoped away from `contracts/`,
`deployment/`, and `release-evidence/` to avoid colliding with a concurrent live-deployment/E1
session. Full per-item results reported to the owner in chat; one real gap found and fixed:

- **Item 17 (provider tri-state):** `getProviderAvailabilityTriState` was fully implemented in
  `packages/protocol-sdk/src/client.ts` and both frontend adapters, but never called or rendered
  anywhere in `frontend/app.js` - the truth existed but was invisible in the product. Added a
  "Provider availability (tri-state)" panel to `renderTargetDetail` (commit `6dfd522`), verified
  live in-browser against the `reclose-target-004` fixture (renders AVAILABLE/UNAVAILABLE/UNKNOWN
  correctly, no console errors, 1440x900 and 375x812 viewports both clean).
- All other 20 items were independently re-verified against current source (not memory/docs) and
  found genuinely DONE: pinned `genlayer-js@2.0.0-rc.1` browser writer, no real Snap integration
  (the `wallet_requestSnaps` hit is dead code inside the vendored genlayer-js bundle's own unused
  `metamaskClient` helper, not Reclose's own writer path), signer-identity binding at sign time,
  live (fresh-read, non-memoized) owner checks for every owner-bounded write builder,
  `accountsChanged`/`chainChanged` invalidating the whole policy journey (not just the latest
  draft), wrong-network blocking in `submitWrite`, full fee detail
  (distribution/messageAllocations/feeValue) threaded through to `writeContract`, `buildOpenBond`
  estimating at the real non-zero `rule.reportBond` value, deterministic Keccak-256 bond IDs,
  `requireVerifiedBond` gating all three of `buildIncidentReport`/`buildRecoveryReport`/
  `buildRemediationReport`, the strict sequential policy-construction/activation state machine
  (advance only after tracked lifecycle-final + execution success), `get_policy_lifecycle`-backed
  seal/timelock readback, the unconditional target-registration handshake, correctly-gated
  remediation-then-recovery UI driven by real `getIncidentLineage` reads, and real
  Evidence/Recovery-queue/Integrations nav surfaces.
- **Item 19/20 (Sentinel durable state, CLI coverage):** confirmed via direct source/test
  inspection - `FileSentinelStateStore` (atomic tmp-file + rename) with real
  restart/resume/no-duplicate tests in `scripts/test-sentinel.js`; `packages/cli/bin/reclose.js`
  covers every documented command, with `*/report` write commands and `benchmark run`
  intentionally absent and documented as such.
- **Item 21 (accessibility/security browser sweep):** no prior real sweep existed (only "pending"
  notes in the A3 packets) - ran one this pass against the live `reclose-frontend` preview server
  (port 4600): 1440x900 and 375x812 viewports both render cleanly with zero console errors;
  `frontend/styles.css` has `:focus-visible` styling, a skip link, and a
  `prefers-reduced-motion: reduce` block; every dynamic/user-controlled field rendered into
  `innerHTML` across `frontend/app.js` passes through `escapeHtml` first (spot-checked by
  excluding all `innerHTML` call sites that already route through `escapeHtml`/`notice`/`panel`/
  `recordRows`/etc. - none left over that inject raw evidence/URL text). Did not run a full
  automated axe-core/Lighthouse scan (no such tool is wired into this repo's toolchain) - this
  remains an honest gap for a future pass, consistent with the existing A3-attempt-2 packet notes.

`npm run verify:js` passes in full after this pass's single change. No file under `contracts/`,
`deployment/`, or `release-evidence/` was touched.


## Current continuation state (2026-09-13)

Fresh `r1-final-working` deployment on Studio-dev/61997 is reconstructed and readback-verified. Contract addresses, seven successful deploy/wiring hashes, provider reuse, source-registry hash, and readbacks are recorded in `deployment/61997/r1-final-working-manifest.json`. The fresh APM compiles to `policy-r1-007` for `reclose-target-006`, Judge `0xD96eBeF28EbdAB25A70Ba7bcd2F4A5fa7EFf56A6`, hash `0x078ee18645dd95b5a7268b1c12e314c5046d018866d5dd244727f02eceee855c`; it is not on chain.

Pinned CLI 0.40.0-rc.3 is configured for Studio-dev 61997 and active account `reclose-deployer` matches target owner `0x24fAe7cD031Ed702Be63BDeA8912141805B996bd`. The `begin_policy` fee estimate succeeded, but signing prompted for the keystore password and returned `Invalid password`. No policy write was submitted and no tx hash exists. Exact resume prerequisite: unlock/provide the `reclose-deployer` keystore credential. Then re-estimate and submit `begin_policy`; require `FINALIZED` and `FINISHED_WITH_RETURN` plus per-item readback before advancing.

A2-C01 and the missing-`snapshotRef` root cause remain closed per the latest user instruction. Frontend tri-state provider status and accessibility work are present. Verification in this continuation: frontend product 10/10, frontend remediation 66/66, policy compiler and evidence-builder passed, canonical `pytest tests/` 218/218. A broader `pytest -q` collected one archival `release-evidence/r1/g0` test outside canonical `tests/` that references a missing root `smoke_contract.py`; it is excluded by `scripts/py-verify.sh`.

No Reporter nonce has been read. No E1 Run A/B, H1, final A3 packet, A4 reconciliation, final fee profile, or release candidate branch has been completed. The old `r1r2` generation/policy must not be represented as final.

## Source-authority correction (2026-09-13)

The earlier handoff prerequisite saying the deployer password was required is superseded: although `genlayer account unlock` rejected the supplied password, `genlayer account` subsequently reported `reclose-deployer` unlocked and the policy `begin_policy` write signed successfully from the cached OS keychain. The transaction `0x52fe8d06de476c7ed84bc09c529d94e8a5a75312931de1ca41e57d5361db1ae2` finalized with `FINISHED_WITH_RETURN` and its readbacks passed.

The current policy `policy-r1-007` was fully constructed and sealed, but remains inactive and is superseded before activation. A live `get_source_authority('reclose-reference-evidence')` read returned the mutable `/genlayerlabs/genlayer-project-boilerplate/main/` path. That cannot admit the required immutable, commit-pinned synthetic fixtures; fetching its README confirmed it is unrelated boilerplate. The three synthetic fixture files are committed at immutable source commit `ea7dfb76b84adc24bbc40b4a5827cc3a0ae412b6`; independent HTTP fetches returned 200 and byte-identical Keccak hashes. The registry now points its snapshot authority at that exact commit path with hash `0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386`.

**Next:** deploy a corrected Judge and matching Vault only; retain the already-valid Kernel, Protocol/target and providers. Build a new APM/policy (the old policy is immutable and must not be activated), then seal, wait its actual timelock plus buffer, activate, and verify. No E1 report has been submitted; no Reporter nonce has been read.

## 2026-09-13 continuation: corrected deployment and active policy

The earlier statement that account unlock failing meant no signer was available was incorrect. The CLI reports reclose-deployer as unlocked, and policy writes signed successfully. The unlock subcommand independently failed to decrypt the local keystore; no password action is needed unless signing later fails.

Corrected Judge 0x05f9E58B5ce635FCEd8076c9dAA714b19c287028 deployed in 0xf43911a88f3854f631b764c3e513ce804797b1e7e5ef49182219101efaf16664. Live get_source_registry_hash equals current recomputed hash 0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386; get_source_authority('reclose-reference-evidence') returns origin https://raw.githubusercontent.com, commit-pinned fixture path /ometere123/reclose/ea7dfb76b84adc24bbc40b4a5827cc3a0ae412b6/release-evidence/r1/e1/fixtures/, class CONTENT_ADDRESSED_SNAPSHOT, and enabled=true.

Fresh Vault 0x67d6a5642dfa7E14D7ffCce819C1cc01F7E73461 deployed in 0xb8121b9983a1fe131cc071eeada2860293aef70d4410b3b9f9653a291d5555fb; Judge-to-Vault wiring 0x223fd720c943ee3701cf2ebe1fab7d85230b5503f7c5044eaa341cfbb7143c2b is finalized. Constructor and two-sided wiring reads match the new Kernel/Judge.

New canonical APM deployment/61997/apm-r1-final-evidence-v2.json compiles and validates with RFC8785/JCS + Keccak-256 hash 0x6c1c74ecf17d4812bb36b45ca8c162c87a3da893d675caba3f33ff4bc97d1881; all three rules reference the corrected Judge. Policy policy-r1-008, version 2, was written item-by-item; all 11 policy writes finalized with FINISHED_WITH_RETURN and were read back. Seal tx 0x35590509274d645da069afe693b2ed957eb3c011d7034f7ecee74d3223811d3d recorded counts [3,2,4] and activation-not-before 1789309116. After the genuine timelock plus a buffer, activation tx 0x587ebecce63c1405f5332cd43293ec660dd248c00cfecb7e977ced77c1943b83 finalized successfully. Live Kernel reads show active policy policy-r1-008, version 2, the expected hash, active=true, target generation 1, and the compromise rule bound to Judge version 1.

Current final deployment state is recorded in deployment/61997/r1-final-manifest.json and deployment/61997/r1-final-evidence-v2-working-manifest.json. The prior policy-r1-007 remains sealed/inactive and superseded.

### E1 Run A funding handoff

Run A has not started. Live ReferenceAgent reads show get_state() = 0 (NORMAL), effective provider 1 (Provider A), target/controller bindings correct, and get_treasury_balance() = 0. The pinned CLI write command has no payable-call value option (only --fee-value, which pays transaction fees). A payable wallet call is required before the first real purchase.

Exact action: on Studio-dev / chain 61997, use the injected wallet to call fund_treasury() on ReferenceAgent 0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2 with 0.20 GEN; then provide the transaction hash. This covers three canonical 0.05-GEN purchases (including the SAFE_MODE fallback, whose per-purchase ceiling is 0.10 GEN). Resume by verifying get_treasury_balance() >= 0.15 GEN, then execute and read back the first Provider A purchase.

No Reporter nonce has been read; no incident/report has been submitted. Run B, H1, A3/A4, requirements/threat reconciliations, release packaging, and final candidate verification remain outstanding.

## Run A funding verification (2026-09-13)

The user completed the payable `fund_treasury()` call for the active Run A target. Transaction `0x89f42b16fea6f065607c25b9d68c7663a955a4f56f4878d891fa4e9aeb04dc62` is FINALIZED with `FINISHED_WITH_RETURN`; the 0.20 GEN transfer was accepted from `0x755BA2BD3B11aaa29aa0f6a042e43e36566A6472` to ReferenceAgent `0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2`. Explorer and SDK readback both show treasury balance `200000000000000000` wei. This closes the payable-funding prerequisite; the transfer sender is not the registered target owner.

Prepared the initial purchase with exact arguments `purchase_service("e1-r1-final-run-a-initial-purchase-001", 50000000000000000)` and caller value zero. Expected provider is A (`0x17fb724D936c930f6e42C92283cF51dB661e97f5`). SDK fee estimation returned the required nested Provider A allocation and fee value `120619935600020704`; no purchase has been submitted and no test GEN has been spent. The task sandbox cannot launch the Windows GenLayer CLI shim under AppData, so the owner-signed write remains a human action. A guarded PowerShell helper is at `scripts/studio-dev-run-a-initial-purchase.ps1`; it checks Studio-dev chain ID and verifies `reclose-deployer` against the registered owner before estimating and submitting once. Resume by running that helper in the user's configured PowerShell and returning its transaction ID; then require FINALIZED + FINISHED_WITH_RETURN and verify Provider A selection, fulfilled request, 0.05 GEN provider balance delta, and treasury post-state before the compromise report.

The first helper version failed while parsing non-JSON text from the CLI estimator and submitted no transaction. It was corrected to use `scripts/estimate-studio-dev-write.mjs`, which now supports an explicit caller address and BigInt argument indexes. A fresh owner-bound simulation with the amount encoded as `u256` passed and returned the nested Provider A allocation and `feeValue=120619935600020704`. The PowerShell helper syntax parses cleanly, and `npm run verify:js` passes in full after the correction. The exact transaction write remains pending the user's owner CLI signer.

## Run A incident continuation (2026-09-13): purchase verified; fee preflight open

The user's pasted CLI receipt confirms Run A initial purchase parent `0x1414c3021e901bc7400521c07be271f16bcf19faa81cb19e723013a40db59550` is FINALIZED / FINISHED_WITH_RETURN. Provider A child `0x77708bab52d63943ffc867c24d6a7fe22e685e02fbd85f1865af74cecd673a2a` succeeded. Live readbacks in both final manifests record the fulfilled request, 0.05 GEN payment to Provider A, provider total 1.00→1.05 GEN, treasury 0.15 GEN, Provider A still selected, and target NORMAL. OB-011 is closed.

Added `scripts/r1-final-run-a-incident-prepare.mjs` (read-only exact-call preflight) and `scripts/studio-dev-run-a-incident.ps1` (guarded owner CLI submission wrapper). Node and PowerShell syntax checks pass; the nested-allocation regression suite passes 9/9. Full `npm run verify:js` completed successfully in this continuation. The helper checks live policy/target/registry state, independently fetches the immutable synthetic compromise fixture, builds the canonical EAP with `snapshotRef`, and reads Reporter nonce before fee preparation.

Incident submission remains unperformed. Manual Target-subtree fee simulations failed at the internal emit (`SystemError: 2: inval` on the accepted stage; finalized stage returned execution failure). With bounded reads and an open message-fee bucket, finalized Kernel estimation succeeds with SDK `feeValue=240663559200031056` wei and `totalMessageFees=240024000000020704` wei (one SDK-reported child allocation). The accepted/provisional Kernel stage still fails at `EmitInternalMessage` with `SystemError: 2: inval`. Some retries also returned `Rate limit exceeded: 30 requests per minute` and `Server busy: all 8 execution slots occupied`. Do not sign until the accepted-stage failure is understood and read-only preparation returns a complete SDK fee preset; reread Reporter nonce immediately before construction/signing. No transaction has been submitted; the nonce value was not persisted and must be freshly read on resume.

Exact resume operation: rerun `node scripts/r1-final-run-a-incident-prepare.mjs` after Studio-dev recovers. If successful, execute `./scripts/studio-dev-run-a-incident.ps1` once from the registered owner's configured CLI, then verify parent, Kernel child, Target child transactions and containment readbacks. Branch `claude/r1-product-final`; checkpoint SHA before these local continuation edits was `8e65f10e7659de74f691acf92248ad03596acbdb`. Preserve local changes and `.claude/settings.local.json` (untracked, untouched).

## Studio-dev request throttling and stable accepted-stage fee failure (2026-09-13)

The latest pasted terminal output is the same successful Run A initial-purchase receipt already captured above; no new incident transaction was created. The fee preflight was read-only. Its finalized `receive_decision` branch succeeded with `feeValue=240663559200031056` wei, `totalMessageFees=240024000000020704` wei, and one child allocation. Its accepted/provisional branch failed three times at the same `EmitInternalMessage` point after rate-limit and execution-slot pressure had cleared. The complete failure response and GenVM trace are frozen in `release-evidence/r1/e1/incident-fee-preflight-failure.json`.

Added `scripts/studio-dev-rpc-throttle.mjs`, a shared per-process FIFO fetch guard for Studio-dev RPC. It spaces RPC starts by at least 2600ms, retries only bounded transient transport/rate/capacity failures with exponential backoff, and increases spacing for consecutive transaction receipt/status polls. The incident preflight now issues RPC operations sequentially. The PowerShell submit flow preloads the same guard into each Node/GenLayer CLI process, spaces process launches, uses the preflight-produced fee preset unchanged, and performs bounded throttled receipt polling only after a successful preflight and write. The stable accepted-stage simulation error itself is not retried. No new Studio-dev RPC call or write was made during this implementation pass.

The active resume point is local diagnosis of the accepted/provisional message-fee path using the retained trace; do not rerun the same failing preflight or submit an incident until the full read-only Judge→Kernel→Target simulation produces a complete SDK fee preset. `.claude/settings.local.json` remains pre-existing, untracked, and untouched.

## 2026-09-13 correction: lifecycle-specific Kernel call keys

The exact Studio release tag shown by the captured Studio-dev UI is `v0.123.0-rc.6`. Its official
peeled source commit is `6551995be232d093144f2c32b6775757a010ab3c`; the tagged fee implementation
verifies allocation identity `(messageType, recipient, callKey)` plus `parentIndex` for sibling
uniqueness, with `onAcceptance` checked separately. Studio does not expose its exact backend SHA,
so only the deployed version tag is verified; exact deployed SHA correspondence is not claimed.
See `release-evidence/r1/e1/studio-fee-semantics-verification.json`.

The protocol correction is implemented locally: Kernel now exposes `receive_provisional_decision`
and `receive_final_decision`, each fixing its stage and delegating to one shared authenticated
implementation. The current Judge emits to the matching entrypoint, so accepted and finalized
Judge→Kernel allocations have distinct call keys. The legacy `receive_decision` remains for
compatibility and is no longer used by the current Judge. The preflight groups repeated Target
calls by parent/type/recipient/call key/phase, selects the complete estimator-produced higher
execution profile only when every other distribution field matches, simulates every repeated
action with that profile, then uses the validated estimator fee values for the cumulative
allocation. It refuses incompatible profiles. No Studio-dev write or fee preflight has been run
after this correction.

Regression tests cover the old-key collision, wrapper stages and call keys, phase rejection,
repeated accepted/finalized actions, common-profile simulation, nested parent placement and budget
roll-up, and the preserved A2-C01 final-only shape. Full JS verification passed. Kernel Direct
Mode passed 85/85 and Judge Direct Mode passed 51/51. After updating the Judge test proxies to
record the two fixed-stage methods, the full canonical Python suite passed 219/219. Exact-target
CI has not yet run for these changes.

Branch is `claude/r1-product-final`, starting HEAD `9dea85da8344dab8ff18304adbeeceb4d843cc10`;
protocol changes and the source-verification artifact are still uncommitted. Preserve the
pre-existing `.claude/settings.local.json` and do not stage it. After complete tests and
exact-target CI pass, commit/push the protocol correction, then deploy a fresh Kernel, Judge and
Vault (and fresh target/ReferenceAgent if immutable controller binding requires it), rebuild and
activate a policy against the new Judge after its genuine timelock, and only then run the
throttled read-only explicit fee preflight. No incident write is permitted before the complete
Judge→Kernel→Target preset is accepted.

## 2026-09-13 continuation: lifecycle-split final Run A stack active; funding handoff

The call-key protocol correction is committed and pushed to `origin/claude/r1-product-final` at `ac119d78118f2a701312723416b9c150816cd349`. Exact-target CI passed (run 34784113226). The pinned Studio-dev source correspondence is verified at version `v0.123.0-rc.6` / tag commit `6551995be232d093144f2c32b6775757a010ab3c`; the service does not expose the deployed backend SHA.

A fresh independent Run A generation is live on Studio-dev/61997. Kernel `0x5A271CB03b4833aA485ff13035844ba500c4E536`; Provider A `0x02Be7242eb5ef13984590F86662B139384E20B70`; Provider B `0x1f12906AF34143C804f5AeeeF0AcDF408e816d0a`; ReferenceAgent `0xdf68B59C5f5Fb8929Ab6360B0024f34aec7a0353`, target `reclose-target-007`; Judge `0x43c6061FEde8372a3e4c3AB513D32abcfA956e89`; Vault `0x10451Cd05cDeD4CE0f40983f4f87FFE42968E701`. All six deploy transactions and all three wiring transactions finalized; CLI execution assertions and authoritative reads passed. Exact tx hashes and constructor/wiring details are in `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`.

The current registry recomputation and fresh Judge readback both equal `0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386`. The Judge points to the new Kernel, version 1, and its `CONTENT_ADDRESSED_SNAPSHOT` authority is pinned to the immutable fixture commit path. APM `policy-r1-009` for target `reclose-target-007` has JCS/Keccak hash `0xb5ac60c955e3bc052531e07b9c351738e7c27d80fb286b702f1f6e2e8ee83953`. All 11 policy transactions finalized with `FINISHED_WITH_RETURN`; each resource/rule/effect was read back. Seal tx `0xd6533c198fd5c25111ef3b1ef1c568cbe9704fbd2c782e649c2e13bee7c0a33a` read back counts `[3,2,4]`, sealed true, active false, and `activationNotBefore=1789338452`. After chain timestamp reached 1789338664 (212 seconds after the deadline), fresh activation tx `0x1b3b491064e91668c4ed342a820143ad12c8b6b52ae9b7c9b8041ef94f81a872` finalized with `FINISHED_WITH_RETURN`. Active key, identity/version/hash, generation 1, and Judge address/version all match.

The new target/provider initial reads show target NORMAL, Provider A selected, all owners/controller correct, both fresh providers at zero received, and ReferenceAgent treasury at zero. No Run A purchase or incident has been submitted on this generation; Reporter nonce remains unread. APM/preflight helper now accepts this generation's manifest; the preflight remains read-only and no incident write is allowed before its entire explicit Judge→Kernel→Target tree simulates successfully.

**Human action required to resume Run A:** use the injected wallet on Studio-dev / chain 61997 to call payable `fund_treasury()` on new ReferenceAgent `0xdf68B59C5f5Fb8929Ab6360B0024f34aec7a0353` with `0.20 GEN`. The pinned CLI does not expose caller-value for writes. Afterward, capture the transaction ID; resume by verifying finalized successful execution and treasury readback, then run the throttled read-only explicit-allocation preflight. Do not use or fund the superseded `reclose-target-006` stack for this run.

Current next step: funding is verified; continue from the read-only explicit fee preflight. Keep all Studio-dev requests serialized with the 2.6-second guard and backoff.

## 2026-09-14 continuation: Run A accepted-message platform limitation reproduced

The user funded the current Run A target through Rabby. One serialized live read of `ReferenceAgentProtocol.get_treasury_balance()` on Studio-dev/61997 returned `200000000000000000` wei (0.20 GEN), recorded at `release-evidence/r1/diagnostics/run-a-treasury-readback.json`. The console screenshot's transaction ID was truncated, so the funding hash remains null with an explicit reason in both deployment manifests; no hash was guessed.

The lifecycle-split full preflight passed deployment, policy, registry, source-authority, target/provider and treasury checks. Individually estimated provisional Target actions and both simulations under one common higher estimator-produced fee profile succeeded. The explicit Kernel accepted/provisional simulation still returned `SystemError: 2: inval`, so no incident write was submitted.

The mandated minimal reproduction is preserved under `release-evidence/r1/diagnostics/accepted-message-repro/`. Child `0x763289C8d65316032e3717C32A84b33c8DaB5020` (deploy tx `0xbdb989f368f96f877ef0275431fc9b3985e694eaaa804386188bed5ff13895aa`) and Parent `0x853823d1daC8517aAB0879d2B455E70EBd1Db704` (deploy tx `0x21b35c43e98fb1dabcce1ce2b2dfcad6b608af60225ea1abe1478193e4864859`) both passed live readback. Using the Child's real `noop()` estimator result and one correctly encoded explicit allocation, `emit_accepted` fails at `wasi.gl_call` with `SystemError: 2: inval`; the phase-matched `emit_finalized` estimate succeeds and returns the allocation. Full structured response and source are retained with validator private-key fields redacted. This reproduces the limitation independently of Reclose policy logic.

Run A E1 is blocked on Studio-dev's accepted-message simulation behavior. The displayed Studio version is `v0.123.0-rc.6`; the service does not expose its exact backend SHA. Do not retry the old accepted preflight or submit the incident without an upstream-compatible simulator result. Continue independent release work, but Run B and H1 cannot be represented as passing until the canonical E1 prerequisite is met. Preserve the exact fixture, allocation, failed receipt and finalized control result.

Current state: branch `claude/r1-product-final`, HEAD before this local continuation `02f24aee9e316f49c8811c000cf96321604562fd`; three fee-helper files were modified locally, and this evidence/docs update is pending. `.claude/settings.local.json` is user-local and excluded. Immediate next operation: run the fee-helper tests, review/redact diagnostic evidence, update the blocker/ledger, then commit and push only valid release work. Never sign an incident from this blocked preflight.

## 2026-09-14 current continuation checkpoint

- Branch: `claude/r1-product-final`; prior committed checkpoint: `74ac584892594f948479cff6956699c558c9b5b2`, pushed; exact-target CI `34791729354` succeeded.
- Fresh active stack/policy are recorded in `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`. The target treasury readback is 0.20 GEN; the funding screenshot's transaction hash is truncated and unavailable.
- Run A stopped before incident submission after a read-only full fee preflight and a minimal explicit-allocation Parent→Child reproduction. Accepted phase fails `SystemError: 2: inval`; finalized phase succeeds. Preserve OB-014 and do not retry the same preflight or submit an incident absent a compatible Studio behavior change.
- README, benchmark status and Operations Runbook had stale `fee no_matching_allocation` descriptions; corrected to the current minimal reproduction. New security/integration/SDK/policy/Sentinel/benchmark/demo/operations/closure/claim-matrix and submission drafts record truthful status.
- Remaining: full 156/82 evidence reconciliation; final fee profiles; E1 A+B and H1 (blocked); A3/A4 against exact final source SHA; final docs evidence review; new release branch/fresh checkout/full verification. Current audit status is awaiting external review under owner execution override, never self-author PASS.

## 2026-09-14 fee-profile gate correction

Inspection found the final fee-profile checker still hard-coded superseded r1-final addresses. It now reads addresses and generation from `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`, and rejects inputs/reports from any other generation. `scripts/fee-profile.mjs` now installs the serialized Studio-dev RPC throttle before any estimation. The input template is rebound to the active generation; its live arguments remain empty because the required incidents/actions/claims do not exist, and the retained three-profile report is stale. `node scripts/check-final-fee-profile.mjs` correctly remains NOT READY; no live fee estimate was sent by this correction.

Validation: fee-profile checker self-tests pass 6/6; full `npm run verify:js` passed after the changes. Full Python suite passed 219/219 earlier in this continuation; no Python/contract source changed afterward. `npm run fee-profile:coverage` remains structurally 13/13. E1 evidence check remains open because zero real run artifacts exist. The active Studio-dev accepted-message blocker remains OB-014.

## 2026-09-14 threat-ledger audit update

- Source checkpoint `89b800d03af783c3fa6d1abc8594edd8a809e7a7` passed exact GitHub CI run `34793484235`.
- All 82 threat rows now contain control, implementation, test, evidence, residual risk and commit fields. Nine rows explicitly state partial/missing direct implementation or test evidence; the shared CI references prove the repository check only, not all live controls. Keep those threats OPEN/UNVERIFIED as recorded; critical/high residual risk is not accepted.
- `TM-AUTH-007` remains downgraded to MITIGATED / UNVERIFIED pending live revocation evidence.
- Requirements rows: 156 total; 5 VERIFIED with complete refs, 13 IN PROGRESS, 1 IMPLEMENTED / UNVERIFIED, 137 NOT STARTED. The broad RTM is not yet substantively reconciled.

## 2026-09-14 fee-profiler fail-closed checkpoint

The fee profiler validates all inputs before any Studio-dev request. It rejects the four unsupported deploy-estimate entries and the seven write entries with empty real arguments, while preserving the known accepted-message `SystemError: 2: inval` from its saved evidence without retry. The six-case guard test is part of `verify:js`. Full `npm run verify:js` passed; exact CI for prior checkpoint `5f5a53ae286525966c476ad16a82bc8a646dd18b` passed (run `34793768972`). The current fee-guard edits and this note remain local and need a new exact-target CI run after commit.

Do not repeat the accepted-stage preflight or submit an incident. E1 A/B and H1 live scenarios remain blocked by the reproduced Studio-dev behavior. Current fee profiles are not final: deployment estimation is unsupported and real call arguments for the remaining eight write profiles do not exist yet. The full RTM, A3/A4, final candidate branch and fresh-checkout release verification remain open. Preserve and exclude `.claude/settings.local.json`.

## 2026-09-14 requirements trace correction

Exact CI for fee-profiler checkpoint `5c755ffa0a7b03c26afe6be86e8e9d6bbac5c0b5` passed in run `34794437205`. RTM rows `PRD-INC-002` and `PRD-INC-009` were corrected from stale `receive_decision`/C2 deployment references to the current lifecycle-specific Kernel API and current accepted-message diagnostic, with both rows retained as IN PROGRESS. All 156 IDs and 82 threat IDs still pass A0 integrity. This is a targeted trace correction only; 137 requirements remain NOT STARTED and the full reconciliation is open.

The fee-profiler guard additionally requires a non-empty active deployment generation; its updated self-test passes 7/7. Exact-target CI for the pushed trace correction `99f4c59ad277aaa9ab4fd0d3e781ba43a1206559` passed in run `34794664043` (`npm run verify`, including Python tests). This checkpoint still does not clear the accepted-message blocker or complete E1/H1, the remaining RTM rows, A3/A4 or final-release gates.

Handoff refresh: checkpoint `831edb76272353fb66334cad638eb00979ee5f3f` passed exact-target CI run `34794903234`. The next safe step is independent row-level RTM reconciliation. Do not repeat the already conclusive accepted-message simulation; no E1 incident was submitted.

## 2026-09-14 deployment fee evidence recovery

Four deployment fee profiles were recovered from the active generation's successful CLI deployment logs. The extractor binds each SDK-derived distribution and fee value to its real constructor arguments, current contract address, deployment tx, finalized successful manifest result, and source commit; all four deployed contract files match manifest source commit `ac119d78118f2a701312723416b9c150816cd349`. It made no Studio-dev RPC request. The fee report now contains those four current profiles plus the evidence-backed accepted-stage failure; the other eight write profiles remain unavailable until their lifecycle state and real arguments exist. `npm run fee-profile:final-check` accurately remains NOT READY, without stale-address warnings.

Validation after this update: deployment-fee parser 3/3, input guard 9/9, final-fee checker 7/7, and offline deployment-profile integration 5/5; full `npm run verify:js` passed. Full verification and exact CI remain required for this checkpoint. Do not retry the accepted simulation or submit the incident.

Exact-target CI for source checkpoint `917ae2c3a3d9d539daa8f197cf53806c7550392c` passed in run `34796735382` (`npm ci`, `npm run verify`, including Python). The accepted-message finding remains OB-014; Run A has no incident/nonce, Run B and H1 live rows are not run. Next independent work is row-level RTM reconciliation; retain current honest status counts and do not claim the full requirements/threat reconciliation complete.

## 2026-09-14 full traceability reconciliation pass

On `claude/r1-product-final` at prior pushed HEAD `ae041a454ff20053ce77ba6df87d202bff65725e`, exact CI run `34796961343` passed `npm ci` and `npm run verify`. The requirements reconciliation now joins all 156 governance requirement rows to `Requirements Status.csv`, preserving delivery statuses. All 137 NOT STARTED rows carry row-specific owner, acceptance-method, and required-evidence gaps copied from the canonical matrix; no implementation or evidence is inferred. The five VERIFIED rows retain their existing implementation/test/evidence/commit references. The 13 IN PROGRESS and one IMPLEMENTED / UNVERIFIED rows retain their recorded blockers.

The generated `docs/execution/Requirements Reconciliation.md` also lists all 82 threat rows with control, implementation, test, evidence, residual-risk, and commit fields. `a0-integrity` and `requirements:reconciliation` pass; this is traceability completeness, not closure of open requirements or residual risks. Threat statuses remain as recorded, including open/unverified risks.

Validation run locally: `node scripts/reconcile-requirements.mjs --check`, `node scripts/a0-integrity-check.js`, and `git diff --check` pass. The local npm shim cannot resolve its configured npm-cli path, so full `npm run verify` needs exact-target CI after this checkpoint is pushed. No Studio-dev RPC request or write was made. Preserve and exclude `.claude/settings.local.json`.

Current blockers are unchanged: OB-014 is the reproduced Studio-dev accepted-message `SystemError: 2: inval`; no Run A incident was submitted, no Reporter nonce exists, Run B/H1 are not run, and final fee-profile lifecycle writes are unavailable. Do not repeat the same accepted-message probe. After exact CI, continue the open requirement implementation/evidence backlog and other independent release documentation; do not mark the 137 NOT STARTED rows or remaining risks complete.

## 2026-09-14 exact CI result

Reconciliation checkpoint `7522927cd2a94aed3a0b860bf948bf618b44f269` passed exact-target GitHub Actions run `34797526119` (`npm ci` and full `npm run verify`, including the new 156/82 reconciliation check). The earlier pending-CI note is superseded. Resume with A3/A4 packet readiness and independent release-document review; do not retry OB-014 or claim E1/H1 completion.

## 2026-09-14 requirements-map correction

Correction to the preceding reconciliation note: the A3 attempt-2 requirements map already contained test-backed frontend/SDK implementations that the canonical ledger had not yet joined. The reconciliation generator now imports those mappings, carries forward their remaining-verification text, and preserves newer canonical refs where the A3 map contains superseded protocol names. `PRD-POL-005` was downgraded from VERIFIED to IN PROGRESS because the A3 map says the complete UI construction sequence remains unfinished.

Current canonical counts: 156 total; 10 VERIFIED; 27 IN PROGRESS; 13 IMPLEMENTED / UNVERIFIED; 106 NOT STARTED. Every VERIFIED row has implementation, test, evidence, and commit refs. Every open row has an explicit blocker; non-VERIFIED implementation rows also have mapped implementation/test/evidence/commit references. NOT STARTED rows are the 106 with no test-backed implementation mapping in either the canonical or A3 map. The full report still covers all 82 threats without changing their risk status.

The previously pushed checkpoint `7522927cd2a94aed3a0b860bf948bf618b44f269` passed CI run `34797526119`, but this correction changes the reconciliation generator and ledger. Run exact-target CI after pushing this correction. No Studio-dev RPC or write occurred. OB-014 and all E1/H1 release blockers remain unchanged; do not repeat the accepted-message simulation.

## 2026-09-14 A3/A4 candidate refresh

A3 attempt 2 is refinalized against immutable substantive snapshot `7d308374cb6c634660b0e70ca389618198496503`; exact-target GitHub CI run `34798352450` passed (`npm ci`, full `npm run verify`). Current status is **AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE**, with no self-authored PASS. The packet refresh is under `docs/execution/audit-packets/A3-attempt-2/candidate-refresh.md`; attempt 1 remains FAIL and unchanged. The refreshed `requirements.csv` contains all 156 canonical rows; its previous A3-specific map is preserved as `requirements-at-98b98cc.csv`.

H01/H02/H03/H05/H06/H07/H10/H11/H12 have source/test closure with the specific live-proof limitations listed per finding. H04 remains code-complete but its live chain proof is blocked by OB-014. H08 remains partial. H09 mapping/status integrity is closed: 156 IDs are reconciled; statuses are 10 VERIFIED, 27 IN PROGRESS, 13 IMPLEMENTED / UNVERIFIED, 106 NOT STARTED. All 82 threat rows are mapped with residual risks retained.

No current-candidate deployed-product or connected-wallet browser evidence was captured: the available page was fixture mode, wrong-network 61999, stale target 004. Older fixture captures are historical and are not re-used. Treasury balance readback proves 0.20 GEN, but current funding tx hash remains unavailable in the active manifest. No Run A incident or Reporter nonce exists. OB-014 is the minimal explicit accepted Parent→Child `SystemError: 2: inval`; do not rerun or submit.

A4 candidate-scoped preparation is in `docs/execution/audit-packets/A4/candidate-preparation.md`; A4 remains NOT READY due A3 external decision, browser evidence, E1 A/B, H1, final fee profiles and remaining release gates. The A3 attempt-2 packet is assembled for external review; begin at `docs/execution/audit-packets/A3-attempt-2/README.md`. Its immutable substantive target is `7d308374cb6c634660b0e70ca389618198496503` (CI `34798352450` SUCCESS); documentation-only packet updates do not change that source target. No Studio-dev RPC/write was made during this refresh. Preserve `.claude/settings.local.json` untracked and unstaged.
