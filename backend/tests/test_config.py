from __future__ import annotations

import pytest

from app.config import Settings, get_settings


def test_reads_and_trims_environment(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "  https://example.supabase.co \n")
    monkeypatch.setenv("SUPABASE_KEY", " anon-key ")

    settings = get_settings()

    assert settings.supabase_url == "https://example.supabase.co"
    assert settings.supabase_key == "anon-key"
    assert settings.supabase_configured


def test_missing_environment_is_not_configured(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)

    settings = get_settings()

    assert settings.supabase_url == ""
    assert settings.supabase_key == ""
    assert not settings.supabase_configured


@pytest.mark.parametrize(
    ("url", "key"),
    [
        ("", "anon-key"),
        ("https://example.supabase.co", ""),
        ("", ""),
    ],
)
def test_blank_value_is_not_configured(url, key):
    assert not Settings(url, key).supabase_configured
