# G0 Preflight Summary

| Target | Status |
|---|---|
| G0-NET-01 canonical RPC reachable | PASS |
| G0-NET-02 returned chain identity = 61997 | PASS |
| G0-NET-03 CLI studio-dev preset exists | PASS |
| G0-NET-04 JS studioDevnet resolves correctly | PASS |
| G0-NET-05 Python studio_devnet resolves correctly | PASS |
| G0-TOOL-01 CLI exact version | PASS (0.40.0-rc.3) |
| G0-TOOL-02 genlayer-js exact version | PASS (2.0.0-rc.1) |
| G0-TOOL-03 genlayer-py exact version | PASS (0.19.0rc2) |
| G0-TOOL-04 genlayer-test exact version | PASS (0.30.0rc2) |
| G0-TOOL-05 genvm-linter exact install source/version | PASS (PyPI, 0.11.1rc2) |
| G0-TOOL-06 Python version | PASS (3.14.4) |
| G0-TOOL-07 Node/npm versions | PASS (v24.16.0 / 11.13.0) |
| G0-RUN-01 py-genlayer runner hash | PASS (exact hash `5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`, proven via CF-010 investigation) |
| G0-RUN-02 standard-library dependency hash | PASS (`kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0`) |
| G0-RUN-03 smoke contract validates against runner/SDK surface | PASS (re-run against exact pinned hash) |
| G0-LINT-01 lint succeeds | PASS (re-run against exact pinned hash) |
| G0-LINT-02 semantic validation succeeds | PASS (re-run against exact pinned hash) |
| G0-LINT-03 schema extraction succeeds | PASS (re-run against exact pinned hash) |
| G0-LINT-04 typecheck path established | PASS (2 accepted SDK-stub false positives, CF-007) |
| G0-TEST-01 direct/local smoke test succeeds | PASS (GenLayer Test Direct Mode - in-memory, no Docker/simulator/network - PASSED; see CF-013 for a Windows-host-only caveat worked around via WSL) |
| G0-DEP-01 smoke deploy submitted to 61997 | PASS (pinned-hash deploy tx; both the floating-tag deploy and the original reverted attempt preserved as historical evidence) |
| G0-DEP-02 tx id persisted | PASS |
| G0-DEP-03 lifecycle observed | PASS |
| G0-DEP-04 execution result verified | PASS |
| G0-DEP-05 deployed state/read verified | PASS |
| G0-FEE-01 deploy fee path proven | PASS (SDK-derived, no hand-derived FeesDistribution) |
| G0-FEE-02 representative write fee path proven | PASS |

Overall G0 status (as of the external-review closure session): **G0 VERIFIED EXECUTION BASELINE**. Every G0
verification target PASSES with real, reproducible evidence: canonical network identity, exact toolchain
versions, the exact accepted runner/stdlib hash (proven, not assumed), full lint/validate/schema/typecheck, a
passing GenLayer Test Direct Mode run, and a full live fee-funded deploy+write+read cycle on chain 61997 using
the SDK's own fee-estimation path with no hand-derived `FeesDistribution`.

See `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` Section 23/25/25.1/25.2 and
`docs/execution/Open Blockers.md` for full detail. Both the originally reverted transaction
(`0x90140b97d71bd1904ad263085399c6b494fae259680a22f4f054dd59a33b9d2a`) and the intermediate floating-tag
successful deployment (`0xe1a7f8afb21a543bab63ad6432912f9f8c4329c194320e8270e42380106d4ff5`) remain preserved as
historical evidence - neither was deleted or overwritten.
