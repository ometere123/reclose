# A3 Attempt 2 - Findings Closure (A3-H01 through A3-H12)

Target SHA: `7d1bf1eb317761c2b660e2e5c3b1b39b41d8388e`. Status reported honestly per finding -
some findings are fully closed with tests + browser evidence, some are partially closed, and some
remain open. This packet does not claim blanket closure.

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

## A3-H02 (HIGH) - target onboarding / policy activation presentation-only - **NOT CLOSED**

Root cause unchanged: `onboard-form`'s submit handler and the policy-author "Validate & diff"
button still only call `setLiveMessage(...)`, with no bounded write plan, network check or
persisted transaction. Browser evidence (`#/onboard`) confirms this directly. Deferred to the next
remediation pass - explicitly not claimed as fixed.

## A3-H03 (HIGH) - wrong-network signing boundary - **CLOSED**

- Fix: `SdkProductAdapter.submitWrite` calls `this.writer.getConnectedChainId()` immediately
  before delegating to the writer method, refusing to sign (fails closed) if the writer cannot
  report a chain ID, or if the reported ID is not exactly 61997.
- Test: "submitWrite blocks signing when the connected writer reports the wrong chain ID",
  "submitWrite fails closed when the writer cannot report a chain ID at all", "submitWrite
  proceeds when the writer reports the correct chain ID with a valid draft".
- Remaining risk: no live-wallet browser screenshot of the actual blocked-signing error banner
  exists yet (requires a connected writer stub in the browser, not just unit tests).

## A3-H04 (HIGH) - live Incident Explorer causal trace - **PARTIALLY CLOSED**

- Fix: `SdkProductAdapter.getIncident` no longer unconditionally returns `trace: []` in live mode;
  it reconstructs the real Judge-parent lifecycle from `decisionView` and attempts
  `sdk.trackActionTrace(incidentId)` for the Judge -> Kernel child, rendering an explicit
  `NOT_YET_AVAILABLE` marker (never a fabricated success) when the trace/index layer cannot
  resolve it.
- Test: "live getIncident no longer unconditionally discards trace - it attempts real
  reconstruction".
- Remaining risk: full Kernel -> Target child reconstruction (the second hop) is not yet wired
  into the live adapter - only the Judge parent + one child are attempted. The fixture-mode
  Incident Explorer (browser evidence) already renders the complete four-hop trace because the
  synthetic fixture data provides it; the LIVE adapter's actual multi-hop reconstruction remains
  incomplete.

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

## A3-H07 (HIGH) - target/owner controls incomplete - **NOT CLOSED**

Not addressed this pass. Target detail already shows assurance state, active policy, restrictions,
authority-revoked flag, human override (pre-existing); bounded owner actions (revoke authority,
human emergency pause) remain unimplemented.

## A3-H08 (HIGH) - policy/audit surfaces incomplete - **NOT CLOSED**

Not addressed this pass beyond what A3-H05/H06 incidentally exposes via the real EAP/fee draft.

## A3-H09 (HIGH) - requirement mapping incomplete - **NOT CLOSED**

`requirements.csv` in this packet is carried forward from attempt 1 with no new rows added this
pass - stated honestly rather than padded.

## A3-H10 (HIGH) - unknown assurance state fails open as NORMAL - **CLOSED**

- Fix: `domain.js::stateMarker` renders `UNKNOWN` (with a distinct dashed-border style, not
  color-only) for any value not in the governed `ASSURANCE_STATES` list, including `undefined`/
  `null`, instead of defaulting to `NORMAL`.
- Test: "an unrecognized assurance state renders as UNKNOWN, never NORMAL".
- Browser evidence: not separately screenshotted (no live source currently produces an unknown
  state to render), but the fixture/unit-level behavior is proven directly.

## A3-H11 (MEDIUM) - report selection not constrained to governed state - **NOT CLOSED**

The report form's rule/resource/source-class fields remain free selects/free text, not resolved
against `getActivePolicy`/`getTarget` before preview. Not addressed this pass.

## A3-H12 (MEDIUM) - incident ID not persisted with tx identity - **PARTIALLY CLOSED**

- Fix: the pending-transaction record now includes `incidentId: result.incidentId ?? null`
  alongside `txId`, persisted via the existing `persistThenTrack` at the same instant as before;
  the Pending page (`#/pending`) now renders an "Incident" column showing it (or "not yet known"
  when the writer has not yet returned one).
- Remaining risk: whether a real writer's return value actually contains `incidentId` depends on
  the host-provided writer implementation, which was not exercised live in this pass. The
  deterministic-derivation path described in FINAL_REMEDIATION.md Section 13 (deriving incidentId
  from target+reporter+nonce before the transaction resolves) is not implemented - only
  post-hoc persistence of whatever the writer returns.
