# A3 External Product & Integration Audit Packet

**Audit ID:** A3
**Attempt:** 2
**Audit status:** **AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE**
**Branch:** `claude/r1-product-final`
**Audited substantive target:** `7d1bf1eb317761c2b660e2e5c3b1b39b41d8388e`
**Exact target CI:** GitHub Actions run `34684832850` - **SUCCESS**
**Attempt 1 (preserved, unchanged):** `264c14af8f83cbd2bcf0176c87d9950baf0b275a` - **FAIL**
(`../A3/AUDIT_DECISION.md`)
**Previous audit:** A2 attempt 2, target `6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5`, PASS WITH
CONDITIONS.

This status statement is not a self-authored PASS. Per CLAUDE.md Sections 41-42, only the
repository owner or an independent reviewer they designate may render a PASS/FAIL/CONDITIONS
decision for this attempt.

## What changed since attempt 1

See `findings-closure.md` for the finding-by-finding detail. Summary:

- **CLOSED:** A3-H01 (CRITICAL review-to-sign integrity), A3-H03 (wrong-network signing
  boundary), A3-H05 (canonical EAP - one implementation, relocated to resolve a real circular
  package-dependency blocker), A3-H06 (exact Judge call fee preview, real 8-argument
  `submit_incident` / 6-argument `submit_recovery_validation` shape), A3-H10 (fail-closed unknown
  assurance state).
- **PARTIALLY CLOSED:** A3-H04 (live Incident Explorer now attempts real Judge-parent + one-child
  reconstruction instead of unconditionally returning an empty trace; the Kernel -> Target second
  hop is not yet wired), A3-H12 (incident identity now persisted alongside the transaction ID when
  a writer returns one; deterministic pre-resolution derivation is not implemented).
- **NOT CLOSED, stated honestly:** A3-H02 (target onboarding/policy activation remain
  presentation-only), A3-H07 (target/owner bounded controls), A3-H08 (policy/audit surface
  completeness), A3-H09 (requirement mapping expansion), A3-H11 (report selection constrained to
  governed state).

This attempt does not claim full closure of all twelve findings. It closes the CRITICAL finding
and several HIGH findings with real code, tests, and browser evidence, and reports the remainder
honestly as open for a further remediation pass.

## Verification performed against this exact SHA

- `npm run verify:js` - **ALL PASS**, including 12 new tests in
  `scripts/test-frontend-remediation.js` proving preview===submission-payload identity, draft
  invalidation on edit, wrong-network blocking (including fail-closed-without-chain-id), fixture
  mode never writing, the literal-`{}` regression, the real `PreparedRecloseWrite` 8-argument
  shape, and the trace-reconstruction-attempt behavior.
- `python -m pytest tests -q` - **197/197 passing** (Python contract suite unaffected by these
  TypeScript/JavaScript-only changes, as expected).
- `genvm-lint` clean on every deployable contract (unchanged from prior state).
- Exact-target GitHub Actions run `34684832850` - **SUCCESS**.
- Two pre-existing Windows-path bugs in `scripts/test-e1-evidence-checker.mjs` and
  `scripts/test-final-fee-profile-checker.mjs` (unrelated to A3, but blocking a full local `npm
  run verify` on this host) were found and fixed in the same commit - see `compatibility-findings.md`.

## Browser/accessibility evidence

Captured against exactly `7d1bf1eb317761c2b660e2e5c3b1b39b41d8388e` - see
`browser-evidence-index.md` for the full route/viewport table and honest list of what was NOT
captured this pass (no live-wallet wrong-network screenshot, no automated axe-core/Lighthouse
scan, no full screen-reader pass).

## External/live blockers that remain separate from A3 source remediation

- Studio-dev Judge -> Kernel triggered child still fails with `fee no_matching_allocation #
  internal` on current evidence (A2-C01) - independently blocks E1/R1 closure, and is visibly
  rendered as an execution-layer failure (not a rewritten judgment) in the Incident Explorer
  browser evidence for exactly this reason.
- The final live fee profile still requires real final-deployment arguments/output.
- E1 still requires two clean successful 61997 canonical runs with real test GEN behaviour,
  successful child execution, and target post-state evidence - none of that work was attempted in
  this pass, consistent with FINAL_REMEDIATION.md Section 17 ("E1 remains NOT COMPLETE until A3
  passes").

## Packet contents

- `AUDIT_TARGET_SHA.txt` - the immutable attempt-2 substantive target and exact CI run
- `findings-closure.md` - finding-by-finding root cause/fix/test/evidence/remaining-risk
- `browser-evidence-index.md` - route/viewport/observation table against this exact SHA
- `requirements.csv`, `threat-delta.csv` - carried forward from attempt 1 (A3-H09 not yet closed
  this pass; do not read the unchanged row count as new verification)
- `known-limitations.md`

## Gate status

**A3 ATTEMPT 2: AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE.**

- Attempt 1's FAIL decision is preserved unchanged at `../A3/AUDIT_DECISION.md`.
- This packet does not claim PASS. It reports real, verifiable closure of the CRITICAL finding and
  several HIGH findings, with the remaining findings reported open rather than fabricated as
  closed.
- E1/A4/R1/S1 remain not authorised until an external (or owner) decision on this attempt is
  supplied, per the standing programme sequence.
