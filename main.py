from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from shapely.geometry import box

# Inicializacao do app FastAPI
app = FastAPI(
    title="MOLDURIZE API",
    description="API para otimizacao de corte de EPS e geracao de G-Code",
    version="2.0.0"
)

# Configuracao de CORS para permitir que o frontend se comunique com a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em producao, isso sera substituido pelo seu dominio web
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DADOS (Pydantic Schemas) ---

class Part(BaseModel):
    id: str
    width: float
    height: float
    quantity: int

class MachineConfig(BaseModel):
    feed_rate: float = 150.0
    plunge_rate: float = 80.0
    safety_height: float = 10.0
    wire_temp: float = 200.0
    lead_in_length: float = 2.0

class CutRequest(BaseModel):
    board_width: float
    board_height: float
    kerf: float = 2.0 # Espessura do fio quente (mm)
    parts: List[Part]
    machine: Optional[MachineConfig] = None

class BlockInfo(BaseModel):
    block_index: int
    piece_count: int

class CutResponse(BaseModel):
    status: str
    efficiency: float
    total_blocks: int
    blocks_info: List[BlockInfo]
    waste_percent: float
    largest_remnant: str
    gcode: str
    gcode_stats: Optional[dict] = None
    message: Optional[str] = None

# --- ROTAS (Endpoints) ---

@app.get("/")
def health_check():
    """Rota basica para verificar se o servidor esta online."""
    return {"status": "online", "system": "MOLDURIZE API", "version": "2.0.0"}

@app.post("/api/v1/optimize-cut", response_model=CutResponse)
def optimize_cut(request: CutRequest):
    """
    Recebe dados da chapa e pecas, aciona o motor de nesting e retorna o G-Code REAL.

    Conectado ao NestingEngine (rectpack + TrueShape) e ao MoldurizeGCodeGenerator.
    """
    try:
        from engine import NestingEngine
        from gcode_generator import MoldurizeGCodeGenerator

        # Inicializar motor de nesting
        engine = NestingEngine(request.board_width, request.board_height, request.kerf)

        # Adicionar pecas ao motor
        total_pieces = 0
        for part in request.parts:
            poly = box(0, 0, part.width, part.height)
            for _ in range(part.quantity):
                engine.add_part(poly)
                total_pieces += 1

        if total_pieces == 0:
            raise HTTPException(status_code=400, detail="Nenhuma peca valida na requisicao.")

        # Executar nesting
        engine.generate_layout()

        # Calcular estatisticas
        total_blocks, waste_pct, retalho_dim, pecas_por_bloco = engine.calculate_stats()
        efficiency = 100.0 - waste_pct

        # Gerar G-Code real
        machine = request.machine or MachineConfig()
        gen = MoldurizeGCodeGenerator(
            feed_rate=machine.feed_rate,
            plunge_rate=machine.plunge_rate,
            safety_height=machine.safety_height,
            wire_temp=machine.wire_temp,
            lead_in_length=machine.lead_in_length,
        )
        gen.header(f"MOLDURIZE - {total_pieces} pecas em {total_blocks} blocos")
        gen.generate_from_nesting(
            engine.blocks_used,
            block_width=request.board_width,
        )
        gen.footer()

        # Montar resposta
        blocks_info = [
            BlockInfo(block_index=i + 1, piece_count=n)
            for i, n in enumerate(pecas_por_bloco)
        ]

        retalho_txt = (
            f"{retalho_dim[0]:.0f}x{retalho_dim[1]:.0f}mm"
            if retalho_dim[0] > 0
            else "Nenhum"
        )

        return CutResponse(
            status="success",
            efficiency=round(efficiency, 2),
            total_blocks=total_blocks,
            blocks_info=blocks_info,
            waste_percent=round(waste_pct, 2),
            largest_remnant=retalho_txt,
            gcode=gen.get_gcode(),
            gcode_stats=gen.get_stats(),
            message=f"Otimizado: {total_pieces} pecas em {total_blocks} blocos ({efficiency:.1f}% eficiencia)"
        )
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Modulo nao encontrado: {str(e)}. Verifique se engine.py e gcode_generator.py estao acessiveis."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/generate-gcode")
def generate_gcode_only(request: CutRequest):
    """
    Gera APENAS o G-Code sem informacoes de nesting.
    Util para re-exportar com parametros de maquina diferentes.
    """
    response = optimize_cut(request)
    return {"gcode": response.gcode, "stats": response.gcode_stats}