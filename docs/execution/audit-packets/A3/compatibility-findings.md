# A3 compatibility findings

## Canonical compatibility baseline

- Network: Studio-dev
- Chain ID: `61997`
- Node: `24.16.0`
- npm: `11.13.0`
- Python: `3.14.4`
- genlayer-js: `2.0.0-rc.1`
- genlayer-py: `0.19.0rc2`
- genlayer-test: `0.30.0rc2`
- genvm-linter: `0.11.1rc2`

A3 product code does not substitute stable Studionet `61999`.

## Findings

### COMP-A3-01 - SDK product truth strengthened

The product integration exposed three unsafe read-model shortcuts and they were removed before A3:

- `AssuranceStateSummary.asOfBlock` no longer uses a fabricated zero;
- CLOSED incidents preserve final `REJECTED` versus `UNDETERMINED` semantics;
- action trace receipts now depend on protocol/index supplied target, execution time and post-state evidence instead of manufacturing those fields.

Executable evidence: `scripts/test-sdk-product-truth.js`.

### COMP-A3-02 - Frontend does not become a protocol authority

Fixture mode is explicitly synthetic and refuses real writes. Live mode delegates protocol reads/builders to the frozen RecloseSDK boundary. No browser-side Judge or alternate policy engine is introduced.

Executable evidence: `scripts/test-frontend-product.js`.

### COMP-A3-03 - GenLayer lifecycle semantics remain separated

Raw lifecycle statuses and protocol decision outcomes remain distinct. `ACCEPTED` is non-final, and finality does not imply target execution success. Child execution and required post-state verification are separately represented.

Executable evidence: transaction truth/lifecycle/action-receipt tests plus frontend product checks.

### COMP-A3-04 - Studio-dev child fee-routing incompatibility remains open

The live Judge -> Kernel triggered child continues to fail with `fee no_matching_allocation # internal` on the recorded fresh R1 deployment, even after estimator-discovered allocation data was used. A3 product code exposes downstream failure rather than masking it. This blocks E1, not source-level product review.

No product-side workaround is accepted as equivalent to a successful canonical child execution.
