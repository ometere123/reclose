# A0 - External Foundation Audit Packet (resubmission)

**Status: AWAITING EXTERNAL REVIEW.** This packet was prepared by Claude Code. It does not contain a
PASS decision - only the repository owner (or an independent reviewer they designate) may render the
A0 decision, per CLAUDE.md Sections 41-42.

**This is a resubmission.** The first A0 submission (audit target `69204d5bb3db0f9b6381f1ebeb7fc304f20a7433`)
was reviewed and returned **FAIL**, citing nine findings (A0-001 through A0-009). This packet audits a
new, later, already-existing commit that fixes findings A0-001 through A0-007 (plus part of A0-008) as
genuine implementation content, and rebuilds the packet itself to the Master Plan's required format
(A0-009). See `scope.md` for the full delta.

## What A0 is auditing

F0 (Repository Foundation), F1 (Internal Frontend Contract Freeze, now version F1-v2), and S0
(Security Threat Baseline), building on the already-externally-accepted G0 (Toolchain Conformance)
baseline.

## Exact commit submitted for review

**Audit target commit (repository state under review):**

```text
82b0d7ce50ad3db62aaa34b677bd6d8927dd7b25
```

on branch `claude/r1-foundation`. See `COMMIT.txt` for the full verification summary and for why the
audit **packet's own** commit is deliberately not recorded in any file it contains (hash-quine
avoidance - the same defect class that caused the first submission's Frontend Contract circularity
bug).

## Packet contents (Master Plan minimum set, plus useful extras)

```text
docs/execution/audit-packets/A0/
├── README.md                          (this file)
├── scope.md                           (what changed since the FAILED first submission)
├── COMMIT.txt                         (audit target commit; audit packet commit deliberately NOT self-recorded)
├── files-changed.txt                  (full file-level diff since the first submission's audit target)
├── requirements.csv                   (156 locked RTM IDs, snapshot AT THE AUDIT TARGET COMMIT)
├── commands-and-results.md            (every verification command run, and its result, in table form)
├── compatibility-findings.md          (G0 lock preservation + the one real compatibility event, CF-010)
├── frontend-contract-review.md        (independent review of F1-v2 vs governance: A0-003/004/005/008)
├── threat-model-review.md             (independent review of threat traceability: A0-002)
├── threat-status.csv                  (82 locked TM-* IDs, snapshot AT THE AUDIT TARGET COMMIT)
├── known-limitations.md               (honest list of what remains unverified or out of scope)
├── evidence-index.md                  (map of every evidence artifact this packet relies on)
│
│   -- retained from the first submission's packet format, for continuity --
├── content-hashes.txt                 (SHA-256 + git blob hash of 12 key files, computed independently of any commit hash)
├── requirements-status-snapshot.csv   (identical content to requirements.csv)
├── threat-status-snapshot.csv         (identical content to threat-status.csv)
├── verification-results.txt           (full raw command output, captured in an isolated worktree)
└── file-manifest.txt                  (full tracked-file listing AT THE AUDIT TARGET COMMIT, for tamper-evidence)
```

All snapshot/manifest files above were generated via `git show 82b0d7c:<path>` or `git ls-tree -r
82b0d7c` (or, for `verification-results.txt`, an isolated `git worktree` checked out at that commit) -
never from the working directory at packet-authoring time - so they are guaranteed to reflect the
audit target commit exactly, not whatever the repository looked like a moment later.

## How to verify each required item

1. **Accepted G0 baseline remains intact.** `docs/execution/Studio-dev Toolchain & Network Compatibility
   Record.md` header still reads "G0 VERIFIED EXECUTION BASELINE"; `toolchain/` is byte-identical to the
   G0-accepted values (`compatibility-findings.md`).
2. **Repository foundation is reproducible and clean.** `npm install && npm run verify` passes;
   `npm audit` reports 0 vulnerabilities; secret scan clean (`commands-and-results.md` items 1-6).
3. **RTM execution ledger is complete.** `requirements.csv` contains exactly the 156 locked RTM IDs, no
   missing/duplicate/extra IDs, using only the allowed status enum (`commands-and-results.md` item 8, 11).
4. **Threat traceability is complete.** `threat-status.csv` contains exactly the 82 locked TM-* IDs;
   every CRITICAL/HIGH threat has a `requirement_refs` mapping; severity totals are CRITICAL=25/
   HIGH=47/MEDIUM=10; 0 CRITICAL threats are `ACCEPTED RESIDUAL RISK` (`threat-model-review.md`,
   `commands-and-results.md` items 9-12).
5. **F1-v2 interfaces faithfully represent Reclose semantics**, including the A0-003/004/005 fixes
   (`frontend-contract-review.md`).
6. **Fixtures validate and do not invent protocol truth.** `npm run schema:validate` reports 40/40
   fixtures valid across 19 schema files; no fixture reuses a real G0 transaction hash
   (`frontend-contract-review.md`, `verification-results.txt`).
7. **Contract-discovery boundary actually enforces what it documents.** `scripts/
   test-list-deployable-contracts.js` proves 8 positive/negative cases, run as part of `npm run verify`.
8. **CI does not swallow real failures.** `.github/workflows/ci.yml` and `Makefile` no longer contain
   `|| true` around genvm-lint/pytest; `scripts/py-verify.sh` reports explicit SKIPPED instead.
9. **No governance document was silently modified.** `git diff main -- docs/governance/ CLAUDE.md
   "Repository Build Master Plan.md"` = 0 lines (`commands-and-results.md` item 7).
10. **No architecture deviation is hidden.** `docs/execution/Architecture Deviations.md` remains empty
    (`compatibility-findings.md`).
11. **No secrets exist in tracked repository content.** `commands-and-results.md` items 5-6.
12. **Frontend Contract freeze identification is non-circular.** F1-v2 identifies itself by a stable
    human version label and freeze date, never by a commit hash claimed inside itself
    (`frontend-contract-review.md`).
