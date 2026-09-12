# A3 External Product & Integration Audit Packet

**Audit ID:** A3
**Attempt:** 2 (fourth and final remediation sub-pass)
**Audit status:** **AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE**
**Branch:** `claude/r1-product-final`
**Audited substantive target:** `98b98cc6ddc3d36292914e79c8fe4c8bc0d48209`
**Exact target CI:** GitHub Actions run `34715269007` - **SUCCESS**
(https://github.com/ometere123/reclose/actions/runs/34715269007)
(supersedes the prior checkpoint `fa76e8409940dc836bc12fc0dc1144196d2531ee`, CI run `34710541702`,
SUCCESS; earlier checkpoints in order: `ad38a3920892c5c0681e4d603afc8ef07254228d` (CI
`34707671490`), `7f032af5921eff258c4c69a2f381861b003bd898` (CI `34686497909`),
`7d1bf1eb317761c2b660e2e5c3b1b39b41d8388e` (CI `34684832850`) - see `AUDIT_TARGET_SHA.txt`)
**Attempt 1 (preserved, unchanged):** `264c14af8f83cbd2bcf0176c87d9950baf0b275a` - **FAIL**
(`../A3/AUDIT_DECISION.md`)
**Previous audit:** A2 attempt 2, target `6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5`, PASS WITH
CONDITIONS.

## What changed since the prior attempt-2 checkpoint (`7f032af...`)

See `findings-closure.md` for the finding-by-finding detail. Summary of this sub-pass:

- **NEWLY CLOSED:** A3-H02 (the remaining policy-activation half - "Validate & diff" now performs
  real canonical validate/hash/diff, never a stub), A3-H07 (bounded owner controls - revoke
  authority, disable action, disable resource - wired as real governed writes over existing
  Kernel methods), A3-H12 (deterministic pre-sign incident-ID prediction using the exact on-chain
  derivation formula, replacing post-hoc-only persistence).
- **NEWLY CLOSED, code-complete but not live-proven:** A3-H04's remaining Kernel -> Target second
  hop (blocked from live proof only by the independent A2-C01 limitation - see below).
- **NEWLY PARTIALLY CLOSED:** A3-H08 (a real per-incident audit-trail export was added; policy-
  level/cross-incident export remains open), A3-H09 (this packet's own `requirements.csv` gained
  honest new rows; the canonical 156-row R1 ledger was deliberately left for R1-wide
  reconciliation, per the master directive's sequencing).
- **Unchanged from the prior checkpoint, already closed:** A3-H01 (CRITICAL review-to-sign
  integrity), A3-H03 (wrong-network signing boundary), A3-H05 (canonical EAP), A3-H06 (exact Judge
  call fee preview), A3-H10 (fail-closed unknown assurance state), A3-H11 (governed report
  selection).

This attempt reports genuine closure of H01/H02/H03/H05/H06/H07/H09(partial)/H10/H11/H12 with real
code, tests, and (where a live network could exercise it) browser evidence. H04 is code-complete
and unit-tested but cannot be live-proven while A2-C01 remains open. H08 is partially closed. No
finding is marked closed merely because a helper function or screen exists without a
correspondingly real write/read pipeline behind it - see `findings-closure.md` for what each
closure actually demonstrates and `known-limitations.md` for what remains honestly open.

## Verification performed against this exact SHA

- `npm run verify:js` - **ALL PASS**, including 24 tests in
  `scripts/test-frontend-remediation.js` (8 new this sub-pass) proving: deterministic incident-ID
  prediction matches the on-chain derivation formula exactly; the three bounded owner-control
  writes (revoke authority, disable action, disable resource) build real prepared writes over the
  existing Kernel methods, exposed as real forms on target detail; the policy-activation review
  performs real validate/hash/diff and blocks invalid manifests, no longer a stub; the live
  Incident Explorer attempts the Kernel -> Target second hop, not only Judge -> Kernel; the
  predicted incident identity is persisted immediately at submit time, preferred over a writer's
  own return value; the Incident Explorer exposes a real audit-trail export.
- `python -m pytest tests -q` - not re-run to completion on this Windows host this sub-pass: a
  pre-existing, host-specific `gltest` library issue (`PermissionError: [WinError 32]` on
  `os.unlink` of a temp file still held open by the GenVM subprocess loader on Windows) blocks the
  full local Python run on this machine. This is unrelated to any source change in this sub-pass
  (confirmed: `git status` shows only TypeScript/JavaScript files changed) and was reproduced
  deterministically across repeated runs. The authoritative check remains exact-target GitHub
  Actions CI (Linux), which is green for this commit - see below.
- `genvm-lint` clean on every deployable contract (unchanged - no contract source was touched this
  sub-pass).
- Exact-target GitHub Actions run: see `AUDIT_TARGET_SHA.txt` for the result recorded once CI
  completed for this exact commit.

## Browser/accessibility evidence

Owner-control previews (revoke authority) and the real policy-activation review (valid and
invalid manifest cases) were exercised live in the Browser pane in fixture mode this sub-pass -
see `browser-evidence-index.md` for the updated table. The full responsive/accessibility sweep
from the prior checkpoint is unchanged and was not re-captured in this sub-pass (no UI layout
changed outside the new owner-controls panel and the policy-review output region).

## External/live blockers that remain separate from A3 source remediation

- Studio-dev Judge -> Kernel triggered child still fails with `fee no_matching_allocation #
  internal` on current evidence (A2-C01) - independently blocks E1/R1 closure, and now ALSO
  blocks live proof of A3-H04's Kernel -> Target second hop, since a failed first hop never
  triggers the second.
- The final live fee profile still requires real final-deployment arguments/output.
- E1 still requires two clean successful 61997 canonical runs with real test GEN behaviour,
  successful child execution, and target post-state evidence - none of that work was attempted in
  this pass, consistent with FINAL_REMEDIATION.md Section 17 ("E1 remains NOT COMPLETE until A3
  passes").

## Packet contents

- `AUDIT_TARGET_SHA.txt` - the immutable target and exact CI run for this sub-pass
- `findings-closure.md` - finding-by-finding root cause/fix/test/evidence/remaining-risk
- `browser-evidence-index.md` - route/viewport/observation table
- `requirements.csv`, `threat-delta.csv`
- `known-limitations.md`

## Gate status

**A3 ATTEMPT 2 (second remediation sub-pass): AWAITING EXTERNAL REVIEW — OWNER EXECUTION
OVERRIDE.**

- Attempt 1's FAIL decision is preserved unchanged at `../A3/AUDIT_DECISION.md`.
- This packet does not claim PASS. It reports real, verifiable closure of ten of twelve findings
  (two of those partially), with the remaining items (H04's live proof, H08's remaining scope)
  reported open rather than fabricated as closed.
- E1/A4/R1/S1 remain not authorised until an external (or owner) decision on this attempt is
  supplied, per the standing programme sequence.
