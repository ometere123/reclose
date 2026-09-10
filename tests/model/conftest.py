"""Reuses the kernel_harness fixture from tests/kernel/conftest.py for model-vs-contract trace
tests (C1R Section 20). Importing the fixture function re-registers it under this directory's
conftest, per standard pytest fixture-sharing-by-import."""

from tests.kernel.conftest import kernel_harness  # noqa: F401
