from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user
from app.menu import router as menu_router
from app.orders import router as orders_router

app = FastAPI()
app.include_router(menu_router)
app.include_router(orders_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/me")
def read_me(user=Depends(get_current_user)):
    return {"id": str(user.id), "email": user.email}
