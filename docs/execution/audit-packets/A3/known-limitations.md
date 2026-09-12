# A3 Known Limitations

1. Studio-dev Judge -> Kernel triggered child still fails with `fee no_matching_allocation # internal`; live UI must present it as downstream execution failure. E1 remains blocked.
2. This branch contains product source but no externally captured browser screenshots/recordings yet.
3. Live discovery of all targets/incidents depends on an optional index adapter. Direct reads by known ID remain protocol-backed.
4. Wallet-backed write adapter is intentionally host-injected. Fixture mode cannot write and the frontend does not custody private keys.
5. `trackActionTrace` requires a transaction/index resolver for action ID -> parent/child/target/post-state evidence. It now rejects absent execution truth instead of inventing it.
6. Automated accessibility checks cover structural primitives. Full keyboard, contrast and screen-reader evidence still requires browser execution.
7. Fee-profile inputs/output are not yet complete against the final deployment.
8. Live non-zero bond, duplicate-delivery and restart/resume proofs remain outstanding.
