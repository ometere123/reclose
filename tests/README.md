# tests/

Repository test suites (contract lint/schema, Kernel state machine, policy composition, replay/idempotency,
Judge input/precheck, prompt injection, recovery, economics, fee profile, SDK/tracker, Sentinel, frontend,
accessibility, E2E, benchmark - see CLAUDE.md Section 36).

Test helpers, fixtures, and `conftest.py` files belong here, never under `contracts/` (see `contracts/README.md`
for the enforced discovery boundary).

No product test suites exist yet as of F0 - C1+ scope. `frontend-fixtures/` under this directory holds only the
F1 synthetic fixtures used to schema-validate the Frontend Contract v1 types (not live protocol behaviour).
