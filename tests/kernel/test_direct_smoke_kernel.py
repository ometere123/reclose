def test_direct_smoke_kernel_deploys(direct_deploy):
    kernel = direct_deploy("assurance_kernel.py", 1, 60)
    assert kernel.protocol_schema_version == 1
