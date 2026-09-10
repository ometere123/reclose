# A0 - External Foundation Audit Packet (third submission)

**Status: AWAITING EXTERNAL REVIEW.** This packet was prepared by Claude Code. It does not contain a
PASS decision - only the repository owner (or an independent reviewer they designate) may render the
A0 decision, per CLAUDE.md Sections 41-42.

**This is the THIRD submission.** Two prior submissions were reviewed and returned **FAIL**:

1. Audit target `69204d5` - FAIL, findings A0-001 through A0-009.
2. Audit target `82b0d7c` (fixed A0-001..A0-007 + part of A0-008) - FAIL again, findings A0-R1 through
   A0-R6 (A0-001, A0-004, A0-007, and most of A0-008/A0-009 were explicitly accepted as closed).

This packet's audit target fixes A0-R1 through A0-R6. See `scope.md` for the full history and delta.

## What A0 is auditing

F0 (Repository Foundation), F1 (Internal Frontend Contract Freeze, now version F1-v3), and S0
(Security Threat Baseline), building on the already-externally-accepted G0 (Toolchain Conformance)
baseline.

## Exact commit submitted for review

**Audit target commit (repository state under review):**

```text
fef26f2c754e401008a7a0342b5b1bd4a1c0b8ff
```

on branch `claude/r1-foundation`. See `commit.txt` for the full verification summary, the complete
three-submission commit history, and for why the audit **packet's own** commit is deliberately not
recorded in any file it contains (hash-quine avoidance).

## Packet contents (Master Plan minimum set, plus useful extras)

```text
docs/execution/audit-packets/A0/
├── README.md                          (this file)
├── scope.md                           (full audit history + what changed in this submission)
├── commit.txt                         (audit target commit; audit packet commit deliberately NOT self-recorded)
├── files-changed.txt                  (file-level diff since the second (FAILED) submission's audit target)
├── requirements.csv                   (156 locked RTM IDs, snapshot AT THE AUDIT TARGET COMMIT)
├── commands-and-results.md            (every verification command run, and its result, in table form)
├── compatibility-findings.md          (G0 lock preservation + CI Python-version alignment, A0-R5)
├── frontend-contract-review.md        (independent review of the F1-v3 reporter fix: A0-R3)
├── threat-model-review.md             (independent review of threat traceability: A0-R1, A0-R2)
├── threat-status.csv                  (82 locked TM-* IDs, snapshot AT THE AUDIT TARGET COMMIT)
├── known-limitations.md               (honest list of what remains unverified or out of scope)
├── evidence-index.md                  (map of every evidence artifact this packet relies on)
│
│   -- retained/extended from prior submissions, for continuity --
├── content-hashes.txt                 (SHA-256 + git blob hash of 14 key files, computed independently of any commit hash)
├── requirements-status-snapshot.csv   (identical content to requirements.csv)
├── threat-status-snapshot.csv         (identical content to threat-status.csv)
├── gate-verification-status-snapshot.csv (Gate Verification Status.csv snapshot, new this submission per A0-R4)
├── verification-results.txt           (full raw command output, captured in an isolated worktree)
└── file-manifest.txt                  (full tracked-file listing AT THE AUDIT TARGET COMMIT, for tamper-evidence)
```

All snapshot/manifest files above were generated via `git show fef26f2:<path>` or `git ls-tree -r
fef26f2` (or, for `verification-results.txt`, an isolated `git worktree` checked out at that commit) -
never from the working directory at packet-authoring time.

## How to verify each required item

1. **Accepted G0 baseline remains intact.** `toolchain/` byte-identical to the G0-accepted values;
   CI's Python version (3.14.4) now matches `toolchain/versions.lock` exactly (`compatibility-findings.md`).
2. **Repository foundation is reproducible and clean.** `npm ci && npm run verify` passes; `npm audit`
   reports 0 vulnerabilities; secret scan clean (`commands-and-results.md` items 1-6).
3. **RTM execution ledger is complete.** `requirements.csv` contains exactly the 156 locked RTM IDs,
   using only the allowed status enum, with `threat_ref` reverse-mapping for security-relevant rows
   (`commands-and-results.md` item 7).
4. **Threat traceability is complete AND every CRITICAL/HIGH threat has implementation/test refs.**
   `threat-status.csv` contains exactly the 82 locked TM-* IDs; all 72 CRITICAL/HIGH threats have
   non-empty `implementation_refs`/`test_refs` (A0-R1); `TM-INF-001` correctly shows `IN PROGRESS`, not
   an overstated `MITIGATED / VERIFIED` (A0-R2) (`threat-model-review.md`, `commands-and-results.md`
   items 8-10).
5. **F1-v3 interfaces faithfully represent Reclose semantics**, including the A0-R3 `reporter` fix
   (`frontend-contract-review.md`, `commands-and-results.md` item 13).
6. **Fixtures validate and do not invent protocol truth.** 40/40 fixtures valid across 19 schema files;
   no fixture reuses a real G0 transaction hash.
7. **Contract-discovery boundary actually enforces what it documents.** 8/8 automated cases pass.
8. **Executable transaction-truth semantic tests exist and pass** (A0-R6): 7/7, plus schema-level
   `allOf`/`if`/`then` enforcement of `derived.isFinal` vs `rawStatus`.
9. **CI does not swallow real failures**, installs via `npm ci`, uses the G0-pinned Python version, and
   its canonical `verify` command includes the Python gate (A0-R5) (`commands-and-results.md` items
   15-18).
10. **Gate Verification Status.csv reflects current truth**, not stale pre-remediation commit
    references (A0-R4) (`commands-and-results.md` item 14).
11. **No governance document was silently modified.** `git diff main -- docs/governance/ CLAUDE.md
    "Repository Build Master Plan.md"` = 0 lines.
12. **No architecture deviation is hidden.** `docs/execution/Architecture Deviations.md` remains empty.
13. **No secrets exist in tracked repository content.**
14. **Frontend Contract freeze identification is non-circular.** F1-v3 identifies itself by a stable
    human version label and freeze date, never by a commit hash claimed inside itself.
