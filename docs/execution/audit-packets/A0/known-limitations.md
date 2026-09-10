# Known Limitations (A0)

Honest, non-exhaustive list of what this packet does NOT claim, so the reviewer does not have to infer
it from silence.

1. **No AssuranceKernel, Policy, Judge, Vault, or ReferenceAgentProtocol contract exists.** All 156 RTM
   requirements outside the small G0-derived `NFR-CMP-*` set are `NOT STARTED` in
   `docs/execution/Requirements Status.csv`. Every `implementation_refs`/`test_refs` entry in
   `Threat Status.csv` for a CRITICAL/HIGH threat is a PLANNED location, not a claim that the file, the
   contract, or the test currently exists - this packet audits F0/F1/S0 foundation work only.
2. **No CI run has ever actually executed on a remote GitHub Actions runner.** `.github/workflows/ci.yml`
   is reviewed by inspection and by running the equivalent commands (`npm ci` + `npm run verify`)
   locally in an isolated worktree (`verification-results.txt`); `F0-CI-01` in
   `docs/execution/Gate Verification Status.csv` is correctly `IMPLEMENTED / UNVERIFIED`, not
   `VERIFIED`, until a real remote run succeeds.
3. **`TM-INF-001` is `MITIGATED / VERIFIED` as of this submission** (was `IN PROGRESS` in the prior
   submission). Both required control halves (network lock + runtime guard) now genuinely exist and are
   tested. The guard itself is a foundation-level primitive - it is not yet wired into any live SDK
   network call path, because no such path exists yet (C1+ scope). See `threat-model-review.md`.
4. **`TM-INF-004`/`TM-INF-011`** remain `MITIGATED / UNVERIFIED` - a control exists (exact lockfiles;
   documented dev-only scope) but no automated CI gate or product documentation enforces it yet.
5. **77 of 82 threats remain `OPEN`**; 24 of 25 CRITICAL threats remain `OPEN` (one, `TM-INF-006`, is
   `MITIGATED / VERIFIED` - a secret-exposure check, not a feature-dependent control). This is expected
   at the F0/F1/S0 stage. Every CRITICAL/HIGH threat now has a planned control, requirement mapping,
   implementation location, and verification path - not that the controls are already built.
6. **The planned `tests/` subdirectory convention** (`tests/kernel/`, `tests/judge/`, `tests/vault/`,
   etc.) cited throughout `Threat Status.csv`'s `test_refs` column is Claude's own reasonable choice,
   consistent with CLAUDE.md Section 36's test categories - the Implementation Specification names
   `contracts/` modules but does not itself enumerate a `tests/` subtree. This convention is not yet a
   governance-locked requirement; C1+ implementation may refine it, with any change tracked through
   normal RTM/threat-ledger updates, not silently.
7. **No live 61997 write beyond the G0 smoke contract exists.** All protocol-level negative/adversarial
   tests referenced in the Threat Model's Section 14 verification programme are C1+ deliverables.
8. **This packet is Claude Code's own self-review, not an external audit decision.** Per CLAUDE.md
   Sections 41-42, only the repository owner (or an independent reviewer they designate) may render a
   PASS/FAIL decision. This packet remains status `AWAITING EXTERNAL REVIEW`.
9. **`GenLayerTransactionLifecycle`'s `derived` display object's exact wording is not frozen** - only
   its existence, optionality, non-authoritative nature, and its `isFinal`/`rawStatus` consistency
   (now enforced both by an executable test and by JSON Schema `allOf`/`if`/`then` conditionals) are
   frozen at F1-v4. Exact UI copy is a D-phase product decision.
10. **`npm run lint` is still a placeholder note, not a real lint ruleset.** `npm run typecheck` (real
    `tsc --noEmit`) is the only automated JS/TS correctness gate that exists at this phase; no ESLint or
    equivalent style/correctness linter is configured yet. This is tracked here rather than silently
    left unmentioned.
11. **`RecloseSDK` in `packages/protocol-sdk/src/sdk.ts` is a type-only interface with zero runtime
    implementation**, by design at this phase (A0-T1 explicitly scoped this to "type/interface
    foundation only... no network calls or C1 business logic"). `F1-SDK-01` in
    `Gate Verification Status.csv` correctly remains `IMPLEMENTED / UNVERIFIED`, not `VERIFIED`.
12. **`scripts/a0-integrity-check.js`'s governance-immutability check is best-effort**: it compares
    against local ref `main` and does not hard-fail the whole gate if that ref/comparison cannot be
    resolved in a given environment (e.g. a shallow clone), only warns. The packet's own
    `commands-and-results.md` item 6 additionally captures a direct `git diff main -- ...` = 0 lines
    result from the isolated verification worktree, which does not depend on that fallback.
