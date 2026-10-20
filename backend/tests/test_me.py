from __future__ import annotations

from types import SimpleNamespace

import httpx
from supabase_auth.errors import AuthApiError

from app import auth
from app.config import Settings


def bearer(token="valid-token"):
    return {"Authorization": f"Bearer {token}"}


def test_missing_token_returns_401(client, fake_auth):
    response = client.get("/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Sign in required."}
    assert fake_auth.tokens == []


def test_non_bearer_scheme_returns_401(client, fake_auth):
    response = client.get("/me", headers={"Authorization": "Basic abc123"})

    assert response.status_code == 401
    assert fake_auth.tokens == []


def test_valid_token_returns_user(client, fake_auth, monkeypatch):
    fake_auth.result = SimpleNamespace(
        user=SimpleNamespace(id="user-123", email="student@vanderbilt.edu"),
    )
    monkeypatch.setattr("app.main.fetch_role", lambda token, user_id: "student")

    response = client.get("/me", headers=bearer("abc.def.ghi"))

    assert response.status_code == 200
    assert response.json() == {"id": "user-123", "email": "student@vanderbilt.edu", "role": "student"}
    assert fake_auth.tokens == ["abc.def.ghi"]


def test_rejected_token_returns_401(client, fake_auth):
    fake_auth.result = AuthApiError("invalid JWT", 401, "bad_jwt")

    response = client.get("/me", headers=bearer())

    assert response.status_code == 401
    assert response.json() == {"detail": "Sign in required."}


def test_unreachable_supabase_returns_503(client, fake_auth):
    fake_auth.result = httpx.ConnectError("connection refused")

    response = client.get("/me", headers=bearer())

    assert response.status_code == 503
    assert response.json() == {"detail": "Could not reach the account service."}


def test_empty_response_returns_401(client, fake_auth):
    fake_auth.result = None

    response = client.get("/me", headers=bearer())

    assert response.status_code == 401


def test_response_without_user_returns_401(client, fake_auth):
    fake_auth.result = SimpleNamespace(user=None)

    response = client.get("/me", headers=bearer())

    assert response.status_code == 401


def test_id_is_a_string(client, fake_auth, monkeypatch):
    fake_auth.result = SimpleNamespace(user=SimpleNamespace(id=42, email="student@vanderbilt.edu"))
    monkeypatch.setattr("app.main.fetch_role", lambda token, user_id: "kitchen")

    response = client.get("/me", headers=bearer())

    assert response.json()["id"] == "42"
    assert response.json()["role"] == "kitchen"


def test_unconfigured_supabase_returns_503(client, monkeypatch):
    monkeypatch.setattr(auth, "get_settings", lambda: Settings("", ""))

    response = client.get("/me", headers=bearer())

    assert response.status_code == 503
    assert response.json() == {"detail": "Sign-in is not configured."}
