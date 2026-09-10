# A0 Packet Scope

## What this packet audits

F0 (Repository Foundation), F1 (Internal Frontend Contract Freeze, now version F1-v3), and S0
(Security Threat Baseline), building on the already-externally-accepted G0 (Toolchain Conformance)
baseline, **as remediated after two prior external A0 review cycles both returned FAIL**.

## Audit target

`fef26f2c754e401008a7a0342b5b1bd4a1c0b8ff` on branch `claude/r1-foundation`. See `commit.txt`.

## Audit history

1. **First submission** (audit target `69204d5`) - FAIL, findings A0-001 through A0-009.
2. **Second submission** (audit target `82b0d7c`, fixing A0-001 through A0-007 + part of A0-008) -
   FAIL again. The reviewer explicitly accepted A0-001, A0-004, A0-007 as closed and most of
   A0-008/A0-009 as correct, and found six remaining defects: A0-R1 through A0-R6.
3. **This (third) submission** (audit target `fef26f2`) fixes A0-R1 through A0-R6, across two commits:
   - `1f78b37` - A0-R1 (threat implementation/test traceability), A0-R2 (TM-INF-001 status
     correction), A0-R3 (DecisionRecord.reporter made required), A0-R5 (CI hardening: `npm ci`,
     Python 3.14.4, single canonical `verify` command), A0-R6 (executable transaction-truth semantic
     tests + schema-level enforcement).
   - `fef26f2` - A0-R4 (Gate Verification Status.csv refreshed to point at the commits that actually
     contain each fix).

Per the reviewer's standing instruction, nothing accepted as closed in the second review (A0-001,
A0-004, A0-007, most of A0-008/A0-009) was touched again in this pass unless a later finding required
it (e.g. fixture/schema counts in Frontend Contract v1.md were already correct and remain so).

## What did NOT change

- The six locked governance documents under `docs/governance/`, `CLAUDE.md`, and
  `Repository Build Master Plan.md` (`git diff main -- docs/governance/ CLAUDE.md
  "Repository Build Master Plan.md"` = 0 lines, re-verified at the audit target commit).
- `toolchain/versions.lock`, `toolchain/runner.lock`, `toolchain/network.lock.json` (byte-identical to
  the G0-externally-accepted baseline; `git diff main -- toolchain/` = 0 lines). CI now uses the exact
  G0-locked Python version (3.14.4) rather than silently substituting 3.12.
- The underlying G0 evidence under `release-evidence/r1/g0/` (untouched by this remediation).

## What independent reviews this packet contains

- `frontend-contract-review.md` - independent cross-check of F1-v3 semantics versus governance,
  including the A0-R3 reporter fix.
- `threat-model-review.md` - independent cross-check of threat traceability completeness (A0-R1) and
  the TM-INF-001 status correction (A0-R2).
- `compatibility-findings.md` - confirmation that G0 locks are unchanged and CI's Python version now
  matches them exactly.
- `commands-and-results.md` + `verification-results.txt` - the exact commands run and their output,
  captured in an isolated `git worktree` at the audit target commit, including the new
  `truth-model:test` and `verify:py` steps (A0-R5/A0-R6).
- `known-limitations.md` - an honest list of what remains unverified or out of scope.
- `evidence-index.md` - a map of every evidence artifact referenced by this packet.
