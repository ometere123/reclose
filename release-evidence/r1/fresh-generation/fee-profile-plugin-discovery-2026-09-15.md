# Fee-profile plugin discovery evidence

This is environment-discovery evidence only. No Reclose test suite was executed
and no live policy or contract state was changed during this check.

## Authoritative installed interpreter

Command:

```powershell
& 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe' -c "import sys, importlib.metadata as m; d=m.distribution('genlayer-test'); print('python=',sys.executable); print('version=',d.version); print('dist=',d.locate_file('')); print('ENTRY POINTS'); [print(e.group, e.name, e.value) for e in d.entry_points if e.group in ('pytest11','console_scripts')]"
```

Raw output:

```text
python= C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe
version= 0.30.0rc2
dist= C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages
ENTRY POINTS
console_scripts glsim glsim.__main__:main
console_scripts gltest gltest_cli.main:main
pytest11 gltest gltest_cli.config.plugin
pytest11 gltest_direct gltest.direct.pytest_plugin
```

Command:

```powershell
& 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe' -c "import os; print('PYTEST_DISABLE_PLUGIN_AUTOLOAD=',repr(os.environ.get('PYTEST_DISABLE_PLUGIN_AUTOLOAD'))); print('PYTEST_ADDOPTS=',repr(os.environ.get('PYTEST_ADDOPTS')))"
```

Raw output:

```text
PYTEST_DISABLE_PLUGIN_AUTOLOAD= None
PYTEST_ADDOPTS= None
```

## Exact plugin implementation

Command:

```powershell
& 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe' -c "import gltest, gltest_cli.config.plugin as p, inspect; print('gltest=',gltest.__file__); print('plugin=',inspect.getsourcefile(p)); print('has_pytest_addoption=',hasattr(p,'pytest_addoption')); print(inspect.getsource(p.pytest_addoption))"
```

Raw output identified:

```text
gltest= C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\gltest\__init__.py
plugin= C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\gltest_cli\config\plugin.py
has_pytest_addoption= True
pytest_addoption registers --fee-profile and --fee-profile-headroom in the gltest group.
```

## Pytest entry-point discovery

Command:

```powershell
& 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe' -c "import importlib.metadata as m; print([str(e) for e in m.entry_points(group='pytest11') if 'gltest' in e.name.lower() or 'gltest' in e.value.lower()])"
```

Raw output:

```text
["EntryPoint(name='gltest', value='gltest_cli.config.plugin', group='pytest11')", "EntryPoint(name='gltest_direct', value='gltest.direct.pytest_plugin', group='pytest11')"]
```

## Plugin registration and options

Command:

```powershell
& 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe' -m pytest --trace-config --collect-only -q
```

Relevant raw output:

```text
PLUGIN registered: <module 'gltest_cli.config.plugin' from 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\gltest_cli\config\plugin.py'>
PLUGIN registered: <module 'gltest.direct.pytest_plugin' from 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\gltest\direct\pytest_plugin.py'>
225 tests collected in 0.65s
```

Command:

```powershell
& 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\Scripts\gltest.exe' --help
```

Relevant raw output:

```text
--fee-profile=FEE_PROFILE
--fee-profile-headroom=FEE_PROFILE_HEADROOM
```

Command:

```powershell
& 'C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe' -m pytest --help
```

Relevant raw output:

```text
--fee-profile=FEE_PROFILE
--fee-profile-headroom=FEE_PROFILE_HEADROOM
```

The bare PowerShell `python` command currently resolves to the inaccessible
Windows Store alias `C:\Users\USER\AppData\Local\Microsoft\WindowsApps\python.exe`;
`where.exe python` and `where.exe gltest` returned no usable PATH command.
The pinned installed interpreter and absolute `gltest.exe` path above are the
reproducible commands for the next profiling step.
