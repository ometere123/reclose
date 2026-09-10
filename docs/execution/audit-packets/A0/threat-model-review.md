# Threat Model Review (A0, third remediation pass)

Independent cross-check of `docs/security/Threat Status.csv` and `docs/security/Security Findings.md`
addressing finding A0-T4 (A0-R1/A0-R2 and earlier findings were accepted as closed in prior reviews and
are not re-litigated here - see the archived review content in git history at `fef26f2` for that detail).

## A0-T4: TM-INF-001 / NFR-CMP-001 - runtime guard now genuinely implemented

At the third submission, `TM-INF-001` was `MITIGATED / VERIFIED`, but `NFR-CMP-001` in
`Requirements Status.csv` was ALSO marked `VERIFIED` despite no runtime wrong-network guard existing
anywhere in the repository - it was VERIFIED only because G0's live verification happened to run
against chain ID 61997, not because any code would actually reject a different chain. The reviewer
correctly identified this as an overclaim: `NFR-CMP-001` requires "network preflight fails if chain ID
!= 61997", which is a claim about behavior, not a claim about what happened to be true during one G0
run.

**Fix:** `packages/protocol-sdk/src/networkGuard.ts` implements `assertCanonicalChainId` (throws
`WrongNetworkError` unless `chainId === 61997`) and `isCanonicalChainId` (non-throwing boolean form).
`RECLOSE_CANONICAL_CHAIN_ID` is hardcoded to `61997` and the guard never treats the stable Studionet
`61999` as an acceptable substitute (CLAUDE.md Section 10 rule 2). `scripts/test-network-guard.js`,
wired into `npm run verify`, proves: 61997 is accepted; 61999 is rejected; an arbitrary chain ID (e.g.
`1`) is rejected.

**Threat status impact:** `TM-INF-001`'s required control is "network lock + runtime guard" (two
parts). The network-lock half was already done at G0 (`toolchain/network.lock.json`). The runtime-guard
half now genuinely exists and is tested, so both halves are complete - `TM-INF-001` is correctly
`MITIGATED / VERIFIED` again, this time with the actual control in place rather than a footnoted plan.
`docs/security/Security Findings.md` was updated to match: 3 concrete `MITIGATED / VERIFIED` findings
now (`TM-INF-001`, `TM-INF-003`, `TM-INF-006`), and the F-INF-001 finding entry rewritten to describe
the resolution rather than the gap.

**Requirement status impact:** `NFR-CMP-001` in `Requirements Status.csv` now cites the real
implementation (`packages/protocol-sdk/src/networkGuard.ts`) and test
(`scripts/test-network-guard.js`) refs, replacing the prior reference to G0 preflight evidence alone.

**Residual scope note (correctly still open):** the guard is a foundation-level primitive not yet wired
into any live SDK/frontend network call path, because no such path exists yet (C1+ scope). `TM-UX-002`
separately tracks the UX-surface concern of displaying wrong-network state to a user once a frontend
exists, and correctly remains `OPEN` - this is not the same concern as the guard's own existence and
testedness, which is what `TM-INF-001`/`NFR-CMP-001` require.

Verified programmatically: `TM-INF-001.status === "MITIGATED / VERIFIED"` with `control_refs` no longer
containing "NOT DONE"; `scripts/a0-integrity-check.js` explicitly asserts no `MITIGATED / VERIFIED` row
acknowledges a missing control half - see `commands-and-results.md` items 10, 21.

## Unchanged from prior remediation passes (accepted as closed)

- Column completeness and status-enum compliance (unchanged since A0-002/A0-R1).
- 72/72 CRITICAL/HIGH threats have non-empty `implementation_refs`/`test_refs` (A0-R1, unchanged).
- Severity totals (CRITICAL=25, HIGH=47, MEDIUM=10, matching the locked catalogue exactly).
- 0 CRITICAL threats marked `ACCEPTED RESIDUAL RISK`.
- Reverse `threat_ref` mapping in `Requirements Status.csv` (A0-R1, unchanged).
