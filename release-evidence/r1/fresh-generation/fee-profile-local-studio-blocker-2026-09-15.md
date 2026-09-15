# Local Studio fee-profile attempt — blocked

The official RC2 fee-profile plugin was confirmed and the dedicated test was
run against a local glsim instance. The run did not produce a release profile.

Command:

    C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Scripts\glsim.exe --port 4002 --chain-id 61997 --no-browser --verbose
    C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Scripts\gltest.exe tests/integration/test_activate_policy_fee_profile.py --network localnet --rpc-url http://127.0.0.1:4002/api --fee-profile release-evidence/r1/fresh-generation/activate-policy-fee-profile.json --fee-profile-headroom 1.25 -v -s

The local node returned finalized-shaped receipts, but every consensus
observation failed before contract execution because the current source pins:

    py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng

The exact receipt error was:

    runner py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng
    not under C:\Users\USER\.cache\gltest-direct\trees-v2\v0.6.0-rc4

The default local node used v0.6.0-rc5 and produced the same resolution
failure. The repository's toolchain/runner.lock identifies the pinned hash
as the verified Studio-dev/61997 runner. Selecting the cache root via
GENVM_PREBUILT_DIR did not resolve it because that cache root is inaccessible
to this execution context and does not contain the pinned runner at the
expected path.

The generated file was moved to
activate-policy-fee-profile.failed-2026-09-15.json; it contains zero
allocations and is explicitly not a valid profile. No live Studio Next
contract or policy was touched.
