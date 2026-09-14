# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
import genlayer as gl


class InternalMessageEmitProbe(gl.contract.Contract):
    @gl.public.write
    def emit_decided(self, child: gl.Address) -> None:
        gl.contract.get_at(child).emit(on="decided").noop()

    @gl.public.write
    def emit_finalized(self, child: gl.Address) -> None:
        gl.contract.get_at(child).emit(on="finalized").noop()
