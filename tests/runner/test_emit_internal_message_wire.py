"""Exercise the pinned Python contract runner's real EmitInternalMessage encoder."""

import pytest
import sys


@pytest.mark.parametrize(
    ("method", "expected_phase"),
    [("emit_decided", "decided"), ("emit_finalized", "finalized")],
)
def test_pinned_runner_serializes_supported_emit_phase(
    direct_deploy, direct_vm, method, expected_phase
):
    expected_child = b"\x23" * 20
    probe = direct_deploy("tests/fixtures/emit_internal_message_probe.py")
    observed = []

    def capture_gl_call(_vm, request):
        if "EmitInternalMessage" in request:
            observed.append(request["EmitInternalMessage"])
            return {"ok": None}
        return None

    direct_vm._gl_call_hook = capture_gl_call
    gl = sys.modules[type(probe._instance).__module__].gl
    probe_method = getattr(probe, method)
    probe_method(gl.Address(bytes(expected_child)))

    assert len(observed) == 1
    message = observed[0]
    assert message["on"] == expected_phase
    assert message["address"].as_hex.lower() == "0x" + expected_child.hex()
    assert message["calldata"] == {"": "noop"}
    assert int(message["value"]) == 0
    assert "use_balance" not in message
    assert "fee_params" not in message
