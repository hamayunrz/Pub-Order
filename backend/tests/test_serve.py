from __future__ import annotations

import importlib
import json
import sys

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def serve(tmp_path, monkeypatch):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<!doctype html><title>Pub-Order</title>", encoding="utf-8")
    monkeypatch.setenv("PUB_ORDER_FRONTEND_DIST", str(dist))
    sys.modules.pop("serve", None)
    yield importlib.import_module("serve")
    sys.modules.pop("serve", None)


def test_serves_the_built_frontend_at_the_root(serve):
    response = TestClient(serve.app).get("/")

    assert response.status_code == 200
    assert "<title>Pub-Order</title>" in response.text


def test_serves_the_api_under_api(serve):
    response = TestClient(serve.app).get("/api/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Sign in required."}


def test_missing_frontend_build_gives_a_clear_error(serve, tmp_path, monkeypatch):
    empty = tmp_path / "empty" / "backend"
    empty.mkdir(parents=True)
    monkeypatch.setenv("PUB_ORDER_FRONTEND_DIST", str(tmp_path / "missing"))
    monkeypatch.setattr(serve, "__file__", str(empty / "serve.py"))

    with pytest.raises(RuntimeError, match="Built frontend not found"):
        serve.find_frontend_dist()


def test_browser_config_uses_runtime_public_settings(serve, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://runtime.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "public-anon-key")
    monkeypatch.setenv("PUB_ORDER_TEST_SERVICE_KEY", "private-test-key")
    response = TestClient(serve.app).get("/config.js")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-type"].startswith("application/javascript")
    config = json.loads(response.text.removeprefix("window.__PUB_ORDER_CONFIG__ = ").removesuffix(";"))
    assert config == {"supabaseUrl": "https://runtime.supabase.co", "supabaseKey": "public-anon-key"}
    assert "private-test-key" not in response.text
