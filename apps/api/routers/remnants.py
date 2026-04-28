from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import uuid
import os
from dependencies.auth import get_current_user_clerk_id

router = APIRouter()

# ---------------------------------------------------------------------------
# DB availability check (shared pattern with nesting router)
# ---------------------------------------------------------------------------
_db_url = os.getenv("DATABASE_URL", "")
DB_ENABLED = bool(_db_url) and not _db_url.startswith("postgresql://user:password")

# In-memory store — fallback for dev mode when DATABASE_URL is not configured
_store: dict[str, dict] = {}


def _get_db_optional():
    """Yield a DB session when DB is enabled, else yield None."""
    if DB_ENABLED:
        from db.database import get_db
        yield from get_db()
    else:
        yield None


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RemnantCreate(BaseModel):
    width: float = Field(..., gt=0, le=20000, description="Largura em mm")
    height: float = Field(..., gt=0, le=20000, description="Altura em mm")
    depth: float = Field(default=100, gt=0, le=20000, description="Profundidade em mm")
    nesting_id: Optional[str] = None


class RemnantStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(disponivel|descartado)$")


class Remnant(BaseModel):
    id: str
    width: float
    height: float
    depth: float
    status: str
    nesting_id: Optional[str] = None
    created_at: str


# ---------------------------------------------------------------------------
# Helper: convert a DB Remnant ORM object → Remnant response model
# ---------------------------------------------------------------------------

def _orm_to_response(r) -> Remnant:
    status = r.status.value if hasattr(r.status, "value") else r.status
    created_at = r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at)
    return Remnant(
        id=r.id,
        width=r.width,
        height=r.height,
        depth=r.depth,
        status=status,
        nesting_id=r.nesting_id,
        created_at=created_at,
    )


# ---------------------------------------------------------------------------
# User resolution
# ---------------------------------------------------------------------------

def _resolve_user_id(db: Session, clerk_id: str) -> str:
    from db import crud

    user = crud.get_user_by_clerk_id(db, clerk_id)
    if not user:
        user = crud.get_or_create_user(
            db,
            clerk_id=clerk_id,
            email=f"{clerk_id}@mocked.email",
        )
    return user.id


# ---------------------------------------------------------------------------
# GET /remnants
# ---------------------------------------------------------------------------

@router.get("/remnants", response_model=List[Remnant])
async def list_remnants(
    status: Optional[str] = None,
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(_get_db_optional),
):
    """Lista retalhos do estoque, com filtro opcional por status."""
    if DB_ENABLED and db is not None:
        from db import crud
        user_id = _resolve_user_id(db, clerk_id)
        items = crud.list_remnants(db, user_id=user_id, status=status)
        return [_orm_to_response(r) for r in items]
    else:
        # Dev fallback: in-memory store
        items = list(_store.values())
        if status:
            items = [r for r in items if r["status"] == status]
        items.sort(key=lambda x: x["created_at"], reverse=True)
        return [Remnant(**r) for r in items]


# ---------------------------------------------------------------------------
# POST /remnants
# ---------------------------------------------------------------------------

@router.post("/remnants", response_model=Remnant, status_code=201)
async def create_remnant(
    data: RemnantCreate,
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(_get_db_optional),
):
    """Registra um novo retalho no estoque."""
    if DB_ENABLED and db is not None:
        from db import crud
        user_id = _resolve_user_id(db, clerk_id)
        r = crud.create_remnant(
            db=db,
            user_id=user_id,
            width=data.width,
            height=data.height,
            depth=data.depth,
            nesting_id=data.nesting_id,
        )
        return _orm_to_response(r)
    else:
        # Dev fallback: in-memory store
        rid = str(uuid.uuid4())
        remnant = {
            "id": rid,
            "width": data.width,
            "height": data.height,
            "depth": data.depth,
            "status": "disponivel",
            "nesting_id": data.nesting_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _store[rid] = remnant
        return Remnant(**remnant)


# ---------------------------------------------------------------------------
# GET /remnants/{remnant_id}
# ---------------------------------------------------------------------------

@router.get("/remnants/{remnant_id}", response_model=Remnant)
async def get_remnant(
    remnant_id: str,
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(_get_db_optional),
):
    """Retorna um retalho específico pelo ID."""
    if DB_ENABLED and db is not None:
        from db.schema import Remnant as RemnantModel
        user_id = _resolve_user_id(db, clerk_id)
        r = db.query(RemnantModel).filter(
            RemnantModel.id == remnant_id,
            RemnantModel.user_id == user_id,
        ).first()
        if not r:
            raise HTTPException(status_code=404, detail="Retalho não encontrado")
        return _orm_to_response(r)
    else:
        if remnant_id not in _store:
            raise HTTPException(status_code=404, detail="Retalho não encontrado")
        return Remnant(**_store[remnant_id])


# ---------------------------------------------------------------------------
# PATCH /remnants/{remnant_id}
# ---------------------------------------------------------------------------

@router.patch("/remnants/{remnant_id}", response_model=Remnant)
async def update_remnant_status(
    remnant_id: str,
    data: RemnantStatusUpdate,
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(_get_db_optional),
):
    """Atualiza o status de um retalho (disponivel / descartado)."""
    if DB_ENABLED and db is not None:
        from db import crud
        user_id = _resolve_user_id(db, clerk_id)
        r = crud.update_remnant_status(db, remnant_id=remnant_id, user_id=user_id, status=data.status)
        if not r:
            raise HTTPException(status_code=404, detail="Retalho não encontrado")
        return _orm_to_response(r)
    else:
        if remnant_id not in _store:
            raise HTTPException(status_code=404, detail="Retalho não encontrado")
        _store[remnant_id]["status"] = data.status
        return Remnant(**_store[remnant_id])


# ---------------------------------------------------------------------------
# DELETE /remnants/{remnant_id}
# ---------------------------------------------------------------------------

@router.delete("/remnants/{remnant_id}", status_code=204)
async def delete_remnant(
    remnant_id: str,
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(_get_db_optional),
):
    """Remove um retalho do estoque permanentemente."""
    if DB_ENABLED and db is not None:
        from db import crud
        user_id = _resolve_user_id(db, clerk_id)
        deleted = crud.delete_remnant(db, remnant_id=remnant_id, user_id=user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Retalho não encontrado")
    else:
        if remnant_id not in _store:
            raise HTTPException(status_code=404, detail="Retalho não encontrado")
        del _store[remnant_id]
