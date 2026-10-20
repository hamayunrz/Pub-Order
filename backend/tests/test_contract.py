from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from app import config
from app.main import app


def test_me_route_accepts_get():
    routes = {route.path: route.methods for route in app.routes if hasattr(route, "methods")}

    assert "GET" in routes["/me"]


def test_me_returns_only_id_email_and_role(client, fake_auth, monkeypatch):
    fake_auth.result = SimpleNamespace(
        user=SimpleNamespace(
            id="user-123",
            email="student@vanderbilt.edu",
            phone="+16155550100",
            user_metadata={"role": "kitchen"},
        ),
    )
    monkeypatch.setattr("app.main.fetch_role", lambda token, user_id: "student")

    response = client.get("/me", headers={"Authorization": "Bearer token"})

    assert response.headers["content-type"] == "application/json"
    assert response.json() == {"id": "user-123", "email": "student@vanderbilt.edu", "role": "student"}


def test_me_returns_id_as_a_string(client, fake_auth, monkeypatch):
    fake_auth.result = SimpleNamespace(user=SimpleNamespace(id=42, email="student@vanderbilt.edu"))
    monkeypatch.setattr("app.main.fetch_role", lambda token, user_id: "student")

    response = client.get("/me", headers={"Authorization": "Bearer token"})

    assert response.json()["id"] == "42"


def test_settings_come_from_the_repo_root_env():
    repo_root = Path(config.__file__).resolve().parents[2]

    assert (repo_root / ".env.example").exists()
    assert (repo_root / "frontend").is_dir()
