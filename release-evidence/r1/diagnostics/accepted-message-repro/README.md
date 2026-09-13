# Studio-dev accepted-message simulation reproduction

This is a disposable Parent→Child `noop()` reproduction for the fee-path check required before E1 Run A. It does not submit an incident or call either deployed Reclose contract.

The child and parent were deployed on Studio-dev chain 61997 using the unlocked `reclose-deployer` account. Deployment addresses, successful transaction hashes, readbacks, the live estimator-produced child fee profile, both explicit mode-2 allocations, and the complete simulation responses are in `simulation-results.json`. The SDK simulator call used the same recipient, `noop` call key, root parent index, child-estimated budget, and encoded fee parameters for both runs; only `onAcceptance` and the parent method differed.

Result:

- Accepted: failed before dispatch completed. The receipt has `execution_result: ERROR`, and the GenVM trace ends at `wasi.gl_call` with `SystemError: 2: inval`.
- Finalized: succeeded and returned the one supplied allocation. The SDK estimate returned `feeValue=1233129600020704` wei and one phase-matched allocation.

This reproduces the accepted-stage failure independently of Reclose policy logic and qualifies as a Studio-dev accepted-message simulation limitation for the currently exposed deployment. Studio-dev’s displayed version is `v0.123.0-rc.6`; the service does not expose an exact backend source SHA, as documented in `release-evidence/r1/e1/studio-fee-semantics-verification.json`.

The deployment CLI also produced two failed diagnostic deploy attempts while correcting the minimal source: the first used an invalid base class; the second omitted the required constructor argument. Both exact failed transaction hashes and error receipts are retained in the neighboring deploy/receipt logs. Neither created a contract. The successful Child and Parent deployments are the addresses in the JSON evidence.

Secrets returned in Studio’s simulation `node_config` fields have been redacted in retained logs and response JSON. The GenVM error, allocation input, returned receipt structure, and successful finalized result are preserved.
