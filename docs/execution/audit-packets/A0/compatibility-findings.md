# Compatibility Findings (A0)

## G0 lock preservation

`toolchain/versions.lock`, `toolchain/runner.lock`, `toolchain/network.lock.json` remain byte-identical
to the externally-accepted G0 baseline at every point across F0/F1/S0/A0-remediation:
`git diff main -- toolchain/` at the audit target commit produces 0 lines.

## CI Python-version alignment (A0-R5)

`toolchain/versions.lock` pins `python: 3.14.4` as the G0-verified baseline. `.github/workflows/ci.yml`
previously pinned Python `3.12` in CI without any documented rationale for the mismatch - an implicit,
undocumented compatibility-matrix decision the external reviewer correctly rejected. CI now pins
`python-version: "3.14.4"`, matching the G0 baseline exactly. No compatibility investigation was
required because this is not a new version choice - it is CI catching up to the version G0 already
verified and locked.

## The one real compatibility-sensitive event since G0 acceptance: CF-010

CF-010 (the runner-hash discrepancy between the SDK registry snapshot and Studio-dev's actual
`genvm-manager` v0.6.0-rc3/rc4 release family) was investigated and resolved **during G0**, before
external acceptance, and is unchanged by this remediation. See
`docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` (CF-010 entry).

## CI Node/npm exact-version pinning (this submission)

The G0-accepted baseline is Node `24.16.0`, npm `11.13.0`. CI previously pinned a floating major version
(`node-version: "24"`), which could silently drift to a later Node 24.x than the one G0 actually
verified. CI now pins `node-version: "24.16.0"` exactly and installs `npm@11.13.0` explicitly, matching
the G0 baseline byte-for-byte on version identity (not merely "close enough").

## No new C2 architecture contradiction

Nothing in this remediation required an architecture change. `docs/execution/Architecture Deviations.md`
remains empty.
