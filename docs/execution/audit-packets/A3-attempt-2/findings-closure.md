# A3 Attempt 2 - Findings Closure (A3-H01 through A3-H12)

## Refinalized-candidate addendum — `7d308374cb6c634660b0e70ca389618198496503`

Exact-target CI run `34798352450` passed the full repository verification. The current candidate
disposition is recorded in `candidate-refresh.md`; older sub-pass notes below are retained as
history and must not be read as evidence for this newer SHA.

The A3-H09 traceability finding is now **CLOSED FOR TRACEABILITY**: the canonical requirements
ledger is joined against the governance matrix and the A3 implementation map for all 156 locked
IDs, statuses are reconciled, and each VERIFIED row has implementation, test, evidence, and commit
references. This closes the mapping/status-integrity defect, not the requirements backlog: 106
requirements remain NOT STARTED, 27 IN PROGRESS, and 13 IMPLEMENTED / UNVERIFIED.

The current Studio-dev blocker is OB-014, not the historical A2-C01 allocation issue. A correctly
allocated accepted Parent→Child noop simulation returns `SystemError: 2: inval`; its finalized
control succeeds. That independently reproduced behavior blocks H04's full live causal trace,
E1 and the live-incident-dependent benchmark cases. No incident write or Reporter nonce was
created. Exact diagnostics are under `release-evidence/r1/diagnostics/accepted-message-repro/`.

The previous browser/accessibility screenshots are historical fixture-mode captures against old
candidate SHAs. The current browser index marks live product/wallet captures NOT CAPTURED for this
candidate. Do not promote those historical captures into current proof.

## Third sub-pass addendum - response to an independent audit against `ad38a39...`

An independent audit of checkpoint `ad38a3920892c5c0681e4d603afc8ef07254228d` correctly found that
several items below were code-complete without the real runtime/identity pieces wired behind them,
or were conservative-looking logic that did not actually match the Kernel's own semantics. This
addendum lists exactly what changed in response - see `known-limitations.md` for the full list with
rationale. In summary, this sub-pass:

- Fixed a real bug: `decisionId` was displayed as a transaction ID in the live trace.
- Fixed a real bug: transaction/action tracking used the bare `incidentId` instead of the Kernel's
  actual per-effect `action_id` (`protocol-sdk::listIncidentActionIds`, mirroring
  `_dispatch_action`'s `_ck(...)` formula exactly).
- Replaced the reduced policy diff with `_classify_expansion`-equivalent semantics (bounty/
  parameter/release-phase changes now correctly drive expansion classification).
- Added resource-against-active-policy validation in `buildIncidentReport`, and per-rule resource
  filtering in the report form (using each effect's own `ruleId`, newly exposed on `PolicyEffect`).
- Added a real browser connect-wallet module (`frontend/lib/wallet.js`) and threaded the connected
  address through as `reporterAddress` for incident/recovery previews, which previously had no
  path to a reporter identity at all.
- Added the real multi-transaction policy construction/activation journey
  (`previewPolicyConstruction`, bridging the canonical `@reclose/policy-compiler`), replacing the
  single-button validate/diff-only flow.
- Unified every write-preview panel onto one `renderPreparedWriteFields` helper exposing every
  security-bearing field (chainId, contract, method, full args, value, semanticKind, reviewHash).
- Partially populated the live recovery surface from real restriction reads
  (`protocol-sdk::getIncidentOwnRestrictions`), and explicitly diagnosed and documented the genuine
  Kernel read-gap (no `parent_incident_id`/child-incident view) that prevents reconstructing the
  remediation/recovery-validation CHAIN from protocol reads alone.

39 total behavioural tests now exist in `scripts/test-frontend-remediation.js` (15 new this
sub-pass, up from 24); `npm run verify:js` is ALL PASS.

Target SHA: `ad38a3920892c5c0681e4d603afc8ef07254228d` (exact-target CI: GitHub Actions run
`34707671490` - SUCCESS; second remediation sub-pass on top of the prior attempt-2 checkpoint
`7f032af5921eff258c4c69a2f381861b003bd898`, which itself superseded
`7d1bf1eb317761c2b660e2e5c3b1b39b41d8388e` - see `AUDIT_TARGET_SHA.txt`). Status reported honestly
per finding - H01/H02/H03/H05/H06/H07/H09/H10/H11/H12 are closed (H02/H09 partially, per their own
sections below); H04 is code-complete and unit-tested but not live-proven, blocked by the
independent A2-C01 limitation; H08 is partially closed. This packet does not claim blanket
closure of "all twelve findings with live proof" - see `known-limitations.md`.

## A3-H01 (CRITICAL) - review-to-sign integrity - **CLOSED**

- Root cause: `submitLiveWrite(kind)` called `adapter.submitWrite(kind, {})` unconditionally,
  discarding the previewed/reviewed draft entirely.
- Fix: `frontend/lib/domain.js::createDraftRegistry` (pure, unit-tested) stores exactly the object
  returned by `previewIncident`/`previewRecovery`'s `draft` field; `submitLiveWrite` now reads
  `draftRegistry.getDraft(kind)` and passes it unmodified to the writer. Any `input`/`change` event
  on the reviewed form invalidates that draft immediately (`invalidateDraftOnEdit`).
  `SdkProductAdapter.submitWrite` additionally refuses any payload lacking `reviewHash`/`args`.
- Test: `scripts/test-frontend-remediation.js` - "draft registry preview payload is retrievable
  byte-identical", "editing reviewed input after preview invalidates the draft", "a different
  write kind's draft is independent", "submitWrite refuses an empty/invalid payload", "app.js
  never passes a literal {} payload".
- Browser evidence: Report/Recovery flows render a "Signing boundary"/"Recovery boundary" panel
  populated from the exact preview response; fixture mode explicitly states it will not sign
  (`browser-evidence-index.md` 1440px `#/report`/`#/recover`).
- Remaining risk: the live-wallet end-to-end signing path (an actual connected writer completing
  a real submission) was not exercised in this browser pass - only the adapter-level logic is
  unit-tested.

## A3-H02 (HIGH) - target onboarding / policy activation presentation-only - **CLOSED**

- **Target registration (CLOSED):** root cause was `onboard-form`'s submit handler calling only
  `setLiveMessage(...)`, with no bounded write plan. Fix: `protocol-sdk::buildTargetRegistration`
  produces a real `PreparedRecloseWrite` for `AssuranceKernel.register_target` (the exact
  3-argument call), including an optional pre-sign owner-handshake check; `handleOnboardSubmit`
  now runs the SAME preview -> draftRegistry -> sign pipeline as incident/recovery. Browser
  evidence (re-run against `7f032af...`): submitting the onboard form now renders a real "Signing
  boundary" panel (network/estimated fee/"Preview only" notice), not the old stub message -
  confirmed via `get_page_text` in the Browser pane.
- **Policy activation (CLOSED this sub-pass):** root cause was the "Validate & diff" button calling
  only `setLiveMessage(...)`. Fix: `protocol-sdk::buildPolicyActivationReview` performs real
  manifest validation (`validateCanonicalApmStructure`), real deterministic hashing (RFC8785/JCS +
  Keccak-256), and a real authority diff against the target's CURRENT live active policy
  (reconstructed from `getActivePolicy`'s real rules/effects, not a fabricated baseline);
  `handlePolicyReview` wires the button to this real pipeline and blocks on an invalid manifest
  before producing any hash/diff. Browser evidence (against the new checkpoint below): clicking
  "Validate & diff" with an incomplete manifest renders "Manifest rejected" with the real validator
  errors; with a complete manifest it renders a real manifest hash and diff - confirmed via
  `get_page_text`. Remaining risk, reported honestly rather than claimed closed: the multi-
  transaction `begin_policy`/`add_policy_resource`/`add_policy_rule`/`add_policy_effect`/
  `seal_policy`/`activate_policy` construction sequence itself is a separate write flow not built
  in this pass - see `known-limitations.md` item 1.

## A3-H11 (MEDIUM) - report selection not constrained to governed state - **CLOSED**

- Fix: `renderReport` now calls `adapter.getPolicy(target)` when a target is known and populates
  the rule/resource `<select>` options from that policy's real `rules[].ruleId` /
  `effects[].resourceId`, with a visible "Governed selection" notice naming the exact policy and
  counts. When no policy can be resolved, the form still allows entry but states the SDK will
  independently verify it before signing (`buildIncidentReport` already throws for a rule that
  isn't active for the target).
- **Bug found and fixed while verifying this in the browser:** `domain.js::routeFromHash` never
  stripped a query string before splitting on "/", so `#/report?target=reclose-target-004` (the
  exact link Target Detail's "Report incident" button produces) always rendered "404 Route not
  found" - a genuine pre-existing defect, not introduced this session. Confirmed live: before the
  fix the route 404'd; after the fix, navigating to that exact URL rendered the report form with a
  "Governed selection" notice reading "Rule and resource options below are the 4 rule(s) and 1
  resource(s) actually active in policy policy-r1-004 for reclose-target-004" and populated
  dropdowns - screenshotted in `browser-evidence-index.md`.
- Test: "routeFromHash must strip query strings before matching a route", "report flow requests
  the active policy for a known target and offers only its real rules/resources".

## A3-H03 (HIGH) - wrong-network signing boundary - **CLOSED**

- Fix: `SdkProductAdapter.submitWrite` calls `this.writer.getConnectedChainId()` immediately
  before delegating to the writer method, refusing to sign (fails closed) if the writer cannot
  report a chain ID, or if the reported ID is not exactly 61997.
- Test: "submitWrite blocks signing when the connected writer reports the wrong chain ID",
  "submitWrite fails closed when the writer cannot report a chain ID at all", "submitWrite
  proceeds when the writer reports the correct chain ID with a valid draft".
- Remaining risk: no live-wallet browser screenshot of the actual blocked-signing error banner
  exists yet (requires a connected writer stub in the browser, not just unit tests).

## A3-H04 (HIGH) - live Incident Explorer causal trace - **CODE-COMPLETE; live proof blocked by OB-014**

- Fix (original sub-pass): `SdkProductAdapter.getIncident` no longer unconditionally returns
  `trace: []` in live mode; it reconstructs the real Judge-parent lifecycle from `decisionView`
  and attempts `sdk.trackActionTrace(incidentId)` for the Judge -> Kernel child, rendering an
  explicit `NOT_YET_AVAILABLE` marker (never a fabricated success) when the trace/index layer
  cannot resolve it.
- Fix (this sub-pass, second hop): `protocol-sdk::DirectRecloseClient.trackKernelToTargetChild`
  resolves the NEXT hop - Kernel -> Target (`_dispatch_action`'s own triggered transaction) - using
  the transport's `getTriggeredTransactionIds` against the Judge->Kernel child's tx hash, the same
  triggered-transaction mechanism genlayer-js exposes generally. `SdkProductAdapter.getIncident`
  now attempts this second hop ONLY when the first hop did not already fail (a failed dispatch
  never triggers a further child), rendering `NOT_YET_AVAILABLE` when it cannot be resolved.
- Test: "live getIncident no longer unconditionally discards trace - it attempts real
  reconstruction"; "live getIncident attempts Kernel -> Target reconstruction, not only Judge ->
  Kernel" (both against a fake transport in `scripts/test-frontend-remediation.js`).
- Remaining risk, reported honestly: this is code-complete and unit-tested, but NOT live-proven.
  The current explicit-allocation accepted Parent -> Child simulation on Studio-dev returns
  `SystemError: 2: inval`; the finalized control succeeds. This is tracked as OB-014. A failed
  accepted first hop means the second hop's dispatch cannot yet be live-proven. The earlier
  `fee no_matching_allocation # internal` diagnosis was superseded by the minimal reproduction.
  The fixture-mode Incident Explorer continues to render the complete four/five-hop trace from
  synthetic fixture data, which is independent of this live limitation.

## A3-H05 (HIGH) - canonical EAP in product - **CLOSED (architecturally)**

- Root cause: `@reclose/evidence-builder`'s canonical EAP builder already depended on
  `@reclose/protocol-sdk`'s types; having `protocol-sdk` depend back on `evidence-builder`'s
  runtime functions would have been circular at build time, so `buildIncidentReport`/
  `buildRecoveryReport` never actually called it and instead deferred EAP construction
  indefinitely ("binds at signing time").
- Fix: moved the ONE canonical EAP implementation into `packages/protocol-sdk/src/evidence.ts`;
  `@reclose/evidence-builder` now re-exports it verbatim (`export * from "@reclose/protocol-sdk"`)
  - there is still exactly one implementation, per CLAUDE.md Section 13, just relocated to resolve
  the dependency cycle. `buildIncidentReport`/`buildRecoveryReport` now call this implementation
  directly (same package) to build a real, hashed, bounds-checked EAP.
- Test: "protocol-sdk buildIncidentReport produces a PreparedRecloseWrite with the exact
  8-argument submit_incident call shape" asserts `eap.schema === "reclose-eap-v1"` and
  `eap.artifactHash === report.args[4]` (evidence_hash).
- Remaining risk: the browser's `handleIncidentSubmit` still builds its OWN
  `evidenceSources` array ad hoc from the form rather than routing through a browser-side
  evidence-authority selector; the CANONICAL EAP construction and validation now genuinely happens
  (in the SDK layer the browser calls), but a governed source-authority picker in the UI itself
  (vs. a free-text URL field) is A3-H11's remaining scope, not yet closed.

## A3-H06 (HIGH) - exact Judge call fee preview - **CLOSED**

- Fix: `buildIncidentReport` now derives the real reporter nonce
  (`get_reporter_nonce`), builds the real canonical EAP/artifactHash, and estimates fees over the
  exact 8-argument `submit_incident` call (`target_id, policy_key, rule_id, resource_id,
  evidence_hash, evidence_json, reporter_nonce, bond_id`) - never a shortened 4-argument
  placeholder. `buildRecoveryReport` does the same for `submit_recovery_validation`'s real
  6-argument shape. Returns a new `PreparedRecloseWrite` type
  (`packages/protocol-sdk/src/types.ts`) with `reviewHash` computed from the draft's args, so any
  future drift is a build-time type check plus a runtime hash mismatch, not a silent shortening.
- Test: "buildIncidentReport produces a PreparedRecloseWrite with the exact 8-argument
  submit_incident call shape" (asserts `args.length === 8` and each positional value).

## A3-H07 (HIGH) - target/owner controls incomplete - **CLOSED**

- Root cause: target detail showed assurance state/policy/restrictions/authority-revoked/human-
  override as READ-ONLY fields, with no way to actually exercise the bounded owner writes the
  Kernel already supports.
- Fix: `protocol-sdk::buildRevokeAuthority`/`buildDisableAction`/`buildDisableResource` produce
  real `PreparedRecloseWrite` drafts for the Kernel's existing `revoke_authority`/`disable_action`/
  `disable_resource` methods; target detail now renders three real forms ("Owner bounded
  controls") wired through the SAME preview -> draftRegistry -> sign pipeline as every other
  write. Browser evidence: previewing "Revoke authority" against `reclose-target-004` in fixture
  mode rendered a real network/fee preview panel with a "Preview only" notice - confirmed via
  `get_page_text`.
- Test: "bounded owner controls... build real prepared writes over the existing Kernel methods";
  "target detail exposes the bounded owner controls as real write forms, not just read-only
  fields".
- Scope note, reported honestly: no contract method literally named "human emergency pause" exists
  on the deployed Kernel beyond `revoke_authority`/`disable_action`/`disable_resource` (confirmed
  by reading `contracts/assurance_kernel.py` in full) - these three ARE the Kernel's bounded,
  immediate, authority-reducing, non-value-moving pause/reduction mechanism. Adding a fourth,
  differently-named contract method would itself be an architecture change, out of this
  remediation pass's scope per CLAUDE.md Section 43.

## A3-H08 (HIGH) - policy/audit surfaces incomplete - **PARTIALLY CLOSED**

- Fix: Incident Explorer now has a real "Export audit trail" control (`handleExportAuditTrail`)
  that assembles and downloads a JSON bundle (claim -> evidence -> decision -> policy consequence
  -> transaction trace -> recovery) directly from the exact incident object the page rendered -
  satisfying FINAL_REMEDIATION.md Section 10's causal-reconstruction requirement for a single
  incident's complete record.
- Test: "Incident Explorer exposes a real audit-trail export assembled from the rendered incident
  object".
- Remaining risk, reported honestly: policy-page lifecycle display (draft/timelock/superseded,
  activation-not-before) was already present from prior sub-passes and is unchanged; this pass
  only added the incident-level export, not a policy-level manifest export or a cross-incident
  audit view. Only exercised in fixture mode - no live-mode export was captured.

## A3-H09 (HIGH) - requirement mapping incomplete - **PARTIALLY CLOSED**

- Fix: this packet's `requirements.csv` now includes additional rows honestly mapping PRD-TGT-005,
  PRD-POL-005, PRD-EXP-002/003, PRD-INC-013, PRD-REC-008, NFR-SEC-005, NFR-UX-001/008 to the real
  C4 frontend work closed in this pass, with implementation/test refs and remaining-verification
  notes.
- Remaining risk, reported honestly: the CANONICAL `docs/execution/Requirements Status.csv`
  156-row ledger was deliberately NOT rewritten in this pass. It predates this remediation program
  and marks most C4/frontend requirement rows "NOT STARTED" despite real frontend implementation
  existing (a pre-existing discrepancy, not something introduced here). Reconciling it accurately,
  row by row, against everything implemented across F1/C4/A3 is R1-wide reconciliation work
  explicitly sequenced AFTER A3/E1/H1/A4 per the master directive (FINAL MASTER COMPLETION
  DIRECTIVE) - attempting a partial rewrite under this pass's time constraints risked introducing
  new inaccuracies rather than fixing the real, larger one.

## A3-H10 (HIGH) - unknown assurance state fails open as NORMAL - **CLOSED**

- Fix: `domain.js::stateMarker` renders `UNKNOWN` (with a distinct dashed-border style, not
  color-only) for any value not in the governed `ASSURANCE_STATES` list, including `undefined`/
  `null`, instead of defaulting to `NORMAL`.
- Test: "an unrecognized assurance state renders as UNKNOWN, never NORMAL".
- Browser evidence: not separately screenshotted (no live source currently produces an unknown
  state to render), but the fixture/unit-level behavior is proven directly.

(A3-H11 moved above, next to A3-H02 - see that entry. It is CLOSED as of `7f032af...`.)

## A3-H12 (MEDIUM) - incident ID not persisted with tx identity - **CLOSED**

- Fix (original sub-pass): the pending-transaction record includes `incidentId` alongside `txId`,
  persisted via `persistThenTrack` at submission time; the Pending page (`#/pending`) renders an
  "Incident" column.
- Fix (this sub-pass, deterministic derivation): `protocol-sdk::buildIncidentReport`/
  `buildRecoveryReport` now attach a `predictedIncidentId` to the returned draft, computed with
  the EXACT formula `contracts/incident_judge_v1.py::_derive_incident_id` evaluates on-chain
  (`f"{target_id}:{reporter.as_hex}:{int(nonce)}"`) - derivable client-side BEFORE the transaction
  resolves, from inputs the draft already carries (target_id, the caller-supplied reporterAddress,
  and the reporter's current on-chain nonce). `submitLiveWrite` now persists
  `draft.predictedIncidentId.incidentId` immediately at submit time, preferred over whatever a
  writer's return object happens to contain - no longer only post-hoc persistence of the writer's
  value. The Pending page labels a predicted ID as "(predicted pre-sign)".
- Test: "buildIncidentReport predicts the incident ID with the exact on-chain derivation formula";
  "predicted incident identity is persisted immediately at submit time, preferred over a writer's
  own return value".
- Remaining risk, reported honestly: no live wallet was connected in this pass, so the exact
  hex-casing behavior of a real on-chain `reporter.as_hex` read (vs. this SDK's lower-cased
  client-side string) has not been cross-checked end-to-end against a genuine Studio-dev
  transaction - see `known-limitations.md` item 4. The product still labels this value
  "predicted", not "confirmed", until a real readback is available.
