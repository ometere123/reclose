# A3 Attempt 2 - Known Limitations

(Fourth and final remediation sub-pass. This pass implements the corrected real browser wallet
architecture - injected provider -> genlayer-js@2.0.0-rc.1 write client -> writeContract(), no
Snap, no custom signer, no host-injected-writer requirement for ordinary use - plus signer-identity
binding, a strict sequential policy construction/activation state machine, Kernel-equivalent
judgeVersion preservation, the non-zero bond journey, an additive recovery-lineage indexer hook,
and the getEffectiveProviderStatus authority-revoked fix.)

## Fixed this pass

1. **Real browser write runtime:** `frontend/lib/genlayerWriter.js` creates a GenLayerJS write
   client (`createClient({chain: studioDevnet, account, provider})`) over the connected injected
   provider and submits every write through the pinned SDK's own `writeContract()`. The vendor
   bundle (`scripts/build-frontend-vendor.mjs`, run via `npm run frontend:vendor:build`, wired into
   `verify:js`) re-exports genlayer-js@2.0.0-rc.1's own `createClient`/`studioDevnet` into a
   browser-consumable ESM file - the frontend otherwise has no bundler, so this is the one build
   step needed to reach the exact pinned SDK from plain static files. No Snap, no Reclose-custodied
   key, no homemade calldata signer, no requirement that a host inject a writer for ordinary usage.
2. **Signer identity binding:** every draft with a known signer (`expectedSigner` - the EAP
   reporter for incident/recovery, the target's cached owner for owner-bounded writes) is checked
   against the connected wallet's `getConnectedAccount()` immediately before every signature, not
   at preview time. `accountsChanged`/`chainChanged` on the injected provider clear every prepared
   draft (including dynamically-keyed policy-construction steps, via the new
   `draftRegistry.clearAll()`) and force reconnection.
3. **Strict sequential policy construction:** the policy-author screen now compiles the manifest
   into a PLAN (`compilePolicyConstruction`) without pre-building any step, then builds and signs
   exactly ONE step at a time (`buildPolicyConstructionStep`) - begin_policy, then each resource/
   rule/effect call, then seal_policy - reads back the real on-chain seal state
   (`getPolicyHeaderReadback`) before building the activation draft, which is never pre-built
   alongside the construction steps.
4. **judgeVersion preserved:** `PolicyRule.judgeVersion` is read from `get_policy_rule`'s real
   tuple index 1 and carried through every read/diff path; `diffCanonicalApm` now correctly treats
   a judge-version bump as a new rule identity (tested).
5. **Non-zero Reporter bond journey:** `buildOpenBond` prepares `IncentiveVault.open_bond` bound to
   the exact predicted incident identity and the rule's real immutable economics;
   `buildIncidentReport` now REFUSES to prepare a non-zero-bond rule's submission without a
   verified `bondId`. The report form gates the incident preview behind a real "Open reporter
   bond" step for bonded rules; zero-bond rules remain the direct path.
6. **getEffectiveProviderStatus fix:** `authorityRevoked` no longer collapses into the same
   `available: false` reason as a real active restriction - it now returns the distinct
   `AUTHORITY_REVOKED` reason code, since losing Reclose's control authority is not the same fact
   as the underlying provider/resource actually being down. `available` itself stays a
   conservative `false` in both cases because the method's `available` field is one of the frozen
   14 RecloseSDK methods' return fields (a strict boolean, not nullable) - UNKNOWN is expressed
   through the reason code instead.
7. **Recovery-lineage read-gap (partially closed):** the Kernel's `get_incident_detail` has no
   `parent_incident_id` field and no "child incidents of X" view - confirmed by reading
   `contracts/assurance_kernel.py` in full. Rather than leaving this purely documented, an OPTIONAL
   `indexer.resolveIncidentLineage(incidentId)` hook (the same convenience-infrastructure pattern
   already used for `resolveActionTransaction`) is now wired into `getIncident`: when an indexer
   supplies a remediation/recovery-validation incident id, it is read back against AUTHORITATIVE
   protocol state (`sdk.getIncident`/`getDecision`, cross-checked against `targetId`) before being
   trusted - an indexer is convenience infrastructure (CLAUDE.md Section 32), never taken as truth
   on its own. Without a connected indexer, the fields remain explicitly unknown, never fabricated.

## Genuine, now-diagnosed protocol read-gaps (require a Kernel view, out of SDK/frontend scope)

8. `get_policy_header` exposes no `sealed_at`/`activation_not_before` field, so the real expansion
   timelock countdown cannot be read. The sequential construction journey reads what IS available
   (the `sealed` flag) and explicitly states this limitation rather than fabricating a countdown.
9. No protocol view enumerates "child incidents of X" - the indexer hook in item 7 is the smallest
   additive answer available without a contract change; a full closure (a new Kernel view plus
   redeployment and the full Python test matrix) was judged too large and too risky to attempt
   blind on a live network within this remediation pass, and is recorded here as the honest reason
   rather than attempted destructively.

## Still open, reported honestly

10. No real wallet extension was available in this sandboxed Browser pane to prove the live
    signing leg end-to-end (the "Connect wallet" control correctly reports "No wallet provider
    detected" here) - the genlayer-js write-client wiring is proven by the vendor-bundle export
    check and the writer's structural tests, not a live transaction.
11. A3-H08's remaining policy-level/cross-incident export scope (beyond the per-incident export)
    was not attempted this pass.
12. No automated axe-core/Lighthouse accessibility scan was run against this exact SHA; no full
    manual screen-reader pass was performed.
13. A2-C01 (Studio-dev Judge -> Kernel `fee no_matching_allocation # internal`) remains open,
    unchanged, and continues to block both E1/R1 closure and live proof of A3-H04's second hop.
14. E1/H1-live/A4/R1/S1 work was not attempted, per FINAL_REMEDIATION.md Section 17.
