# { "Depends": "py-genlayer:test" }
import genlayer as gl


class SmokeContract(gl.contract.Contract):
    counter: gl.u256

    def __init__(self):
        self.counter = gl.u256(0)

    @gl.public.write
    def increment(self) -> None:
        self.counter += gl.u256(1)

    @gl.public.view
    def get_counter(self) -> gl.u256:
        return self.counter
