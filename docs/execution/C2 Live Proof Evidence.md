# C2 Live Proof Evidence (Studio-dev, chain 61997)

Commit under test: `61d6b0f` (Judge fix), contracts subsequently redeployed at `0A51983...`.

## Deployed contract set

See `deployment/61997/c2-manifest.json` for full addresses/tx IDs/constructor args. Summary:

| Contract | Address | Status |
|---|---|---|
| ProviderStubA | `0x0bECC92AFB5e5AEF945545ef302a1b0653bb30BD` | FINALIZED |
| ProviderStubB (reused from C1R) | `0x1dEb2cd419558D17eC8ea500CC970fE8BD1281D3` | FINALIZED |
| AssuranceKernel (C2) | `0x39a3D52Bb89e501FFdb0229C21f0C2ec0CD6195D` | FINALIZED |
| ReferenceAgentProtocol (C2) | `0x33b843f3578b1C980F99014661e532ce8eeab1d4` | FINALIZED |
| IncidentJudgeV1 (first deploy, had the evidence_json CLI-coercion bug) | `0xe8642bB4B0b8c8D829EbeAA14e83746018F9cf5C` | FINALIZED but superseded - do not use |
| IncidentJudgeV1 (fixed, current) | `0x0A519837D3983272A14710d5b6b2108bC27D2D96` | FINALIZED |
| IncentiveVault | `0x2D8fd574095d13D9756C279f0972f73D822fd9Ad` | FINALIZED |

## Wiring performed live

- `IncidentJudgeV1.set_vault(vault)` - confirmed FINALIZED.
- `ReferenceAgentProtocol.set_assurance_controller(kernel)` - confirmed ACCEPTED/FINALIZED.
- `AssuranceKernel.register_target("reclose-target-002", agentProtocol, true)` - confirmed ACCEPTED/FINALIZED.
- Policy `policy-c2-001` (original Judge address) built, sealed, and activated after the Kernel's
  first-policy authority-expansion timelock (60s from `minimum_policy_delay_seconds`) elapsed.
  Superseded by `policy-c2-002` once the Judge had to be redeployed (see Finding 1 below) -
  `policy-c2-002` binds all three rule_ids (`PROVIDER_COMPROMISE_V1`, `REMEDIATION_CONFIRMED_V1`,
  `RECOVERY_VALIDATED_V1`) to the fixed Judge, is sealed and ACTIVE (confirmed via
  `get_policy_header("policy-c2-002")` -> `[2, 0x222...222, true, true, true]`).

## Finding 1 (RESOLVED in-session): CLI coerces JSON-shaped `--args` tokens into objects

The exact pinned `genlayer` CLI auto-detects a `{`-leading `--args` token as JSON and decodes it
into a real object/array before it reaches the contract, rather than passing the literal EAP
string the `evidence_json: str` parameter requires. First live `submit_incident` attempt (tx
`0xc8e390857761f4e0e09a5c661dd54105f85705da5f3401b7bf74d739df5aaa1a`, FINALIZED/MAJORITY_AGREE but
`execution_result: ERROR`) rolled back with `E_JDG_006: [JUDGE_EVIDENCE] evidence_json must be a
string`, confirmed by direct inspection of the receipt's `calldata.readable` (evidence_json arrived
as a JSON object, not a string). Fixed by adding `_normalize_json_arg` (same pattern as the
already-shipped `_normalize_hash_arg`/`_normalize_str_arg`) to `_parse_and_validate_eap` in
commit `61d6b0f`, with a Direct Mode regression test (`184 passed`, up from 182). The Judge had to
be redeployed fresh (old address `0xe8642...` carries the bug and is abandoned; new address
`0x0A519837D3983272A14710d5b6b2108bC27D2D96`), and a fresh policy version (`policy-c2-002`) built
to bind the new Judge address, since Kernel policies cannot be mutated after `seal_policy`.

## Finding 2 (OPEN, NOT a contract-logic defect): Judge -> Kernel `EmitInternalMessage` fails with `SystemError: 2: inval`

After Finding 1's fix, `submit_incident` against the live fixed Judge
(tx `0x42887c23af1b46583be91a5971bdba0db12b4ca12ac6b0b2f7cddf6ca99b31ff`, FINALIZED/MAJORITY_AGREE,
`execution_result: ERROR`) proceeded correctly through:

1. deterministic precheck (target/policy/rule/resource validation against the live Kernel via
   `gl.contract.get_at(kernel).view()...`) - passed;
2. EAP parsing/bounds validation - passed;
3. **real live web fetch** of `https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate/main/README.md`
   plus the Reporter-supplied fallback evidence text, both bracketed as untrusted data per Section 15;
4. **real nondeterministic LLM judgment** via `gl.eq_principle.strict_eq` - the `eq_outputs` field
   in the receipt shows a genuine classifier result (`CONFIRMED_ACTIVE_EXPLOITATION` in the
   estimate-fees dry-run trial, `CREDENTIAL_COMPROMISE` in the submitted-write trial - both valid
   CONFIRMED-class codes for `PROVIDER_COMPROMISE_V1`, the divergence itself being expected/honest
   evidence of genuine model nondeterminism across separate executions, which `strict_eq` consensus
   is specifically designed to catch when validators disagree);
5. then failed at `kernel_contract.emit(on="accepted").receive_decision(...)` with a Python
   traceback terminating in `wasi.gl_call(calldata.encode({'EmitInternalMessage': message})) ->
   SystemError: 2: inval`.

This is **the same class of issue already documented in
`docs/execution/audit-packets/A1/known-limitations.md` item 2** (`AllocationTreeMalformed` on
`receive_decision`'s cross-contract effect dispatch in C1R) recurring at the Judge -> Kernel hop in
C2. It reproduced identically whether the write used:

- a bare-baseline fee object (`genlayer estimate-fees` with no address/method, empty
  `messageAllocations`) - fails with `SystemError: 2: inval`;
- the **targeted** `genlayer estimate-fees <address> <method> --args ...` simulation
  (`_discover_message_allocations_for_estimate: true`, intended to discover the correct
  cross-contract message-allocation tree) - **also fails identically**, even during the fee
  *estimation* dry-run itself, before any real value is at stake.

Because the targeted discovery simulation itself cannot produce a working allocation tree for this
internal message, this is not a fee-flag-guessing problem this session can resolve by further
probing (the same conclusion A1's known-limitations.md item 2 already reached for the
Kernel-internal case) - it is a GenVM/Studio-dev runtime-level constraint on synchronous internal
cross-contract dispatch that remains unresolved upstream.

**Status: the Judge's own semantic-adjudication logic (deterministic precheck, EAP validation,
real web fetch, real LLM judgment via eq_principle) is live-proven on Studio-dev chain 61997.
Judge -> Kernel decision dispatch (`receive_decision`) remains proven only via Direct Mode (184/184
passing, including the full Judge/Vault/Kernel-reconciliation test matrix) and is NOT proven live
end-to-end, pending upstream GenVM resolution of the internal-message allocation issue.**

This must be carried forward as `MITIGATED / UNVERIFIED (live cross-contract dispatch)` in
`Requirements Status.csv` for the affected requirement(s), exactly as A1's precedent did for the
Kernel-internal case - not silently marked VERIFIED, and not worked around by weakening the
contract's real cross-contract call into some synchronous same-transaction shortcut that would
violate the architecture's Judge/Kernel separation (CLAUDE.md Section 6).

## Reporter nonce confirms no false-positive success

`IncidentJudgeV1.get_reporter_nonce(deployer)` still returns `0` after both failed `submit_incident`
attempts - confirming the nonce-bump-then-fail ordering inside `submit_incident` did NOT leave the
contract in an inconsistent state (the whole transaction rolled back on error, per GenVM semantics),
and that no phantom incident record was created.
