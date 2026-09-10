# G0-TEST-01 Direct Mode report

## Command and result

```
python -m pytest test_direct_smoke.py -v -p no:cacheprovider -p no:gltest
```

Fixture used: `direct_deploy` from `gltest.direct.pytest_plugin` (auto-registered via the `genlayer-test==0.30.0rc2`
`pytest11` entry point `gltest_direct`). Pure in-memory execution - no Docker, no simulator process, no network
call. Contract used: the exact pinned smoke contract (`# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }`).

```python
def test_direct_smoke_deploy_and_increment(direct_deploy):
    contract = direct_deploy("smoke_contract.py")
    assert contract.get_counter() == 0
    contract.increment()
    assert contract.get_counter() == 1
```

## Result: PASS (on Linux/WSL Ubuntu; see CF-013 for the Windows-native finding)

```
============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-9.1.1, pluggy-1.6.0 -- /usr/bin/python3
rootdir: /tmp/reclose_g0
plugins: genlayer-test-0.30.0rc2
collecting ... collected 1 item

test_direct_smoke.py::test_direct_smoke_deploy_and_increment PASSED      [100%]
```

Full raw output: `release-evidence/r1/g0/direct-mode-test-output.txt`.

This proves, in-memory with only Python (no Docker/localnet/network):
- in-memory deployment succeeds (`direct_deploy("smoke_contract.py")` returns a live contract object);
- initial `get_counter()` returns `0`;
- `increment()` executes without error;
- post-state `get_counter()` returns `1`;
- the test ran through plain `pytest` using the supported Direct Mode fixture (`direct_deploy`), from the exact
  pinned `genlayer-test==0.30.0rc2` package.

## CF-013 (see compatibility record): Windows-native Direct Mode failure, worked around via WSL

The first attempt, run natively on the Windows host with the identical pinned `genlayer-test==0.30.0rc2`
environment (`C:\g0\venv`), failed with:

```
PermissionError: [WinError 32] The process cannot access the file because it is being used by another process:
'C:\\Users\\USER\\AppData\\Local\\Temp\\tmp...'
```

raised from `gltest/direct/loader.py::_inject_message_to_fd0`, which duplicates a temp file onto stdin (fd 0) via
`os.dup2` and then calls `os.unlink(path)` while that duplicated handle is still open. This is valid on POSIX
(unlinking an open file only removes the directory entry; the file stays accessible through the open descriptor)
but is not valid on Windows, where a file cannot be deleted while any handle to it remains open. This is a
genuine, disclosed platform-compatibility bug in `genlayer-test==0.30.0rc2`'s Direct Mode implementation on
Windows, not a Reclose defect - it was not silently patched or worked around inside Reclose's own code.

To obtain an actual passing Direct Mode run with the identical pinned package version and pinned contract, the
same test was executed under WSL (Ubuntu, Python 3.12.3) - a POSIX environment where the same code path succeeds
as designed, confirmed by GitHub's own documented behaviour for Direct Mode ("Python only, in-memory, no
Docker/simulator/network"). No Docker, simulator, or network dependency was introduced by this - WSL provided only
a POSIX filesystem for `os.unlink`-while-open semantics.

This is recorded as CF-013 (C1: implementation refinement / host-platform compatibility note) in
`docs/execution/Studio-dev Toolchain & Network Compatibility Record.md`.
