# A3 External Product & Integration Audit Packet

**Audit ID:** A3
**Attempt:** 2 (refinalized candidate after fourth remediation sub-pass)
**Audit status:** **AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE**
**Branch:** `claude/r1-product-final`
**Audited substantive target:** `7d308374cb6c634660b0e70ca389618198496503`
**Exact target CI:** GitHub Actions run `34798352450` - **SUCCESS**
(https://github.com/ometere123/reclose/actions/runs/34798352450)
This refinalization supersedes candidate `98b98cc6ddc3d36292914e79c8fe4c8bc0d48209` (CI run
`34715269007`, SUCCESS). Earlier remediation checkpoints are preserved in `AUDIT_TARGET_SHA.txt`.
**Attempt 1 (preserved, unchanged):** `264c14af8f83cbd2bcf0176c87d9950baf0b275a` - **FAIL**
(`../A3/AUDIT_DECISION.md`)
**Previous audit:** A2 attempt 2, target `6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5`, PASS WITH
CONDITIONS.

## Current candidate refresh

The exact candidate, CI, requirement mapping, H01-H12 disposition, live deployment facts, and
remaining evidence limits are in `candidate-refresh.md`. The canonical 156-row ledger is copied
to `requirements.csv`; the prior 98b candidate's A3-specific map is preserved as
`requirements-at-98b98cc.csv`. Current Run A is blocked by OB-014 (`SystemError: 2: inval` for an
explicitly allocated accepted message). The browser index records that no current-candidate
production/live-wallet capture was obtained; earlier fixture-mode captures are historical only.

## What changed since the prior attempt-2 checkpoint (`7f032af...`)

The following change summary and verification notes are historical records from the prior
remediation sub-pass. The current candidate's authoritative status and blocker are in
`candidate-refresh.md`; the active live blocker is OB-014, not A2-C01.

See `findings-closure.md` for the finding-by-finding detail. Summary of this sub-pass:

- **NEWLY CLOSED:** A3-H02 (the remaining policy-activation half - "Validate & diff" now performs
  real canonical validate/hash/diff, never a stub), A3-H07 (bounded owner controls - revoke
  authority, disable action, disable resource - wired as real governed writes over existing
  Kernel methods), A3-H12 (deterministic pre-sign incident-ID prediction using the exact on-chain
  derivation formula, replacing post-hoc-only persistence).
- **NEWLY CLOSED, code-complete but not live-proven:** A3-H04's remaining Kernel -> Target second
  hop (live proof was blocked at that historical checkpoint by what was then diagnosed as A2-C01;
  the current explicit-allocation accepted-message reproduction is tracked as OB-014).
- **NEWLY PARTIALLY CLOSED:** A3-H08 (a real per-incident audit-trail export was added; policy-
  level/cross-incident export remains open), A3-H09 (this packet's own `requirements.csv` gained
  honest new rows; the canonical 156-row R1 ledger was deliberately left for R1-wide
  reconciliation, per the master directive's sequencing).
- **Unchanged from the prior checkpoint, already closed:** A3-H01 (CRITICAL review-to-sign
  integrity), A3-H03 (wrong-network signing boundary), A3-H05 (canonical EAP), A3-H06 (exact Judge
  call fee preview), A3-H10 (fail-closed unknown assurance state), A3-H11 (governed report
  selection).

The current finding-by-finding dispositions are in `candidate-refresh.md`; the detailed historical
closure narrative below is retained for provenance. H04 remains without live proof under OB-014,
and H08 remains partial. No finding is marked closed merely because a helper function or screen
exists without a correspondingly real write/read pipeline behind it - see `findings-closure.md`
and `known-limitations.md` for evidence boundaries and open risks.

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

## Historical external/live blocker notes from the prior sub-pass

- At that checkpoint, Studio-dev Judge -> Kernel triggered-child execution was recorded as
  `fee no_matching_allocation # internal` and attributed to A2-C01. That diagnosis was
  superseded by the explicit-allocation reproduction: the current blocker is OB-014, where the
  accepted Parent -> Child simulation returns `SystemError: 2: inval` and the finalized control
  succeeds. See `candidate-refresh.md` and `findings-closure.md` for current status.
- The final live fee profile still requires real final-deployment arguments/output.
- E1 still requires two clean successful 61997 canonical runs with real test GEN behaviour,
  successful child execution, and target post-state evidence. These are still incomplete; the
  current candidate refresh records the exact blocker and run state.

## Packet contents

- `AUDIT_TARGET_SHA.txt` - immutable source target and exact CI run
- `findings-closure.md` - finding-by-finding root cause/fix/test/evidence/remaining-risk
- `browser-evidence-index.md` - route/viewport/observation table
- `requirements.csv` - canonical 156-row requirement reconciliation; prior A3-specific map is
  preserved as `requirements-at-98b98cc.csv`
- `threat-delta.csv` - A3 threat delta; complete 82-threat reconciliation is in the repository's
  `docs/execution/Requirements Reconciliation.md`
- `known-limitations.md`
- `candidate-refresh.md` - current H01-H12 status, deployment facts, evidence boundaries, and
  explicit open release gates

## Gate status

**A3 ATTEMPT 2 (refinalized candidate): AWAITING EXTERNAL REVIEW — OWNER EXECUTION
OVERRIDE.**

- Attempt 1's FAIL decision is preserved unchanged at `../A3/AUDIT_DECISION.md`.
- This packet does not claim PASS. See `candidate-refresh.md` for the current H01-H12 dispositions;
  the prior sub-pass counts above are historical and are not the current closure tally.
- E1/A4/R1/S1 remain not authorised until an external (or owner) decision on this attempt is
  supplied, per the standing programme sequence.
