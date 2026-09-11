"""Direct Mode helpers for hardened IncentiveVault."""

import sys
import pytest


class FakeKernelForVault:
    def __init__(self, state):
        self.state = state

    def view(self):
        return self

    def get_incident_final_outcome(self, incident_id):
        return self.state["outcomes"].get(incident_id, 0)

    def get_policy_header(self, policy_key):
        # version, manifest_hash, sealed, active, human_override_enabled
        return (self.state["policy_version"], "0x" + "1" * 64, True, True, True)

    def get_policy_rule_economics(self, policy_key, rule_id):
        return (self.state["report_bond"], self.state["confirmed_bounty"])


class FakeRecipient:
    transfers = None

    def __init__(self, address):
        self.address = address

    def emit_transfer(self, value):
        self.transfers.append({"address": self.address, "value": int(value)})


@pytest.fixture
def vault_harness(direct_deploy, direct_owner, direct_alice):
    # kernel=alice(stub), judge=owner(stub)
    vault = direct_deploy("incentive_vault.py", direct_alice, direct_owner, 1)
    mod = sys.modules[type(vault).__module__]
    gl = mod.gl
    state = {
        "outcomes": {},
        "policy_version": 1,
        "report_bond": 100,
        "confirmed_bounty": 50,
    }
    transfers = []
    original_get_at = gl.contract.get_at
    original_recipient = mod._Recipient
    gl.contract.get_at = lambda _addr: FakeKernelForVault(state)
    FakeRecipient.transfers = transfers
    mod._Recipient = FakeRecipient
    yield vault, gl, state, transfers
    gl.contract.get_at = original_get_at
    mod._Recipient = original_recipient
