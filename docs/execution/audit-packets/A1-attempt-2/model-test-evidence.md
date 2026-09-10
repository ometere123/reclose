# Independent Reference Model Evidence (A1 Attempt 2, Section 20)

`tests/model/kernel_model.py` is a pure-Python reference model of the Kernel security state
machine. It does NOT import `contracts/assurance_kernel.py` and is deliberately organised
differently (dict-of-dataclasses, a single dispatcher method) from the production Kernel's
storage-map/composite-key style, per the instruction's "independent oracle, not copy/paste"
requirement.

## Coverage against the Section 20 required-scenario list

Covered by `tests/model/test_model_adversarial.py` (12 tests, pure-model, no GenVM dependency):
no active policy; wrong Judge; wrong judge version; stale policy key; stale policy version;
stale policy hash; exact replay; conflicting replay; same-count authority expansion; reduction;
more-than-four-effects-for-one-rule rejected; remediation requires an eligible parent.

Covered by `tests/model/test_model_vs_contract.py` (5 tests, trace comparison against the real
Direct Mode contract via the `kernel_harness` fixture): dual-incident restriction composition
with resolve-one-leaves-other; final undetermined -> monitored; confirmed -> remediation
confirmed -> recovery -> validated -> released full lifecycle; overlay suppression (disabled
action blocks both restriction creation and dispatch); resolve-weaker-first-leaves-stronger.

**Not covered by the independent model this pass** (proven only via the real Direct Mode
contract, `tests/kernel/test_authority.py`, not via a separate independent-model trace):
wrong owner; overlay suppression for disabled resource specifically (action-disable is covered,
resource-disable is not, in the model); action redelivery idempotency (target-side, tested in
`tests/reference-agent/`); resource restore only on aggregate-count-reaches-zero; policy
replacement clearing only eligible policy-replacement monitor holds; invalid identifier/hash
edge cases beyond malformed hash (covered directly on the contract, not modeled).

## Two real bugs found by this exercise

Both were bugs in the MODEL, not the contract - divergence is a useful signal in both
directions, and this is exactly what an independent-model trace comparison is for:

1. `ENTER_SAFE_MODE` was missing from the model's `PROVISIONAL_SAFE_ACTIONS` set. The contract
   correctly includes it (matching the original R1 `PROVISIONAL_SAFE_ACTIONS` design documented
   in `contracts/assurance_kernel.py`); the model's exclusion was a modeling error, caught when
   `test_trace_final_undetermined_becomes_monitored` diverged (contract said SAFE_MODE, model said
   NORMAL).
2. The model's remediation/recovery-validation paths raised an unhandled `KeyError` instead of a
   `ModelError` for an unknown `parent_incident_id`, caught by
   `test_remediation_requires_parent_final_confirmed`.

Both fixed in commit `d641cc8`; 17/17 model tests pass, and all 5 trace tests agree with the real
contract at every checkpoint after the fix.
