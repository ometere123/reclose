# A0-U01..A0-U03 Findings Closure

## A0-U01: canonical ActionEnvelope drift

- **Root cause:** A prior remediation (A0 final remediation A4) closed the open
  `Record<string,unknown>` `boundedParameters` container by flattening it to top-level
  `paramU256`/`paramStr` fields - but the locked Master Design Package's canonical field name is
  `boundedParameters`, not two top-level fields. The flattening was itself a drift from the
  locked formal model, correctly flagged by external review.
- **Fix:** `schemas/transaction/ActionEnvelope.schema.json`'s `boundedParameters` is now a
  required object field (`type: object`, `required: [paramU256, paramStr]`,
  `additionalProperties: false`) - restoring the canonical name while keeping the closed shape.
  `packages/protocol-sdk/src/types.ts` adds a `BoundedParameters` interface and uses it as
  `ActionEnvelope.boundedParameters`. `scripts/test-action-envelope-negative.js` gained 7 new
  tests proving `boundedParameters.calldata`/`.selector`/`.method`/`.destination`/`.payload`/an
  extra unknown nested field are all rejected (24 tests total, up from 17).
- **File/function:** `schemas/transaction/ActionEnvelope.schema.json`,
  `packages/protocol-sdk/src/types.ts::BoundedParameters`.
- **Test:** `scripts/test-action-envelope-negative.js` (24/24 PASS), `scripts/test-f1-parity.js`'s
  `ActionEnvelope.boundedParameters is the canonical closed bounded-parameter container` check.
- **Status: FIXED.**

## A0-U02: compiled RecloseSDK does not match all frozen Frontend Contract v1 signatures

- **Root cause:** the compiled `RecloseSDK` interface had drifted in two ways: several methods'
  return/input shapes did not match the frozen contract's exact object shapes
  (`getEffectiveProviderStatus`, `buildIncidentReport`, `buildRecoveryReport`, `validateAPM`,
  `hashAPM`, `diffAPM`, `trackTransaction`, `trackActionTrace`), and every method had been
  mutated to return `T | ErrorEnvelope` even though the frozen contract does not specify that
  union for most of them.
- **Fix:** `packages/protocol-sdk/src/sdk.ts`'s `RecloseSDK` interface rewritten to match the
  F1-v6 owner instruction's Section 17 signatures verbatim - exact nested input/output object
  shapes for all 14 methods, no unauthorized `| ErrorEnvelope` unions.
- **File/function:** `packages/protocol-sdk/src/sdk.ts::RecloseSDK`.
- **Test:** `packages/protocol-sdk/src/__typetests__/sdk-parity.ts` (see A0-U03).
- **Status: FIXED.**

## A0-U03: test-f1-parity.js overclaims full SDK parity

- **Root cause:** the script's docstring and test name claimed "full SDK parity" while
  mechanically checking only method NAMES plus three hand-written regex signatures - not
  actually proving parity for the other 11 methods' shapes.
- **Fix:** `packages/protocol-sdk/src/__typetests__/sdk-parity.ts` is a new compile-time
  bidirectional structural-assignability check: it independently re-declares the frozen F1-v6
  contract as `ExpectedRecloseSDK` (importing only plain data types from `../types`, never
  `RecloseSDK` itself for the interface body), then asserts `RecloseSDK` is assignable to
  `ExpectedRecloseSDK` AND vice versa. A mismatched method, parameter shape, or return type fails
  `npm run typecheck` (part of `npm run verify`). `scripts/test-f1-parity.js`'s own docstring and
  test names were corrected to describe its actual (narrower) scope - field-name/required-set
  parity only - and point to `sdk-parity.ts` as the real signature-parity proof.
- **File/function:** `packages/protocol-sdk/src/__typetests__/sdk-parity.ts`,
  `scripts/test-f1-parity.js`.
- **Test:** `npm run typecheck` (compiles `sdk-parity.ts` successfully = the proof itself);
  `scripts/test-f1-parity.js`'s new check that `sdk-parity.ts` exists and declares the
  bidirectional assertions.
- **Status: FIXED.**
