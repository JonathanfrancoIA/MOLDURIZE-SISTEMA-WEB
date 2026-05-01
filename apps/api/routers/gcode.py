import os
import sys
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from gcode_generator import MoldurizeGCodeGenerator
from dependencies.auth import get_current_user_clerk_id

router = APIRouter()


class CutPiece(BaseModel):
    x: float = Field(..., description="Posicao X em mm")
    y: float = Field(..., description="Posicao Y em mm")
    width: float = Field(..., gt=0, description="Largura em mm")
    height: float = Field(..., gt=0, description="Altura em mm")
    depth: float = Field(default=100, gt=0, description="Profundidade de corte em mm")
    block_index: int = Field(default=0)
    label: Optional[str] = None


class GCodeConfig(BaseModel):
    feed_rate: int = Field(default=800, gt=0, le=10000, description="mm/min")
    rapid_rate: Optional[int] = Field(default=None, gt=0, le=20000, description="mm/min rapido")
    plunge_rate: Optional[int] = Field(default=None, gt=0, le=5000, description="Compatibilidade legada")
    safe_z: Optional[float] = Field(default=None, description="Compatibilidade legada")
    clearance: float = Field(default=10.0, ge=0, description="Ponto de estacionamento externo em mm")
    origin_x: float = Field(default=0.0)
    origin_y: float = Field(default=0.0)
    wire_temp: int = Field(default=80, description="Temperatura do fio")
    lead_in_length: float = Field(default=0.0, ge=0, le=100, description="Lead-in/out em mm")
    block_gap: float = Field(default=50.0, ge=0, le=1000, description="Espaco entre blocos em mm")
    output_style: str = Field(default="devfoam", pattern="^(devfoam|compact|annotated)$")
    precision: Optional[int] = Field(default=None, ge=3, le=5)
    corner_radius: float = Field(default=0.5, ge=0, le=100, description="Raio dos cantos em mm")
    corner_segments: int = Field(default=3, ge=1, le=16, description="Segmentos por quarto de arco")


class GCodeRequest(BaseModel):
    pieces: List[CutPiece] = Field(..., min_length=1)
    block_width: Optional[float] = Field(default=None, gt=0)
    block_height: Optional[float] = Field(default=None, gt=0)
    config: GCodeConfig = Field(default_factory=GCodeConfig)
    machine_profile: str = Field(
        default="mach3",
        description="Perfil da maquina: mach3 | planet_cnc | grbl",
    )
    strategy: str = Field(
        default="devfoam_auto",
        pattern="^(devfoam_auto|auto|devfoam_banded|banded_grid|banded_serpentine|devfoam_shared|shared_grid|shared_serpentine|serpentine|contour)$",
    )


def _build_gcode(request: GCodeRequest) -> str:
    config = request.config
    normalized_profile = request.machine_profile.replace("-", "_")
    clearance = config.clearance if config.safe_z is None else config.safe_z
    generator = MoldurizeGCodeGenerator(
        feed_rate=config.feed_rate,
        rapid_rate=config.rapid_rate,
        wire_temp=config.wire_temp,
        lead_in_length=config.lead_in_length,
        clearance=clearance,
        block_gap=config.block_gap,
        profile=normalized_profile,
        output_style=config.output_style,
        precision=config.precision,
        corner_radius=config.corner_radius,
        corner_segments=config.corner_segments,
    )
    generator.header("Corte EPS", total_pieces=len(request.pieces))
    generator.generate_from_pieces(
        request.pieces,
        origin_x=config.origin_x,
        origin_y=config.origin_y,
        block_width=request.block_width or 0.0,
        strategy=request.strategy,
    )
    generator.footer()
    return generator.get_gcode()


@router.post("/gcode", response_class=PlainTextResponse)
async def get_gcode(
    request: GCodeRequest,
    clerk_id: str = Depends(get_current_user_clerk_id),
):
    """Gera G-Code CNC para fio quente a partir das pecas posicionadas."""
    try:
        return _build_gcode(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gcode/download")
async def download_gcode(
    request: GCodeRequest,
    clerk_id: str = Depends(get_current_user_clerk_id),
):
    """Retorna G-Code como arquivo .nc para download."""
    try:
        content = _build_gcode(request)
        return Response(
            content=content,
            media_type="text/plain",
            headers={
                "Content-Disposition": "attachment; filename=moldurize_cut.nc",
                "Content-Type": "text/plain; charset=utf-8",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
