# R1 Live Proof Evidence (A2-remediation integration, Studio-dev chain 61997)

Commit range: `claude/a2-remediation-integration` branch, integrating `chatgpt/a2-remediation`'s
hardened Judge/Kernel/Vault with owner-specified surgical corrections plus three real calldata-
coercion bugs found and fixed live this session. Full manifest: `deployment/61997/r1-manifest.json`.

## What is proven live

1. **Fresh deployment of the full hardened stack**: ProviderStubA/B, AssuranceKernel,
   ReferenceAgentProtocol, IncidentJudgeV1 (final generation), IncentiveVault (final generation) -
   all FINALIZED on Studio-dev.
2. **Wiring**: `set_vault`, `set_assurance_controller`, `register_target` - all confirmed live via
   read-back (`get_vault`, `get_target_details`).
3. **Canonical APM compile -> Kernel write sequence -> policy readback verification -> timelocked
   activation**: `policy-r1-004` built via `@reclose/policy-compiler`'s `compileCanonicalApm`,
   verified byte-for-byte against on-chain state via `verifyPolicyReadback` (zero mismatches,
   `release-evidence/r1/c3/readback-result-004.json`), activated after the Kernel's authority-
   expansion timelock elapsed.
4. **A real `submit_incident` call's full Judge-side pipeline**, end to end, live:
   deterministic precheck -> EAP parse/hash-binding verification -> real `gl.nondet.web.get` fetch
   -> real LLM judgment via `gl.vm.run_nondet_default` -> state commit on the Judge. Result:
   `condition_code=INSUFFICIENT_EVIDENCE`, `outcome=UNDETERMINED` (tx
   `0x3675242c50ef385d3f6032b73ff4041b2cf16989c1f34b0d7d5bb685df4e1501`) - an honest model
   judgment on the evidence provided, not a fabricated confirmation.
5. **Genuine reproduction and fix of three live calldata-coercion bugs** the exact pinned `genlayer`
   CLI introduces that Direct Mode testing cannot catch (see below) - none of these were found in
   Direct Mode because Direct Mode never routes calldata through the CLI's JS-object encoder.

## Three live calldata-coercion bugs found and fixed this session

All three are the SAME root cause (the exact pinned `genlayer` CLI's `--args` parser auto-types
nested values inside a JSON-shaped string argument rather than preserving them as JSON-schema-
typed strings) manifesting in three different ways, found one at a time because each fix exposed
the next:

| # | Symptom | Field | Fix |
|---|---|---|---|
| 1 | `TypeError: Object of type Address is not JSON serializable` | `reporter` (40-hex) | Convert `gl.Address` back to `.as_hex` before re-serializing |
| 2 | `E_JDG_006: EAP policyHash mismatch` | `policyHash`/`contentHash`/`artifactHash` (64-hex) | Convert coerced int back to `"0x"+format(int,'064x')` by field name |
| 3 | `E_JDG_EVIDENCE: invalid snapshotRef` | `snapshotRef`/`snapshotRefs` (empty string) | Generalized: any bare int `0` surviving the hash-field pass is an empty string (no legitimate EAP field is ever int 0) |

Each was fixed surgically in `contracts/incident_judge_v1.py::_sanitize_calldata_scalars`, with a
Direct Mode regression test added for each (`test_submit_incident_normalizes_calldata_typed_reporter_and_policy_hash`,
`test_submit_incident_normalizes_calldata_coerced_empty_strings`), and required three full
Judge+Vault redeploy cycles (the Vault's `judge_address` constructor argument is immutable, so
each Judge fix required a fresh Vault too) - see `r1-manifest.json`'s `supersededGenerations` for
the full chain.

## What remains an external, unresolved live limitation (not a Reclose defect)

**The Judge -> Kernel `receive_decision` dispatch's triggered CHILD transaction fails live with
`fee no_matching_allocation # internal`** - confirmed again on this fresh deployment
(child tx `0x00d59204565f14677eb5f46bb3877efede739ce91e0bfc73fba836063b9e3087`, FINALIZED at the
consensus level, but its own execution_result is ERROR with that exact payload on both leader and
validator).

This is the SAME finding originally documented in the superseded C2 deployment's
`docs/execution/C2 Live Proof Evidence.md` (Finding 2 and its update), now reproduced on a
completely independent fresh deployment, which rules out any deployment-specific artifact as the
cause.

**Per the master directive's explicit instruction, this was investigated using the estimator-
discovered allocation data (never hand-bisected)**: `genlayer estimate-fees <judge> submit_incident
--args ...` (run as the real signing account, not a zero-address simulation) successfully
discovers a `messageAllocations` entry targeting the Kernel's `receive_decision` callKey, and
submitting the write with EXACTLY that discovered fee object is what got the PARENT transaction
(the Judge's own execution) to succeed cleanly for the first time this session. The CHILD
transaction - a transaction genlayer-js's own `getTriggeredTransactionIds` confirms is genuinely
created and scheduled - still fails at its own execution time with the identical fee-allocation
error regardless. This strongly suggests the gap is in how the discovered allocation is applied
to the CHILD's own execution-time fee lookup on Studio-dev's runner, not in anything this
repository's tooling controls.

**Consequence for the 16 requested live scenarios**: the Judge's own behavior (zero-bond
reporting, EAP validation, evidence-hash binding, real web fetch, real LLM judgment, UNDETERMINED
outcome) is live-proven. Every scenario that additionally requires the Kernel to actually RECEIVE
and ACT ON a decision - provisional containment, Provider A restriction, remediation, RECOVERY,
recovery validation, restoration, and (since `IncentiveVault.settle_bond` itself reads the
Kernel's `get_incident_final_outcome`) Vault settlement/payout - cannot be live-proven while this
specific child-dispatch limitation stands, because the Kernel never receives the decision that
would drive any of those downstream states. These remain proven only via Direct Mode (197/197
passing, including the full multi-incident/recovery/Vault-settlement test matrix) - this is stated
honestly here, not fabricated as resolved.

**Not attempted, and stated honestly rather than faked**: a bonded-report live proof (the
deployed `policy-r1-004`'s rules all have `reportBond=0`; proving a nonzero bond would require
another full policy-rebuild-and-timelock cycle this session's remaining time did not allow),
duplicate-delivery and restart/resume-transaction-tracking live proofs specifically against this
fresh deployment (the underlying idempotency/nonce and tracker logic are both covered by
Direct Mode tests and the `@reclose/transaction-tracker` unit tests respectively, but a dedicated
live run against THIS deployment was not separately executed).

## Requirements/Threat status implications

Per the master directive, `Requirements Status.csv`/`Threat Status.csv` are updated only from this
actual evidence: the Judge-side requirements this proof directly supports may move toward
VERIFIED; any requirement whose verification depends on the Kernel receiving a decision remains
`MITIGATED / UNVERIFIED (live cross-contract dispatch)`, unchanged from the C2-era status - not
upgraded on the strength of this session's (still partial) live proof.
