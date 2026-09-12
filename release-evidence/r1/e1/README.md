# E1 canonical 61997 end-to-end evidence

This directory is the release-evidence boundary for the canonical Reclose R1 scenario on Studio-dev chain `61997`.

E1 is **not complete** at repository preparation time. The existing `run-template.json` is a schema-like operator template, not evidence of a successful run.

## Release rule

E1 closes only after **two independent clean deployments** complete the canonical scenario from deployment through restoration and final purchase. Each run must be recorded as a separate JSON artifact derived from `run-template.json` and must contain real contract addresses, transaction hashes, lifecycle observations, execution results and post-state evidence.

A run is not successful merely because the parent GenLayer transaction is accepted or finalized. Where the flow requires a triggered child transaction, the child execution must itself succeed. In particular, the Judge -> Kernel dispatch must not be recorded as successful unless the child reaches the required successful execution result and the expected target state is observed.

The repository currently records the Studio-dev limitation `fee no_matching_allocation # internal` for the Judge -> Kernel child. That limitation blocks E1 completion. It must not be converted into a pass by omitting the child, manually mutating target state, substituting Direct Mode evidence, or describing Judge-side semantic adjudication as end-to-end execution.

## Required clean-run sequence

Each run records, at minimum:

1. fresh contract deployment and construction verification;
2. target registration;
3. reference policy construction, readback, timelock and activation;
4. ReferenceAgentProtocol funding;
5. successful Provider A purchase with real test GEN;
6. canonical compromise report submission;
7. raw GenLayer transaction lifecycle;
8. provisional containment only when the actual RC path supports it;
9. final `CONFIRMED` Reclose decision;
10. successful Judge -> Kernel -> Target execution with Provider A restricted and safe mode observed;
11. successful AUTO purchase routed to Provider B with real test GEN;
12. remediation evidence submission;
13. entry into `RECOVERY`;
14. recovery-validation evidence submission;
15. restoration of Provider A and target `NORMAL` when policy permits;
16. successful final AUTO purchase;
17. complete causal trace linking evidence, decision, policy effect, parent/child transactions and target post-state.

## Verification

Run:

```bash
npm run e1:evidence:check
```

The checker is deliberately evidence-bound. It must fail while fewer than two complete successful clean-run artifacts exist. Do not add placeholder runs merely to satisfy the count.

## Evidence provenance

Only public non-secret evidence belongs here. Never commit private keys, wallet exports, seed phrases, API tokens or keystore passwords.
