# Commands and Results (A0 Attempt 6)

| # | Command | Result |
|---|---|---|
| 1 | `npm run typecheck` (includes `__typetests__/sdk-parity.ts`) | PASS |
| 2 | `npm run build` | PASS |
| 3 | `npm run f1-parity:test` | 17/17 PASS |
| 4 | `npm run action-envelope:test` | 24/24 PASS |
| 5 | `npm run schema:validate` | 43/43 fixtures valid |
| 6 | `npm run a0-integrity` | PASS (governance/toolchain byte-identical to G0 baseline) |
| 7 | Full `npm run verify` on GitHub Actions | commit `4fc2599`: [run 34534943290](https://github.com/ometere123/reclose/actions/runs/34534943290) SUCCESS |
| 8 | `git diff main -- docs/governance/ CLAUDE.md "Repository Build Master Plan.md"` | 0 lines |
