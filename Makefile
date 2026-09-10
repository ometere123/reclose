# Reclose R1 root verification commands. See docs/execution/Frontend Contract v1.md
# and docs/execution/Studio-dev Toolchain & Network Compatibility Record.md for the
# environments these commands assume.

.PHONY: py-venv py-lint py-test js-verify verify

py-venv:
	python3 -m venv .venv
	.venv/Scripts/python -m pip install -r requirements.txt

py-lint:
	bash scripts/py-verify.sh

py-test:
	bash scripts/py-verify.sh

js-verify:
	npm run verify

verify: js-verify py-lint
	@echo "Reclose root verification complete."
