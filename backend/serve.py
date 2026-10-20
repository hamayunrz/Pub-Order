"""Run the whole app as one process: the API under /api and the built frontend at /.

This is how the release artifact runs (`uvicorn serve:app`). In development, the Vite dev
server serves the frontend and forwards /api to `app.main:app` instead.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.main import app as api


def create_app(frontend_dist: Path) -> FastAPI:
    site = FastAPI()
    @site.get("/config.js", include_in_schema=False)
    def browser_config():
        # Only public browser settings belong here; never expose test or service-role keys.
        settings = get_settings()
        config = {"supabaseUrl": settings.supabase_url, "supabaseKey": settings.supabase_key}
        return Response(
            "window.__PUB_ORDER_CONFIG__ = " + json.dumps(config) + ";",
            media_type="application/javascript",
            headers={"Cache-Control": "no-store"},
        )

    site.mount("/api", api)
    site.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
    return site


def find_frontend_dist() -> Path:
    here = Path(__file__).resolve().parent
    candidates = [os.environ.get("PUB_ORDER_FRONTEND_DIST"), here / "static", here.parent / "frontend" / "dist"]
    for candidate in candidates:
        if candidate and (Path(candidate) / "index.html").is_file():
            return Path(candidate)
    raise RuntimeError("Built frontend not found. Run `npm run build` in frontend/ or set PUB_ORDER_FRONTEND_DIST.")


app = create_app(find_frontend_dist())
