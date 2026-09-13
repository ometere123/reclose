# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
import genlayer as gl


class AcceptedMessageReproChild(gl.contract.Contract):
    @gl.public.write
    def noop(self) -> None:
        return

    @gl.public.view
    def ping(self) -> bool:
        return True
