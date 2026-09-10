# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""ProviderStubA - minimal, realistic primary provider for the ReferenceAgentProtocol demo (C1).

Implements Implementation Specification Section 45/47's "Provider A primary" role. Deliberately
narrow and deterministic: it accepts a finalized GEN payment for a request reference and records
the fulfillment idempotently (duplicate request_ref -> no-op, never double-fulfilled or
double-paid). It has no authority over ReferenceAgentProtocol or the Kernel - it is economically
separate (CLAUDE.md Section 19: IncentiveVault/economic actors never gain target-control authority,
and providers here are the target's own dependency, not part of the assurance chain).
"""

import genlayer as gl


class ProviderStubA(gl.contract.Contract):
    owner: gl.Address
    fulfilled_requests: gl.storage.TreeMap[str, gl.u256]
    total_received: gl.u256

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.total_received = gl.u256(0)

    @gl.public.write.payable
    def fulfill(self, request_ref: str) -> None:
        if request_ref in self.fulfilled_requests:
            return  # idempotent: duplicate delivery cannot duplicate economic effect.
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
