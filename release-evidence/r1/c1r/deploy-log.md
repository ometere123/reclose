# C1R Live Deployment Log (Studio-dev, chain 61997)

Deployer: `reclose-deployer` (`0x24fae7cd031ed702be63bdea8912141805b996bd`), network `studio-dev`
(chainId 61997 - verified via `genlayer network info` before every call), RPC
`https://studio-dev.genlayer.com/api`. Toolchain: exact pinned `genlayer@0.40.0-rc.3` CLI,
`py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` runner.

See `deployment/61997/c1r-manifest.json` for the machine-readable manifest. This document is the
narrative. The prior C1 deployment (`deployment/61997/c1-manifest.json`, addresses under
`0xf86C...`/`0xcb0d...`/`0x6f6b...`/`0xe9BC...`) is untouched historical evidence.

## Fee construction method (Section 21 improvement over the prior C1 packet)

Prior C1 deployment evidence hand-guessed a `--fees` JSON distribution. This C1R deployment
instead uses `genlayer estimate-fees` (no positional `[contractAddress] [method]` args), which
calls the exact pinned `genlayer-js@2.0.0-rc.1`'s `estimateTransactionFees` against
`readCurrentFeePolicy` - the *authoritative*, network-derived distribution, not a guess. For
calls against an *already-deployed* contract (writes, not fresh deploys), `genlayer estimate-fees
<address> <method> --args ...` additionally runs a real `gen_call`/`sim_estimateTransactionFees`
simulation, which is how the two CLI arg-encoding bugs below were caught (the simulation actually
executes the contract logic). `scripts/studio-dev-write.sh` wraps this estimate-then-write
pattern as a reusable tool; it asserts chainId 61997 before every call and never touches key
material (the configured `genlayer` keystore signs, as it always did).

## Deployment (4/4 FINALIZED / FINISHED_WITH_RETURN)

| Contract | Address | Deploy tx | Source commit |
|---|---|---|---|
| ProviderStubA | `0xe6AF2d2F5580d05d347AffE85cAE77dC233C94a1` | `0x5c31c487307b9e9d65046a47e9ff61bf118968cd461707dce1b0c53034373f80` | `1679840` |
| ProviderStubB | `0x1dEb2cd419558D17eC8ea500CC970fE8BD1281D3` | `0x3ead72a2d84331f3e57aea0d7ff8cdc918bc410b8fcb42b5e8b274b8c44ac62e` | `1679840` |
| AssuranceKernel | `0xB6FfE8b8d4ad1AC5c418A4dccbA01feD77D6156C` | `0x03ca49904e3fb2c06f56fd22b740b39c60238e9cbbc91dfa4c04d26632b3c5be` | `4fc2599` |
| ReferenceAgentProtocol | `0x7e3Fb43ea770E2Daa520E9D7725889721DA98768` | `0x5bb25050657c9b789c6eb40ce3ce9855d66e2fa3ca2c37c14059af486f436cfa` | `c574550` |

Two AssuranceKernel deploys occurred in this session: an intermediate one at
`0x21Efcc7726Ab94568962EE5C87C02548a24d0b17` (source commit `21Efcc7` predates the
`_normalize_str_arg` fix - `add_policy_effect`'s `param_str` could not be stored as a true empty
string via CLI `--args`, which would have broken `ReferenceAgentProtocol`'s strict
`param_str == ""` check for RESTRICT). That address was registered against a target but never
carried a completed policy lifecycle and is not used further; the address above (`0xB6FfE8b8...`)
is the one all live proof below targets.

## Live proof matrix (against `0xB6FfE8b8...` / `0x7e3Fb43e...`)

**A. Target/controller registration** - PROVEN.
- `target.set_assurance_controller(kernel)` - ACCEPTED.
- `kernel.register_target("reclose-target-001", target, true)` - ACCEPTED (live cross-contract
  read: Kernel called the deployed target's `get_owner()`/`get_assurance_controller()` over the
  real network and verified them before registering - this is the same live-handshake proof as
  the prior C1 packet, now against the C1R-hardened Kernel).
- View proof: `kernel.get_target_state("reclose-target-001")` -> `0` (NORMAL).
- View proof: `target.get_state()` -> `0` (NORMAL).

**B. Policy lifecycle** - PROVEN.
- `begin_policy("reclose-target-001", "policy-v1", <64-hex manifest hash>)` - ACCEPTED. This call
  is the live proof of the `_normalize_hash_arg` fix: the CLI encodes the hex-shaped hash argument
  as an int; the Kernel's `begin_policy` recovers it losslessly before `_valid_hash` validates it.
- `add_policy_resource("policy-v1", "provider_a")` - ACCEPTED.
- `add_policy_rule("policy-v1", "PROVIDER_COMPROMISE_V1", <deployer as stand-in Judge>, judge_version=1, rule_kind=INCIDENT, provisional_allowed=true, 0, 0)` - ACCEPTED.
- `add_policy_rule("policy-v1", "REMEDIATION_CONFIRMED_V1", ..., rule_kind=REMEDIATION, ...)` - ACCEPTED.
- `add_policy_rule("policy-v1", "RECOVERY_VALIDATED_V1", ..., rule_kind=RECOVERY_VALIDATION, ...)` - ACCEPTED.
- `add_policy_effect("policy-v1", "PROVIDER_COMPROMISE_V1", RESTRICT, "provider_a", 0, "", RELEASE_AT_RECOVERY_VALIDATED)` - ACCEPTED. This call is the live proof of the `_normalize_str_arg`
  fix: the CLI encodes the empty `param_str`/non-resource-scoped fields as the integer `0`; the
  Kernel recovers the intended empty string before storing the effect.
- `seal_policy("policy-v1")` - tx `0xfad77d03fc9f5a63aeda12d1a68c044ddc9bf6e0e4c0704182430bbf41ab7f28`, confirmed **FINALIZED** via `genlayer receipt`.
- `activate_policy("policy-v1")` - ACCEPTED.
- View proof: `kernel.get_active_policy_key("reclose-target-001")` -> `"policy-v1"`.

Reporter used as the stand-in Judge for all three rules is the deployer's own address, per
CLAUDE.md's exact-sender authentication test pattern (IncidentJudgeV1 is C2 scope, not
substituted here - see known-limitations).

**C-K (semantic expansion timelock through multi-incident/final-outcome proofs) - NOT live-proven
this pass.** All of these require at least one successful `receive_decision` call to reach the
Kernel's dispatch path, which requires solving item D below first. Direct Mode already proves the
full state machine (73/73 tests, including the model-vs-contract trace suite) for all of C
through K; what remains unproven LIVE is specifically the wire-level cross-contract dispatch.

## D. `receive_decision` -> Kernel -> Target live cross-contract dispatch: PARTIALLY RESOLVED, still not proven successful

This is a genuine, deep improvement over the prior C1 packet's opaque `AllocationTreeMalformed`,
but it does **not** reach a successful live dispatch this pass. Documented precisely per Section
21's "produce a minimal reproducible case" instruction rather than continuing to guess
indefinitely.

**What was newly discovered this pass** (primary-source investigation, `genlayer@0.40.0-rc.3`'s
`dist/index.js` and `genlayer-js@2.0.0-rc.1`'s exported `encodeInternalMessageFeeParams`):

1. A `receive_decision` PROVISIONAL CONFIRMED call against `RESTRICT`/`provider_a` reaches real
   GenVM execution and gets as far as `_dispatch_action` -> `target_contract.emit(on=...)
   .apply_assurance_action(...)` -> `wasi.gl_call(calldata.encode({'EmitInternalMessage':
   message}))`, which raises `SystemError: 2: inval` **only during the CLI's two-phase
   budget-discovery estimation pass** (`_allow_low_execution_budget_for_estimate` /
   `_discover_message_allocations_for_estimate`) - i.e. the internal message emission itself is
   real and reachable; the discovery-mode simulation just cannot auto-derive its own
   `messageAllocations` entry for it in this exact pinned toolchain.
2. `messageAllocationComponents.feeParams` (a `bytes` field, previously left as `"0x"` in the
   prior C1 packet's guesses) is not incidental - it must be the ABI-encoded **nested**
   `feesDistributionComponents` tuple for the CHILD message's own sub-budget.
   `genlayer-js@2.0.0-rc.1` exports `encodeInternalMessageFeeParams(...)` for exactly this; using
   it to construct a real (non-empty) `feeParams` value, together with an explicit
   `messageAllocations` entry (`messageType: "internal"`, `callKeyMethod:
   "apply_assurance_action"`, `recipient: <target address>`, `parentIndex: 0`), moved the
   on-chain revert from `AllocationTreeMalformed` to **`InsufficientFees`** - i.e. the allocation
   TREE STRUCTURE is now accepted by consensus; only the funding amount was wrong. This is a
   materially different (and better) result than the prior packet ever reached.
3. Systematic bisection of `--fee-value` (holding the rest of the distribution and the
   `messageAllocations` entry fixed) found the tree-valid/insufficient region and the
   malformed region are separated by an extremely narrow band, and that band itself shifts when
   `executionBudgetPerRound` changes - i.e. the validation is coupled across multiple fields in a
   way not documented in any of the primary sources checked (CLI `--help`, `genlayer-js` source,
   `genlayer-test` source). Exact reproducible on-chain evidence (all against
   `0xB6FfE8b8d4ad1AC5c418A4dccbA01feD77D6156C.receive_decision`, same `messageAllocations`/
   `feeParams`/args, `executionBudgetPerRound=1887108000000000`, `totalMessageFees=budget=
   1000000000000000`):

   | `--fee-value` (wei) | Result |
   |---|---|
   | `3000000000000000` | `InsufficientFees` (tx `0x299b428e9b7e11d638c4fd033e77b7d1d05edca95bace8d10ef5bff61a54090d`) |
   | `4500000000000000` | `InsufficientFees` (tx `0xcf8f8b1ded3d93834396a11f56093fd3db8c3135c1fbabd538ffff5590431f4e`) |
   | `6000000000000000` | `InsufficientFees` (tx `0x95fa94ebc6d2bf1834d63af1e3b4b8355ab6a4571eb957d0fac84c89367807c4`) |
   | `8000000000000000` | `InsufficientFees` (tx `0x55cb78a5e35af775f7b9d6d3e252d33983023386ff86905c7497df19e91dd229`) |
   | `8500000000000000` | `InsufficientFees` (tx `0x8f2d36bc73b418bad98f11e4c802e14dc179214bf763aacf8778c653235ed020`) |
   | `8600000000000000` | `AllocationTreeMalformed` (tx `0xd332e5843c404698c6fe95e77cfaf3cd847fdb842eb23bece9b9c19a374a5530`) |
   | `9000000000000000` | `AllocationTreeMalformed` (tx `0x2ee07cdcefb7cd71156b688201154d882a6e6cb10ca0eb9f75de60e35f3b6246`) |
   | `10000000000000000` | `AllocationTreeMalformed` (tx `0x5040a39dadcbd005fe6ea239745c291dec8e6676aeb84e08f3a6da514f544f9f`) |
   | `500000000000000000` (0.5 GEN) | `AllocationTreeMalformed` (tx `0x0bdc8655d8f5149f1a930051aa58edabdd7be58980c33de56c59e74e78ea85cd`) |

   The last confirmed-good boundary is `8500000000000000` wei (`InsufficientFees`, still
   underfunded but structurally valid); `8600000000000000` wei (a 1.2% increase) flips to
   `AllocationTreeMalformed` with the identical `messageAllocations`/`feeParams`/distribution
   shape otherwise. This non-monotonic, tightly-coupled sensitivity across `--fee-value`,
   `executionBudgetPerRound`, and `totalMessageFees`/`budget` together, with no documented
   formula found in any pinned primary source checked, is the honest boundary of what this pass
   resolved. No secret/private-key material was involved in reaching this point - only public RPC
   simulation calls and the CLI's own keystore-signed `write`.

**Conclusion for this pass:** the live Kernel -> Target `receive_decision` dispatch path remains
**not proven successful**, but is now proven **reachable and structurally valid** (past
`AllocationTreeMalformed` to `InsufficientFees`), with exact reproducible transaction evidence and
a precise characterization of the remaining unknown (an undocumented, multi-field-coupled fee
validation threshold in the exact pinned Studio-dev consensus contract). Per Section 21, no
success is fabricated; C2 has not started while this path remains unproven. A follow-on pass with
either access to the GenLayer core repository's Solidity fee-allocation validation source, or
support from the GenLayer team on the exact `InsufficientFees`/`AllocationTreeMalformed`
distinguishing formula, is the recommended next step - not further blind bisection.

## Secrets

No private key, keystore JSON, password, or mnemonic was printed, decrypted, copied, or persisted
at any point in this deployment. All `write`/`deploy` calls used the pre-configured `genlayer`
CLI keystore signer (`reclose-deployer`, already unlocked in the CLI's own account store from a
prior session); this session never read `.env.local`'s keystore password field programmatically.
