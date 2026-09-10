# deploy/

Deployment scripts and tooling (CLI wrappers, fee-profile helpers) for reproducibly deploying Reclose contracts to
`studio-dev` / chain `61997`, following the exact SDK-derived fee path proven at G0 (see
`docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` CF-011).

Every deployment MUST produce a manifest conforming to `deployment/manifest.schema.json` and a corresponding
entry under `release-evidence/r1/deployment/`.

No product deployment scripts exist yet as of F0 - this is C1+ scope. The G0 toolchain-verification deploys are
recorded only under `release-evidence/r1/g0/`.
