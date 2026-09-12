Current phase: **D1-D4 / I1-I2 PRODUCT IMPLEMENTATION AUTHORISED AFTER A2 PASS WITH CONDITIONS.**

Independent A2 attempt-2 review was performed against immutable target
`6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5` on `claude/a2-remediation-integration`.
Decision: **PASS WITH CONDITIONS**. The exact decision and conditions are preserved at
`docs/execution/audit-packets/A2-attempt-2/AUDIT_DECISION.md`.

The historical first A2 packet at `docs/execution/audit-packets/A2/` remains unchanged as the
first submission against `ae3a5083e1db805c3fa6692a11661d06e6679ec7`.

## Verified current baseline

- GitHub Actions run `34676730787`: SUCCESS on exact audit target.
- Node 24.16.0, npm 11.13.0, Python 3.14.4.
- `npm run verify`: green from clean CI.
- 43/43 schema fixtures valid.
- 197/197 Python tests pass.
- Fresh Studio-dev 61997 hardened stack deployed and wired.
- Canonical APM compile/readback/timelocked activation proven live.
- Real Judge-side deterministic precheck, canonical EAP binding, public-source fetch and LLM
  judgment proven live.

## Open A2 conditions

- **A2-C01:** Judge -> Kernel triggered child still fails live with
  `fee no_matching_allocation # internal`. This blocks E1 completion, but not truthful product
  implementation.
- **A2-C02:** real fee-profile inputs/output must replace placeholder-only branch coverage before
  A3 closes / E1 begins.
- **A2-C03:** action-trace `ExecutionReceipt` must stop fabricating/omitting protocol truth where
  target ID, post-state requirement and execution time can be derived. Close during I2.
- **A2-C04:** current phase/audit register/ledgers must reflect the current A2 attempt-2 evidence
  without rewriting the historical first packet.

## Authorised critical path

Proceed directly through:

`D1 -> D2 -> D3 -> I1 -> I2 -> D4 -> A3`

Product implementation must be truth-preserving. In particular:

- never show a child dispatch as successful when it failed;
- preserve REJECTED vs UNDETERMINED vs CONFIRMED;
- never manufacture an `asOfBlock`, post-state proof or fee amount;
- accepted transactions are not final;
- final consensus is not the same as successful execution.

After product implementation, prepare A3 for independent review. E1 may be prepared but cannot be
closed while A2-C01 remains unresolved. H1/A4/R1/S1 work may be implemented and packaged where it
does not require fabricated live evidence, but their release gates remain evidence-bound.
