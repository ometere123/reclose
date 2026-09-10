# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""ProviderStubB - minimal, realistic fallback provider for the ReferenceAgentProtocol demo (C1).

Implements Implementation Specification Section 45/46's "Provider B fallback" role - structurally
identical to ProviderStubA (same fulfill/idempotency contract) so AUTO provider selection (Section
46) can switch between them deterministically without either provider needing to know about the
Kernel, incidents, or assurance state at all.
"""

import genlayer as gl


class ProviderStubB(gl.contract.Contract):
    owner: gl.Address
    fulfilled_requests: gl.storage.TreeMap[str, gl.u256]
    total_received: gl.u256

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.total_received = gl.u256(0)

    @gl.public.write.payable
    def fulfill(self, request_ref: str) -> None:
        if request_ref in self.fulfilled_requests:
            return
        self.fulfilled_requests[request_ref] = gl.message.value
        self.total_received = gl.u256(int(self.total_received) + int(gl.message.value))

    @gl.public.view
    def get_owner(self) -> gl.Address:
        return self.owner

    @gl.public.view
    def is_fulfilled(self, request_ref: str) -> bool:
        return request_ref in self.fulfilled_requests

    @gl.public.view
    def get_total_received(self) -> gl.u256:
        return self.total_received
