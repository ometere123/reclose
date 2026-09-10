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

# `npm run verify` (invoked by js-verify) already includes the Python conditional gate
# (scripts/py-verify.sh via the `verify:py` npm script), so `verify` here is just an alias -
# there is exactly one canonical verification path, per A0-R5.
verify: js-verify
	@echo "Reclose root verification complete."
