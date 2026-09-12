# A3 Attempt 2 - Browser Evidence Index

**Exact candidate SHA:** `7f032af5921eff258c4c69a2f381861b003bd898` (branch `claude/r1-product-final`)
**CI at this SHA:** GitHub Actions run `34686497909` - **SUCCESS**

This index covers TWO capture passes: the initial pass against the earlier checkpoint
`7d1bf1eb317761c2b660e2e5c3b1b39b41d8388e` (routes unaffected by the A3-H02/H11 fixes below), and a
follow-up delta pass against exactly `7f032af...` covering the onboarding and governed-report-
selection changes. Both are real interactive Browser-pane sessions, not descriptions.
**Tool:** Claude Code's Browser pane (Chromium-based), served via `npx serve frontend` on
`http://localhost:4600`, mock/fixture adapter mode (`MockProductAdapter`) - no live SDK/wallet
connected in this pass.
**Date:** 2026-09-12

This is a real, interactive inspection pass performed against the exact SHA above - not a
description of expected behavior. Every observation below reflects what was actually rendered.

## 1440px desktop

| Route | Observation |
|---|---|
| `#/overview` | Renders cleanly; fixture-mode banner, metric strip, known-live-limitation notice (fee no_matching_allocation), targets table (SAFE_MODE + NORMAL markers, shape-differentiated), recent incidents table (CONFIRMED green / UNDETERMINED amber). |
| `#/targets` | Registered targets table; SAFE_MODE target and NORMAL target both render with distinct marker shapes. |
| `#/targets/reclose-target-004` | Target detail: assurance state SAFE_MODE, active restrictions=2, effective capabilities=1, policy version=4, full identity/authority record. |
| `#/incidents` | Incident list; CONFIRMED (green) and UNDETERMINED (amber) outcomes visually distinct, never collapsed to one status color. |
| `#/incidents/reclose-target-004:...:11` (CONFIRMED) | Full five-band Incident Explorer: (01) claim & evidence with two sources; (02) GenLayer judgment showing FINAL/CONFIRMED/CONFIRMED_CREDENTIAL_COMPROMISE/FINALIZED/MAJORITY_AGREE/SUCCESS·FINISHED_WITH_RETURN; (03) bounded effects table (RESTRICT provider_a, ENTER_SAFE_MODE target-wide, both PROVISIONAL/SUCCESS); (04) real 4-hop parent/child trace (REPORT_SUBMISSION -> JUDGE_DECISION -> KERNEL_EFFECT -> TARGET_ACTION, all FINALIZED/SUCCESS/FINISHED_WITH_RETURN). |
| `#/incidents/reclose-target-004:...:12` (UNDETERMINED / child failure) | Confirmed the required "successful semantic judgment + failed child execution" case: a red "Execution failure is downstream of judgment" banner reads "JUDGE_DECISION finalized with FINISHED_WITH_ERROR: fee no_matching_allocation # internal. The semantic decision is not rewritten as failed." - execution failure is visually separated from and never overwrites the semantic outcome. |
| `#/policies/reclose-target-004` | Policy identity (version 4, manifest hash, active=yes, human override=enabled) and authority diff showing `ACTION_ADDED` rows for RESTRICT/ENTER_SAFE_MODE with plain-language descriptions - expansion is visually prominent, not buried. |
| `#/report` | Incident report form (target/rule/resource/URL/source class) plus, after "Preview fee & bond": a Signing boundary panel showing network/estimated fee/reporter bond/estimate flag, and an explicit "Preview only - Fixture mode will not sign or submit this report" notice (I1 control visually confirmed, not just source-asserted). |
| `#/recover` | Recovery evidence form plus a Recovery boundary panel stating restoration requires a final recovery validation decision and the absence of conflicting restrictions - never implies a timer alone restores authority. |
| `#/onboard` | **Confirmed still presentation-only (A3-H02 NOT closed this pass):** Target ID/address inputs and an authority-acknowledgement checkbox: "Review registration" has no fee/network/handshake preview wired to it in fixture mode beyond a live-region message. |
| `#/system` | Network/chain ID/evidence commit, contracts table, fixture-mode banner, and the open live limitation notice - all present as first-class product state, not buried in a changelog. |
| `#/benchmark` | Required=60/implemented=52/passing=52/blocked-live=8; hard release targets table shows 0 for every zero-tolerance invariant class. Blocked-live cases are visibly not counted as passing. |

## 768px tablet

`#/overview` re-checked: content reflows into the same information without introducing horizontal
page overflow; the rail remains present and legible; metric cards stack correctly.

## 360px mobile (375px viewport)

- `#/overview`: hamburger "Menu" button replaces the always-visible rail; metric cards stack
  full-width; no horizontal page overflow observed.
- Opening the mobile menu renders the full nav list (Overview…System) as a legible full-height
  panel with clear labels and index numbers.
- `#/incidents/reclose-target-004:...:11` (causal trace) at 375px: the "Bounded effects" table
  scrolls **within its own bounded container** (a visible internal scrollbar under the table,
  content clipped only inside `table-wrap`, never the page body) - confirms the
  `overflow-x:auto` containment requirement rather than page-level horizontal scroll. Causal band
  text remains readable without truncation of the surrounding prose.

## Keyboard / focus

Pressing Tab from a fresh `#/overview` load moves focus visibly through the page (confirmed: a
clear blue focus outline appears on the third focusable element, the "demo-payments" target link)
- focus is never invisible or ambiguous.

## Delta pass against `7f032af5921eff258c4c69a2f381861b003bd898` (A3-H02/H11 closure verification)

| Check | Observation |
|---|---|
| `#/report?target=reclose-target-004` (routing regression check) | Before the `routeFromHash` fix in this commit, this exact URL - the one Target Detail's "Report incident" button produces - rendered "404 Route not found". After the fix, it correctly renders the report form. |
| `#/report?target=reclose-target-004` (A3-H11 governed selection) | A green "Governed selection" notice reads "Rule and resource options below are the 4 rule(s) and 1 resource(s) actually active in policy policy-r1-004 for reclose-target-004." The Rule `<select>` and Affected resource `<select>` are populated from that real policy data (`PROVIDER_COMPROMISE_V1` etc., `provider_a`), not the previous hardcoded two-option list. |
| `#/onboard` (A3-H02 registration preview) | Filled Target ID (`reclose-target-004`), Target address, checked the authority acknowledgement, and clicked "Preview registration". `get_page_text` confirms a real "Signing boundary" panel rendered: `NETWORK studio-dev · 61997`, `ESTIMATED FEE 80000000000000000 wei`, `ESTIMATE yes · may change`, `Preview only / Fixture mode cannot fabricate a registration transaction.` - replacing the previous stub that only ever displayed a static message with no fee/network/draft content. |

## Not captured this pass (honest gap, not fabricated)

- A full manual screen-reader (NVDA/VoiceOver) pass was not performed - only DOM-structure/labels
  were inspected visually plus the existing automated checks (semantic `<main>`/`<nav>`, skip
  link, `:focus-visible`, `prefers-reduced-motion` - see `scripts/test-frontend-product.js`).
- No live-wallet wrong-network visual state was captured (the SDK-adapter path for this exists and
  is unit-tested in `scripts/test-frontend-remediation.js`, but no live wallet was connected in
  this browser pass to show the actual blocked-signing UI banner in situ).
- No automated axe-core/Lighthouse accessibility scan was run against this exact SHA in this pass.
- Malicious-evidence rendering was verified via the existing automated test
  (`scripts/test-frontend-product.js`, `escapeHtml` neutralizes `<img onerror>`) rather than a
  fresh manual XSS-payload browser render in this specific pass.
