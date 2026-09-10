# A0 - External Foundation Audit Packet (fourth submission)

**Status: AWAITING EXTERNAL REVIEW.** This packet was prepared by Claude Code. It does not contain a
PASS decision - only the repository owner (or an independent reviewer they designate) may render the
A0 decision, per CLAUDE.md Sections 41-42.

**This is the FOURTH submission.** Three prior submissions were reviewed and returned **FAIL**:

1. Audit target `69204d5` - FAIL, findings A0-001 through A0-009.
2. Audit target `82b0d7c` (fixed A0-001..A0-007 + part of A0-008) - FAIL again, findings A0-R1 through
   A0-R6 (A0-001, A0-004, A0-007, and most of A0-008/A0-009 were explicitly accepted as closed).
3. Audit target `fef26f2` (fixed A0-R1..A0-R6) - FAIL again, findings A0-T1 through A0-T5.

This packet's audit target fixes A0-T1 through A0-T5. See `scope.md` for the full history and delta.

## What A0 is auditing

F0 (Repository Foundation), F1 (Internal Frontend Contract Freeze, now version F1-v4), and S0
(Security Threat Baseline), building on the already-externally-accepted G0 (Toolchain Conformance)
baseline.

## Exact commit submitted for review

**Audit target commit (repository state under review):**

```text
c7ace037f63029dccff708cde1ac52372c3f642d
```

on branch `claude/r1-foundation`. See `commit.txt` for the full verification summary, the complete
four-submission commit history, and for why the audit **packet's own** commit is deliberately not
recorded in any file it contains (hash-quine avoidance).

## Packet contents (Master Plan minimum set, plus useful extras)

```text
docs/execution/audit-packets/A0/
├── README.md                          (this file)
├── scope.md                           (full audit history + what changed in this submission)
├── commit.txt                         (audit target commit; audit packet commit deliberately NOT self-recorded)
├── files-changed.txt                  (file-level diff since the third (FAILED) submission's audit target)
├── requirements.csv                   (156 locked RTM IDs, snapshot AT THE AUDIT TARGET COMMIT)
├── commands-and-results.md            (every verification command run, and its result, in table form)
├── compatibility-findings.md          (G0 lock preservation, unchanged this submission)
├── frontend-contract-review.md        (independent review of F1-v4: A0-T1, A0-T2, A0-T3)
├── threat-model-review.md             (independent review of TM-INF-001 closure: A0-T4)
├── threat-status.csv                  (82 locked TM-* IDs, snapshot AT THE AUDIT TARGET COMMIT)
├── known-limitations.md               (honest list of what remains unverified or out of scope)
├── evidence-index.md                  (map of every evidence artifact this packet relies on)
│
│   -- retained/extended from prior submissions, for continuity --
├── content-hashes.txt                 (SHA-256 + git blob hash of key files, computed independently of any commit hash)
├── requirements-status-snapshot.csv   (identical content to requirements.csv)
├── threat-status-snapshot.csv         (identical content to threat-status.csv)
├── gate-verification-status-snapshot.csv (Gate Verification Status.csv snapshot at the audit target)
├── verification-results.txt           (full raw command output, captured in an isolated worktree)
└── file-manifest.txt                  (full tracked-file listing AT THE AUDIT TARGET COMMIT, for tamper-evidence)
```

All snapshot/manifest files above were generated via `git show c7ace03:<path>` or `git ls-tree -r
c7ace03` (or, for `verification-results.txt`, an isolated `git worktree` checked out at that commit) -
never from the working directory at packet-authoring time.

## How to verify each required item

1. **Accepted G0 baseline remains intact.** `toolchain/` byte-identical to the G0-accepted values.
2. **Repository foundation is reproducible and clean.** `npm ci && npm run verify` passes in an
   isolated worktree at the audit target; `npm audit` reports 0 vulnerabilities; secret scan clean.
3. **A real compiled shared TypeScript package exists (A0-T1).** `packages/protocol-sdk/` compiles
   with pinned `typescript@5.9.3`; `npm run typecheck` runs real `tsc --noEmit`, including
   `@ts-expect-error` negative type fixtures for the NONE-prohibition rule.
4. **`ActionEnvelope`/`ExecutionReceipt` are rebuilt to the full canonical MDP shape (A0-T2).** No
   reduced/incomplete projection remains; `boundedParameters` is a typed object, never an arbitrary
   scalar payload.
5. **`DecisionRecord.outcome`/`.decisionStage` prohibit `NONE` (A0-T3).** Enforced at both the JSON
   Schema level (`scripts/test-decision-record-negative.js`, 6/6 pass) and the TypeScript level
   (compile-time `@ts-expect-error` fixtures).
6. **`NFR-CMP-001` is genuinely, not just coincidentally, verified (A0-T4).**
   `packages/protocol-sdk/src/networkGuard.ts` rejects any chain ID other than 61997, including the
   stable Studionet 61999; `scripts/test-network-guard.js` (4/4) proves it. `TM-INF-001`'s previously
   missing runtime-guard control half now exists, so it is correctly `MITIGATED / VERIFIED` again -
   this time with the control actually in place, not merely footnoted as planned.
7. **RTM execution ledger is complete.** `requirements.csv` contains exactly the 156 locked RTM IDs.
8. **Threat traceability is complete.** `threat-status.csv` contains exactly the 82 locked TM-* IDs;
   all 72 CRITICAL/HIGH threats have non-empty `implementation_refs`/`test_refs`.
9. **Fixtures validate and do not invent protocol truth.** 40/40 fixtures valid across 19 schema files.
10. **Contract-discovery boundary actually enforces what it documents.** 8/8 automated cases pass.
11. **Executable transaction-truth semantic tests exist and pass.** 7/7, plus schema-level
    `allOf`/`if`/`then` enforcement of `derived.isFinal` vs `rawStatus`, and now also
    `finalStatus` vs `executionResult` on `ExecutionReceipt`.
12. **CI pins the exact G0-accepted Node/npm/Python versions (A0-T5 support).**
    Node `24.16.0`, npm `11.13.0` (installed explicitly), Python `3.14.4`; uses `npm ci`.
13. **A new automated audit-integrity gate exists and is wired into `npm run verify` (A0-T5).**
    `scripts/a0-integrity-check.js` mechanically derives the locked RTM/TM ID sets from governance
    sources and fails the build on any drift - 12/12 checks pass.
14. **Gate Verification Status.csv reflects current truth.**
15. **No governance document was silently modified.** `git diff main -- docs/governance/ CLAUDE.md
    "Repository Build Master Plan.md"` = 0 lines.
16. **No architecture deviation is hidden.** `docs/execution/Architecture Deviations.md` remains empty.
17. **No secrets exist in tracked repository content.**
18. **The full three-prior-FAIL audit history is preserved, not erased.** See
    `docs/execution/Audit Register.md`.
