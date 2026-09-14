# R1 Release Claim Matrix

This matrix prevents submission/demo copy from outrunning repository evidence.

## Claims supported now

| Claim | Allowed wording | Evidence |
|---|---|---|
| Product definition | Reclose provides runtime assurance for autonomous protocols by separating GenLayer judgment from deterministic policy consequence. | locked governance + implemented Kernel/Judge/product |
| Network | The Agent Tank implementation targets GenLayer Studio-dev chain 61997. | toolchain lock, deployment manifests, network guard |
| Policy bounds | Reclose's Kernel executes only finite pre-authorized policy effects rather than arbitrary Reporter/LLM-selected calldata. | Kernel tests, ActionEnvelope schema/negative tests |
| Evidence adjudication | The Judge binds canonical evidence/context, independently fetches governed public sources and uses GenLayer nondeterministic judgment with validator re-evaluation. | Judge source/tests + recorded live Judge-side execution |
| Uncertainty | `UNDETERMINED` is a first-class Reclose result and is not conflated with confirmation/rejection. | schemas, Judge/Kernel tests, frontend/SDK truth tests |
| Provisional safety | R1 provisional execution is restricted to the governed reversible/authority-reducing safe action set and policy opt-in. | Kernel/Judge source/tests |
| Multi-incident safety | Restrictions are reason-indexed so resolving one incident does not restore authority still restricted by another. | Kernel/model tests |
| Recovery | Remediation and recovery validation are first-class protocol/product flows. | Kernel/Judge tests + product surfaces |
| Machine interfaces | Reclose includes protocol SDK, policy compiler, evidence builder, transaction tracker, CLI, Sentinel and a bounded agent `skill.md`. | packages/, CLI/Sentinel tests, skill guard |
| Product truth | The product separates evidence, GenLayer lifecycle/judgment, policy consequence, actual execution and recovery. | frontend + product tests |
| Current test baseline | Clean GitHub CI verifies schema, SDK, lifecycle, frontend/product, benchmark structure, contracts and Python suites for the exact candidate where cited. | exact CI run for frozen candidate |
| Benchmark corpus | The repository contains a 78-scenario threat-linked benchmark matrix, with live cases explicitly marked blocked/not-run where evidence is absent. | benchmark/r1-scenarios.json + checker |

## Claims that are NOT yet allowed

Do not claim any of the following until the listed release evidence exists:

| Prohibited premature claim | Why it is not yet supported | Required evidence |
|---|---|---|
| "Reclose is fully live end to end on Studio-dev" | A minimal explicit-allocation accepted Parent→Child simulation fails with `SystemError: 2: inval`; the finalized control succeeds. No Run A incident was submitted. | successful accepted-path simulation, E1 child path + two clean runs |
| "The canonical incident automatically restricted Provider A live" | no successful live Judge -> Kernel -> Target action on the current evidence path | E1 target post-state |
| "Live recovery/restoration is proven" | remediation/recovery child path is not live-proven | E1 recovery sequence |
| "All benchmark scenarios passed" | live cases remain BLOCKED_EXTERNAL/NOT_RUN | benchmark report after live execution |
| "All fees are profiled" | final-address input still needs real dynamic args and fresh output | `npm run fee-profile:final-check` PASS |
| "A3 passed" | external review not yet issued | A3 AUDIT_DECISION.md from reviewer |
| "A4/R1/S1 passed" | later release gates remain evidence-bound | A4 external PASS + release closure |
| "Production cross-chain protection is deployed" | Safe/Base/Hyperlane production routes are R1 non-goals/unverified | future release evidence |
| "No bugs / unhackable / perfectly secure" | not a defensible engineering claim | never use absolute security marketing |

## Demo wording for the known Studio-dev limitation

Acceptable:

> A read-only preflight on the current Studio-dev build found that a minimal explicit-allocation accepted Parent-to-Child message fails with `SystemError: 2: inval`; the finalized control succeeds. We stopped before submitting the incident, so this deployment has no live containment result.

Unacceptable:

> GenLayer confirmed the incident and Reclose automatically contained the provider live.

unless the exact demonstrated run has a successful child execution and verified target post-state.

## Release rule

Every concrete deployment, transaction, benchmark, fee, accessibility or end-to-end claim in the final submission must point to an exact evidence artifact and commit. If the evidence changes, update the claim rather than weakening the evidence standard.
