# A3 Attempt 2 - Known Limitations

(Updated for the second remediation sub-pass on top of `7f032af...` - see `findings-closure.md`
for the full finding-by-finding detail of what changed.)

1. A3-H02 (policy-activation half): "Validate & diff" is now real canonical validate/hash/diff
   against the target's live active policy - it is no longer a `setLiveMessage`-only stub. It does
   NOT yet perform the multi-transaction `begin_policy`/`add_policy_resource`/`add_policy_rule`/
   `add_policy_effect`/`seal_policy`/`activate_policy` construction sequence - that remains a
   separate, larger write-sequence feature, honestly reported open rather than closed.
2. A3-H07: bounded owner controls (revoke authority, disable action, disable resource) are now
   real governed writes over the Kernel methods that already existed (`revoke_authority`,
   `disable_action`, `disable_resource`). No contract method literally named "emergency pause"
   exists on the deployed Kernel beyond these three bounded, immediate, authority-reducing,
   non-value-moving writes - they ARE the Kernel's bounded pause mechanism. Adding a fourth,
   differently-named contract method would be an architecture change outside this pass's scope.
3. A3-H04 (second hop): the live adapter now attempts Kernel -> Target reconstruction
   (`trackKernelToTargetChild`) in addition to the Judge -> Kernel hop, rendering an explicit
   `NOT_YET_AVAILABLE` marker when unresolved. This was proven only at the unit level against a
   fake transport (`scripts/test-frontend-remediation.js`) - no live Studio-dev transaction has
   exercised it, because the Judge -> Kernel hop itself still fails live (A2-C01), which means the
   Kernel -> Target hop never fires on the one live network available to prove it.
4. A3-H12: incident identity is now predicted client-side, before signing, using the exact formula
   the IncidentJudge contract evaluates on-chain (`contracts/incident_judge_v1.py::
   _derive_incident_id`: `f"{target_id}:{reporter.as_hex}:{int(nonce)}"`). This is a genuine
   deterministic prediction, not a guess - but it has not been confirmed against a real signed
   transaction on Studio-dev in this pass (no live wallet was connected), so the exact hex-casing
   behavior of a live `reporter.as_hex` read has not been cross-checked end-to-end; a caller should
   still treat it as "predicted" (labeled as such in the Pending page) until readback confirms it.
5. A3-H08: an "Export audit trail" control on the Incident Explorer now produces a downloadable
   JSON bundle (claim -> evidence -> decision -> policy consequence -> transaction trace ->
   recovery) assembled directly from the exact object the page rendered. It was exercised only in
   fixture mode in this pass (MockProductAdapter) - no live-mode export was captured, since no live
   incident was available to render against. The policy/audit surfaces otherwise already exposed
   (manifest hash, lifecycle, rules/effects) are unchanged from the prior sub-pass.
6. A3-H09: the packet's own `requirements.csv` now includes additional honestly-mapped rows for
   PRD-TGT/POL/EXP/INC/REC and NFR-SEC/UX reflecting the C4 frontend work in this pass. The
   CANONICAL 156-row `docs/execution/Requirements Status.csv` ledger was deliberately NOT rewritten
   in this pass - many of its C4/frontend rows read "NOT STARTED" despite real frontend
   implementation existing, which is a pre-existing discrepancy from before this remediation
   program began. Reconciling that 156-row ledger accurately is R1-wide reconciliation work,
   explicitly sequenced AFTER A3/E1/H1/A4 per the master directive - attempting a partial rewrite
   here risked introducing new inaccuracies under time pressure rather than fixing the real one.
7. No live-wallet writer was connected during the browser evidence pass - the wrong-network
   blocking behavior (A3-H03) and the new owner-control/policy-review flows were proven by unit
   test and fixture-mode browser interaction, not by an in-situ live-signed browser screenshot.
8. No automated axe-core/Lighthouse accessibility scan was run against this exact SHA.
9. No full manual screen-reader pass was performed.
10. A2-C01 (Studio-dev Judge -> Kernel `fee no_matching_allocation # internal`) remains open and
    independently blocks E1/R1 closure, and transitively blocks any live proof of A3-H04's second
    hop - unchanged by this A3 remediation pass, and honestly visible in the browser evidence
    itself (the UNDETERMINED/child-failure Incident Explorer case).
11. E1/H1-live/A4/R1/S1 work was not attempted in this pass, per FINAL_REMEDIATION.md Section 17's
    explicit sequencing ("E1 remains NOT COMPLETE until A3 passes").
