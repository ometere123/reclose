# Operation 2 deployment attempt — stopped

Date: 2026-09-14
Network: Studio-dev / chain 61997 (`https://studio-dev.genlayer.com/api`)

The approved Operation 2 deployment was not submitted. The local execution environment has no `genlayer` executable and the previously recorded global CLI path (`C:\Users\USER\AppData\Roaming\npm\node_modules\genlayer\dist\index.js`) is absent in this session. Both the direct CLI invocation and Node invocation failed before any RPC request or signing:

- `genlayer`: command not recognized.
- Node: `Cannot find module ...\\genlayer\\dist\\index.js`.

Therefore there is no transaction hash, receipt, returned Target address, or fee charge. No wiring or Operation 3 action was attempted.

Approved deployment parameters remain unchanged in `docs/execution/operation-2-target-read-only-plan.md`. Resume only after the pinned CLI is restored at the exact path/toolchain, then re-run the approved Target deployment once with the same cap and arguments.
