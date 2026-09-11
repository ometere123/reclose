"""Direct Mode test helpers for IncentiveVault (C2). Deploys ONLY the Vault and monkeypatches
gl.contract.get_at with a FakeKernelForVault (answers get_incident_final_outcome) plus records
any outbound claim dispatch, so the Vault's OWN bond/settlement/claim logic is proven without a
second live contract."""

import sys
import pytest


class FakeKernelForVault:
    def __init__(self, outcomes, claim_log):
        self._outcomes = outcomes  # dict: incident_id -> outcome int
        self._claim_log = claim_log

    def view(self):
        return self

    def get_incident_final_outcome(self, incident_id):
        return self._outcomes.get(incident_id, 0)

    def emit(self, **kwargs):
        return self

    def fulfill_vault_claim(self, bond_id):
        self._claim_log.append({"bond_id": bond_id})


@pytest.fixture
def vault_harness(direct_deploy, direct_owner, direct_alice):
    vault = direct_deploy("incentive_vault.py", direct_alice, direct_owner, 1)  # kernel=alice(stub), judge=owner(stub)
    mod = sys.modules[type(vault).__module__]
    gl = mod.gl

    outcomes = {}
    claim_log = []
    orig_get_at = gl.contract.get_at

    def _get_at(addr):
        return FakeKernelForVault(outcomes, claim_log)

    gl.contract.get_at = _get_at

    yield vault, gl, outcomes, claim_log

    gl.contract.get_at = orig_get_at
