# A3 Known Limitations

1. Studio-dev Judge -> Kernel triggered child still fails with `fee no_matching_allocation # internal`; live UI must present it as downstream execution failure. E1 remains blocked.
2. The A3 packet has source-level product evidence but no externally captured browser screenshots/recordings, keyboard walkthrough, contrast report or screen-reader evidence yet.
3. Live discovery of all targets/incidents depends on an optional index adapter. Direct reads by known ID remain protocol-backed and the indexer is not treated as a truth authority.
4. Wallet-backed write submission is intentionally host-injected. Fixture mode cannot write and the frontend/CLI preparation path does not custody private keys.
5. `trackActionTrace` requires a transaction/index resolver for action ID -> parent/child/target/post-state evidence. It now rejects absent required execution truth instead of inventing it.
6. Automated accessibility checks cover structural primitives only. Full keyboard, contrast, responsive and assistive-technology evidence still requires real browser execution.
7. Fee-profile input is bound to the final R1 addresses, but dynamic branch arguments and a fresh final report are still absent. `npm run fee-profile:final-check` must remain red until real live data replaces that gap.
8. Live non-zero-bond, duplicate-delivery and restart/resume proofs remain outstanding against the final deployment, even though corresponding source/automated behaviour is covered.
9. CLI incident/recovery commands now prepare canonical non-custodial SDK report drafts and fee previews. Full wallet-backed CLI submission, Sentinel operation and benchmark execution remain incomplete relative to the broad PRD CLI requirement and must not be described as finished.
10. E1 has an evidence contract/checker but no successful clean-run artifacts. Two independent clean 61997 runs are still mandatory before release closure.
