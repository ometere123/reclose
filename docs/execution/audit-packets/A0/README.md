# A0 - External Foundation Audit Packet

**Status: AWAITING EXTERNAL REVIEW.** This packet was prepared by Claude Code. It does not contain a PASS
decision - only the repository owner (or an independent reviewer they designate) may render the A0 decision, per
CLAUDE.md Sections 41-42.

## What A0 is auditing

F0 (Repository Foundation), F1 (Internal Frontend Contract Freeze), and S0 (Security Threat Baseline), building on
the already-externally-accepted G0 (Toolchain Conformance) baseline.

## Exact commit submitted for review

**Audit target commit (repository state under review):**

```text
69204d5bb3db0f9b6381f1ebeb7fc304f20a7433
```

on branch `claude/r1-foundation`. This is the exact, already-existing commit that contains the complete F0 + F1 +
S0 implementation state and passes all required verification (see `COMMIT.txt` for the verification summary).

**Audit packet commit** (this README, `COMMIT.txt`, and the snapshot files below) is a **separate, later** commit
that adds only files under `docs/execution/audit-packets/A0/` on top of the audit target commit. It is not
self-referenced anywhere in this packet - see `COMMIT.txt` for why, and for how to find its hash with
`git log`. **The audit packet commit changes nothing under review**; diff it against the audit target commit to
confirm this (`git diff 69204d5 -- ':!docs/execution/audit-packets/A0'` should be empty once the packet commit
is the only thing added on top).

## How to verify each required item

### 1. Accepted G0 baseline remains intact

- `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` - header still reads
  "G0 VERIFIED EXECUTION BASELINE"; all CF-001 through CF-013 findings present and unmodified from the
  externally-accepted version.
- `release-evidence/r1/g0/` - all files from both G0 sessions (including the historical reverted and floating-tag
  transactions) are present and unmodified; diff this directory against the version reviewed at G0 acceptance to
  confirm no evidence was altered.
- `toolchain/{versions.lock,runner.lock,network.lock.json}` - unchanged from the accepted G0 values.

### 2. Repository foundation is reproducible and clean

- `package.json` + `package-lock.json` (npm workspace root); `requirements.txt` (Python, pinned).
- Run `npm install && npm run verify` - should complete with `npm run schema:validate` reporting 36/36 fixtures
  valid and `node scripts/list-deployable-contracts.js` reporting 0 violations.
- `.gitignore` excludes all secret-shaped files; `.env.example` contains placeholders only.
- Repository-wide secret scan performed and documented in `docs/execution/Phase Log.md` (F0 entry) - independently
  re-run: `grep -rlniE "BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|-----BEGIN" .` (excluding `.git/`) should return nothing
  outside of documentation prose mentioning the concept.

### 3. Exact toolchain/runner/network locks are preserved

Diff `toolchain/` against the state at G0 acceptance - should be byte-identical (F0 did not modify these files).

### 4. Contract discovery is safe

- `contracts/README.md` documents the discovery boundary.
- `scripts/list-deployable-contracts.js` enforces it; run `node scripts/list-deployable-contracts.js` - reports
  0 deployable-contract candidates (no product contracts exist yet) and 0 boundary violations.

### 5. F1 interfaces faithfully represent Reclose semantics

- `docs/execution/Frontend Contract v1.md` - cross-reference each type against its cited governance source
  (Implementation Specification Sections 9-14 and 68 for enums/records; CLAUDE.md Sections 6/9/13/15/17/21-34/39
  for behavioral rules).
- Specifically verify: `AssuranceState` enum (NORMAL/MONITORED/RESTRICTED/SAFE_MODE/PAUSED/RECOVERY) matches
  Implementation Specification Section 10 exactly; `DecisionOutcome` (NONE/CONFIRMED/REJECTED/UNDETERMINED) and
  `DecisionStage` (NONE/PROVISIONAL/FINAL) match the same section; `GenLayerTransactionLifecycle` and
  `ExecutionResult` enum values match real G0 receipt evidence (`release-evidence/r1/g0/deploy-success-pinned/`).
- Verify the transaction truth model (Frontend Contract v1.md Section 3) keeps six concepts distinct and never
  collapses them into one `status` field.

### 6. Fixtures validate and do not invent protocol truth

- `tests/frontend-fixtures/manifest.json` + 36 fixture files.
- Run `npm run schema:validate` - should report `36/36 fixtures valid`.
- Manually inspect a sample (e.g. `decision-final-confirmed.json`, `tx-lifecycle-wrong-network.json`) to confirm
  they are clearly synthetic (fake addresses/incident IDs) and do not claim to be live protocol reads.

### 7. Threat baseline covers the governed attack surface

- `docs/security/Threat Status.csv` - 82 rows, one per `TM-*` ID in
  `docs/security/Threat Model & Security Assurance Plan.md` Section 11. Cross-check row count and ID coverage:
  `TM-AUTH-001..012`, `TM-EVID-001..014`, `TM-LIFE-001..012`, `TM-REC-001..008`, `TM-ECON-001..008`,
  `TM-INF-001..012`, `TM-UX-001..010`, `TM-REL-001..006`.
- `docs/security/Security Findings.md` - verify the 4 `MITIGATED / VERIFIED` rows each cite specific, checkable
  evidence files, and that no CRITICAL-severity threat is marked as accepted residual risk.

### 8. RTM status is accurate

- `docs/execution/Requirements Status.csv` - G0-* rows (28) all VERIFIED with evidence refs; F0-* rows (12) all
  VERIFIED; F1-* rows (5) VERIFIED except `F1-SDK-01` which is correctly `IMPLEMENTED / UNVERIFIED` (signatures
  only, no implementation).
- No row claims `VERIFIED` without a `test_ref`/`evidence_ref` pointing at something checkable.

### 9. No governance document was silently modified

Run `git diff main 69204d5 -- docs/governance/ CLAUDE.md "Repository Build Master Plan.md"` (already independently
verified empty as of this packet's preparation) (or diff
against your own retained copy of the six governance files) - should show **no changes** to any file under
`docs/governance/`.

### 10. No architecture deviation is hidden

`docs/execution/Architecture Deviations.md` - currently empty (no C2 finding occurred). Cross-check against
`docs/security/Security Findings.md`'s "Architecture contradictions identified: None" statement and
`docs/execution/Studio-dev Toolchain & Network Compatibility Record.md`'s compatibility findings (all C0/C1,
none C2).

### 11. No secrets exist in tracked repository content

See item 2 above. Additionally: `docs/execution/Open Blockers.md` OB-001 explains that a keystore password was
generated and shared with the repository owner out-of-band during G0 (not written to any repository file) - this
was confirmed via an explicit secret scan at that time and again at F0.

## 12. Frontend Contract v1 freeze is non-circular

`docs/execution/Frontend Contract v1.md` and `docs/execution/Interface Change Log.md` were found, during this
packet's preparation, to contain an inaccurate self-referential freeze claim (they claimed to be "frozen at" the
commit that only introduced them with placeholder text - the real content was added in a later commit). This was
treated as an actual issue, not a cosmetic one: fixed in implementation commit
`69204d5bb3db0f9b6381f1ebeb7fc304f20a7433` itself (i.e. the audit target commit already contains the fix - it is
not a separate later patch). Both files now state, non-circularly:

- which commit *introduced* them (with placeholder text);
- which commit their *actual frozen content* first appears in;
- that the content is verified unchanged through the audit target commit via `git diff` between two
  already-existing commits (never a claim about the file's own containing commit's hash).

Independently verify: `git diff 23fb711 69204d5 -- "docs/execution/Frontend Contract v1.md"` should be empty
(content unchanged since the fix), and the content hash below matches.

## Packet contents

```text
docs/execution/audit-packets/A0/
├── README.md                          (this file)
├── COMMIT.txt                         (audit target commit hash; audit packet commit deliberately NOT self-recorded)
├── content-hashes.txt                 (SHA-256 + git blob hash of key frozen files, computed independently of any commit hash)
├── requirements-status-snapshot.csv   (copy of Requirements Status.csv AT THE AUDIT TARGET COMMIT)
├── threat-status-snapshot.csv         (copy of Threat Status.csv AT THE AUDIT TARGET COMMIT)
├── verification-results.txt           (npm run verify + secret scan + governance/toolchain diff output, captured against the audit target commit)
└── file-manifest.txt                  (full tracked-file listing AT THE AUDIT TARGET COMMIT, for tamper-evidence)
```

All snapshot files above were generated via `git show 69204d5:<path>` (or an isolated worktree checked out at that
commit) - never from the working directory at packet-authoring time - so they are guaranteed to reflect the audit
target commit exactly, not whatever the repository looked like a moment later.
