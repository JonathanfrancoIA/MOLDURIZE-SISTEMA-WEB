from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from dependencies.auth import get_current_user_clerk_id
import sys
import os
import uuid

# Ensure engine is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

router = APIRouter()

# ---------------------------------------------------------------------------
# DB availability check
# DB_ENABLED is True only when DATABASE_URL is explicitly set in the
# environment AND is not the placeholder default value.
# ---------------------------------------------------------------------------
_db_url = os.getenv("DATABASE_URL", "")
DB_ENABLED = bool(_db_url) and not _db_url.startswith("postgresql://user:password")


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

class PartInput(BaseModel):
    width: float = Field(..., gt=0, description="Largura em mm")
    height: float = Field(..., gt=0, description="Altura em mm")
    quantity: int = Field(default=1, ge=1, description="Quantidade de peças")
    label: Optional[str] = None


class BlockConfig(BaseModel):
    width: float = Field(default=4000, gt=0, description="Largura do bloco EPS em mm")
    height: float = Field(default=1200, gt=0, description="Altura do bloco EPS em mm")
    kerf: float = Field(default=3.0, ge=0, le=50, description="Espessura do fio de corte em mm")


class NestingRequest(BaseModel):
    parts: List[PartInput] = Field(..., min_length=1)
    block: BlockConfig = Field(default_factory=BlockConfig)
    name: Optional[str] = None


class PlacedPart(BaseModel):
    x: float
    y: float
    width: float
    height: float
    rotated: bool
    label: Optional[str] = None
    block_index: int


class NestingResult(BaseModel):
    id: str
    success: bool
    total_blocks: int
    waste_percent: float
    largest_remnant_w: float
    largest_remnant_h: float
    pieces_per_block: float
    placed_parts: List[PlacedPart]
    block_width: float
    block_height: float
    total_pieces: int


# ---------------------------------------------------------------------------
# POST /optimize
# ---------------------------------------------------------------------------

@router.post("/optimize", response_model=NestingResult)
async def optimize_nesting(
    request: NestingRequest,
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(_get_db_optional),
):
    """
    Executa o algoritmo de nesting 2D para otimização de corte de EPS.

    Utiliza o algoritmo MaxRects + BFF (Best Fit First) para posicionar
    automaticamente as peças nos blocos, minimizando o desperdício.
    Salva o resultado no banco de dados quando DATABASE_URL está configurado.
    """
    try:
        from engine import NestingEngine
        from shapely.geometry import box as shapely_box

        engine = NestingEngine(
            block_w=request.block.width,
            block_h=request.block.height,
            kerf=request.block.kerf,
        )

        # Build label map: part index → label string
        labels: list[str] = []
        total_pieces = 0
        parts_input_serializable = []
        for part in request.parts:
            lbl = part.label or f"{part.width}x{part.height}"
            parts_input_serializable.append(part.model_dump())
            for _ in range(part.quantity):
                w = max(part.width - request.block.kerf, 1.0)
                h = max(part.height - request.block.kerf, 1.0)
                polygon = shapely_box(0, 0, w, h)
                engine.add_part(polygon)
                labels.append(lbl)
                total_pieces += 1

        engine.generate_layout()
        stats = engine.calculate_stats()

        # Convert blocks_used (list of lists of shapely Polygons) → PlacedPart list
        placed_parts = []
        placed_parts_serializable = []
        for block_idx, block_polys in enumerate(engine.blocks_used):
            for poly_idx, poly in enumerate(block_polys):
                minx, miny, maxx, maxy = poly.bounds
                w = maxx - minx
                h = maxy - miny
                flat_idx = sum(len(engine.blocks_used[b]) for b in range(block_idx)) + poly_idx
                lbl = labels[flat_idx] if flat_idx < len(labels) else None
                pp = PlacedPart(
                    x=round(minx, 3),
                    y=round(miny, 3),
                    width=round(w, 3),
                    height=round(h, 3),
                    rotated=False,
                    label=lbl,
                    block_index=block_idx,
                )
                placed_parts.append(pp)
                placed_parts_serializable.append(pp.model_dump())

        remnant = stats[2] if stats[2] else (0, 0)
        pieces_per_block_raw = stats[3]
        avg_ppb = (
            sum(pieces_per_block_raw) / len(pieces_per_block_raw)
            if pieces_per_block_raw
            else 0.0
        )

        result_dict = {
            "total_blocks": int(stats[0]),
            "waste_percent": round(float(stats[1]), 2),
            "largest_remnant_w": round(float(remnant[0]), 1),
            "largest_remnant_h": round(float(remnant[1]), 1),
            "pieces_per_block": round(avg_ppb, 1),
            "placed_parts": placed_parts_serializable,
        }

        # Persist to database (when configured)
        nesting_id = str(uuid.uuid4())
        if DB_ENABLED and db is not None:
            try:
                from db import crud
                # Locate or create user via clerk_id
                user = crud.get_user_by_clerk_id(db, clerk_id)
                if not user:
                    user = crud.get_or_create_user(db, clerk_id=clerk_id, email=f"{clerk_id}@mocked.email")
                
                db_nesting = crud.create_nesting(
                    db=db,
                    user_id=user.id,
                    block_width=request.block.width,
                    block_height=request.block.height,
                    kerf=request.block.kerf,
                    parts_input=parts_input_serializable,
                    name=request.name,
                )
                crud.update_nesting_result(db, db_nesting.id, result_dict)
                nesting_id = db_nesting.id
            except Exception as db_err:
                # DB errors must not fail the nesting computation
                print(f"[WARN] DB persist failed: {db_err}")

        return NestingResult(
            id=nesting_id,
            success=True,
            total_blocks=result_dict["total_blocks"],
            waste_percent=result_dict["waste_percent"],
            largest_remnant_w=result_dict["largest_remnant_w"],
            largest_remnant_h=result_dict["largest_remnant_h"],
            pieces_per_block=result_dict["pieces_per_block"],
            placed_parts=placed_parts,
            block_width=request.block.width,
            block_height=request.block.height,
            total_pieces=total_pieces,
        )

    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Motor de nesting não disponível: {str(e)}. Instale as dependências: pip install rectpack shapely",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro no processamento de nesting: {str(e)}",
        )


# ---------------------------------------------------------------------------
# GET /nestings  — list recent nestings
# ---------------------------------------------------------------------------

@router.get("/nestings")
async def list_nestings_endpoint(
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(_get_db_optional)
):
    """Lista nestings recentes (requer DB configurado)."""
    if not DB_ENABLED or db is None:
        return []
    try:
        from db import crud
        user = crud.get_user_by_clerk_id(db, clerk_id)
        if not user:
            return []
        from db.schema import Nesting as NestingModel
        nestings = (
            db.query(NestingModel)
            .filter(NestingModel.user_id == user.id)
            .order_by(NestingModel.created_at.desc())
            .limit(50)
            .all()
        )
        return [
            {
                "id": n.id,
                "name": n.name,
                "block_width": n.block_width,
                "block_height": n.block_height,
                "total_blocks": n.total_blocks,
                "waste_percent": n.waste_percent,
                "pieces_per_block": n.pieces_per_block,
                "total_pieces": len(n.parts_input) if n.parts_input else 0,
                "status": n.status.value if hasattr(n.status, "value") else n.status,
                "created_at": n.created_at.isoformat() if n.created_at else "",
            }
            for n in nestings
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar nestings: {str(e)}")


# ---------------------------------------------------------------------------
# GET /nestings/{nesting_id}  — retrieve a specific nesting
# ---------------------------------------------------------------------------

@router.get("/nestings/{nesting_id}")
async def get_nesting_endpoint(
    nesting_id: str,
    db: Session = Depends(_get_db_optional),
):
    """Retorna os detalhes de um nesting específico."""
    if not DB_ENABLED or db is None:
        raise HTTPException(
            status_code=503,
            detail="Banco de dados não configurado. Configure DATABASE_URL para habilitar histórico.",
        )
    try:
        from db.schema import Nesting as NestingModel
        n = db.query(NestingModel).filter(NestingModel.id == nesting_id).first()
        if not n:
            raise HTTPException(status_code=404, detail="Nesting não encontrado")
        return {
            "id": n.id,
            "name": n.name,
            "block_width": n.block_width,
            "block_height": n.block_height,
            "kerf": n.kerf,
            "total_blocks": n.total_blocks,
            "waste_percent": n.waste_percent,
            "largest_remnant_w": n.largest_remnant_w,
            "largest_remnant_h": n.largest_remnant_h,
            "pieces_per_block": n.pieces_per_block,
            "parts_input": n.parts_input,
            "placed_parts": n.placed_parts,
            "total_pieces": len(n.parts_input) if n.parts_input else 0,
            "status": n.status.value if hasattr(n.status, "value") else n.status,
            "created_at": n.created_at.isoformat() if n.created_at else "",
            "completed_at": n.completed_at.isoformat() if n.completed_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar nesting: {str(e)}")
