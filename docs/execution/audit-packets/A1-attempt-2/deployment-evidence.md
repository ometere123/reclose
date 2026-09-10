# Deployment Evidence (A1 Attempt 2)

Full narrative: `release-evidence/r1/c1r/deploy-log.md`.
Machine-readable manifest: `deployment/61997/c1r-manifest.json`.

## Summary

| Contract | Address | Status |
|---|---|---|
| ProviderStubA | `0xe6AF2d2F5580d05d347AffE85cAE77dC233C94a1` | FINALIZED / FINISHED_WITH_RETURN |
| ProviderStubB | `0x1dEb2cd419558D17eC8ea500CC970fE8BD1281D3` | FINALIZED / FINISHED_WITH_RETURN |
| AssuranceKernel | `0xB6FfE8b8d4ad1AC5c418A4dccbA01feD77D6156C` | FINALIZED / FINISHED_WITH_RETURN |
| ReferenceAgentProtocol | `0x7e3Fb43ea770E2Daa520E9D7725889721DA98768` | FINALIZED / FINISHED_WITH_RETURN |

Live-proven: target/controller registration handshake, full policy lifecycle (resources, three
rule kinds with `judge_version` binding, a rule-scoped effect, seal, activate). Both CLI-arg
normalization fixes (`_normalize_hash_arg`/`_normalize_str_arg`) are proven live, not just in
Direct Mode - `begin_policy` and `add_policy_effect` succeeded against real CLI-encoded calldata
that would have crashed the pre-fix contract.

Not live-proven: the `receive_decision` -> Kernel -> Target cross-contract effect dispatch. See
`findings-closure.md`'s A1-H08 entry and `release-evidence/r1/c1r/deploy-log.md` section D for
the full investigation (reached `InsufficientFees`, a structurally valid but underfunded
allocation tree - a materially better result than attempt 1's `AllocationTreeMalformed`, but not
success).
