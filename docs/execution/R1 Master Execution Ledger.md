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
| 47-66 | D1-D4/I1-I2 | frontend product build, mock+real integration, accessibility | DONE (per A3 attempt 1) | frontend/ | scripts/test-frontend-product.js | 10/10 | (chatgpt/r1-product-release history) | A3 attempt 1 found integration defects despite green CI - see A3 AUDIT_DECISION.md |
| - | A3 | attempt 1: external product/integration audit | FAIL | docs/execution/audit-packets/A3/ | see packet | CI run 34682294856 SUCCESS, decision FAIL | 264c14af8f83cbd2bcf0176c87d9950baf0b275a | critical review-to-sign integrity break + 11 other findings |
| - | A3 | attempt 2: remediation of A3-H01..H12 | AWAITING EXTERNAL REVIEW | docs/execution/audit-packets/A3-attempt-2/, packages/protocol-sdk/src/evidence.ts, frontend/lib/domain.js, frontend/lib/adapters.js | scripts/test-frontend-remediation.js | 12/12 new + full verify:js ALL PASS + 197/197 py | 7d1bf1eb317761c2b660e2e5c3b1b39b41d8388e | CLOSED: H01(critical)/H03/H05/H06/H10. PARTIAL: H04/H12. NOT CLOSED: H02/H07/H08/H09/H11 - see findings-closure.md. CI run 34684832850 SUCCESS. Browser evidence captured against this exact SHA. |
| - | A3 | attempt 2 checkpoint: H02/H11 closure + routing fix | AWAITING EXTERNAL REVIEW | docs/execution/audit-packets/A3-attempt-2/ | scripts/test-frontend-remediation.js | 16/16 + full verify:js ALL PASS | 7f032af5921eff258c4c69a2f381861b003bd898 | CLOSED (added): H02 (registration half)/H11. Found+fixed real routeFromHash query-string bug. CI run 34686497909 SUCCESS. |
| - | A3 | attempt 2, second remediation sub-pass: H02(full)/H07/H12 closure, H04 second hop, H08/H09 partial | AWAITING EXTERNAL REVIEW | docs/execution/audit-packets/A3-attempt-2/, packages/protocol-sdk/src/client.ts, packages/protocol-sdk/src/types.ts, frontend/app.js, frontend/lib/adapters.js | scripts/test-frontend-remediation.js | 24/24 (8 new) + full verify:js ALL PASS | ad38a3920892c5c0681e4d603afc8ef07254228d | CLOSED (added): H02 (policy-activation half)/H07/H12. CLOSED code-complete not live-proven: H04 second hop (blocked by A2-C01). PARTIAL: H08/H09. CI run 34707671490 SUCCESS. Browser evidence captured against this exact SHA. See findings-closure.md. |
| - | A3 | attempt 2, third remediation sub-pass: independent-audit fixes (decisionId/txId bug, real action_id tracking, kernel-equivalent policy diff, resource validation, browser wallet+reporter identity, real multi-tx policy construction journey, full prepared-write field review, recovery surface) | AWAITING EXTERNAL REVIEW | docs/execution/audit-packets/A3-attempt-2/, packages/protocol-sdk/src/client.ts, packages/protocol-sdk/src/types.ts, frontend/app.js, frontend/lib/adapters.js, frontend/lib/wallet.js | scripts/test-frontend-remediation.js | 39/39 (15 new) + full verify:js ALL PASS | fa76e8409940dc836bc12fc0dc1144196d2531ee | Fixed real defects an independent audit found against ad38a39. CI run 34710541702 SUCCESS. See findings-closure.md addendum and known-limitations.md. |
| 67-71 | E1/H1 | canonical live scenario x2, 78-scenario benchmark, hardening | IN PROGRESS - lifecycle-specific Kernel/Judge stack deployed; Run A policy-r1-009 active. Run A awaits 0.20 GEN treasury funding before read-only explicit allocation preflight. No Run A incident submitted on this generation. | release-evidence/r1/e1/fixtures/; deployment/61997/r1-lifecycle-split-run-a-working-manifest.json | scripts/check-e1-evidence.mjs; scripts/r1-final-run-a-incident-prepare.mjs | pending two genuine runs | ac119d7 | Studio v0.123.0-rc.6 fee key/phase rule accounted for; full preflight still required. |
| 72-77 | A4/R1 | pre-release audit, docs, requirements/threat closure, claim-to-evidence, deployment freeze | NOT STARTED | | | | | |
| 78-87 | S1 | release candidate branch, submission materials, final verification, final report | NOT STARTED | | | | | |


## Continuation checkpoint — 2026-09-13

The first fresh contract set is live and its deployment record is `deployment/61997/r1-final-working-manifest.json`; its `policy-r1-007` has all construction writes read back and is sealed but intentionally inactive because its Judge cannot admit the immutable E1 fixture URLs. The cached `reclose-deployer` signer works. E1/H1/A3/A4/release package remain incomplete. Keep this policy inactive; use corrected registry hash `0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386`, deploy a corrected Judge/Vault, and begin `policy-r1-008`.

## Registry/source verification update — 2026-09-13

The current Judge is not valid for E1's immutable-source requirement. Its `reclose-reference-evidence` source authority was live-read as mutable boilerplate `main/`, and the fetched README is unrelated. Corrected registry hash is `0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386`; immutable fixture commit is `ea7dfb76b84adc24bbc40b4a5827cc3a0ae412b6`. Keep the current sealed policy inactive; deploy corrected Judge/Vault and a new policy before E1.
