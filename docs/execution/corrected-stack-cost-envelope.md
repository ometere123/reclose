# Corrected stack deployment cost envelope (read-only)

Date: 2026-09-14  
Source/report commit: `cf659d7b5d12080629dd31bd52b9655900dfebab`  
Network: Studio-dev / Studio Next, chain `61997`  
RPC: `https://studio-dev.genlayer.com/api`  

This envelope is a planning cap only. It was produced without deployment, wiring, funding, activation, simulation, or wallet submission. Every operation is capped at the authoritative network baseline `100000000000010352` wei (`0.100000000000010352 GEN`). That baseline is a conservative cap, not an exact quote for each operation.

The corrected Kernel deployment command must pass constructor values as `--args 1 60`; the literal type-marker form `--args int 1 int 60` is invalid and caused the stopped deployment recorded in the evidence.

## Operation order

| # | Operation | Transaction? | Maximum fee cap |
|---:|---|:---:|---:|
| 1 | Deploy `AssuranceKernel(1, 60)` | Yes | `0.100000000000010352 GEN` |
| 2 | Deploy `ReferenceAgentProtocol(deployer, targetId, providerA, providerB, 1000000000000000000, 100000000000000000, true)` | Yes | `0.100000000000010352 GEN` |
| 3 | `ReferenceAgentProtocol.set_assurance_controller(kernel)` | Yes | `0.100000000000010352 GEN` |
| 4 | Deploy `IncidentJudgeV1(kernel, 1, sourceRegistryHash, sourceRegistryJson)` | Yes | `0.100000000000010352 GEN` |
| 5 | Deploy `IncentiveVault(kernel, judge, 1)` | Yes | `0.100000000000010352 GEN` |
| 6 | `IncidentJudgeV1.set_vault(vault)` | Yes | `0.100000000000010352 GEN` |
| 7 | `AssuranceKernel.register_target(targetId, target, true)` | Yes | `0.100000000000010352 GEN` |
| 8 | `begin_policy(targetId, policyKey, manifestHash)` | Yes | `0.100000000000010352 GEN` |
| 9 | `add_policy_resource(policyKey, provider_a)` | Yes | `0.100000000000010352 GEN` |
| 10 | `add_policy_resource(policyKey, provider_b)` | Yes | `0.100000000000010352 GEN` |
| 11 | `add_policy_rule(... PROVIDER_COMPROMISE_V1 ...)` | Yes | `0.100000000000010352 GEN` |
| 12 | `add_policy_rule(... REMEDIATION_CONFIRMED_V1 ...)` | Yes | `0.100000000000010352 GEN` |
| 13 | `add_policy_rule(... RECOVERY_VALIDATED_V1 ...)` | Yes | `0.100000000000010352 GEN` |
| 14 | `add_policy_effect(... effect 1 ...)` | Yes | `0.100000000000010352 GEN` |
| 15 | `add_policy_effect(... effect 2 ...)` | Yes | `0.100000000000010352 GEN` |
| 16 | `add_policy_effect(... effect 3 ...)` | Yes | `0.100000000000010352 GEN` |
| 17 | `add_policy_effect(... effect 4 ...)` | Yes | `0.100000000000010352 GEN` |
| 18 | `seal_policy(policyKey)` | Yes | `0.100000000000010352 GEN` |
| 19 | `activate_policy(targetId, policyKey, version)` after genuine timelock | Yes | `0.100000000000010352 GEN` |
| 20 | Fund target treasury via payable `fund_treasury()` with `0.20 GEN` | Yes; `0.20 GEN` value plus fee cap | `0.300000000000010352 GEN` total exposure |

Providers A and B are already deployed and are reused only if their source/state remains independently valid. Their redeployment is excluded from this envelope. The Judge/Vault circular dependency is resolved by deploying Judge with its vault unset, deploying Vault with both Kernel and Judge addresses, then calling the Judge’s one-time `set_vault`.

## Exposure

- Fee-capped transactions: **20**.
- Maximum fee deposits: `20 × 0.100000000000010352 = 2.000000000000207040 GEN`.
- Required treasury value transfer: `0.20 GEN`.
- Maximum total GEN exposure including treasury value: **`2.200000000000207040 GEN`**.
- Deployer balance observed: `204.416387008249727217 GEN`.
- Balance after maximum exposure: **`202.216387008249520177 GEN`**.

The operation 20 cap includes its `0.20 GEN` value transfer plus the same conservative fee cap. All other rows are fee caps only.

## Stop conditions

Stop immediately, without retrying or advancing, if any estimator returns a required fee above `0.100000000000010352 GEN`, if a required distribution/message allocation is missing, if a transaction is not `FINALIZED` with `FINISHED_WITH_RETURN`, if code/schema/linkage readback differs from the corrected source plan, if the timelock has not genuinely elapsed, or if the deployer balance cannot cover the remaining envelope. Do not replace a higher quote with a guessed cap.
