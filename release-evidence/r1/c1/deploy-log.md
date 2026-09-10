# C1 Deployment Log - Studio-dev (chain 61997)

Deployer: reclose-deployer (0x24fae7cd031ed702be63bdea8912141805b996bd)
CLI: genlayer 0.40.0-rc.3 (pinned, reinstalled this session after finding ambient 0.39.2 drift)
Fee approach: hand-supplied --fees distribution (matching the exact shape observed in the G0
  successful deploy receipt) + generous --fee-value (Studio-dev refunds unused fee on finalization
  per the fee_accounting.refunds mechanism observed at G0) - not derived via --fee-profile because
  gltest's fee-profile generation requires the deployer's raw private key in a local
  gltest.config.yaml, which this session's safety classifier correctly blocked as sensitive
  credential handling. This is a known, accepted deviation from the C3-target tooling path
  documented in CF-011 - acceptable for this one-off C1 deployment, not for repeatable product
  tooling.

## ProviderStubA

- Transaction Hash: 0x6b3cc180f664eb5021f26773067acf49a7089926cfe2f66fcbe73de2cf996ce5
- Contract Address: 0xf86C3762735eEc9e20CD890Dc3872Fd267592b96
- Consensus Status (at submission): ACCEPTED
ReferenceAgentProtocol deploy tx (submitted, RPC timeout on initial status check): 0x4355812153e736013c46de39ab9ee20cfb874f99d3592023a4930ceb67c25a13

## ProviderStubB

- Transaction Hash: 0xd793cf577aede7532113e10d0f0bba0572780eb53aa666773176f22c36ffa7e2
- Contract Address: 0xcb0d07d53914249704df2800E339b632047adD6f
- Consensus Status (at submission): ACCEPTED

## AssuranceKernel

- Transaction Hash: 0x8905babe90011583870fbae35628f68f23094b4676247d68b170a6b9454cad05
- Contract Address: 0x6f6b52bc5Bd8040c46d8a3eaAA42a49888eCd647
- Consensus Status (at submission): ACCEPTED
- Constructor args: protocol_schema_version=1, minimum_policy_delay_seconds=60

## ReferenceAgentProtocol

- Transaction Hash: 0x4355812153e736013c46de39ab9ee20cfb874f99d3592023a4930ceb67c25a13
- Contract Address: 0xeE850E45e240bB2864088887fB6Eb7c203b0F9Ed
- Consensus Status: FINALIZED, "Finalized · Accepted" (validator votes 3 AGREE / 2 IDLE - majority)
  (Initial `genlayer deploy` invocation hit a transient RPC fetch-timeout when polling status right
  after submission - the transaction hash was captured and persisted immediately per CLAUDE.md
  Section 35, then confirmed finalized via a separate `genlayer receipt` call.)
- Constructor args: authorized_agent=0x24fae7cd031ed702be63bdea8912141805b996bd (deployer, acting as
  its own authorized agent for this reference demo), target_id="reclose-target-001",
  provider_a=<ProviderStubA address>, provider_b=<ProviderStubB address>,
  per_request_limit=1000000000000000000 (1 GEN wei), safe_mode_limit=100000000000000000 (0.1 GEN wei),
  human_override_enabled=true

## Live target registration + active-policy flow (proven, per Master Plan minimum requirement)

- `kernel.register_target("reclose-target-001", <ReferenceAgentProtocol address>, true, <now>)`
  succeeded (tx `0x8...` sequence above) - live handshake: Kernel called the deployed target's
  `get_owner()`/`get_assurance_controller()` over the real network and verified them before
  registering.
- `target.set_assurance_controller(<Kernel address>)` succeeded first.
- View proof: `genlayer call <kernel> get_target_state --args reclose-target-001` -> `0` (NORMAL).
- View proof: `genlayer call <target> get_assurance_controller` -> `<Kernel address>` (correct).
- Full policy lifecycle proven live: `begin_policy` -> `add_policy_rule` -> `add_policy_effect` ->
  `seal_policy` -> `activate_policy`, all ACCEPTED.
- View proof: `genlayer call <kernel> get_active_policy_key --args reclose-target-001` -> `policy-v1`.

This satisfies the Master Plan's stated minimum: "Prove at least one real target registration and
active-policy flow on 61997."

## Known limitation: `receive_decision`'s internal cross-contract dispatch not proven live

`receive_decision` (which internally calls the target's `apply_assurance_action` via
`gl.contract.get_at(...)`) reverted on-chain with `AllocationTreeMalformed` when supplied a
best-effort `messageAllocations` entry (`messageType: "internal"`, `callKeyMethod:
"apply_assurance_action"`, a recipient/budget/parentIndex/onAcceptance guess). The CLI source
(`genlayer/dist/index.js`) confirms `callKeyMethod` pairs with an internal message allocation and
documents the field names, but does not document the exact allocation-tree structure the studio-dev
consensus contract expects (e.g. whether a root/self allocation at index 0 is required, or how
`parentIndex` must reference it). Not resolved by further blind guessing against undocumented
on-chain validation logic - flagged honestly rather than worked around. The DIRECT-MODE test suite
(31/31 passing) already proves this call's OWN internal logic (default-deny, replay protection,
restriction bookkeeping, effect dispatch invocation) is correct in isolation; what remains unproven
live is specifically the wire-level fee-allocation encoding for the cross-contract hop, which is a
CLI/tooling-level gap, not a contract-logic gap. Retest once GenLayer publishes the allocation-tree
fee spec, or once a funded gltest fee-profile run (blocked this session on private-key handling
policy) can derive it programmatically.
