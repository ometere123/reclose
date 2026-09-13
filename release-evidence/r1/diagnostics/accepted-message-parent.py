# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
import genlayer as gl


class AcceptedMessageReproParent(gl.contract.Contract):
    child: gl.Address

    def __init__(self, child: gl.Address):
        self.child = child

    @gl.public.write
    def emit_accepted(self) -> None:
        gl.contract.get_at(self.child).emit(on="accepted").noop()

    @gl.public.write
    def emit_finalized(self) -> None:
        gl.contract.get_at(self.child).emit(on="finalized").noop()

    @gl.public.view
    def get_child(self) -> gl.Address:
        return self.child
