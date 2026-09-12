# Next Execution (resume point)

This file exists per the master directive's hard-runtime-boundary protocol. A3 attempt 2 is a
genuine, designated stop point (owner review is required before E1/A4/R1/S1 may proceed) - this is
not a "ran out of session" boundary, but the instructions below apply equally if a future session
picks this up cold.

## Where things stand

- A3 attempt 2 target SHA: `fa76e8409940dc836bc12fc0dc1144196d2531ee` on `claude/r1-product-final`
  (third remediation sub-pass - response to an independent audit against `ad38a39...`).
- Exact-target CI: GitHub Actions run `34710541702` - SUCCESS
  (https://github.com/ometere123/reclose/actions/runs/34710541702).
- Full packet: `docs/execution/audit-packets/A3-attempt-2/`.
- Findings CLOSED: A3-H01 (CRITICAL), A3-H02, A3-H03, A3-H05, A3-H06, A3-H07, A3-H10, A3-H11,
  A3-H12.
- A3-H04: code-complete and unit-tested (both hops, including real per-effect action_id
  derivation), but NOT live-proven - blocked by the independent A2-C01 Studio-dev limitation (a
  failed first hop never triggers a second).
- Findings PARTIALLY CLOSED: A3-H08 (per-incident audit-trail export + real restriction-based
  recovery reads done; policy-level/cross-incident export AND a genuine Kernel read-gap - no
  parent_incident_id/child-incident view, blocking remediation-chain reconstruction - remain
  open), A3-H09 (packet-local requirements.csv now mirrors the full canonical set for every
  Section 16 category, 117 rows; canonical 156-row R1 ledger deliberately deferred).
- This checkpoint directly fixed real defects an independent audit found in the prior checkpoint:
  a decisionId-displayed-as-txId bug, action tracking keyed by the bare incidentId instead of a
  real derived action_id, a policy diff missing bounty/parameter/release-phase changes, no browser
  wallet/reporter-identity path at all, and a single-button policy "construction" with no real
  multi-transaction journey behind it. See findings-closure.md's addendum.

## If resuming without a new owner decision on A3 attempt 2 yet

The remaining honestly-open scope is narrower than before: A3-H08's policy-level/cross-incident
export, and (if the owner wants it pulled forward rather than done at R1) the canonical
`docs/execution/Requirements Status.csv` reconciliation. A3-H04 cannot be taken further without
A2-C01 resolving first - do not attempt to fabricate a live second-hop proof. If more work is
authorized, close what remains, freeze a NEW substantive SHA, get exact-target CI green again, and
capture fresh browser evidence against exactly that new SHA before updating this packet again
(confirm with the owner whether to extend this attempt-2 packet further or start attempt 3, since
no external decision has been rendered yet).

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
     unresolved part). Resolving this also unblocks live proof of A3-H04's second hop.
  3. E1 run A: fresh clean deployment (Provider A/B, Kernel, ReferenceAgentProtocol, Judge, Vault),
     full canonical scenario per FINAL MASTER COMPLETION DIRECTIVE Section 24.
  4. E1 run B: a SECOND independent clean deployment, not reusing run A's addresses/policy/
     incidents.
  5. `npm run e1:evidence:check` must pass against both real run artifacts.
  6. H1 live-designated benchmark scenarios (LIVE-01..08 currently BLOCKED_EXTERNAL/NOT_RUN per
     `npm run benchmark:check`).
  7. A4 packet, R1 requirements/threat reconciliation (156 requirements / 82 threats - this is
     where the canonical ledger gets reconciled against everything implemented across F1/C4/A3),
     release manifest, `release/r1-agent-tank-candidate` branch freeze (S1) - per the master
     directive's exact final-report format (Section 45).
- **FAIL:** the dependent phase remains blocked per CLAUDE.md Section 42 - implement the
  reviewer's findings as a new remediation pass, do not silently reopen only convenient items.
- **PASS WITH CONDITIONS:** address the stated conditions first, then proceed as under PASS.

## Do not

- Do not mark E1/A4/R1/S1 as started before A3 has an external/owner decision.
- Do not fabricate live scenario evidence - every E1/H1 step requires a real Studio-dev
  transaction hash, not a synthetic fixture. This applies equally to A3-H04's second hop: it stays
  "code-complete, not live-proven" until A2-C01 resolves, never a fabricated live screenshot.
- Do not merge `claude/r1-product-final` (or any later release branch) into `main` without
  explicit owner authorization.
