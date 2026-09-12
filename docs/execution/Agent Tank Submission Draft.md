# Agent Tank Submission Draft

## Project name

**Reclose**

## One-line descriptor

**Runtime assurance for autonomous protocols.**

## Short description

Reclose lets autonomous protocols change behaviour safely when real-world conditions change. GenLayer judges whether governed public evidence satisfies a policy condition, while a deterministic AssuranceKernel limits the consequence to actions the target already authorised. The result is evidence-triggered containment, safe fallback and recovery without handing a Reporter, monitor or language model unlimited emergency authority.

## Problem

Autonomous protocols can have strong static permissions and still fail when the outside world changes. A provider can be compromised, a service can degrade, or remediation can occur while the protocol continues operating under stale assumptions.

The usual choices are weak:

- trust a centralized monitor to pause or reconfigure the system;
- let an AI/agent decide both what happened and what to do;
- rely on slow manual governance;
- or keep running with stale authority.

## Solution

Reclose separates the problem into distinct trust boundaries:

1. **Sense:** a permissionless Reporter/Sentinel submits bounded evidence.
2. **Judge:** GenLayer validators evaluate the evidence under a frozen semantic rule.
3. **Constrain:** the AssuranceKernel checks the active policy and maps the result into only a finite pre-authorised effect.
4. **Act:** the target executes through its registered adapter.
5. **Verify:** parent/child execution and target post-state are tracked separately from semantic judgment.
6. **Recover:** remediation and recovery validation safely unwind restrictions without breaking multi-incident safety.

## Reference use case

The R1 demo protects an autonomous agent protocol using Provider A and Provider B.

Normal operation prefers Provider A. If governed evidence confirms Provider A is compromised, Reclose can restrict that resource and enter safe mode while allowing the target's pre-authorised Provider B fallback to continue. Remediation evidence moves the incident into RECOVERY, and only successful recovery validation permits restoration to NORMAL.

## Why GenLayer

The difficult part is not detecting a number on-chain. It is judging changing public evidence such as provider status, remediation claims and independently accessible HTTPS sources without trusting one centralized oracle.

GenLayer supplies decentralized semantic judgment. Reclose deliberately does **not** let that judgment become arbitrary execution authority. The deterministic policy/Kernel boundary controls the consequence.

## Key properties

- `CONFIRMED`, `REJECTED` and `UNDETERMINED` are first-class outcomes.
- provisional containment is limited to the governed reversible/authority-reducing safe set;
- policy effects are finite and bounded, not arbitrary calldata;
- Reporter identity and canonical evidence/context are cryptographically bound;
- independently accessible evidence is re-fetched/re-evaluated rather than trusting Reporter text;
- policy/Judge/version binding prevents stale-authority execution;
- replay/idempotency and reason-indexed multi-incident restrictions prevent duplicate effects and erroneous restoration;
- lifecycle finality, child execution and target post-state are distinct;
- recovery is a first-class protocol state;
- SDK, CLI, Sentinel and `skill.md` let agents use Reclose without depending on the web product;
- hosted/indexed data never becomes the protocol truth authority.

## Built for Agent Tank

Canonical environment:

- GenLayer Studio-dev
- chain ID `61997`
- R1 contracts deployed and wired
- canonical policy compile/readback/timelocked activation proven
- real Judge-side public evidence fetch and GenLayer semantic execution demonstrated
- protocol, SDK/tooling, product and benchmark test suites integrated into CI

## Current evidence boundary

The current Studio-dev evidence records a runtime fee-allocation failure on the triggered Judge -> Kernel child:

`fee no_matching_allocation # internal`

Reclose intentionally shows this as a downstream execution failure instead of presenting the semantic judgment as completed containment. The repository therefore does not claim the canonical incident/recovery sequence is fully live end-to-end until the required child path and two clean E1 runs succeed.

If that blocker is resolved before submission, replace this section with the exact successful E1 transaction/evidence references. Do not simply delete the limitation without evidence.

## Track fit

**Autonomous Protocols**

Reclose is infrastructure for autonomous systems that need to adapt their own operating state and delegated authority when external conditions change, while keeping those changes inside an immutable constitutional boundary.

## Differentiator

Reclose is not a generic wallet guard, news oracle, moderation jury or pause button. Its core abstraction is **contracts governing contracts** through decentralized evidence-triggered state and authority transitions under target-delegated deterministic policy.

## Suggested submission tagline

**The world changes. Your protocol should adapt without surrendering control.**
