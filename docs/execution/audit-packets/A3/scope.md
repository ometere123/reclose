# A3 Scope

Review the product implementation from D1 through D4/I1/I2 against `Repository Build Master Plan.md` Sections 21-27 and the frozen Frontend Contract.

Primary changed areas:

- `frontend/**`
- `packages/protocol-sdk/src/client.ts`
- `packages/protocol-sdk/src/genlayerAdapter.ts`
- `scripts/test-frontend-product.js`
- `scripts/test-sdk-product-truth.js`
- `docs/design/Product UI Specification.md`
- product-related root verification scripts and CI wiring

Security/product invariants in scope:

- no frontend policy/Judge shadow engine;
- no fake chain state;
- fixture mode visibly synthetic and unable to write;
- wrong network rejected by SDK guard;
- ACCEPTED is not final;
- FINALIZED is not execution success by itself;
- CONFIRMED, REJECTED and UNDETERMINED remain distinct;
- provisional and final remain distinct;
- execution child failure remains visible;
- target post-state is required where the execution trace says it is required;
- evidence rendered as untrusted escaped text;
- tx ID persisted before tracking;
- polling error does not trigger resubmission;
- authority expansion obvious before signing;
- human override displayed as separate sovereign action, not as GenLayer consensus.
