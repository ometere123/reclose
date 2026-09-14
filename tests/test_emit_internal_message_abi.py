"""Schema fixture tests for the pinned GenVM Manager v0.6.0-rc4 message ABI.

`PinnedEmitPhase` models the exact executor enum from genvm-executor v0.3.x
commit 561fbaaf9578e5600dbfa622de96007afc8c18ab. It is a version-pinned schema
fixture, not a runner serialization test. The separate Direct Mode test in
`tests/runner/test_emit_internal_message_wire.py` invokes the actual contract
emitter and captures its decoded host-call payload.
"""

from enum import Enum

import pytest


class PinnedEmitPhase(str, Enum):
    DECIDED = "decided"
    FINALIZED = "finalized"


def decode_emit_internal_message(payload):
    """Model the pinned executor's typed `on` field after message decoding."""
    return PinnedEmitPhase(payload["on"])


def test_legacy_accepted_phase_is_rejected_by_pinned_executor_abi():
    with pytest.raises(ValueError):
        decode_emit_internal_message({"on": "accepted"})


@pytest.mark.parametrize("phase", ["decided", "finalized"])
def test_runner_supported_emit_phases_decode(phase):
    assert decode_emit_internal_message({"on": phase}).value == phase
