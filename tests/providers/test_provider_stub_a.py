"""ProviderStubA tests (C1). Narrow, deterministic, idempotent economic stand-in."""


def test_fulfill_is_idempotent(direct_deploy, direct_vm, direct_owner):
    provider = direct_deploy("provider_stub_a.py")
    direct_vm.value = 100
    provider.fulfill("req-1")
    assert int(provider.get_total_received()) == 100
    assert provider.is_fulfilled("req-1") is True

    # Duplicate delivery of the same request_ref must not duplicate economic effect.
    direct_vm.value = 100
    provider.fulfill("req-1")
    assert int(provider.get_total_received()) == 100


def test_distinct_requests_accumulate(direct_deploy, direct_vm, direct_owner):
    provider = direct_deploy("provider_stub_a.py")
    direct_vm.value = 10
    provider.fulfill("req-a")
    direct_vm.value = 20
    provider.fulfill("req-b")
    assert int(provider.get_total_received()) == 30
