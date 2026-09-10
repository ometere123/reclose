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
3. **`TM-INF-001` is `IN PROGRESS`, not mitigated.** The network/chain-identity lock is real and
   verified; the SDK/frontend runtime guard component of the same required control does not exist
   because no SDK/frontend code has been written yet. See `threat-model-review.md`.
4. **`TM-INF-004`/`TM-INF-011`** remain `MITIGATED / UNVERIFIED` - a control exists (exact lockfiles;
   documented dev-only scope) but no automated CI gate or product documentation enforces it yet.
5. **77 of 82 threats remain `OPEN`** (up from OPEN status even for TM-INF-001, now that it moved to
   `IN PROGRESS` rather than the overstated `MITIGATED / VERIFIED`), and all 25 CRITICAL threats remain
   `OPEN`. This is expected at the F0/F1/S0 stage. Every CRITICAL/HIGH threat now has a planned
   control, requirement mapping, implementation location, and verification path (A0-R1) - not that the
   controls are already built.
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
   frozen at F1-v3. Exact UI copy is a D-phase product decision.
