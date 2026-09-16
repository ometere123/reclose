"""Minimal external-agent target adapter for Reclose.

Replace the provider and business-operation sections with the external agent's own
bounded operations. The assurance surface intentionally exposes typed actions only.
"""
import genlayer as gl

ACTION_MONITOR = 2
ACTION_RESTRICT = 3
ACTION_ENTER_SAFE_MODE = 7
ACTION_PAUSE = 8
ACTION_ENTER_RECOVERY = 9
ACTION_RESTORE = 10
PROVISIONAL = 1
FINAL = 2


class ExternalAgentTarget(gl.contract.Contract):
    def __init__(self, target_id: str, provider_a: gl.Address, provider_b: gl.Address) -> None:
        self.owner = gl.message.sender_address
        self.target_id = target_id
        self.kernel = gl.Address("0x" + "0" * 40)
        self.controller_set = False
        self.provider_a = gl.Address(provider_a)
        self.provider_b = gl.Address(provider_b)
        self.provider_a_enabled = True
        self.provider_b_enabled = True
        self.state = gl.u8(0)  # NORMAL
        self.processed_actions: gl.storage.TreeMap[str, bool]

    def _require(self, condition: bool, message: str) -> None:
        if not condition:
            raise gl.vm.UserError(message)

    @gl.public.write
    def set_assurance_controller(self, kernel: gl.Address) -> None:
        self._require(gl.message.sender_address == self.owner, "UNAUTHORIZED_OWNER")
        self._require(not self.controller_set, "CONTROLLER_ALREADY_SET")
        self.kernel = gl.Address(kernel)
        self.controller_set = True

    @gl.public.view
    def get_assurance_owner(self) -> gl.Address:
        return self.owner

    @gl.public.view
    def get_assurance_target_id(self) -> str:
        return self.target_id

    @gl.public.view
    def is_assurance_authority_revoked(self) -> bool:
        return False

    @gl.public.view
    def supports_assurance_action(self, action_type: gl.u8, resource_id: str) -> bool:
        action = int(action_type)
        if action in (ACTION_MONITOR, ACTION_ENTER_SAFE_MODE, ACTION_PAUSE, ACTION_ENTER_RECOVERY):
            return resource_id == ""
        if action == ACTION_RESTRICT:
            return resource_id in ("provider_a", "provider_b")
        if action == ACTION_RESTORE:
            return resource_id in ("provider_a", "provider_b", "")
        return False

    @gl.public.write
    def apply_assurance_action(
        self, action_id: str, incident_id: str, policy_key: str,
        action_type: gl.u8, resource_id: str, param_u256: gl.u256,
        param_str: str, decision_stage: gl.u8,
    ) -> None:
        self._require(self.controller_set and gl.message.sender_address == self.kernel, "UNAUTHORIZED_KERNEL")
        self._require(int(decision_stage) in (PROVISIONAL, FINAL), "INVALID_STAGE")
        if action_id in self.processed_actions:
            return
        self.processed_actions[action_id] = True
        self._require(self.supports_assurance_action(action_type, resource_id), "UNSUPPORTED_ACTION")
        if int(decision_stage) == PROVISIONAL:
            self._require(int(action_type) in (ACTION_MONITOR, ACTION_RESTRICT, ACTION_ENTER_SAFE_MODE), "PROVISIONAL_ACTION_FORBIDDEN")
        if int(action_type) == ACTION_RESTRICT:
            if resource_id == "provider_a":
                self.provider_a_enabled = False
            else:
                self.provider_b_enabled = False
            self.state = gl.u8(2)
        elif int(action_type) == ACTION_ENTER_SAFE_MODE:
            self.state = gl.u8(3)
        elif int(action_type) == ACTION_PAUSE:
            self.state = gl.u8(4)
        elif int(action_type) == ACTION_ENTER_RECOVERY:
            self.state = gl.u8(5)
        elif int(action_type) == ACTION_RESTORE:
            if resource_id == "provider_a":
                self.provider_a_enabled = True
            elif resource_id == "provider_b":
                self.provider_b_enabled = True
            else:
                self.state = gl.u8(int(param_u256))

    @gl.public.view
    def get_state(self) -> gl.u8:
        return self.state
