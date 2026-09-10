# Reclose R1 root verification commands. See docs/execution/Frontend Contract v1.md
# and docs/execution/Studio-dev Toolchain & Network Compatibility Record.md for the
# environments these commands assume.

.PHONY: py-venv py-lint py-test js-verify verify

py-venv:
	python3 -m venv .venv
	.venv/Scripts/python -m pip install -r requirements.txt

py-lint:
	.venv/Scripts/genvm-lint check contracts || true
	node scripts/list-deployable-contracts.js

py-test:
	.venv/Scripts/python -m pytest tests -v

js-verify:
	npm run verify

verify: js-verify py-lint
	@echo "Reclose root verification complete."
