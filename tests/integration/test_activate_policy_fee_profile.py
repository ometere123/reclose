"""Studio-mode developer measurement for the current Kernel activation path."""

from pathlib import Path
import hashlib
import time

from gltest import get_contract_factory
from gltest.accounts import get_default_account
from gltest.utils import extract_contract_address

ROOT = Path(__file__).resolve().parents[2]
KERNEL = ROOT / "contracts" / "assurance_kernel.py"
TARGET = ROOT / "contracts" / "reference_agent_protocol.py"
PROVIDER_A = ROOT / "contracts" / "provider_stub_a.py"
PROVIDER_B = ROOT / "contracts" / "provider_stub_b.py"
TARGET_ID = "fee-profile-target"
POLICY_KEY = "fee-profile-policy"
MANIFEST_HASH = "0x" + "ab" * 32
JUDGE = "0x" + "11" * 20

def _deploy(path, account, *args):
    factory = get_contract_factory(contract_file_path=path)
    receipt = factory.deploy_contract_tx(
        args=list(args), account=account, wait_until="finalized",
        wait_transaction_status="FINALIZED", wait_interval=1000, wait_retries=120
    )
    print("DEPLOY_RECEIPT_KEYS", sorted(receipt))
    print("DEPLOY_RECEIPT", receipt)
    assert receipt.get("execution_result") in ("SUCCESS", "success", None)
    return factory.build_contract(extract_contract_address(receipt), account=account), receipt

def _write(contract, method, args):
    receipt = getattr(contract, method)(args).transact(
        wait_until="finalized", wait_transaction_status="FINALIZED",
        wait_interval=1000, wait_retries=120
    )
    print("WRITE_RECEIPT_KEYS", sorted(receipt))
    print("WRITE_RECEIPT", receipt)
    assert receipt.get("execution_result") in ("SUCCESS", "success", None)
    return receipt

def test_current_kernel_activate_policy_fee_profile(gl_client, default_account, request):
    account = default_account or get_default_account()
    provider_a, receipt_a = _deploy(PROVIDER_A, account)
    provider_b, receipt_b = _deploy(PROVIDER_B, account)
    target, receipt_target = _deploy(
        TARGET, account, account.address, TARGET_ID, provider_a.address,
        provider_b.address, 100, 10, True
    )
    kernel, receipt_kernel = _deploy(KERNEL, account, 1, 60)
    _write(target, "set_assurance_controller", [kernel.address])
    _write(kernel, "register_target", [TARGET_ID, target.address, True])
    _write(kernel, "begin_policy", [TARGET_ID, POLICY_KEY, MANIFEST_HASH])
    for resource in ("provider_a", "provider_b"):
        _write(kernel, "add_policy_resource", [POLICY_KEY, resource])
    rules = [
        ("PROVIDER_COMPROMISE_V1", JUDGE, 1, 1, True, 0, 0),
        ("REMEDIATION_CONFIRMED_V1", JUDGE, 1, 2, False, 0, 0),
        ("RECOVERY_VALIDATED_V1", JUDGE, 1, 3, False, 0, 0),
    ]
    for rule in rules:
        _write(kernel, "add_policy_rule", [POLICY_KEY, *rule])
    effects = [
        ("PROVIDER_COMPROMISE_V1", 3, "provider_a", 0, "", 1),
        ("PROVIDER_COMPROMISE_V1", 7, "", 0, "", 1),
        ("REMEDIATION_CONFIRMED_V1", 9, "", 0, "", 2),
        ("RECOVERY_VALIDATED_V1", 10, "", 0, "", 2),
    ]
    for effect in effects:
        _write(kernel, "add_policy_effect", [POLICY_KEY, *effect])
    _write(kernel, "seal_policy", [POLICY_KEY])
    # The local Studio clock is wall-clock based; honor the real 60-second
    # constructor delay rather than using time control or changing the source.
    time.sleep(65)
    # glsim RC2 currently cannot decode gen_call read requests on Windows
    # (the write path is fully supported and is the path measured by this
    # profiler). Keep the activation branch receipt-backed and avoid treating
    # that unrelated local read adapter defect as a successful measurement.
    activation_receipt = _write(kernel, "activate_policy", [POLICY_KEY])
    request.node.user_properties.append(("kernel_source_sha256", hashlib.sha256(KERNEL.read_bytes()).hexdigest()))
    request.node.user_properties.append(("target_source_sha256", hashlib.sha256(TARGET.read_bytes()).hexdigest()))
    request.node.user_properties.append(("policy_shape", "resources=2 rules=3 effects=4"))
    request.node.user_properties.append(("activation_receipt", str(activation_receipt)))
    request.node.user_properties.append(("deployment_receipts", str([receipt_a, receipt_b, receipt_target, receipt_kernel])))
