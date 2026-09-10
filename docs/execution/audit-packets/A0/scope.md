# A0 Packet Scope

## What this packet audits

F0 (Repository Foundation), F1 (Internal Frontend Contract Freeze, now version F1-v4), and S0
(Security Threat Baseline), building on the already-externally-accepted G0 (Toolchain Conformance)
baseline, **as remediated after three prior external A0 review cycles all returned FAIL**.

## Audit target

`c7ace037f63029dccff708cde1ac52372c3f642d` on branch `claude/r1-foundation`. See `commit.txt`.

## Audit history

1. **First submission** (audit target `69204d5`) - FAIL, findings A0-001 through A0-009.
2. **Second submission** (audit target `82b0d7c`, fixing A0-001 through A0-007 + part of A0-008) -
   FAIL again. The reviewer explicitly accepted A0-001, A0-004, A0-007 as closed and most of
   A0-008/A0-009 as correct, and found six remaining defects: A0-R1 through A0-R6.
3. **Third submission** (audit target `fef26f2`, fixing A0-R1 through A0-R6) - FAIL again. The
   reviewer found five remaining defects: A0-T1 (F1 existed only as Markdown/JSON Schema, no real
   compiled shared TypeScript types), A0-T2 (`ActionEnvelope`/`ExecutionReceipt` were a
   reduced/incomplete projection of the MDP formal model), A0-T3 (canonical `DecisionRecord` still
   permitted `NONE` for `outcome`/`decisionStage`), A0-T4 (`NFR-CMP-001` marked `VERIFIED` without any
   actual runtime chain-ID preflight guard existing), A0-T5 (archive/audit-target integrity process
   gaps, including a case-insensitive-rename content-loss bug found and fixed within that same
   submission's own history).
4. **This (fourth) submission** (audit target `c7ace03`) fixes A0-T1 through A0-T5, across three
   commits:
   - `c125fe4` - A0-T1 (real compiled `@reclose/protocol-sdk` TypeScript package), A0-T2
     (`ActionEnvelope`/`ExecutionReceipt` rebuilt to the full canonical MDP shape), A0-T3
     (`DecisionRecord.outcome`/`.decisionStage` now prohibit `NONE`), A0-T4 (NFR-CMP-001 wrong-network
     runtime guard implemented and tested, closing `TM-INF-001`'s missing control half), plus the new
     `scripts/a0-integrity-check.js` automated gate and exact CI Node/npm version pins that support
     A0-T5's stronger integrity discipline.
   - `f2fc115` - metadata-only: populate the `commit` column in Requirements/Threat/Gate Verification
     Status CSVs with `c125fe4`'s already-existing SHA (non-circular, per CLAUDE.md Section 44); refresh
     `Current Phase.md` and rewrite `Audit Register.md` to preserve the full four-attempt history.
   - `c7ace03` - regenerate `package-lock.json` so `npm ci` is reproducible against the new
     `packages/protocol-sdk` workspace (caught by running `npm ci` in the isolated verification
     worktree before freezing the target - see `verification-results.txt`).

Per the reviewer's standing instruction, nothing accepted as closed in the second or third review
(A0-001, A0-004, A0-007, most of A0-008/A0-009, A0-R1..A0-R6) was touched again in this pass unless a
later finding required it.

## What did NOT change

- The six locked governance documents under `docs/governance/`, `CLAUDE.md`, and
  `Repository Build Master Plan.md` (`git diff main -- docs/governance/ CLAUDE.md
  "Repository Build Master Plan.md"` = 0 lines, re-verified at the audit target commit).
- `toolchain/versions.lock`, `toolchain/runner.lock`, `toolchain/network.lock.json` (byte-identical to
  the G0-externally-accepted baseline; `git diff main -- toolchain/` = 0 lines).
- The underlying G0 evidence under `release-evidence/r1/g0/` (untouched by this remediation).
- No AssuranceKernel, Policy, Judge, Vault, ReferenceAgentProtocol, Sentinel or frontend product
  feature implementation was begun. `contracts/` remains empty of deployable candidates.

## What independent reviews this packet contains

- `frontend-contract-review.md` - independent cross-check of F1-v4 (A0-T1, A0-T2, A0-T3).
- `threat-model-review.md` - independent cross-check of the TM-INF-001 closure (A0-T4).
- `compatibility-findings.md` - confirmation that G0 locks are unchanged.
- `commands-and-results.md` + `verification-results.txt` - the exact commands run and their output,
  captured in an isolated `git worktree` at the audit target commit.
- `known-limitations.md` - an honest list of what remains unverified or out of scope.
- `evidence-index.md` - a map of every evidence artifact referenced by this packet.
