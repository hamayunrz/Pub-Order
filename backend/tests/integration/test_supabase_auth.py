"""Integration tests against a real Supabase project.

They run only when PUB_ORDER_TEST_EMAIL and PUB_ORDER_TEST_PASSWORD are set (in the
environment or the root .env) along with SUPABASE_URL and SUPABASE_KEY. The test
user must already exist and be confirmed. The variable names deliberately avoid the
SUPABASE_ prefix, which Vite exposes to the browser.
"""

from __future__ import annotations

import os

import pytest
from supabase import create_client

from app.config import get_settings

TEST_EMAIL = os.environ.get("PUB_ORDER_TEST_EMAIL", "").strip()
TEST_PASSWORD = os.environ.get("PUB_ORDER_TEST_PASSWORD", "")

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        not (TEST_EMAIL and TEST_PASSWORD and get_settings().supabase_configured),
        reason="Supabase test credentials are not set",
    ),
]


@pytest.fixture(scope="module")
def access_token():
    settings = get_settings()
    supabase = create_client(settings.supabase_url, settings.supabase_key)
    response = supabase.auth.sign_in_with_password({"email": TEST_EMAIL, "password": TEST_PASSWORD})
    return response.session.access_token


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_real_token_returns_the_signed_in_user(client, access_token):
    response = client.get("/me", headers=bearer(access_token))

    assert response.status_code == 200
    assert response.json()["email"].lower() == TEST_EMAIL.lower()


def test_garbage_token_is_rejected(client):
    response = client.get("/me", headers=bearer("not-a-real-token"))

    assert response.status_code == 401


def test_token_with_tampered_signature_is_rejected(client, access_token):
    header, payload, signature = access_token.split(".")
    tampered = f"{header}.{payload}.{signature[::-1]}"

    response = client.get("/me", headers=bearer(tampered))

    assert response.status_code == 401
