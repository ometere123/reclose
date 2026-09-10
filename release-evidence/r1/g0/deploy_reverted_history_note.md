# Historical note: preserved reverted deploy attempt

Before the Studio-dev deployer account was funded, this G0 session submitted a real deploy transaction that
reverted with `FeesDistributionMissing`:

```
tx hash: 0x90140b97d71bd1904ad263085399c6b494fae259680a22f4f054dd59a33b9d2a
account: unfunded pre-existing CLI account (0 GEN)
result: EVM revert, FeesDistributionMissing
```

This transaction is intentionally kept as evidence in `release-evidence/r1/g0/smoke-test-report.txt` (original text
unmodified) and in compatibility finding CF-009 in
`docs/execution/Studio-dev Toolchain & Network Compatibility Record.md`. It remains useful evidence of the exact
fee-enforcement boundary on the v0.6 RC stack: a deploy transaction with no `FeesDistribution` object at all is
rejected differently (`FeesDistributionMissing`) than one with a distribution but a zero fee value
(`FeeValueMustBeNonZero`, observed later in this same session before the correct `--fee-profile` path was used).

The successful deployment and write described in `smoke-deployment.json` and `smoke-receipt.json` were performed
afterward, once the Studio-dev account was funded, using a newly created project-dedicated account
(`reclose-deployer`, distinct from any pre-existing unrelated-project account on this machine) and the correct
SDK-derived fee path (`--fee-profile` -> `genlayer-js` `estimateTransactionFees()` against Studio-dev's live
`sim_getFeeConfig` policy). No `FeesDistribution` value was hand-derived or fabricated at any point.
