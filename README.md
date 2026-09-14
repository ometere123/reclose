# Reclose

**Runtime assurance for autonomous protocols.**

Reclose lets an autonomous protocol change behaviour safely when real-world conditions change. **GenLayer judges the evidence; deterministic policy limits exactly what the system may do.**

The core separation is:

```text
SENSE -> JUDGE -> CONSTRAIN -> ACT -> VERIFY -> RECOVER
```

A Reporter or Sentinel may submit evidence. The Reporter does not choose the consequence. A GenLayer Judge produces a constrained semantic outcome. The immutable AssuranceKernel maps that outcome into only the finite action already authorized by the target's active policy.

## Why Reclose

Static authorization answers who may act. Autonomous systems also need to answer a runtime question:

> Has the operating world changed enough that this system's permissions or operating state should change now?

Reclose is designed to answer that question without giving a centralized monitor, Reporter or language model unlimited emergency authority.

## R1 reference scenario

The reference target is an autonomous agent protocol with Provider A and Provider B.

The intended canonical lifecycle is:

```text
NORMAL
  -> Provider A compromise evidence
  -> GenLayer judgment
  -> bounded restriction / safe mode
  -> approved fallback through Provider B
  -> remediation evidence
  -> RECOVERY
  -> recovery validation
  -> restoration to NORMAL
```

Safe continuity, not a cosmetic `paused=true`, is the defining product goal.

## Architecture

```text
Reporter / Sentinel
      |
      v
Evidence Artifact Package
      |
      v
IncidentJudgeV1  -- GenLayer semantic judgment
      |
      v
AssuranceKernel  -- deterministic policy boundary
      |
      v
Target Adapter / ReferenceAgentProtocol
      |
      v
Execution receipt + observed post-state
```

Supporting infrastructure includes:

- protocol SDK;
- policy compiler;
- evidence builder;
- transaction tracker;
- CLI;
- Sentinel;
- bounded agent `skill.md`;
- human-facing product/explorer;
- threat-linked benchmark and release evidence gates.

## Security model

Reclose follows a few hard rules:

- GenLayer determines judgment. Policy determines consequence. Kernel enforces boundary.
- The model cannot invent authority.
- The Reporter cannot select the resulting action.
- No arbitrary calldata/selector/destination execution surface is exposed through the canonical ActionEnvelope.
- `UNDETERMINED` is a first-class result.
- `ACCEPTED` is not final.
- `FINALIZED` does not automatically mean downstream execution succeeded.
- Child transaction execution and required target post-state are verified separately.
- Restrictions are reason-indexed so resolving one incident cannot accidentally restore authority still restricted by another.
- Recovery is a governed lifecycle, not a hidden admin shortcut.
- Hosted/indexed data is convenience infrastructure, not protocol truth.

R1 provisional containment is limited to the governed safe set:

- `MONITOR`
- `RESTRICT`
- `REVOKE_CAPABILITY`
- `ENTER_SAFE_MODE`

Final-only or otherwise more consequential actions remain policy/finality constrained.

## Canonical R1 environment

| Item | Value |
|---|---|
| Network | GenLayer Studio-dev |
| Chain ID | `61997` |
| genlayer-js | `2.0.0-rc.1` |
| genlayer-py | `0.19.0rc2` |
| genlayer-test | `0.30.0rc2` |
| genvm-linter | `0.11.1rc2` |
| Node | `24.16.0` |
| npm | `11.13.0` |
| Python | `3.14.4` |

Do not substitute stable Studionet `61999` for the Agent Tank R1 evidence path.

## Current final R1 deployment addresses

The current fresh lifecycle-split deployment record is `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`.

| Component | Address |
|---|---|
| ProviderStubA | `0x02Be7242eb5ef13984590F86662B139384E20B70` |
| ProviderStubB | `0x1f12906AF34143C804f5AeeeF0AcDF408e816d0a` |
| AssuranceKernel | `0x5A271CB03b4833aA485ff13035844ba500c4E536` |
| ReferenceAgentProtocol / target `reclose-target-007` | `0xdf68B59C5f5Fb8929Ab6360B0024f34aec7a0353` |
| IncidentJudgeV1 | `0x43c6061FEde8372a3e4c3AB513D32abcfA956e89` |
| IncentiveVault | `0x10451Cd05cDeD4CE0f40983f4f87FFE42968E701` |

Policy: `policy-r1-009`, version 1, active, manifest hash `0xb5ac60c955e3bc052531e07b9c351738e7c27d80fb286b702f1f6e2e8ee83953`

Deployment generation: `r1-lifecycle-split-run-a`
Full deployment and policy transaction/readback record: [working manifest](deployment/61997/r1-lifecycle-split-run-a-working-manifest.json)

## Current live-evidence boundary

The old `on="accepted"` failure is historical and superseded. The pinned contract runner expects `decided` for the provisional emission. A read-only Studio-dev simulation of `emit_decided` against the existing disposable Parent succeeded on chain 61997 with a typed `CalldataAddress` Child argument and the saved allocation; its evidence records `transactionSubmitted: false`, so the returned fee is an estimate, not a charge. The earlier string-address request failed during calldata decoding before message emission and is not evidence against the phase.

```text
decided Parent -> Child.noop (typed address): successful read-only simulation
transactionSubmitted: false
```

This proves only the isolated `decided` message-emission path. It does not prove the full Judge → Kernel → Target incident lifecycle or recovery. The active policy generation's manifest records contract source commit `ac119d78118f2a701312723416b9c150816cd349`, which predates the lifecycle-specific `decided` source fix. The live frontend therefore allows canonical reads but fails closed on signing until a matching deployment is verified. E1 Run A has not submitted an incident; Run B and H1 have not run, and final live fee coverage is incomplete.

E1 remains evidence-bound until two independent clean 61997 runs succeed. See:

- `release-evidence/r1/diagnostics/accepted-message-repro/typed-address-existing-parent/result.json`
- `docs/execution/Open Blockers.md`
- `docs/execution/HANDOFF.md`
- `docs/execution/R1 Release Readiness Checklist.md`
- `docs/execution/R1 Release Claim Matrix.md`

## Repository structure

```text
contracts/                 GenLayer protocol contracts
packages/protocol-sdk/     canonical developer/machine SDK
packages/policy-compiler/  policy validation/compile tooling
packages/evidence-builder/ canonical evidence artifact tooling
packages/transaction-tracker/ lifecycle persistence/tracking
packages/sentinel/         policy-driven monitoring/report candidate tooling
packages/cli/              developer/operator CLI
frontend/                  human-facing Reclose product
schemas/                   canonical shared schemas
fixtures/                  validated F1 fixtures
benchmark/                 R1 adversarial/threat-linked corpus
tests/                     Direct Mode and protocol tests
docs/governance/           locked architecture/product governance
docs/execution/            phase, audit and release evidence records
deployment/61997/           Studio-dev manifests/config
release-evidence/r1/        release evidence and E1 contracts
skill.md                    bounded autonomous-agent interaction guide
```

## Verification

Install using the pinned Node/npm versions and run:

```bash
npm ci
pip install -r requirements.txt
npm run verify
```

The normal gate covers TypeScript build/typecheck, schemas, lifecycle truth, network guard, SDK/schema parity, ActionEnvelope semantics, canonical hashes, policy compiler, evidence builder, tracker, CLI, Sentinel, SDK product truth, frontend/product checks, bounded agent-skill checks, benchmark integrity, contract discovery/lint-wrapper checks and Python verification.

Evidence-only release gates are separate because they must remain red until real external/live evidence exists:

```bash
npm run fee-profile:final-check
npm run e1:evidence:check
```

Do not weaken those gates to make an incomplete release appear complete.

## Product

The frontend is designed as a calm operational instrument rather than a generic AI/Web3 dashboard. R1 surfaces include:

- Overview;
- Targets;
- Policies and authority review;
- Incidents;
- five-band Incident Explorer;
- Report Incident;
- Recovery;
- Benchmark;
- System/deployment status;
- persistent transaction state.

The Incident Explorer explicitly separates:

1. claim and evidence;
2. GenLayer judgment/lifecycle;
3. policy consequence;
4. actual execution/post-state;
5. recovery.

## Machine interfaces

The ordinary agent interface is documented in `skill.md` and deliberately excludes owner/admin authority expansion.

Developers and agents should prefer the SDK/CLI to scraping the web product. Direct protocol access remains possible without a hosted API/indexer.

## Audit state

Audit history is preserved under `docs/execution/audit-packets/`.

The available A3 attempt-2 packet targets an older source SHA and is not the final candidate packet. A3 must be refinalized against the eventual immutable substantive SHA with its required browser/accessibility evidence. A4 remains **NOT READY FOR EXTERNAL REVIEW**. Current status is **AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE** where applicable; no PASS is self-authored.

## Non-goals for R1

R1 does not claim:

- production Safe/Base execution;
- a production Hyperlane route from 61997;
- production ERC-7579/ERC-8004/AntSeed integration;
- proprietary hosted API as a correctness dependency;
- production self-evolution;
- a project token;
- defect-free or unhackable software.

## Documentation

Start with:

- `docs/governance/Product Requirements Document.md`
- `docs/governance/Master Design Package.md`
- `docs/governance/Implementation Specification.md`
- `Repository Build Master Plan.md`
- `docs/design/Product UI Specification.md`
- `docs/execution/Current Phase.md`
- `docs/execution/Canonical Demo Script.md`

Reclose's release rule is simple: **claim only what the evidence proves.**
