def test_direct_smoke_deploy_and_increment(direct_deploy):
    contract = direct_deploy("smoke_contract.py")
    assert contract.get_counter() == 0
    contract.increment()
    assert contract.get_counter() == 1
