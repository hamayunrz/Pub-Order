from __future__ import annotations

from types import SimpleNamespace

import pytest
from postgrest.exceptions import APIError

from app import orders
from app.auth import get_current_user
from app.main import app

ORDER_ID = "0a1b2c3d-0000-4000-8000-000000000001"
HEADERS = {"Authorization": "Bearer test-token"}
ORDER = {
    "id": ORDER_ID, "status": "Preparing", "swipes": 1, "created_at": "2026-10-19T12:00:00+00:00",
    "order_items": [
        {"menu_item_id": "burger", "name": "Burger", "swipe_type": "Entry", "quantity": 1},
    ],
}


class FakeDatabase:
    def __init__(self):
        self.rpc_calls = []
        self.rpc_error = None
        self.row = ORDER

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        self.mode = "rpc"
        return self

    def from_(self, table):
        self.mode = "select"
        return self

    def select(self, columns):
        return self

    def eq(self, column, value):
        return self

    def execute(self):
        if self.mode == "rpc":
            if self.rpc_error is not None:
                raise self.rpc_error
            params = self.rpc_calls[-1][1]
            if "p_status" in params:
                self.row = {**self.row, "status": params["p_status"]}
            return SimpleNamespace(data=None)
        return SimpleNamespace(data=[self.row])


@pytest.fixture
def database(monkeypatch):
    fake = FakeDatabase()
    monkeypatch.setattr(orders, "user_client", lambda token: fake)
    return fake


@pytest.fixture
def signed_in():
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="user-1")
    yield
    app.dependency_overrides.clear()


def test_a_student_cannot_change_an_order_status(client, database, signed_in, monkeypatch):
    monkeypatch.setattr(orders, "fetch_role", lambda token, user_id: "student")

    response = client.patch(f"/orders/{ORDER_ID}", json={"status": "Preparing"}, headers=HEADERS)

    assert response.status_code == 403
    assert response.json() == {"detail": "Kitchen access required."}
    assert database.rpc_calls == []


def test_kitchen_can_change_any_order_status(client, database, signed_in, monkeypatch):
    monkeypatch.setattr(orders, "fetch_role", lambda token, user_id: "kitchen")

    response = client.patch(f"/orders/{ORDER_ID}", json={"status": "Ready"}, headers=HEADERS)

    assert response.status_code == 200
    assert response.json()["status"] == "Ready"
    assert database.rpc_calls == [("set_order_status", {"p_order_id": ORDER_ID, "p_status": "Ready"})]


def test_unknown_status_is_rejected(client, database, signed_in, monkeypatch):
    monkeypatch.setattr(orders, "fetch_role", lambda token, user_id: "kitchen")

    response = client.patch(f"/orders/{ORDER_ID}", json={"status": "Delivered"}, headers=HEADERS)

    assert response.status_code == 422
    assert database.rpc_calls == []


def test_missing_order_is_not_found(client, database, signed_in, monkeypatch):
    monkeypatch.setattr(orders, "fetch_role", lambda token, user_id: "kitchen")
    database.rpc_error = APIError({"message": "set_order_status: order not found", "code": "P0002"})

    response = client.patch(f"/orders/{ORDER_ID}", json={"status": "Collected"}, headers=HEADERS)

    assert response.status_code == 404
    assert response.json() == {"detail": "Order not found."}


def test_a_student_cannot_mark_an_item_sold_out(client, database, signed_in, monkeypatch):
    monkeypatch.setattr(orders, "fetch_role", lambda token, user_id: "student")

    response = client.patch("/menu/pub-burger", json={"available": False}, headers=HEADERS)

    assert response.status_code == 403
    assert database.rpc_calls == []


def test_kitchen_can_mark_an_item_sold_out(client, database, signed_in, monkeypatch):
    monkeypatch.setattr(orders, "fetch_role", lambda token, user_id: "kitchen")

    response = client.patch("/menu/pub-burger", json={"available": False}, headers=HEADERS)

    assert response.status_code == 200
    assert response.json() == {"id": "pub-burger", "available": False}
    assert database.rpc_calls == [("set_item_availability", {"p_id": "pub-burger", "p_available": False})]


def test_sign_in_stays_a_student_until_the_role_table_exists(client, fake_auth, monkeypatch):
    fake_auth.result = SimpleNamespace(user=SimpleNamespace(id="user-1", email="student@vanderbilt.edu"))

    class MissingProfiles:
        def from_(self, table):
            raise APIError({"message": "Could not find the table", "code": "PGRST205"})

    monkeypatch.setattr(orders, "user_client", lambda token: MissingProfiles())

    response = client.get("/me", headers=HEADERS)

    assert response.status_code == 200
    assert response.json()["role"] == "student"


def test_role_lookup_failure_does_not_sign_the_user_in(client, fake_auth, monkeypatch):
    fake_auth.result = SimpleNamespace(user=SimpleNamespace(id="user-1", email="student@vanderbilt.edu"))

    def unavailable(token, user_id):
        raise RuntimeError("down")

    monkeypatch.setattr("app.main.fetch_role", unavailable)

    response = client.get("/me", headers=HEADERS)

    assert response.status_code == 503
    assert response.json() == {"detail": "Could not load your account. Please try again."}
