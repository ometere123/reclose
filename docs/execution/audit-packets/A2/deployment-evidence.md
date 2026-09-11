# A2 Deployment Evidence (Studio-dev, chain 61997)

Full manifest: `deployment/61997/c2-manifest.json`. Full narrative + live tx hashes:
`docs/execution/C2 Live Proof Evidence.md`. This file is a condensed index.

| Contract | Address | Status |
|---|---|---|
| ProviderStubA | `0x0bECC92AFB5e5AEF945545ef302a1b0653bb30BD` | FINALIZED |
| ProviderStubB (reused from C1R, source unchanged) | `0x1dEb2cd419558D17eC8ea500CC970fE8BD1281D3` | FINALIZED |
| AssuranceKernel | `0x39a3D52Bb89e501FFdb0229C21f0C2ec0CD6195D` | FINALIZED |
| ReferenceAgentProtocol | `0x33b843f3578b1C980F99014661e532ce8eeab1d4` | FINALIZED |
| IncidentJudgeV1 (current, fixed) | `0x0A519837D3983272A14710d5b6b2108bC27D2D96` | FINALIZED |
| IncidentJudgeV1 (superseded, had the evidence_json CLI-coercion bug - do not use) | `0xe8642bB4B0b8c8D829EbeAA14e83746018F9cf5C` | FINALIZED, abandoned |
| IncentiveVault | `0x2D8fd574095d13D9756C279f0972f73D822fd9Ad` | FINALIZED |

Active policy: `policy-c2-002` (version 2, sealed, active) on target `reclose-target-002`, binding
`PROVIDER_COMPROMISE_V1`/`REMEDIATION_CONFIRMED_V1`/`RECOVERY_VALIDATED_V1` to the current Judge.

Live `submit_incident` transactions:
- `0xc8e390857761f4e0e09a5c661dd54105f85705da5f3401b7bf74d739df5aaa1a` - first attempt against the
  fixed Judge, FINALIZED/MAJORITY_AGREE but rolled back with `E_JDG_006` (Finding 1, since fixed).
- `0x42887c23af1b46583be91a5971bdba0db12b4ca12ac6b0b2f7cddf6ca99b31ff` - first successful judgment
  after Finding 1's fix; `eq_outputs` show genuine `CREDENTIAL_COMPROMISE` classification, but the
  triggered child dispatch to the Kernel failed (original Finding 2 writeup).
- `0x002f88dd66900960d1b1cfdf0272768a6c93b5cb2d1cc134fcd8fd0e262a7b2a` - using a
  fee-profile-discovered `messageAllocations` tree; FULL success of the Judge's own pipeline
  (condition_code `INSUFFICIENT_EVIDENCE`, outcome `UNDETERMINED`, persisted on-chain); triggered
  child `0x2ec7301866a8d6c1ac773c6ca0585f97749c6bf65f5c1bc844262a69b35ff0f6` still fails with the
  specific `fee no_matching_allocation # internal` error (Finding 2 update - see
  `known-limitations.md`).

Deployer account: `reclose-deployer` (`0x24fAe7cD031Ed702Be63BDeA8912141805B996bd`).
