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

    def __init__(self, owner_addr, kernel_addr, dispatch_log, target_id="target-001", revoked_flag=None, controller_addr=None, unsupported_actions=None, unsupported_resources=None):
        self._owner_addr = owner_addr
        self._kernel_addr = kernel_addr
        self._dispatch_log = dispatch_log
        self._target_id = target_id
        # C1-FINAL Section 7 (A1-H18): a mutable box (list) so tests can flip live revocation
        # after the proxy is constructed, simulating target-side revocation mid-test.
        self._revoked_flag = revoked_flag if revoked_flag is not None else [False]
        self._controller_addr = controller_addr if controller_addr is not None else [kernel_addr]
        # C1-FINAL Section 10: mutable sets so tests can simulate a target that does NOT support
        # a given action/resource combination.
        self._unsupported_actions = unsupported_actions if unsupported_actions is not None else set()
        self._unsupported_resources = unsupported_resources if unsupported_resources is not None else set()

    def view(self):
        return self

    def get_owner(self):
        return self._owner_addr

    def get_assurance_owner(self):
        return self._owner_addr

    def get_assurance_controller(self):
        return self._controller_addr[0]

    def get_assurance_target_id(self):
        return self._target_id

    def is_assurance_authority_revoked(self):
        return self._revoked_flag[0]

    def supports_assurance_action(self, action_type, resource_id):
        """C1-FINAL Section 10: defaults to True (matches every existing test's assumption that
        the fake target supports whatever effect is registered) unless a test explicitly narrows
        it via unsupported_actions/unsupported_resources."""
        if int(action_type) in self._unsupported_actions:
            return False
        if resource_id in self._unsupported_resources:
            return False
        return True

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

    class DispatchLog(list):
        """Plain list (unchanged len()/append() semantics for every existing test) that ALSO
        carries the mutable revocation/controller boxes a test can flip to simulate target-side
        revocation (C1-FINAL Section 7, A1-H18) without changing the 4-tuple fixture shape every
        existing test already unpacks."""
        pass

    dispatch_log = DispatchLog()
    dispatch_log.revoked_flag = [False]
    dispatch_log.controller_addr = [kernel.address]
    dispatch_log.unsupported_actions = set()
    dispatch_log.unsupported_resources = set()
    orig_get_at = gl.contract.get_at
    gl.contract.get_at = lambda addr: FakeTargetProxy(
        owner_addr, kernel.address, dispatch_log, "target-001", dispatch_log.revoked_flag, dispatch_log.controller_addr,
        dispatch_log.unsupported_actions, dispatch_log.unsupported_resources,
    )

    yield kernel, gl, owner_addr, dispatch_log

    gl.contract.get_at = orig_get_at


@pytest.fixture
def fresh_kernel_with_proxy(direct_deploy, direct_owner):
    """Like kernel_harness, but does NOT pre-inject a TargetRecord - for testing
    register_target()'s own live handshake (C1-FINAL Section 6, A1-H15) against the
    FakeTargetProxy. Returns (kernel, gl, owner_addr, target_addr, dispatch_log)."""
    kernel = direct_deploy("assurance_kernel.py", 1, 60)
    mod = sys.modules[type(kernel).__module__]
    gl = mod.gl

    owner_addr = gl.Address(bytes(direct_owner))
    target_addr = gl.Address(b"\x22" * 20)

    class DispatchLog(list):
        pass

    dispatch_log = DispatchLog()
    dispatch_log.revoked_flag = [False]
    dispatch_log.controller_addr = [kernel.address]
    dispatch_log.target_id = ["target-001"]
    orig_get_at = gl.contract.get_at
    gl.contract.get_at = lambda addr: FakeTargetProxy(
        owner_addr, kernel.address, dispatch_log, dispatch_log.target_id[0],
        dispatch_log.revoked_flag, dispatch_log.controller_addr,
    )

    yield kernel, gl, owner_addr, target_addr, dispatch_log

    gl.contract.get_at = orig_get_at
