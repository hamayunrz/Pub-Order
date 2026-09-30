from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import auth
from app.config import get_settings
from app.main import app


@pytest.fixture(autouse=True)
def clear_caches():
    get_settings.cache_clear()
    auth.get_supabase.cache_clear()
    yield
    get_settings.cache_clear()
    auth.get_supabase.cache_clear()


@pytest.fixture
def client():
    return TestClient(app)


class FakeAuth:
    """Stands in for supabase.auth; set `result` to a return value or an exception."""

    def __init__(self):
        self.result = None
        self.tokens = []

    def get_user(self, token):
        self.tokens.append(token)
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


@pytest.fixture
def fake_auth(monkeypatch):
    fake = FakeAuth()
    monkeypatch.setattr(auth, "get_supabase", lambda: SimpleNamespace(auth=fake))
    return fake
