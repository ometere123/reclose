# Compatibility Findings (A0)

## G0 lock preservation

`toolchain/versions.lock`, `toolchain/runner.lock`, `toolchain/network.lock.json` remain byte-identical
to the externally-accepted G0 baseline at every point across F0/F1/S0/A0-remediation:
`git diff main -- toolchain/` at the audit target commit produces 0 lines. No compatibility-sensitive
dependency changed during this remediation pass - it only touched documentation, JSON Schemas,
fixtures, and CI/script logic, none of which are G0-governed toolchain facts.

## The one real compatibility-sensitive event since G0 acceptance: CF-010

CF-010 (the runner-hash discrepancy between the SDK registry snapshot and Studio-dev's actual
`genvm-manager` v0.6.0-rc3/rc4 release family) was investigated and resolved **during G0**, before
external acceptance, and is unchanged by this remediation. See
`docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` (CF-010 entry) for the full
investigation, and `toolchain/runner.lock`'s `selection_rationale` field for why the Studio-dev-proven
hash (not the newer-looking registry hash) was pinned.

## New evidence produced during this remediation (not a toolchain change)

To fix A0-005, the pinned `genlayer-js@2.0.0-rc.1` package's own npm tarball was downloaded
(`npm pack genlayer-js@2.0.0-rc.1`) and its bundled TypeScript type definitions
(`dist/index-BT1ApAqQ.d.ts`) were read directly to extract the real `TransactionStatus`,
`TransactionResult`, and `TransactionDecisionOutcome` enums. This is confirmatory evidence about the
*already-pinned* version (no version was changed), used to correct `schemas/transaction/
GenLayerTransactionLifecycle.schema.json`, which had previously used invented enum values. This does
not reopen G0 - the pinned version (`genlayer-js@2.0.0-rc.1`) is identical to what G0 verified; only
Reclose's own JSON Schema representation of that package's types was wrong and has been corrected.

## No new C2 architecture contradiction

Nothing in this remediation required an architecture change. `docs/execution/Architecture Deviations.md`
remains empty.
