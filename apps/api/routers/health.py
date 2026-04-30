import os

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "moldurize-api",
        "version": "0.1.0",
    }


@router.get("/health/db")
async def database_health_check():
    """Validate database connectivity without exposing connection details."""
    database_url = os.getenv("DATABASE_URL", "")
    configured = bool(database_url) and not database_url.startswith("postgresql://user:password")

    if not configured:
        return {
            "status": "disabled",
            "database": {
                "configured": False,
                "connected": False,
                "migration_version": None,
            },
        }

    try:
        from db.database import engine

        with engine.connect() as conn:
            conn.execute(text("select 1"))
            migration_version = None
            try:
                migration_version = conn.execute(
                    text("select version_num from alembic_version")
                ).scalar_one_or_none()
            except SQLAlchemyError:
                migration_version = None
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unavailable",
                "database": {
                    "configured": True,
                    "connected": False,
                    "migration_version": None,
                },
                "message": str(exc.__class__.__name__),
            },
        ) from exc

    return {
        "status": "ok",
        "database": {
            "configured": True,
            "connected": True,
            "migration_version": migration_version,
        },
    }
