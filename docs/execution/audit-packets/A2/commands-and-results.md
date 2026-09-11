# A2 Verification Commands and Results

All commands below were run against commit `ae3a5083e1db805c3fa6692a11661d06e6679ec7` on branch
`claude/r1-tooling`.

## Python Direct Mode test suite

```bash
python3 -m pytest tests -q
```

Result: `185 passed` (up from `182` at the end of A1/C1-FINAL; +3 from C2's Judge/Vault work plus
the C3 Kernel policy-enumeration-view test).

## genvm-lint

```bash
genvm-lint lint contracts/assurance_kernel.py
genvm-lint lint contracts/incident_judge_v1.py
genvm-lint lint contracts/incentive_vault.py
genvm-lint lint contracts/reference_agent_protocol.py
genvm-lint lint contracts/provider_stub_a.py
genvm-lint lint contracts/provider_stub_b.py
```

Result: `✓ Lint passed` on every contract.

## JS/TS verification (includes all six C3 packages)

```bash
npm run verify:js
```

Result: `ALL PASS`. Includes (new/extended for A2):

| Check | Tests |
|---|---|
| `lifecycle:test` (protocol-sdk) | 9 |
| `policy-compiler:test` | 11 |
| `evidence-builder:test` | 13 |
| `transaction-tracker:test` | 8 |
| `cli:test` | 9 |
| `sentinel:test` | 10 |

Plus the pre-existing `truth-model:test`, `network-guard:test`, `f1-parity:test`,
`action-envelope:test`, `contracts:lint(:selftest)`, `genvm-lint-wrapper:selftest`, and
`a0-integrity` checks, all unchanged and still passing.

## Live Studio-dev (chain 61997) verification

See `deployment-evidence.md` for the full deploy/wire/policy/submit sequence and transaction
hashes. Summary of distinct verification actions:

1. Fresh deploy of ProviderStubA, AssuranceKernel, ReferenceAgentProtocol, IncidentJudgeV1 (two
   generations - see Finding 1 in `docs/execution/C2 Live Proof Evidence.md`), IncentiveVault.
2. `set_vault`, `set_assurance_controller`, `register_target` - all confirmed FINALIZED.
3. Policy `policy-c2-002` built (`begin_policy`/`add_policy_resource`×2/`add_policy_rule`×3/
   `add_policy_effect`×4/`seal_policy`), activated after the Kernel's authority-expansion timelock
   elapsed - confirmed via `get_policy_header` returning `[2, 0x222..., true, true, true]`.
4. Two live `submit_incident` calls against the fixed Judge, both FINALIZED/MAJORITY_AGREE,
   producing genuine `eq_principle` LLM judgments (`CREDENTIAL_COMPROMISE` and
   `INSUFFICIENT_EVIDENCE` respectively across independent executions) and persisted incident
   records - confirmed via `get_incident_condition_code`/`get_incident_outcome`.
5. `client.getTriggeredTransactionIds` confirmed each `submit_incident` call triggers a real child
   transaction toward the Kernel; the child's own execution fails with `fee no_matching_allocation
   # internal` (see `known-limitations.md`).

## Fee profiling (C3 Section 34)

```bash
node scripts/fee-profile.mjs release-evidence/r1/c3/fee-profile-input.json --out release-evidence/r1/c3/fee-profile-report.json
```

Result: see `release-evidence/r1/c3/fee-profile-report.json`. One of three representative branches
(`IncidentJudgeV1.submit_incident`, the Judge->Kernel cross-contract branch) produced a successful
fee estimate with a discovered `messageAllocations` entry; the other two (`Kernel.begin_policy`,
`IncentiveVault.fund_target_pool`) returned `ESTIMATION_FAILED` with a generic
"Missing or invalid parameters" RPC error on this run - not yet root-caused, recorded honestly as
an open item rather than re-run until it happened to succeed.
