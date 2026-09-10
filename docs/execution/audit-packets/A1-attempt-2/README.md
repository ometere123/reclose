# A1 Attempt 2 - External Core Architecture / Security Audit Packet

**Audit target commit:** `55ee2cbccb1be0404b7e4bfb9f265e868d5b93dc` (branch `claude/r1-core-hardening`)

**Status: AWAITING EXTERNAL REVIEW.** This packet does not itself constitute a PASS. Per
CLAUDE.md Section 41/42, only the repository owner (or a reviewer they designate) may supply an
external A1 decision; this document records what was done and what remains open so that review
can happen efficiently.

## Why this attempt exists

A1 attempt 1 (commit `82421aab595acfda4351c54f6542a071633152ad`) was rejected by the repository
owner's external review, which supplied twelve numbered findings (A1-H01..A1-H12) - see
`docs/execution/Audit Register.md` for the full record. The owner also supplied three findings
against the A0 foundation (A0-U01..A0-U03), which this same pass closes (see
`docs/execution/audit-packets/A0-attempt-6/`).

This packet ("C1R Core Hardening and Proof Closure") implements the owner's exact remediation
instruction: a full Kernel data-model/security rewrite, a new authority-expansion classifier, a
narrowed genvm-lint waiver, an independent reference model with model-vs-contract trace tests,
and a fresh live Studio-dev deployment.

## Contents

| File | Contents |
|---|---|
| `README.md` | This file |
| `audit-target-commit.txt` | The exact commit reviewed |
| `scope.md` | What changed since A1 attempt 1, and what did NOT change |
| `findings-closure.md` | Finding-by-finding closure table for A1-H01..A1-H12 |
| `commands-and-results.md` | Every verification command and its result, including CI links |
| `deployment-evidence.md` | Summary + pointer to the full live deployment narrative |
| `security-invariant-matrix.md` | CLAUDE.md Section 7/32 invariants mapped to enforcement points |
| `model-test-evidence.md` | Independent reference model + model-vs-contract trace test summary |
| `requirements.csv` | Snapshot of `docs/execution/Requirements Status.csv` at the audit target commit |
| `threat-status.csv` | Snapshot of `docs/security/Threat Status.csv` at the audit target commit |
| `known-limitations.md` | Honest list of what remains unverified or out of scope |
| `evidence-index.md` | Pointer index to repository evidence outside this packet |
| `file-manifest.txt` | Full tracked-file listing at the audit target commit |

## What this attempt does NOT claim

- It does not claim A0 has passed (A0 remains `AWAITING EXTERNAL REVIEW`, this pass adds
  attempt 6 - see `docs/execution/audit-packets/A0-attempt-6/`).
- It does not claim the live `receive_decision` -> Kernel -> Target cross-contract dispatch
  succeeded. It reached a materially better, precisely characterized state
  (`InsufficientFees`, a structurally-valid allocation tree) than the prior attempt's opaque
  `AllocationTreeMalformed`, but not a successful dispatch. See `known-limitations.md` item 1 and
  `release-evidence/r1/c1r/deploy-log.md`.
- It does not claim C2 has started. It has not.
