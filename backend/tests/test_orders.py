from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import httpx
import pytest
from postgrest.exceptions import APIError

from app import menu, orders
from app.auth import get_current_user
from app.main import app

KEY = "6f1d2c34-5b6a-4e7f-8a9b-0c1d2e3f4a5b"
ORDER_ID = "0a1b2c3d-0000-4000-8000-000000000001"
HEADERS = {"Authorization": "Bearer test-token"}


class FakeDatabase:
    """Stands in for the per-request PostgREST client used by app.orders."""

    def __init__(self):
        self.rpc_calls = []
        self.rpc_result = ORDER_ID
        self.rpc_error = None
        self.rows = [{
            "id": ORDER_ID, "status": "Received", "swipes": 1, "created_at": "2026-10-19T12:00:00+00:00",
            "order_items": [
                {"menu_item_id": "tea", "name": "Tea", "swipe_type": "Drink", "quantity": 1},
                {"menu_item_id": "burger", "name": "Burger", "swipe_type": "Entry", "quantity": 1},
                {"menu_item_id": "fries", "name": "Fries", "swipe_type": "Side", "quantity": 1},
            ],
        }]

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        return self

    def from_(self, table):
        return self

    def select(self, columns):
        return self

    def eq(self, column, value):
        self.filter = (column, value)
        return self

    def execute(self):
        if self.rpc_calls and self.rpc_error is not None:
            raise self.rpc_error
        if getattr(self, "filter", None) is None:
            return SimpleNamespace(data=self.rpc_result)
        return SimpleNamespace(data=[row for row in self.rows if row["id"] == self.filter[1]])


@pytest.fixture
def catalog():
    return [dict(id=id, name=name, category=kind, swipe_type=kind, available=True)
            for id, name, kind in [("burger", "Burger", "Entry"), ("fries", "Fries", "Side"), ("tea", "Tea", "Drink")]]


@pytest.fixture
def menu_database(monkeypatch, catalog):
    client = MagicMock()
    query = client.table.return_value.select.return_value.order.return_value
    query.execute.return_value = SimpleNamespace(data=catalog)
    monkeypatch.setattr(menu, "get_supabase", lambda: client)
    return client


@pytest.fixture
def database(monkeypatch):
    fake = FakeDatabase()
    fake.tokens = []

    def user_client(token):
        fake.tokens.append(token)
        return fake

    monkeypatch.setattr(orders, "user_client", user_client)
    return fake


@pytest.fixture
def signed_in():
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="student-1")
    yield
    app.dependency_overrides.clear()


def meal(**changes):
    body = {
        "swipes": 1,
        "idempotencyKey": KEY,
        "items": [dict(id=id, quantity=1, expectedSwipeType=kind)
                  for id, kind in [("burger", "Entry"), ("fries", "Side"), ("tea", "Drink")]],
    }
    return {**body, **changes}


def test_place_order_saves_and_returns_the_order(client, menu_database, database, signed_in):
    response = client.post("/orders", json=meal(), headers=HEADERS)

    assert response.status_code == 201
    assert response.json() == {
        "id": ORDER_ID, "status": "Received", "swipes": 1, "createdAt": "2026-10-19T12:00:00+00:00",
        "items": [
            {"id": "burger", "name": "Burger", "swipeType": "Entry", "quantity": 1},
            {"id": "fries", "name": "Fries", "swipeType": "Side", "quantity": 1},
            {"id": "tea", "name": "Tea", "swipeType": "Drink", "quantity": 1},
        ],
    }
    assert database.tokens == ["test-token"]
    assert database.rpc_calls == [("place_order", {
        "p_idempotency_key": KEY,
        "p_swipes": 1,
        "p_items": [{"id": "burger", "quantity": 1}, {"id": "fries", "quantity": 1}, {"id": "tea", "quantity": 1}],
    })]


def test_meal_needing_review_is_not_saved(client, menu_database, catalog, database, signed_in):
    catalog[0]["available"] = False

    response = client.post("/orders", json=meal(), headers=HEADERS)

    assert response.status_code == 409
    assert response.json()["detail"]["issues"][0]["code"] == "unavailable"
    assert database.rpc_calls == []


def test_incomplete_meal_is_not_saved(client, menu_database, database, signed_in):
    response = client.post("/orders", json=meal(items=[{"id": "burger", "quantity": 1, "expectedSwipeType": "Entry"}]),
                           headers=HEADERS)

    assert response.status_code == 409
    assert {issue["code"] for issue in response.json()["detail"]["issues"]} == {"composition"}
    assert database.rpc_calls == []


def test_guest_cannot_place_an_order(client, menu_database, database):
    response = client.post("/orders", json=meal())

    assert response.status_code == 401
    assert database.rpc_calls == []


@pytest.mark.parametrize("body", [
    {key: value for key, value in meal().items() if key != "idempotencyKey"},
    meal(idempotencyKey="not-a-uuid"),
    meal(total=3),
    meal(swipes=11),
])
def test_invalid_requests_are_rejected(client, menu_database, database, signed_in, body):
    response = client.post("/orders", json=body, headers=HEADERS)

    assert response.status_code == 422
    assert database.rpc_calls == []


def test_database_rejecting_the_meal_becomes_409(client, menu_database, database, signed_in):
    database.rpc_error = APIError({"message": "place_order: an item is unavailable", "code": "22023"})

    response = client.post("/orders", json=meal(), headers=HEADERS)

    assert response.status_code == 409
    assert "menu changed" in response.json()["detail"]["message"]


@pytest.mark.parametrize("error", [
    APIError({"message": "private database details", "code": "XX000"}),
    httpx.ConnectError("private connection details"),
])
def test_database_failures_are_sanitized(client, menu_database, database, signed_in, error):
    database.rpc_error = error

    response = client.post("/orders", json=meal(), headers=HEADERS)

    assert response.status_code == 503
    assert "private" not in response.text
    assert "cart is still here" in response.json()["detail"]


def test_order_that_cannot_be_read_back_is_503(client, menu_database, database, signed_in):
    database.rows = []

    response = client.post("/orders", json=meal(), headers=HEADERS)

    assert response.status_code == 503


def test_user_client_acts_as_the_student(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "anon-key")

    db = orders.user_client("student-token")

    assert str(db.base_url).rstrip("/") == "https://example.supabase.co/rest/v1"
    assert db.headers["Authorization"] == "Bearer student-token"
    assert db.headers["apikey"] == "anon-key"
    assert db.headers["Accept"] == "application/json"
