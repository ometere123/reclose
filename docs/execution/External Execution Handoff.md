# External Execution Handoff

This document is the boundary between repository work that is complete/prepared and evidence that requires a browser, an unlocked Studio-dev signer, or live GenLayer execution.

Do not redo completed source work unless one of the external checks finds a defect. Do not weaken a gate to make an external failure disappear.

## 1. Browser product and accessibility evidence

Use the exact final A3 audit-target commit.

Run the frontend in a browser-capable environment and capture the evidence listed in:

`docs/execution/audit-packets/A3/screenshots-recordings-index.md`

Minimum checks:

- desktop and mobile product shell;
- dashboard, target, policy, incidents, Incident Explorer, report, recovery, benchmark and system surfaces;
- wrong-network write block;
- persisted pending transaction/resume presentation;
- successful judgment + failed downstream child shown as two separate facts;
- keyboard-only primary flows;
- visible focus order;
- reduced-motion behaviour;
- labels/contrast/accessibility inspection;
- malicious evidence rendered as inert escaped text.

Record browser/version, viewport, exact commit SHA and defects found. If a defect is found, fix it on the product branch and re-run the relevant evidence. Do not produce a clean evidence index by omitting failures.

## 2. Final fee profile

The fee-profile input is now bound to the final R1 addresses but intentionally contains empty dynamic arguments where a fresh incident/action/claim must exist.

Current Run A addresses (read from `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`):

- AssuranceKernel: `0x5A271CB03b4833aA485ff13035844ba500c4E536`
- IncidentJudgeV1: `0x43c6061FEde8372a3e4c3AB513D32abcfA956e89`
- IncentiveVault: `0x10451Cd05cDeD4CE0f40983f4f87FFE42968E701`
- ReferenceAgentProtocol: `0xdf68B59C5f5Fb8929Ab6360B0024f34aec7a0353`

Generation: `r1-lifecycle-split-run-a`; active target `reclose-target-007`; policy `policy-r1-009` v1. These are the current recorded addresses, not proof that all fee branches are profileable. Generate fresh valid branch arguments from current state rather than copying stale nonces or incident IDs.

Run the live estimator/profile and write the result to:

`release-evidence/r1/c3/fee-profile-report.json`

Then run:

```bash
npm run fee-profile:coverage
npm run fee-profile:final-check
```

`fee-profile:final-check` reads the active deployment manifest and binds both input and output to its generation and contract addresses. The currently retained fee report is stale and must not be presented as final. Re-profile only branches permitted by the serialized throttle; do not repeat the accepted-message preflight that is already proven to fail.

## 3. Studio-dev Judge -> Kernel child blocker

Historical failure (superseded):

`fee no_matching_allocation # internal`

Current disposition: the former shared call-key collision was fixed with lifecycle-specific Kernel entrypoints. The remaining blocker is different: an explicit-allocation accepted Parent→Child minimal simulation fails with `SystemError: 2: inval`, while the finalized control succeeds. See `release-evidence/r1/diagnostics/accepted-message-repro/`; do not repeat the same accepted preflight or submit an incident.

Known facts already established:

- final Judge construction succeeds;
- canonical EAP binding succeeds;
- public-source fetch and real semantic judgment execute;
- Judge state persists;
- estimator-discovered message allocation was used;
- triggered Kernel child still fails.

Before E1, re-test this path against the current pinned toolchain/runtime. If GenLayer Studio/runtime has changed, verify compatibility before adopting any toolchain change and record it under the repository's interface/compatibility/change-control process.

Do not hand-bisect or invent a fee tree when the authoritative estimator already provides one unless a verified GenLayer fix specifically requires a changed encoding/path.

Success criterion:

- Judge parent has the expected semantic decision;
- triggered Kernel child executes successfully;
- expected Kernel/Target state is actually observed;
- transaction trace records both parent and child truth.

## 4. E1 canonical clean runs

After the child path succeeds, perform the complete canonical scenario **twice from independent clean deployments**.

Use:

- `release-evidence/r1/e1/README.md`
- `release-evidence/r1/e1/run-template.json`
- `scripts/check-e1-evidence.mjs`

Create two real run artifacts under `release-evidence/r1/e1/`. They must contain actual addresses, transaction hashes, lifecycle observations, execution results, target post-state and GEN payment evidence.

Then run:

```bash
npm run e1:evidence:check
```

Never satisfy this checker with placeholder runs.

## 5. A3 external decision

Once browser evidence is attached and the final A3 audit-target is frozen, an external reviewer performs A3 against that exact SHA.

The repository author/implementation agent does not self-issue A3 PASS.

If A3 returns findings, preserve the first packet/decision and create the next attempt packet rather than rewriting history.

## 6. A4 and release closure

A4 is not eligible for PASS until:

- A3 has an external acceptable decision;
- H1 benchmark/security hardening is complete and current;
- final fee profile passes its evidence gate;
- E1 has two successful clean runs;
- canonical requirements/threat/gate ledgers are reconciled to real evidence;
- there are no unresolved release-critical findings;
- intended submission claims exactly match the evidence.

R1/S1 must remain open while those conditions are not met.

## 7. Files that must never be committed

Never commit:

- private keys;
- seed phrases;
- keystore passwords;
- wallet export files;
- API tokens;
- private deployment credentials.

Only public addresses, transaction hashes, non-secret logs and reproducible evidence belong in the repository.
