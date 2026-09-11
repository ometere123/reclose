# R1 Master Execution Ledger

Tracks implementation progress through the Reclose R1 Master Execution Directive (owner-supplied,
superseding the phase-by-phase-checkpoint interpretation). Distinct from `Requirements Status.csv`
and `Threat Status.csv`. Status values: `NOT STARTED`, `IN PROGRESS`, `DONE`, `BLOCKED`.

| section | phase | task | status | implementation refs | test refs | evidence refs | commit | blocker |
|---|---|---|---|---|---|---|---|---|
| 4 | C1-FINAL | provisional-safe action set (A1-H13) | DONE | contracts/assurance_kernel.py, contracts/reference_agent_protocol.py | tests/kernel/test_authority.py, tests/reference-agent/test_reference_agent_protocol.py | 89/89 tests passing | 3e67ce5 | |
| 5 | C1-FINAL | first-policy timelock (A1-H14) | DONE | contracts/assurance_kernel.py | tests/kernel/test_authority.py, tests/model/ | 122/122 passing | 539428d | |
| 6 | C1-FINAL | registration handshake (A1-H15) | DONE | contracts/assurance_kernel.py, reference_agent_protocol.py | tests/kernel/ | 114/114 | c172808 | |
| 7 | C1-FINAL | target-side revocation (A1-H18) | DONE | contracts/assurance_kernel.py | tests/kernel/ | 114/114 | c172808 | |
| 8 | C1-FINAL | expansion classifier economic fields (A1-H20) | DONE | contracts/assurance_kernel.py | tests/kernel/ | 97/97 | 539428d | |
| 9 | C1-FINAL | rule-scoped effects hardening | DONE (pre-existing A1-H05 pass; reviewed, no gaps) | contracts/assurance_kernel.py | tests/kernel/test_authority.py | see A1-H05 closure | (pre-existing) | |
| 10 | C1-FINAL | target capability handshake | DONE | contracts/assurance_kernel.py, reference_agent_protocol.py | tests/kernel/, tests/reference-agent/ | 129/129 | 9830bfc | |
| 11 | C1-FINAL | recovery/release engine separation (A1-H16) | DONE | contracts/assurance_kernel.py | tests/kernel/ | 124/124 | 95a0f12 | |
| 12 | C1-FINAL | policy-replacement MONITOR holds (A1-H17) | DONE | contracts/assurance_kernel.py | tests/kernel/, tests/model/ | 122/122 | 5a1ba14 | |
| 13 | C1-FINAL | state priority model (A1-H19) | DONE | contracts/reference_agent_protocol.py | tests/reference-agent/ | 118/118 | a76407a | |
| 14 | C1-FINAL | final action redispatch (A1-H21) | DONE | contracts/assurance_kernel.py | tests/kernel/ | 133/133 | 8d7bd94 | |
| 15 | C1-FINAL | identifiers/hashes/composite keys | DONE (prior A1R pass; reviewed, no gaps found) | contracts/assurance_kernel.py | tests/kernel/test_authority.py | see A1-H09 closure | (pre-existing) | |
| 16 | C1-FINAL | error codes | DONE | contracts/assurance_kernel.py, reference_agent_protocol.py | tests/kernel/, tests/reference-agent/ | 138/138 | 2c4d2f1 | |
| 17 | C1-FINAL | human override audit | DONE | contracts/reference_agent_protocol.py | tests/reference-agent/ | 142/142 | 7cfd339 | |
| 18 | C1-FINAL | reference agent treasury | DONE | contracts/reference_agent_protocol.py | tests/reference-agent/ | 146/146 | 40e9de1 | |
| 19 | C1-FINAL | genvm linter (already narrowed - reviewed, no gaps) | DONE | scripts/genvm-lint-wrapper.js | scripts/test-genvm-lint-wrapper.js | 9/9 | (pre-existing) | |
| 20 | C1-FINAL | F1-v6 consistency (already done - reviewed, no gaps) | DONE | packages/protocol-sdk/ | scripts/test-f1-parity.js, __typetests__/sdk-parity.ts | 17/17 | (pre-existing) | |
| 21 | C1-FINAL | fee blocker via SDK simulation estimator | DONE | scripts/estimate-studio-dev-write.mjs | live-tested against deployed Kernel | real sim_estimateTransactionFees round-trip | 6851469 | InsufficientFees/AllocationTreeMalformed boundary remains an open platform-compatibility finding, not blocking C2/C3 per directive |
| 22 | C1-FINAL | expanded model verification + full local/remote CI | IN PROGRESS | tests/model/ | 146/146 full suite | remote CI green through 40e9de1 | | |
| 23-31 | C2 | IncidentJudgeV1 - real semantic adjudicator, EAP validation, eq_principle judgment, 4 rule families | DONE | contracts/incident_judge_v1.py | tests/judge/ | 184/184 full suite passing | c7e97bf, 61d6b0f | |
| 32 | C2 | Kernel deterministic read views for the Judge | DONE | contracts/assurance_kernel.py | tests/judge/ | included in 184/184 | fdcf64d | |
| 33 | C2 | IncentiveVault - economic settlement, zero target authority | DONE | contracts/incentive_vault.py | tests/vault/ | included in 184/184 | 1ade0ee, eec684c | |
| 34 | C2 | Judge/Vault circular-construction fix | DONE | contracts/incident_judge_v1.py | tests/judge/ | included in 184/184 | 97484f2 | |
| 35 | C2 | live Studio-dev proof: deploy full C2 stack, wire, build+activate policy, real submit_incident | PARTIAL - see note | deployment/61997/c2-manifest.json, docs/execution/C2 Live Proof Evidence.md | live txs on chain 61997 | see C2 Live Proof Evidence.md | 61d6b0f | Judge->Kernel internal-message dispatch (receive_decision) fails live with SystemError: 2: inval (same AllocationTreeMalformed-class GenVM runtime limitation as A1 known-limitations.md item 2) - deterministic precheck, real web fetch, and real eq_principle LLM judgment are all live-proven; cross-contract decision dispatch remains Direct-Mode-only (184/184), not live-proven end-to-end pending upstream GenVM resolution |
| 36 | C3 | @reclose/protocol-sdk real lifecycle-mapping implementation | DONE | packages/protocol-sdk/src/lifecycle.ts | scripts/test-lifecycle-mapping.js | 9/9 | 3e0a332 | |
| 37 | C3 | Kernel policy enumeration read views | DONE | contracts/assurance_kernel.py | tests/kernel/test_authority.py | 185/185 full suite | 435e177 | |
| 38 | C3 | @reclose/policy-compiler | DONE | packages/policy-compiler/ | scripts/test-policy-compiler.js | 11/11 | 5fa4ea4 | |
| 39 | C3 | @reclose/evidence-builder | DONE | packages/evidence-builder/ | scripts/test-evidence-builder.js | 13/13 | 90be817 | |
| 40 | C3 | @reclose/transaction-tracker | DONE | packages/transaction-tracker/ | scripts/test-transaction-tracker.js | 8/8 | c368525 | |
| 41 | C3 | @reclose/cli (reclose executable) | DONE | packages/cli/ | scripts/test-cli.js | 9/9 | 66dacc4 | |
| 42 | C3 | @reclose/sentinel | DONE | packages/sentinel/ | scripts/test-sentinel.js | 10/10 | acb9290 | |
| 43 | C3 | deployment automation + operations runbook | DONE | scripts/studio-dev-deploy.sh, docs/execution/Operations Runbook.md | manual verification | n/a (operational scripts) | 57bf924 | |
| 44 | C3 | fee-profiling automation | DONE | scripts/fee-profile.mjs | live run against C2 deployment | release-evidence/r1/c3/fee-profile-report.json | ae3a508 | 2/3 representative branches returned ESTIMATION_FAILED on this run - see A2 known-limitations.md item 4 |
| 45-46 | A2 | audit packet preparation | AWAITING EXTERNAL REVIEW | docs/execution/audit-packets/A2/ | see packet | see packet | (this commit) | stopped per CLAUDE.md Section 41 - owner/external reviewer decision required before D1-D4 |
| 47-66 | D1-D4/I1-I2 | frontend product build, mock+real integration, accessibility, A3 | NOT STARTED | | | | | |
| 67-71 | E1/H1 | canonical live scenario x2, 60-scenario benchmark, hardening | NOT STARTED | | | | | |
| 72-77 | A4/R1 | pre-release audit, docs, requirements/threat closure, claim-to-evidence, deployment freeze | NOT STARTED | | | | | |
| 78-87 | S1 | release candidate branch, submission materials, final verification, final report | NOT STARTED | | | | | |
