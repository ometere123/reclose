# Fee-profile tooling verification

Date: 2026-09-15. Workspace: Reclose. No live policy or Studio Next state was modified.

Version command:

```text
python -c "import importlib.metadata as m; print(m.version('genlayer-test'))"
0.30.0rc2
```

Installed executable:

```text
C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Scripts\gltest.exe
```

The executable was invoked directly because `gltest` is not on the current PowerShell PATH:

```powershell
& 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Scripts\gltest.exe' --help
```

The help output is pytest help and does not contain `--fee-profile` or `--fee-profile-headroom`. `python -m pytest --help` likewise does not contain either option.

Installed package inspection found `gltest/fees/profile.py` with `FeeProfileCollector`, `record_method`, and `build_profile`, but no CLI/pytest option registration for those flags. The installed package therefore does not expose the interface required by the requested command, despite having the internal collector implementation.

Conclusion: no developer fee profile was fabricated or generated, and no live activation was attempted. The sealed Studio Next policy remains untouched.
