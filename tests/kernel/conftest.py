"""Shared Direct Mode test helpers for AssuranceKernel (C1).

genlayer-test 0.30.0rc2's Direct Mode only permits ONE `gl.contract.Contract` subclass to be
loaded per test function (confirmed by direct experimentation: two different contract types can
be deployed across different tests in the same pytest session without conflict - each test gets
a fresh `direct_vm`/registry - but deploying two different contract types within a single test
function trips a "only one contract is allowed" guard). This makes genuine cross-contract
(Kernel <-> Target) interaction untestable WITHIN ONE TEST in Direct Mode. To still unit-test the
Kernel's own security logic in isolation, these helpers:
  1. deploy ONLY the Kernel;
  2. inject a TargetRecord directly into Kernel storage (bypassing register_target's live-owner
     handshake, which itself requires a second live contract to answer);
  3. monkeypatch `gl.contract.get_at` (the module the Kernel imports as `gl`) with a fake proxy
     that answers get_owner/get_assurance_controller/apply_assurance_action deterministically.

This proves the Kernel's OWN decision logic (default-deny, timelocks, replay protection,
restriction composition, state monotonicity) correctly, but does NOT prove the real cross-contract
wire format/behavior against an actual second contract - that requires the live Studio-dev E2E
proof step, which remains mandatory per the Master Plan for exactly this reason.
"""

import sys
import pytest


class FakeTargetProxy:
    """Stands in for a live Target contract during Kernel-only Direct Mode tests."""

    def __init__(self, owner_addr, kernel_addr, dispatch_log):
        self._owner_addr = owner_addr
        self._kernel_addr = kernel_addr
        self._dispatch_log = dispatch_log

    def view(self):
        return self

    def get_owner(self):
        return self._owner_addr

    def get_assurance_controller(self):
        return self._kernel_addr

    def emit(self, **kwargs):
        return self

    def apply_assurance_action(self, action_id, incident_id, policy_key, action_type, resource_id, param_u256, param_str, decision_stage):
        self._dispatch_log.append(
            {
                "action_id": action_id,
                "incident_id": incident_id,
                "policy_key": policy_key,
                "action_type": action_type,
                "resource_id": resource_id,
                "decision_stage": decision_stage,
            }
        )


@pytest.fixture
def kernel_harness(direct_deploy, direct_owner):
    """Deploys a fresh Kernel, registers one target ("target-001") via direct storage injection,
    and monkeypatches gl.contract.get_at with a FakeTargetProxy. Returns
    (kernel, gl, owner_addr, dispatch_log)."""
    kernel = direct_deploy("assurance_kernel.py", 1, 60)
    mod = sys.modules[type(kernel).__module__]
    gl = mod.gl
    TargetRecord = mod.TargetRecord

    owner_addr = gl.Address(bytes(direct_owner))
    target_addr = gl.Address(b"\x22" * 20)

    rec = TargetRecord()
    rec.target_address = target_addr
    rec.cached_owner = owner_addr
    rec.state = gl.u8(0)
    rec.active_policy_key = ""
    rec.registered_at = gl.u64(1000)
    rec.policy_generation = gl.u32(0)
    rec.authority_revoked = False
    rec.human_override_enabled = True
    kernel.targets["target-001"] = rec
    kernel.target_ids.append("target-001")

    dispatch_log = []
    orig_get_at = gl.contract.get_at
    gl.contract.get_at = lambda addr: FakeTargetProxy(owner_addr, kernel.address, dispatch_log)

    yield kernel, gl, owner_addr, dispatch_log

    gl.contract.get_at = orig_get_at
