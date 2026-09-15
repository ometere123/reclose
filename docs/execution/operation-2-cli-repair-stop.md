# CLI repair / read-only preflight stop

The repository contains pinned `genlayer-js` 2.0.0-rc.1 and transaction-kit packages, but no GenLayer CLI package or executable. The documented global CLI path is absent, and `npm exec --package genlayer@0.40.0-rc.3` cannot start because the local npm installation is missing `npm-cli.js`.

Checks performed without RPC:

- `genlayer --version`: unavailable (`genlayer` not recognized).
- SDK package present: `genlayer-js` 2.0.0-rc.1 in `node_modules` and lockfile.
- Required RPC remains `https://studio-dev.genlayer.com/api`, chain 61997 (not queried because the CLI preflight could not be initialized).
- Deployer, fee cap, and constructor values remain those in `docs/execution/operation-2-target-read-only-plan.md`; no new quote or balance query was made.

No deployment, RPC call, signing, or Operation 3 action occurred. Restore the pinned CLI/bundled runtime (and npm launcher) before the authorized read-only preflight can run.
