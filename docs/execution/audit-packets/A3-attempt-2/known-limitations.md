# A3 Attempt 2 - Known Limitations

(Updated for the THIRD remediation sub-pass, responding directly to an independent audit's
findings against the prior checkpoint `ad38a3920892c5c0681e4d603afc8ef07254228d`. That audit
correctly identified that several "closures" were code existing without the real runtime/identity
pieces wired behind them. This pass fixes the specific defects named, not a superficial relabeling.)

## Fixed this pass (previously real defects, not just presentation gaps)

1. **Trace identity bug (FIXED):** the live Incident Explorer trace previously displayed
   `decisionId` (a canonical RECORD identity, e.g. `"<incidentId>:FINAL"`) as if it were a
   transaction hash (`txId`). Fixed: the Judge-parent trace entry now uses
   `decisionView.transaction.txId`, the real resolved transaction identity.
2. **Action-identity bug (FIXED):** `trackActionTrace`/`trackKernelToTargetChild` were called with
   the bare `incidentId`, which is not a valid Kernel action identity at all (actions are dispatched
   per EFFECT, not per incident). Fixed: `protocol-sdk::listIncidentActionIds` derives the real
   Kernel `action_id` (`_ck(incident_id, policy_key, action_type, resource_id)`, mirroring
   `contracts/assurance_kernel.py::_dispatch_action` exactly) for every enabled effect of the
   incident's matched rule (capped at `MAX_EFFECTS_PER_DECISION`), and the live adapter now tracks
   each one individually, labeling each hop with its action type/resource.
3. **Reduced policy diff (FIXED):** `diffCanonicalApm` previously tracked only resource/action/
   judge-set membership and human-override - a bounty increase, a parameter change, or a
   release-phase change on an otherwise-identical effect was invisible to it. Fixed:
   `extractKernelRuleEffectModel` + the rewritten `diffCanonicalApm` mirror
   `contracts/assurance_kernel.py::_classify_expansion` exactly - rule identity is
   `(ruleId, judge, judgeVersion, ruleKind, provisionalAllowed, reportBond)` mapped to
   confirmedBounty (expansion if a bounty increases or an identity is new), and effects are the
   tuple `(ruleId, actionType, resourceId, paramU256, paramStr, releasePhase)` (expansion if the
   new effect set is not a subset of the old - ANY field change on an effect is conservatively
   treated as potential expansion, matching the Kernel's own subset semantics, never a
   human-judged "this one's obviously fine" carve-out).
4. **Unvalidated resource selection (FIXED):** `buildIncidentReport` now rejects any `resourceId`
   that is not governed by a real ENABLED effect of the chosen rule in the target's active policy,
   and the report form's resource `<select>` is filtered PER RULE (via each effect's own `ruleId`,
   newly exposed on `PolicyEffect`) rather than a rule-agnostic union of every resource in the
   policy.
5. **No browser wallet/reporter-identity path (FIXED):** `frontend/lib/wallet.js` is a real
   EIP-1193-style connect-wallet integration (`eth_requestAccounts`/`eth_chainId` against
   `window.genlayer` or `window.ethereum`). The shell now renders a real connect-wallet control;
   incident/recovery previews bind `reporterAddress` to the connected address and REFUSE to preview
   in live mode without one (previously there was no path to a reporter identity at all, meaning
   `buildIncidentReport` could never actually be called successfully from the browser).
6. **Single-button policy "construction" fiction (FIXED):** the policy-author screen now has a
   real "Build construction sequence" action that compiles the manifest through the canonical
   `@reclose/policy-compiler::compileCanonicalApm` (injected by the host, like `sdk`/`writer`/
   `indexer`, since the bundler-less frontend cannot import it directly and `protocol-sdk` cannot
   depend on it without circularity) into its exact ordered `begin_policy` / `add_policy_resource`*
   / `add_policy_rule`* / `add_policy_effect`* / `seal_policy` / `activate_policy` calls, each
   becoming its OWN independently fee-estimated, review-hashed, individually-signed
   `PreparedRecloseWrite` - never one button standing in for six-plus real transactions.
7. **Reduced signing-boundary review (FIXED):** every write-preview panel (incident, recovery,
   registration, owner controls, policy construction/activation) now renders through one shared
   `renderPreparedWriteFields` helper that shows chainId, contract, method, EVERY positional
   argument, valueWei, semanticKind and reviewHash - not just contract/method/reviewHash as before.
8. **Recovery surface showing nothing live (PARTIALLY FIXED):** live `getIncident` now populates
   `recovery.remainingRestrictions` from the incident's own real restriction records
   (`protocol-sdk::getIncidentOwnRestrictions`, newly exposed). The remediation/recovery-validation
   CHAIN fields (`remediationSubmitted`, `remediationDecision`, `recoveryValidated`) are explicitly
   marked unknown rather than guessed - see the genuine protocol read-gap below.

## Genuine, now-diagnosed protocol read-gap (not fixable from the frontend/SDK layer alone)

9. The Kernel's `get_incident_detail` view has no `parent_incident_id` field, and there is no view
   enumerating "child incidents of X". Remediation/recovery-validation are, Kernel-side, SEPARATE
   incidents linked by `parent_incident_id` - so a live product cannot currently reconstruct "has
   remediation been submitted for this incident, and what was its decision" from protocol reads
   alone. Closing this requires either a new Kernel view (a contract change, with the full Python
   test matrix and a fresh live deployment that implies, explicitly out of scope for a frontend/SDK
   remediation pass) or an index/indexer-side mapping (already the documented pattern for
   transaction-identity resolution elsewhere in this codebase). Recorded here as a genuine A3-H08
   architecture finding, not glossed over.

## Still-open, reported honestly (not newly discovered, not newly closed)

10. A3-H08's remaining scope (policy-level/cross-incident audit export, beyond the per-incident
    export already shipped) was not attempted this pass.
11. The canonical 156-row `docs/execution/Requirements Status.csv` ledger was not rewritten; this
    packet's own `requirements.csv` now mirrors the full canonical set for every category
    FINAL_REMEDIATION.md Section 16 lists (ACC/TGT/POL/REP/INC/REC/EXP/DEV/BEN, NFR-SEC/REL/UX -
    117 rows, not a curated subset), with this session's specific frontend-layer deltas overlaid
    where they materially changed C4 status.
12. No automated axe-core/Lighthouse accessibility scan was run against this exact SHA.
13. No full manual screen-reader pass was performed.
14. No actual GenLayer-aware wallet SIGNER was exercised - `frontend/lib/wallet.js` proves a real
    connected address/chain ID, but actually signing a GenLayer contract call still requires a
    host-injected writer (CLAUDE.md Section 21: Reclose never custodies a key). This was verified
    live in the Browser pane in fixture mode (the owner-control/policy-review flows); no live
    wallet extension was available in this sandboxed browser to prove the signing leg end-to-end.
15. A2-C01 (Studio-dev Judge -> Kernel `fee no_matching_allocation # internal`) remains open,
    unchanged by this pass, and now ALSO explains why A3-H04's Kernel->Target second hop (and the
    new per-effect action tracking built this pass) cannot be live-proven: the first hop fails
    before any action dispatch fires on the only live network available.
16. E1/H1-live/A4/R1/S1 work was not attempted, per FINAL_REMEDIATION.md Section 17's explicit
    sequencing.
