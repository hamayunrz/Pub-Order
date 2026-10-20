from __future__ import annotations

import os

import pytest

# CI sets this so a broken database setup fails the run instead of quietly skipping every
# integration test. Locally the tests still skip when Supabase isn't running.
REQUIRED = os.environ.get("PUB_ORDER_REQUIRE_INTEGRATION") == "1"


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if REQUIRED and report.skipped:
        report.outcome = "failed"
        report.longrepr = f"Integration test was skipped, but PUB_ORDER_REQUIRE_INTEGRATION=1: {report.longrepr}"
