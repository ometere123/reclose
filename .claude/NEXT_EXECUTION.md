# Next Execution (resume point)

This file exists per the master directive's hard-runtime-boundary protocol. A3 attempt 2 is a
genuine, designated stop point (owner review is required before E1/A4/R1/S1 may proceed) - this is
not a "ran out of session" boundary, but the instructions below apply equally if a future session
picks this up cold.

## Where things stand

- A3 attempt 2 target SHA: `7f032af5921eff258c4c69a2f381861b003bd898` on `claude/r1-product-final`.
- Exact-target CI: GitHub Actions run `34686497909` - SUCCESS.
- Browser/accessibility evidence captured against exactly this SHA:
  `docs/execution/audit-packets/A3-attempt-2/browser-evidence-index.md`.
- Full packet: `docs/execution/audit-packets/A3-attempt-2/`.
- Findings closed: A3-H01 (CRITICAL), A3-H03, A3-H05, A3-H06, A3-H10, A3-H11.
- Findings partially closed: A3-H02 (registration real; policy activation still a stub), A3-H04, A3-H12.
- Findings NOT closed: A3-H07, A3-H08, A3-H09.

## If resuming without a new owner decision on A3 attempt 2 yet

Continue closing the remaining findings (A3-H02/H07/H08/H09/H11, plus A3-H04's Kernel->Target
second hop and A3-H12's deterministic incident-ID pre-derivation) as a further remediation pass on
top of `claude/r1-product-final`, then freeze a NEW substantive SHA, get exact-target CI green
again, and capture a fresh full browser evidence set against exactly that new SHA before updating
this packet to an "attempt 3" (or amending attempt 2 only if the owner has not yet reviewed it and
explicitly asks for it to be extended rather than superseded - confirm with the owner which they
prefer before overwriting attempt 2's frozen evidence).

## If resuming after an owner/external decision is supplied

- **PASS or explicit owner authorization to continue:** proceed directly to:
  1. Live fee-profile closure using the FINAL deployed addresses (contracts have been redeployed
     multiple times this program under different Judge/Vault fixes - use the addresses in
     `deployment/61997/r1-manifest.json`, verifying they are still the current live generation
     before reusing them).
  2. A2-C01 Judge -> Kernel child-routing investigation: use estimator-produced allocation data
     from the pinned `genlayer`/`genlayer-js`, never hand-bisected fee guesses. See
     `docs/execution/R1 Live Proof Evidence.md` for the exact prior findings and what was already
     tried (the estimator DOES discover a real messageAllocations entry for this exact call
     shape; the triggered CHILD transaction still fails at its own execution time with the same
     error even with that discovered allocation applied to the parent write - this is the open,
     unresolved part).
  3. E1 run A: fresh clean deployment (Provider A/B, Kernel, ReferenceAgentProtocol, Judge, Vault),
     full canonical scenario per FINAL MASTER COMPLETION DIRECTIVE Section 24.
  4. E1 run B: a SECOND independent clean deployment, not reusing run A's addresses/policy/
     incidents.
  5. `npm run e1:evidence:check` must pass against both real run artifacts.
  6. H1 live-designated benchmark scenarios (LIVE-01..08 currently BLOCKED_EXTERNAL/NOT_RUN per
     `npm run benchmark:check`).
  7. A4 packet, R1 requirements/threat reconciliation (156 requirements / 82 threats), release
     manifest, `release/r1-agent-tank-candidate` branch freeze (S1) - per the master directive's
     exact final-report format (Section 45).
- **FAIL:** the dependent phase remains blocked per CLAUDE.md Section 42 - implement the
  reviewer's findings as a new remediation pass, do not silently reopen only convenient items.
- **PASS WITH CONDITIONS:** address the stated conditions first, then proceed as under PASS.

## Do not

- Do not mark E1/A4/R1/S1 as started before A3 has an external/owner decision.
- Do not fabricate live scenario evidence - every E1/H1 step requires a real Studio-dev
  transaction hash, not a synthetic fixture.
- Do not merge `claude/r1-product-final` (or any later release branch) into `main` without
  explicit owner authorization.
