"""Placing a student's order (US3). The database only accepts orders through the
place_order() function, which re-checks the meal and saves the order with its items in one
transaction. Requests act as the signed-in student, so row-level security applies."""

from __future__ import annotations

from typing import Any, cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from postgrest import SyncPostgrestClient
from postgrest.constants import DEFAULT_POSTGREST_CLIENT_HEADERS
from postgrest.exceptions import APIError
from pydantic import ConfigDict

from app.auth import bearer, get_current_user
from app.config import get_settings
from app.menu import CheckoutRequest, review_cart

router = APIRouter()

ORDER_COLUMNS = "id,status,swipes,created_at,order_items(menu_item_id,name,swipe_type,quantity)"
TYPE_ORDER = ["Entry", "Side", "Drink"]
INVALID_ORDER = "22023"  # errcode raised by place_order() for a meal it won't accept


class PlaceOrderRequest(CheckoutRequest):
    model_config = ConfigDict(extra="forbid")
    idempotencyKey: UUID


def user_client(token: str) -> SyncPostgrestClient:
    """A database client that acts as the signed-in student."""
    settings = get_settings()
    return SyncPostgrestClient(
        f"{settings.supabase_url}/rest/v1",
        headers={
            **DEFAULT_POSTGREST_CLIENT_HEADERS,
            "apikey": settings.supabase_key,
            "Authorization": f"Bearer {token}",
        },
    )


def access_token(credentials: HTTPAuthorizationCredentials | None) -> str:
    if credentials is None:
        raise HTTPException(401, "Sign in required.")
    return credentials.credentials


def order_json(row: dict[str, Any]) -> dict[str, Any]:
    items = sorted(
        row.get("order_items") or [],
        key=lambda item: (TYPE_ORDER.index(item["swipe_type"]), item["name"]),
    )
    return {
        "id": row["id"],
        "status": row["status"],
        "swipes": row["swipes"],
        "createdAt": row["created_at"],
        "items": [
            {"id": item["menu_item_id"], "name": item["name"], "swipeType": item["swipe_type"],
             "quantity": item["quantity"]}
            for item in items
        ],
    }


def fetch_order(db: SyncPostgrestClient, order_id: str) -> dict[str, Any] | None:
    rows = cast(list[dict[str, Any]], db.from_("orders").select(ORDER_COLUMNS).eq("id", order_id).execute().data)
    return order_json(rows[0]) if rows else None


@router.post("/orders", status_code=201)
def place_order(
    order: PlaceOrderRequest,
    user=Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    """Save a reviewed meal as an order. Repeating the same idempotencyKey returns the same order."""
    review = review_cart(order)
    if not review["canSubmit"]:
        raise HTTPException(409, {"message": "Your meal needs review before ordering.", "issues": review["issues"]})

    db = user_client(access_token(credentials))
    params: Any = {
        "p_idempotency_key": str(order.idempotencyKey),
        "p_swipes": order.swipes,
        "p_items": [{"id": item.id, "quantity": item.quantity} for item in order.items],
    }
    try:
        order_id = db.rpc("place_order", params).execute().data
        saved = fetch_order(db, str(order_id))
    except APIError as exc:
        if exc.code == INVALID_ORDER:
            raise HTTPException(409, {
                "message": "The menu changed while you were ordering. Review your meal and try again.",
                "issues": [],
            }) from exc
        raise HTTPException(503, "Could not save your order. Your cart is still here; please try again.") from exc
    except Exception as exc:
        # Do not leak database details or credentials to the browser.
        raise HTTPException(503, "Could not save your order. Your cart is still here; please try again.") from exc
    if saved is None:
        raise HTTPException(503, "Could not save your order. Your cart is still here; please try again.")
    return saved
