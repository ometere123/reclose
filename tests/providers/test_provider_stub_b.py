"""ProviderStubB tests (C1). Narrow, deterministic, idempotent economic stand-in."""


def test_fulfill_is_idempotent(direct_deploy, direct_vm, direct_owner):
    provider = direct_deploy("provider_stub_b.py")
    direct_vm.value = 50
    provider.fulfill("req-2")
    assert int(provider.get_total_received()) == 50
    direct_vm.value = 50
    provider.fulfill("req-2")
    assert int(provider.get_total_received()) == 50
