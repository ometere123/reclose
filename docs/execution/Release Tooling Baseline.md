# Release Tooling Baseline

**Branch:** `chatgpt/r1-product-release`  
**Immutable release-tooling source target:** `97ce0c09ec8ca635ee53d225eb8b2992fc41b56f`  
**GitHub Actions run:** `34682744374`  
**Result:** SUCCESS

This baseline is separate from the frozen A3 product/integration target. It contains the post-A3 release-tooling hardening used to judge evidence without pretending the evidence already exists.

## Included evidence/tooling controls

- `scripts/check-e1-evidence.mjs`
  - auto-discovers real `release-evidence/r1/e1/run-*.json` artifacts when called without arguments;
  - never treats `run-template.json` as evidence;
  - requires at least two independent clean Studio-dev 61997 runs;
  - requires exact 40-hex source commit, timestamps and distinct run/deployment identities;
  - requires every canonical step to PASS with a non-empty transaction/evidence reference;
  - requires Provider A initial real-value purchase;
  - requires Judge -> Kernel child `FINISHED_WITH_RETURN`;
  - requires Provider A restriction + SAFE_MODE;
  - requires real-value Provider B fallback;
  - requires RECOVERY;
  - requires Provider A restoration + NORMAL;
  - requires a final real-value AUTO purchase;
  - rejects a PASS step carrying a failing execution result.
- `scripts/test-e1-evidence-checker.mjs`
  - proves the checker accepts two good independent run records;
  - rejects failed child execution;
  - rejects empty PASS evidence;
  - rejects deployment-manifest reuse;
  - rejects placeholder/non-SHA source commit.
- `scripts/check-final-fee-profile.mjs`
  - defaults to canonical repository evidence paths;
  - also accepts explicit input/report files for self-testability;
  - requires the final R1 addresses;
  - rejects empty live arguments and placeholders;
  - requires Studio-dev/61997 binding and valid generated timestamp;
  - requires explicit ESTIMATED or ESTIMATION_FAILED status;
  - requires decimal fee value for estimates and exact error text for failed estimates.
- `scripts/test-final-fee-profile-checker.mjs`
  - proves complete evidence can pass;
  - rejects empty live args;
  - rejects placeholder values;
  - rejects wrong contract address;
  - rejects a failed estimate with no exact error.

Both checker self-test suites are part of normal `npm run verify`. The live evidence gates themselves remain outside ordinary CI and are expected to stay red until genuine browser/live-chain evidence is supplied:

```bash
npm run fee-profile:final-check
npm run e1:evidence:check
```

Do not alter a checker merely to convert missing or failed external evidence into PASS.
