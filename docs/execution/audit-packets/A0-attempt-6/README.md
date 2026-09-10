# A0 Attempt 6 - Foundation/Interface Delta Resubmission

**Audit target commit:** `55ee2cbccb1be0404b7e4bfb9f265e868d5b93dc` (branch `claude/r1-core-hardening`)

**Status: AWAITING EXTERNAL REVIEW.** Does not constitute a PASS.

## Scope of this attempt

This packet reviews ONLY the foundation/interface delta introduced by F1-v6, per the owner's
instruction: "The new A0 packet should review only the foundation/interface delta relevant to
F1-v6 and the new parity controls, not pretend the C1 Kernel is an A0 foundation component."

It closes the three owner-supplied findings against the prior (attempt 5) submission:

- **A0-U01** - canonical `ActionEnvelope` drift: closed parameters were implemented as top-level
  `paramU256`/`paramStr` instead of preserving the canonical `boundedParameters` field.
- **A0-U02** - compiled `RecloseSDK` did not match all frozen Frontend Contract v1 signatures.
- **A0-U03** - `test-f1-parity.js` overclaimed full SDK parity while checking exact signatures
  for only a subset of methods.

Attempt 5's packet (`docs/execution/audit-packets/A0/`) is preserved untouched.

## What changed

`docs/execution/Interface Change Log.md` records the F1-v5 -> F1-v6 delta:
`schemas/transaction/ActionEnvelope.schema.json` now nests `paramU256`/`paramStr` under a closed
`boundedParameters` object (matching the locked Master Design Package field name exactly);
`packages/protocol-sdk/src/types.ts`'s `ActionEnvelope`/new `BoundedParameters` interface mirror
it; `packages/protocol-sdk/src/sdk.ts`'s `RecloseSDK` interface now matches all 14 frozen F1-v6
signatures exactly (no unauthorized `| ErrorEnvelope` unions, exact nested input/output shapes);
`packages/protocol-sdk/src/__typetests__/sdk-parity.ts` is a new compile-time bidirectional
assignability check against an independently-declared `ExpectedRecloseSDK` contract, enforced by
`npm run typecheck`; `scripts/test-f1-parity.js` no longer calls its method-name check "full
parity" and points to the compile-time check as the actual proof.

## Contents

| File | Contents |
|---|---|
| `README.md` | This file |
| `findings-closure.md` | A0-U01/U02/U03 closure table |
| `commands-and-results.md` | Verification commands and results |
| `requirements.csv` / `threat-status.csv` | Snapshots at the audit target commit |
| `file-manifest.txt` | Full tracked-file listing at the audit target commit |
