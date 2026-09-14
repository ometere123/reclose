# OB-014 root-cause report

**Updated:** 2026-09-14<br>
**Repository base:** `main` at `a40a5b085d11d1c2b8b8c03c2cc332da5cf510d8`; local changes are not yet committed<br>
**Network evidence:** GenLayer Studio-dev, chain 61997; UI-reported version `v0.123.0-rc.6`<br>
**Disposition:** The isolated `decided` message-emission path is live-verified on Studio-dev chain 61997 against the existing Parent using a correctly typed `CalldataAddress` and the saved accepted allocation. The saved simulation result is `SIMULATION_SUCCEEDED` and explicitly records `transactionSubmitted: false`. Its returned fee is an estimate, not a charge. This closes only the isolated phase-emission validation; it does not verify the complete Reclose lifecycle, E1 Run A/B, H1, or final fee coverage.

## Exact runner and executor evidence

The contract pins `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` in `contracts/assurance_kernel.py`; `toolchain/runner.lock` resolves that runner to `py-lib-genlayer-std` hash `kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0`. This is the Studio v0.123.0-rc.6 / GenVM Manager v0.6.0-rc4 runner family recorded in the lock. The off-chain `genlayer-py==0.19.0rc2` client is not the contract runner and is not used as evidence for the payload.

In that exact stdlib artifact's `genlayer/contract/__init__.py`, `ON` is `typing.Literal['decided', 'finalized']`. The public `emit` method types `on` as `ON`; `_ContractAtEmitMethod.__call__` copies `self._on` directly into `message['on']`, then calls `wasi.gl_call(calldata.encode({'EmitInternalMessage': message}))`. There is no translation from `accepted` to `decided`. Python's runtime does not enforce the `Literal` annotation, so the old string reached the host call unchanged.

The Manager v0.6.0-rc4 source is commit `b3bf110d65f2fdddaa3ac569a69f1a021bee71d1`; its `executors/v0.3.x` gitlink resolves to executor commit `561fbaaf9578e5600dbfa622de96007afc8c18ab`. The executor's `gl_call::On` schema accepts `decided` and `finalized` (including those serialized spellings), not `accepted`. Its message conversion handles those two enum variants. This matches the runner's public type and rejects the legacy phase string before child dispatch. These are exact source pins; Studio-dev's UI version is verified, but the service does not expose an exact deployed backend SHA, so source-to-hosted-build identity remains unverified.

Source references:

- [Repository runner lock](../../toolchain/runner.lock)
- [GenVM Manager v0.6.0-rc4 source](https://github.com/genlayerlabs/genvm-manager/tree/b3bf110d65f2fdddaa3ac569a69f1a021bee71d1)
- [Pinned executor `gl_call` ABI](https://github.com/genlayerlabs/genvm-executor/blob/561fbaaf9578e5600dbfa622de96007afc8c18ab/executor/crates/sdk-rs/src/abi/gl_call.rs)
- [Pinned executor internal-message handling](https://github.com/genlayerlabs/genvm-executor/blob/561fbaaf9578e5600dbfa622de96007afc8c18ab/executor/src/wasi/genlayer_sdk/message.rs)

## Captured request comparison

The saved requests and responses are in `release-evidence/r1/diagnostics/accepted-message-repro/simulation-results.json`. The Parent's source is preserved at `release-evidence/r1/diagnostics/accepted-message-parent.py`; its original deployed bytecode must remain historical evidence.

| Field | Accepted reproduction | Finalized control |
|---|---|---|
| Emitted `on` | `accepted` | `finalized` |
| `address` | `0x763289C8d65316032e3717C32A84b33c8DaB5020` | same |
| `calldata` | `{"":"noop"}` | same |
| `value` | `0` | `0` |
| `use_balance` | omitted (`false`) | omitted (`false`) |
| `fee_params` | omitted (`None`) | omitted (`None`) |
| Allocation recipient / call key | Child / padded `noop` call key | same |
| Allocation budget / encoded fee params | `613814400010352` / same encoded params | same |
| Allocation phase flag | `onAcceptance: true` | `onAcceptance: false` |

The two outer calls necessarily use different Parent methods (`emit_accepted` and `emit_finalized`), and the allocation phase flag is matched to each emitted phase. Among the `EmitInternalMessage` payload fields, only `on` differs. Recipient, calldata/call key, value, `use_balance`, and fee fields do not explain the result. This minimal reproduction has one child emission; repeated-effect allocation grouping is not implicated.

The original accepted call failed at `wasi.gl_call` with `SystemError: 2: inval`; the finalized control succeeded. That captured comparison and the exact enum mismatch motivated changing provisional emissions from `accepted` to `decided`. A later corrected-code attempt against the disposable Parent still failed, but its request encoded the Child argument as a plain string. The preserved request/calldata in `release-evidence/r1/diagnostics/accepted-message-repro/corrected-run-once/simulation-failure.json` shows the string encoding, and the returned trace reports only `STORAGE_READ` calls before `exit_code 1`; it did not reach message emission. That failure is a harness argument-encoding error and is not evidence against the `decided` phase.

## Corrective change and local regression

The Judge's provisional dispatch now uses `emit(on="decided")`; the Kernel's provisional target dispatch now uses `"decided"`. Final dispatch remains `"finalized"`. The lifecycle-specific entrypoints still force their existing provisional/final stages, all authorization and idempotency logic is unchanged, and no fee values or allocation fields changed.

The enum check in `tests/test_emit_internal_message_abi.py` is a version-pinned schema fixture; by itself it does not prove runner serialization. The integration test `tests/runner/test_emit_internal_message_wire.py` deploys a probe contract carrying the exact `Depends` runner hash, intercepts the real Direct Mode `gl_call`, and verifies the decoded `EmitInternalMessage` payload fields (`on`, recipient, `noop` calldata, zero value, and omitted false/None fields). The Judge and Kernel lifecycle tests also assert production dispatch uses `decided` provisionally and `finalized` finally. Results on this worktree:

```text
python -m pytest tests/test_emit_internal_message_abi.py tests/kernel/test_authority.py tests/judge/test_incident_judge_v1.py -q
133 passed in 105.31s

python -m pytest tests/runner/test_emit_internal_message_wire.py -q
2 passed in 1.34s
```

node scripts/test-ob014-calldata-address.mjs
PASS; 0 network requests; typed 20-byte CalldataAddress decoded as an address, while the plain-string negative control decoded as a string

The Direct Mode integration test exercises the pinned runner's real encoder; the separate SDK calldata regression proves the harness supplies the Child as a 20-byte `CalldataAddress`, with a plain-string negative control. Neither test by itself establishes the whole protocol lifecycle.

The current environment could not rerun GenVM lint: `genvm-lint` is not installed/on PATH. The prior checkpoint's recorded result remains: Kernel AST lint passed three checks; Judge AST lint reported three unchanged `E010` warnings at `_evaluate_once` LLM calls; SDK semantic validation was unavailable because the cache lacked the pinned runner archive `runners/py-genlayer/5j/ycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng.tar`. Do not treat those earlier AST results as a fresh lint run for this commit. The Direct Mode integration test did load the exact `Depends`-pinned runner for the real encoder test.

## Live verification and release boundary

The successful one-time read-only simulation is preserved at `release-evidence/r1/diagnostics/accepted-message-repro/typed-address-existing-parent/result.json` (SHA-256 `C90F5262BCBC689A048E9D7F84027A0C9C9EDD7BEFA2FCD6DE0591DD279138D6`). It used the already-existing Parent `0xbd7a6BcFaa8Ab8505e7C62C8Dcfff1Ae40fcA5de`, Child `0x763289C8d65316032e3717C32A84b33c8DaB5020`, `emit_decided`, and the saved accepted allocation without modification. The local request records a typed `CalldataAddress` made from the Child's 20 address bytes. The result reports `SIMULATION_SUCCEEDED`, `transactionSubmitted: false`, estimated `feeValue` `1233129600020704` wei, and `messageFeeConsumed` `613814400010352` wei. These are simulation outputs; no fee was charged by a transaction.

This confirms the isolated corrected `decided` emission path can simulate on the recorded Studio-dev service version. It does not establish source-SHA identity for the hosted build, verify the Judge→Kernel→Target production lifecycle, or complete E1 Run A/B, H1, or final live-fee coverage. Those release gates remain blocked/not run. No incident write or Reporter nonce exists for this validation. Preserve both the malformed-string failure and the successful typed-address result as distinct evidence; do not attribute the former to the phase.

## Current local verification record

Local verification on the source immediately before this documentation-only update:

```text
python -m pytest tests/test_emit_internal_message_abi.py tests/kernel/test_authority.py tests/judge/test_incident_judge_v1.py -q
133 passed in 105.31s

python -m pytest tests/runner/test_emit_internal_message_wire.py -q
2 passed in 3.26s

node scripts/test-ob014-calldata-address.mjs
PASS; networkRequestsMade: 0

node node_modules/typescript/bin/tsc -p packages/{protocol-sdk,policy-compiler,evidence-builder,transaction-tracker,sentinel,cli}/tsconfig.json --noEmit
PASS for all six workspaces (executed as six individual commands)
```

Lint limitations: `npm run lint` and `npm run typecheck` could not start because the installed npm PowerShell shim resolves a missing global `npm-cli.js`. Repository `lint` is also explicitly a placeholder (no JS/TS rules configured). `genvm-lint check` could not start because `genvm-lint` is not installed/on PATH. The prior checkpoint's AST lint observations are preserved above and are not represented as a fresh pass. CI for the final documentation/evidence commit is recorded in the handoff after push.
