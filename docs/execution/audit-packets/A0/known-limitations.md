# Known Limitations (A0)

Honest, non-exhaustive list of what this packet does NOT claim, so the reviewer does not have to infer
it from silence.

1. **No AssuranceKernel, Policy, Judge, Vault, or ReferenceAgentProtocol contract exists.** All 156 RTM
   requirements outside the small G0-derived `NFR-CMP-*` set are `NOT STARTED` in
   `docs/execution/Requirements Status.csv`. This packet audits F0/F1/S0 foundation work only, per the
   Master Plan's phase gate.
2. **No CI run has ever actually executed on a remote GitHub Actions runner.** `.github/workflows/ci.yml`
   is reviewed by inspection and by running the equivalent commands locally
   (`verification-results.txt`); `F0-CI-01` in `docs/execution/Gate Verification Status.csv` is
   correctly `IMPLEMENTED / UNVERIFIED`, not `VERIFIED`.
3. **`TM-INF-001` is only half-mitigated.** The network/chain-identity lock is real and verified; the
   SDK/frontend runtime guard component of the same required control does not exist because no
   SDK/frontend code has been written yet. See `threat-model-review.md`.
4. **`TM-INF-004`/`TM-INF-011`** are `MITIGATED / UNVERIFIED` - a control exists (exact lockfiles;
   documented dev-only scope) but no automated CI gate or product documentation enforces it yet.
5. **77 of 82 threats remain `OPEN`**, and all 25 CRITICAL threats remain `OPEN` - this is expected at
   the F0/F1/S0 stage, since none of C1-C4 has been implemented. Every CRITICAL/HIGH threat has a
   planned control, requirement mapping, and verification path (see `threat-status.csv`), which is
   what S0 requires before C1 - not that the controls are already built.
6. **No live 61997 write beyond the G0 smoke contract exists.** All protocol-level negative/adversarial
   tests referenced in the Threat Model's Section 14 verification programme are C1+ deliverables, not
   yet implemented.
7. **This packet is Claude Code's own self-review, not an external audit decision.** Per CLAUDE.md
   Sections 41-42, only the repository owner (or an independent reviewer they designate) may render a
   PASS/FAIL decision. This packet remains status `AWAITING EXTERNAL REVIEW`.
8. **`GenLayerTransactionLifecycle`'s `derived` display object's exact wording is not frozen** - only
   its existence, optionality, and non-authoritative nature are frozen at F1-v2. Exact UI copy is a
   D-phase product decision.
