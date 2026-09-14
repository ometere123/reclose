# Reclose R1 Operations Runbook (C3)

This is the operational reference for running real Reclose protocol operations on GenLayer
Studio-dev (chain 61997) using the C3 tooling built in `packages/`. It assumes `npm install` has
been run at the repo root and the `genlayer` CLI is installed, authenticated against a funded
`reclose-deployer`-style account, and pointed at `studio-dev` (never `studio-next`/stable `61999` -
CLAUDE.md Section 10).

Every command below is either read-only, or signs through the `genlayer` CLI's own configured
keystore. Nothing in this repository's tooling ever custodies or requests a private key directly
(CLAUDE.md Section 45).

---

## 1. Deploying a contract

```bash
bash scripts/studio-dev-deploy.sh contracts/<file>.py [--args <ctor args>]
```

Derives the authoritative baseline fee via `genlayer estimate-fees` (no hand-guessed `--fees`),
then deploys. Retries up to `RECLOSE_DEPLOY_RETRY_COUNT` (default 3) times, but ONLY on a
known-transient-connectivity error shape (`ConnectTimeoutError`, `fetch failed`, `ECONNRESET`, an
HTML response where JSON was expected, `UnknownRpcError`) - confirmed to occur intermittently
against the live Studio-dev RPC during this program's C1R/C2 live-deployment sessions, always
clearing within 2-3 attempts. A genuine protocol-level rejection (e.g. a contract's own
`UserError`, `FeeValueMustBeNonZero`) is never retried and always surfaced immediately.

After a successful deploy, **immediately** record the contract address, deployment tx ID,
constructor args, source commit, and lifecycle/execution-result confirmation in a
`deployment/61997/<phase>-manifest.json` entry (see `deployment/61997/c2-manifest.json` for the
exact shape) - per CLAUDE.md Section 35, persisting this is not optional.

## 2. Writing to a deployed contract

```bash
bash scripts/studio-dev-write.sh <contractAddress> <method> [--args ...]
```

Runs the **targeted** `genlayer estimate-fees <address> <method> --args ...` simulation (which
discovers any cross-contract `messageAllocations` tree the call needs), then writes with exactly
that fee object.

**Current Studio-dev limitation:** a read-only simulation of a correctly encoded explicit mode-2
allocation for an `on="accepted"` Parent→Child internal message fails with
`SystemError: 2: inval` at `wasi.gl_call`; the phase-matched `on="finalized"` control succeeds.
This was reproduced with a minimal Parent and Child, independently of Reclose policy semantics.
The exact diagnostic source, inputs, receipts and redacted structured response are in
`release-evidence/r1/diagnostics/accepted-message-repro/`. Do not retry the same accepted-message
preflight or submit the incident until the simulation works on Studio-dev. Do not replace the
estimator-produced allocation with guessed fee values.

## 3. Compiling and deploying a policy

```bash
node packages/cli/bin/reclose.js policy compile <manifest.json>
```

Prints the exact ordered `begin_policy` -> `add_policy_resource`* -> `add_policy_rule`* ->
`add_policy_effect`* -> `seal_policy` call sequence plus the manifest hash, validated against the
same rules the Kernel itself enforces (`@reclose/policy-compiler`). Run each printed call through
`scripts/studio-dev-write.sh`, in order.

**`activate_policy` is a separate, manual step** - the compiler deliberately does not emit it,
since whether this activation is an authority EXPANSION (requiring the Kernel's configured
`minimum_policy_delay_seconds` timelock from `seal_policy`'s block time before it can succeed) can
only be determined by the live chain state at activation time, not by the manifest alone. If
`activate_policy` fails with `E_KRN_007: TIMELOCK_NOT_ELAPSED`, wait past the configured delay
(60s in the current C2 deployment) and retry - this is expected behavior for a target's first
policy or any authority-expanding policy change, not a bug.

**Operational finding:** the *targeted* `estimate-fees <kernelAddress> activate_policy --args ...`
simulation has been observed to return a STALE `TIMELOCK_NOT_ELAPSED` rejection even after the real
delay has elapsed on-chain. The reliable workaround used successfully throughout this session's
live deployment: submit `activate_policy` via `genlayer write` directly with the **bare baseline**
fee object (`genlayer estimate-fees` with no address/method args), bypassing the stale targeted
simulation.

## 4. Building and submitting evidence

```bash
node packages/cli/bin/reclose.js evidence build <eap-input.json>
```

Validates and prints the exact `evidence_json` string to pass to `submit_incident` /
`submit_remediation` / `submit_recovery_validation`, using `@reclose/evidence-builder`'s port of
the Judge's own deterministic EAP bounds - rejects locally before ever touching the chain anything
the Judge's `_parse_and_validate_eap` would itself reject.

**Known CLI argument-encoding findings (already fixed in the contracts, keep in mind for any
NEW string-typed write parameter):** the exact pinned `genlayer` CLI's `--args` scalar parser (1)
coerces any `0x`-prefixed hex token into a BigInt/int rather than passing it as a string, and (2)
auto-decodes any `{`-leading token as JSON into a real object rather than the literal string a
`str`-typed parameter expects. Both are defended against in the contracts via
`_normalize_hash_arg`/`_normalize_str_arg`/`_normalize_json_arg` (see
`contracts/assurance_kernel.py` and `contracts/incident_judge_v1.py`) - do not assume a brand-new
write method is automatically safe from this; add the same normalization if it takes a
hash-shaped, optionally-empty, or JSON-shaped string argument.

## 5. Tracking a transaction

```bash
node packages/cli/bin/reclose.js tx track <txId> [--rpc <url>]
```

Read-only poll of a transaction's live lifecycle (and any triggered child transactions) via
`@reclose/transaction-tracker`. Never resubmits anything; if the transaction is `CANCELED`, the
output notes that resubmission *may* be considered, but a human/calling process decides that.

## 6. Running Sentinel monitoring (library use, no standing service yet)

`@reclose/sentinel`'s `SentinelMonitor` (see `packages/sentinel/src/monitor.ts`) runs a
deterministic keyword/pattern check against configured HTTPS sources and, when triggered, builds
a submittable EAP via `buildCandidateReport`. It has **no** submission or signing capability by
design - piping its output EAP JSON into step 4's `evidence build` step (or directly into
`scripts/studio-dev-write.sh <judgeAddress> submit_incident --args ...`) remains a separate,
explicit, operator-driven action. A standing Sentinel process (cron/daemon wrapper around
`SentinelMonitor.runOnce()`) is out of scope for this runbook entry and tracked as future C3/E1
work.

## 7. Verifying everything still works before any of the above

```bash
npm run verify:js
bash scripts/py-verify.sh   # or: npm run verify:py
```

Both must pass before trusting any of the tooling above against a live network. `npm run
verify:js` builds and tests every package in `packages/` (protocol-sdk, policy-compiler,
evidence-builder, transaction-tracker, sentinel, cli) along with the existing schema/RTM/threat-
ledger integrity checks.

## 8. Recovering from a fresh Studio-dev reset

Studio-dev resets are expected and must be recoverable via reproducible commands (CLAUDE.md
Section 35). Re-run the deploy sequence in `deployment/61997/c2-manifest.json`'s order (Provider
stubs -> AssuranceKernel -> ReferenceAgentProtocol -> IncidentJudgeV1 -> IncentiveVault), wire with
`set_vault`/`set_assurance_controller`/`register_target`, compile and activate a fresh policy
(Section 3 above), and record a NEW manifest entry - never silently overwrite a prior manifest
entry for a contract that is now at a different address.
