# Security Invariant Matrix (A1 Attempt 2)

Maps CLAUDE.md Section 7's 15 invariants to their enforcement point and test evidence.

| # | Invariant | Enforcement | Test |
|---|---|---|---|
| 1 | No action without active delegated policy | `receive_decision` requires `target.active_policy_key` set | `test_no_action_without_active_policy` |
| 2 | No action outside finite allowed action set | `SUPPORTED_ACTIONS` set checked in `add_policy_effect` | `test_unsupported_action_rejected_at_policy_construction` |
| 3 | No arbitrary AI-generated calldata | No `execute`/generic-call method exists on Kernel or target; `ActionEnvelope.boundedParameters` closed to `paramU256`/`paramStr` | `test_arbitrary_calldata_impossible`, `scripts/test-action-envelope-negative.js` |
| 4 | No autonomous authority expansion | `_classify_expansion` + `activation_not_before` timelock, recomputed at activation | `test_same_count_*_is_expansion` (4 cases), `test_authority_expansion_timelock_uses_sealed_at_not_created_at` |
| 5 | Immutable constitutional Kernel | No upgrader method exists on `AssuranceKernel` | inspection (no such method in source) |
| 6 | Provisional actions bounded (explicit/reversible/idempotent/authority-reducing/non-value-moving) | `PROVISIONAL_SAFE_ACTIONS` set; `provisional_allowed` gate; PAUSE/ENTER_RECOVERY/RESTORE excluded from provisional-safe set | `test_provisional_disallowed_action_not_applied`, `test_provisional_allowed_false_suppresses_provisional_effects` |
| 7 | Irreversible/value-moving consequences require finality | Same PROVISIONAL_SAFE_ACTIONS exclusion; `ReferenceAgentProtocol.apply_assurance_action` independently rejects PAUSE/ENTER_RECOVERY/RESTORE at PROVISIONAL stage even if Kernel sent them | `tests/reference-agent/test_reference_agent_protocol.py` |
| 8 | Duplicate delivery cannot duplicate economic effect | canonical decision fingerprint (exact duplicate = no-op); target-side `processed_action_ids` idempotency | `test_replayed_decision_is_noop`, `test_duplicate_action_id_is_noop` |
| 9 | Stale policy cannot silently create new authority | `receive_decision` binds `policy_key`/`policy_version`/`policy_hash` against the active `PolicyHeader` | `test_stale_policy_key_decision_rejected`, `test_stale_policy_hash_decision_rejected` |
| 10 | Resolving Incident A cannot remove Incident B's restriction | `RestrictionRecord.incident_id`-scoped release | `test_resolving_incident_a_does_not_remove_incident_b_restriction`, `tests/model/test_model_vs_contract.py::test_trace_provisional_confirm_dual_incident_resolution` |
| 11 | Recovery cannot restore more authority than policy permits | `RESTORE` bounded to the Kernel-recomputed state; owner-level provider revocation not cleared by Kernel RESTORE | `test_human_override_restores_only_when_enabled`, `contracts/reference_agent_protocol.py::apply_assurance_action` RESTORE handling |
| 12 | Reporter/Sentinel does not vote on or determine truth | No Reporter-facing decision-authoring path exists in the Kernel; `receive_decision`'s `reporter` field is descriptive metadata only, never checked for authorization | inspection |
| 13 | Hosted API/indexer is not protocol authority | No hosted API exists in C1R scope; all proof is via direct CLI/RPC | N/A (C1R scope) |
| 14 | Final transaction status alone is not application success | `ExecutionReceipt`/`GenLayerTransactionLifecycle` schemas separate `finalStatus` from raw lifecycle; F1-v6 cross-field constraints | `scripts/test-transaction-truth-model.js` |
| 15 | External evidence is hostile/untrusted by default | Judge/evidence-handling is C2 scope (IncidentJudgeV1 does not exist); not applicable to C1R's Kernel-only surface | N/A (C2 scope) |
