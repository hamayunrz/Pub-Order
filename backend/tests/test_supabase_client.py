from __future__ import annotations

import pytest
from fastapi import HTTPException

from app import auth
from app.config import Settings


@pytest.fixture
def created(monkeypatch):
    calls = []

    def fake_create_client(url, key):
        calls.append((url, key))
        return object()

    monkeypatch.setattr(auth, "create_client", fake_create_client)
    monkeypatch.setattr(auth, "get_settings", lambda: Settings("https://example.supabase.co", "anon-key"))
    return calls


def test_creates_client_from_settings(created):
    client = auth.get_supabase()

    assert client is not None
    assert created == [("https://example.supabase.co", "anon-key")]


def test_reuses_the_same_client(created):
    first = auth.get_supabase()
    second = auth.get_supabase()

    assert first is second
    assert len(created) == 1


def test_unconfigured_settings_raise_503(monkeypatch):
    monkeypatch.setattr(auth, "get_settings", lambda: Settings("", ""))

    with pytest.raises(HTTPException) as error:
        auth.get_supabase()

    assert error.value.status_code == 503
