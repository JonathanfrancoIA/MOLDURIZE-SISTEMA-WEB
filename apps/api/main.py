"""
MOLDURIZE WEB — FastAPI Application Entry Point
"""
import os
import time
import uuid
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

from routers import nesting, gcode, remnants, health, webhooks, billing, users

# ═══════════════════════════════════════════════════════════════════════════
# Logging
# ═══════════════════════════════════════════════════════════════════════════

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("moldurize.api")
logger.setLevel(LOG_LEVEL)

# Silence noisy libs in prod
if ENVIRONMENT == "production":
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


# ═══════════════════════════════════════════════════════════════════════════
# Lifespan (startup / shutdown)
# ═══════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("═" * 60)
    logger.info(f"MOLDURIZE API starting — env={ENVIRONMENT}")
    logger.info("═" * 60)

    # Attempt to initialize database (non-fatal if unavailable in dev)
    if os.getenv("DATABASE_URL"):
        try:
            from db.database import engine
            with engine.connect() as conn:
                pass # verify connection
            logger.info("✓ Database connection ready")
        except Exception as e:
            logger.warning(f"✗ Database connection failed: {e}")
    else:
        logger.info("✓ Dev mode (no DATABASE_URL — running in-memory)")

    yield

    logger.info("MOLDURIZE API shutting down")


# ═══════════════════════════════════════════════════════════════════════════
# FastAPI App
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="MOLDURIZE API",
    description=(
        "Plataforma SaaS de Otimização de Corte de EPS — "
        "Nesting 2D + G-Code CNC + Gestão de Retalhos"
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if ENVIRONMENT != "production" else None,
)


# ─── CORS ────────────────────────────────────────────────────────────────────
# Build allowlist from env (CORS_ORIGINS="https://a.com,https://b.com")
# or fall back to dev defaults.

_cors_origins_env = os.getenv("CORS_ORIGINS", "")
if _cors_origins_env:
    _cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
else:
    _cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ]

_cors_regex = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"^https://(.+\.)?(moldurize\.com\.br|vercel\.app)$",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# ─── Request ID + Timing Middleware ─────────────────────────────────────────

@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    start = time.perf_counter()
    try:
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-ms"] = f"{elapsed_ms:.1f}"
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} "
            f"→ {response.status_code} ({elapsed_ms:.1f}ms)"
        )
        return response
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            f"[{request_id}] {request.method} {request.url.path} "
            f"→ 500 ({elapsed_ms:.1f}ms) — {exc}"
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )


# ─── Routers ────────────────────────────────────────────────────────────────

app.include_router(health.router, tags=["health"])
app.include_router(nesting.router, prefix="/api/v1", tags=["nesting"])
app.include_router(gcode.router, prefix="/api/v1", tags=["gcode"])
app.include_router(remnants.router, prefix="/api/v1", tags=["remnants"])
app.include_router(webhooks.router, prefix="/api/v1", tags=["webhooks"])
app.include_router(billing.router, prefix="/api/v1", tags=["billing"])
app.include_router(users.router, prefix="/api/v1", tags=["users"])


@app.get("/", tags=["health"])
async def root():
    return {
        "service": "MOLDURIZE API",
        "version": "0.1.0",
        "environment": ENVIRONMENT,
        "docs": "/docs",
        "health": "/health",
    }
