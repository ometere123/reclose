# CLI repair preflight — stopped

Repository package lock contains `genlayer-js` 2.0.0-rc.1 but no pinned GenLayer CLI package or executable. The documented global CLI path is absent and `genlayer` is not on PATH.

Local checks:
- SDK: `genlayer-js 2.0.0-rc.1` (from `node_modules/genlayer-js/package.json`).
- Constructor encoding regression: PASS (`scripts/test-kernel-deployment-args.mjs`); serialized args are `[1,60]` with no type markers.
- CLI version: NOT AVAILABLE.
- RPC/network, deployer, balance, and fee preflight: NOT RUN because the pinned CLI executable is unavailable; no network request was made.
- Approved cap remains `0.100000000000010352 GEN`.

No deployment or Operation 3 action occurred. Restore the documented pinned CLI/bundled runtime before any further preflight or deployment.
