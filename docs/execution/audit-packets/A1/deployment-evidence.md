# Live Studio-dev Deployment Evidence (C1)

Network: `studio-dev`, chain ID `61997`. Deployer: `reclose-deployer`
(`0x24fae7cd031ed702be63bdea8912141805b996bd`), funded by the repository owner this session.

Full details, constructor args, and fee-deposit amounts: `deployment/61997/c1-manifest.json` and
`release-evidence/r1/c1/deploy-log.md` (both at the audit target commit).

## Deployed contracts (all FINALIZED / FINISHED_WITH_RETURN)

| Contract | Address | Deploy tx |
|---|---|---|
| ProviderStubA | `0xf86C3762735eEc9e20CD890Dc3872Fd267592b96` | `0x6b3cc180f664eb5021f26773067acf49a7089926cfe2f66fcbe73de2cf996ce5` |
| ProviderStubB | `0xcb0d07d53914249704df2800E339b632047adD6f` | `0xd793cf577aede7532113e10d0f0bba0572780eb53aa666773176f22c36ffa7e2` |
| AssuranceKernel | `0x6f6b52bc5Bd8040c46d8a3eaAA42a49888eCd647` | `0x8905babe90011583870fbae35628f68f23094b4676247d68b170a6b9454cad05` |
| ReferenceAgentProtocol | `0xeE850E45e240bB2864088887fB6Eb7c203b0F9Ed` | `0x4355812153e736013c46de39ab9ee20cfb874f99d3592023a4930ceb67c25a13` |

## Master Plan minimum requirement: proven

> "Prove at least one real target registration and active-policy flow on 61997."

**Target registration + live handshake:**
1. `target.set_assurance_controller(<kernel address>)` - write, ACCEPTED.
2. `kernel.register_target("reclose-target-001", <target address>, true, <timestamp>)` - write,
   ACCEPTED. Internally, the Kernel called the deployed target's `get_owner()` and
   `get_assurance_controller()` over the real network and validated both before registering - a
   genuine live cross-contract handshake, not a mock.
3. View proof: `genlayer call <kernel> get_target_state --args reclose-target-001` -> `0` (NORMAL).
4. View proof: `genlayer call <target> get_assurance_controller` -> `<kernel address>` (correct).

**Active-policy flow:**
1. `kernel.begin_policy("reclose-target-001", "policy-v1", "0xmanifest1", <timestamp>)` - ACCEPTED.
2. `kernel.add_policy_rule("policy-v1", "PROVIDER_COMPROMISE_V1", <deployer as judge>, 1, true, 0, 0)` - ACCEPTED.
3. `kernel.add_policy_effect("policy-v1", 5, "provider_a", 0, "n/a", 0)` - ACCEPTED (REVOKE_CAPABILITY effect).
4. `kernel.seal_policy("policy-v1")` - ACCEPTED.
5. `kernel.activate_policy("policy-v1", <timestamp>)` - ACCEPTED.
6. View proof: `genlayer call <kernel> get_active_policy_key --args reclose-target-001` -> `policy-v1`.

Both halves of the stated minimum are proven with on-chain transaction hashes and on-chain view-call
verification, not simulated or asserted.

## What is NOT proven live (honest, not glossed over)

`receive_decision`'s internal cross-contract dispatch (Kernel -> Target's
`apply_assurance_action`, triggered when a decision creates a restriction) reverted on-chain with
`AllocationTreeMalformed` when supplied a best-effort `--fees.messageAllocations` entry. The CLI
documents the `callKeyMethod`/`messageType: internal` field names but not the exact allocation-tree
structure Studio-dev's consensus contract validates. This was not resolved by further blind
guessing against undocumented on-chain validation logic - see `known-limitations.md`. The
underlying Kernel logic for this path (default-deny, replay protection, restriction bookkeeping,
effect dispatch) is proven correct via the Direct Mode test suite (31/31 passing); what remains
unproven live is specifically the wire-level fee encoding for this one cross-contract call shape.

## Toolchain finding fixed before deployment

The ambient global `genlayer` CLI was `0.39.2`; the G0-pinned/accepted baseline is `0.40.0-rc.3`.
The older CLI's built-in network list did not include `studio-dev` at all and silently defaulted to
stable `studionet` (chain 61999) - exactly the substitution CLAUDE.md Section 10 forbids. Found via
`genlayer network set studio-dev` failing with "Network studio-dev not found", root-caused via
`genlayer --version` vs `toolchain/versions.lock`, and fixed by reinstalling the exact pinned
version before any deployment action.
