# A2 Scope

## Why C2 and C3 are bundled into one audit gate

The Master Execution Directive instructed continuing through C2 and C3 without an intermediate
owner-permission stop, reserving the designated stop for the next external audit gate (A2,
per the Master Plan's sequence: ... -> A2 -> D1-D4/I1-I2 -> A3 -> E1 -> H1 -> A4 -> R1 -> S1).
This packet is that stop.

## Changed since A1 (A1 covered C1-FINAL only)

- New contracts: `contracts/incident_judge_v1.py`, `contracts/incentive_vault.py`.
- Extended contract: `contracts/assurance_kernel.py` (Judge read views, Judge/Vault circular-
  construction fix support, C3 policy-enumeration views).
- New test suites: `tests/judge/`, `tests/vault/`, plus one new test in `tests/kernel/`.
- New npm workspace packages: `@reclose/policy-compiler`, `@reclose/evidence-builder`,
  `@reclose/transaction-tracker`, `@reclose/cli`, `@reclose/sentinel`.
- Extended package: `@reclose/protocol-sdk` gained real (non-type-only) lifecycle-mapping logic.
- New operational scripts: `scripts/studio-dev-deploy.sh`, `scripts/fee-profile.mjs`.
- New documentation: `docs/execution/C2 Live Proof Evidence.md`,
  `docs/execution/Operations Runbook.md`.
- New live deployment manifest: `deployment/61997/c2-manifest.json`.

## Governance documents

No changes. `docs/governance/*` remain byte-identical to the accepted G0 baseline (verified by
`npm run a0-integrity`, included in `npm run verify:js`).

## Architecture deviations

None recorded for C2/C3. See `docs/execution/Architecture Deviations.md` (unchanged).
