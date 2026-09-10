# Open Blockers

## OB-001 - No funded Studio-dev credential for deploy/fee verification [RESOLVED 2026-09-10]

**Opened:** 2026-09-10
**Resolved:** 2026-09-10 (same G0 phase, funded follow-up session)
**Phase:** G0
**Resolution:** repository owner funded a newly created, Reclose-dedicated Studio-dev account
(`reclose-deployer`, `0x24fAe7cD031Ed702Be63BDeA8912141805B996bd`) with 100 GEN. Successful fee-funded deploys and
writes were completed (both a floating-tag version and, after CF-010's resolution, the exact pinned-hash version),
using the SDK-derived fee path (`--fee-profile` -> `genlayer-js` `estimateTransactionFees()`), with lifecycle,
execution result, and post-state all independently verified. See CF-011/CF-012 and
`release-evidence/r1/g0/smoke-test-report.txt` Session 2.
The original unfunded revert (`FeesDistributionMissing`, tx
`0x90140b97d71bd1904ad263085399c6b494fae259680a22f4f054dd59a33b9d2a`) remains preserved as historical evidence
(CF-009), not deleted.
**Note:** the pre-existing, unrelated-project CLI accounts found on this machine (`praest-deployer`, `deployer`,
etc.) were deliberately never used for Reclose.

## OB-002 - GenLayer Test Direct Mode not yet exercised for G0-TEST-01 [RESOLVED 2026-09-10]

**Opened:** 2026-09-10
**Resolved:** 2026-09-10 (external-review closure session)
**Phase:** G0
**Original framing (incorrect):** this item was originally opened as "no local Docker `localnet` simulator
available," and `G0-TEST-01` was marked `PARTIAL / EXTERNAL BLOCKER` on that basis.
**Correction:** external review identified that Docker/`localnet` is a *Studio Mode* requirement per GenLayer's
own testing-suite documentation, not a *Direct Mode* requirement. `genlayer-test==0.30.0rc2` ships a fully
in-memory, Python-only Direct Mode (`gltest.direct`, fixtures `direct_vm`/`direct_deploy`) that needs no Docker,
simulator, or network. This session had simply never tried Direct Mode - it only exercised `gltest`'s
network-mode CLI runner, which does need a network target.
**Resolution:** ran `pytest` against the exact pinned smoke contract using the `direct_deploy` fixture. Result:
**PASSED** - in-memory deploy, `get_counter()==0`, `increment()`, post-state `get_counter()==1`, no Docker/
simulator/network involved. See `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` CF-013
and `release-evidence/r1/g0/direct-mode-report.md`. (A genuine, disclosed Windows-native bug in Direct Mode's
temp-file handling was hit and worked around by running under WSL/Linux, not by patching Reclose or GenLayer code
- see CF-013.)
**Owner:** Claude Code (closed in-session).

## OB-004 - Runner-hash discrepancy (CF-010) between S10 registry snapshot and Studio-dev's live runner family [RESOLVED 2026-09-10]

**Opened:** 2026-09-10 (as part of the original CF-010 finding)
**Resolved:** 2026-09-10 (external-review closure session)
**Phase:** G0
**Resolution:** investigated and closed. The exact accepted `py-genlayer` runner hash for the Reclose R1 pinned
Studio-dev/v0.6 RC baseline is `5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` (with stdlib hash
`kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0`), not the previously-recorded S10 "current" snapshot hash,
which was proven unresolvable in the actual `genvm-manager` v0.6.0-rc3/rc4 release family that Studio `v0.123.0-rc.6`
ships. `toolchain/runner.lock` was corrected; the smoke contract's dependency header was changed from the floating
`:test` tag to this exact hash; the pinned contract was re-linted, re-validated, re-schema-checked, run through
Direct Mode, and redeployed live to Studio-dev 61997 with a full read/write/post-state cycle. See
`docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` CF-010 for the full investigation and
rationale, and `release-evidence/r1/g0/deploy-success-pinned/` for the evidence.
**Owner:** Claude Code (closed in-session).

## OB-003 - No git repository initialized [RESOLVED 2026-09-10]

**Opened:** 2026-09-10
**Resolved:** 2026-09-10 (F0)
**Phase:** G0 (identified during G0; resolved at F0 as planned)
**Resolution:** `git init` performed; initial commit `fe86a2f7ae8f113956cc4815410b79dd26df3f2d` on `main` contains
the R0 seed, the full G0 evidence pack, and F0/F1 scaffolding. Branch `claude/r1-foundation` created from that
commit for the audited F0-A0 tranche.
**Owner:** Claude Code.
