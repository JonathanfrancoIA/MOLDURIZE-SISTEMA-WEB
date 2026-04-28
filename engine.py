"""MOLDURIZE — Motor de Nesting Híbrido (Rectpack + True Shape)"""

import logging
from shapely.geometry import box, Polygon
from shapely.affinity import translate

logger = logging.getLogger("moldurize.engine")

try:
    import rectpack
    RECTPACK_AVAILABLE = True
except ImportError:
    RECTPACK_AVAILABLE = False
    logger.warning("Biblioteca rectpack não encontrada. Fallback para True Shape ativado.")


class NestingEngine:
    """Motor híbrido: rectpack para retangulares, True Shape para irregulares."""

    def __init__(self, block_w, block_h, kerf=2.0):
        self.block_w = block_w
        self.block_h = block_h
        self.kerf_mm = kerf  # C1 fixado: renomeado de kerf para kerf_mm
        self.raw_parts = []
        self.blocks_used = []

    def add_part(self, polygon):
        self.raw_parts.append(polygon)

    def _is_rectangular(self, poly):
        """Verifica se o polígono é retangular com margem de tolerância."""
        if not isinstance(poly, Polygon):
            return False
        coords = list(poly.exterior.coords)
        if len(coords) != 5:
            return False
        minx, miny, maxx, maxy = poly.bounds
        rect = box(minx, miny, maxx, maxy)
        return poly.area > 0 and abs(poly.area - rect.area) < 0.1

    def generate_layout(self):
        """Executa nesting com despachante automático."""
        if not self.raw_parts:
            self.blocks_used = []
            return

        all_rects = all(self._is_rectangular(p) for p in self.raw_parts)

        if RECTPACK_AVAILABLE and all_rects:
            logger.info("Modo Rectpack (MaxRectsBl) selecionado - Todas as peças são retangulares.")
            self._generate_rectpack_layout()
        else:
            logger.info("Modo True Shape selecionado - Peças irregulares detectadas.")
            try:
                from true_shape import TrueShapeEngine
            except ImportError:
            try:
                from true_shape import TrueShapeEngine
            except ImportError:
                from .true_shape import TrueShapeEngine
            # Passando o kerf_mm corretamente para o TrueShapeEngine
            ts_engine = TrueShapeEngine(self.block_w, self.block_h, self.kerf_mm)
            for p in self.raw_parts:
                ts_engine.add_part(p)
            self.blocks_used = ts_engine.generate_layout()

    def _generate_rectpack_layout(self):
        """Nesting otimizado via rectpack para peças retangulares (precisão 0.01mm) utilizando Chunking."""
        k = self.kerf_mm
        multiplier = 100  # C2 fixado: aumento de precisão para suportar x.xx mm

        # Adicionar blocos inteligentemente (Chunking para quantidades massivas)
        bin_w = int(round((self.block_w + k) * multiplier))
        bin_h = int(round((self.block_h + k) * multiplier))
        
        CHUNK_SIZE = 1500 # Peças por lote para evitar superaquecimento O(N^2) do algorítmo
        blocks_dict = {}
        block_counter = 0
        
        # Processamento em lotes (Agrupamento matemático)
        for i in range(0, len(self.raw_parts), CHUNK_SIZE):
            chunk = self.raw_parts[i:i+CHUNK_SIZE]
            
            packer = rectpack.newPacker(
                mode=rectpack.PackingMode.Offline,
                bin_algo=rectpack.PackingBin.BFF,
                pack_algo=rectpack.MaxRectsBl,
                sort_algo=rectpack.SORT_AREA,
                rotation=True
            )
            
            chunk_area = 0
            for local_idx, poly in enumerate(chunk):
                minx, miny, maxx, maxy = poly.bounds
                w = maxx - minx + k
                h = maxy - miny + k
                chunk_area += (w * h)
                global_idx = i + local_idx
                packer.add_rect(int(round(w * multiplier)),  
                                int(round(h * multiplier)), 
                                rid=global_idx)
                                
            # Estima o número máximo de blocos APENAS para este chunk (Garante performance extrema)
            bin_area = (self.block_w * self.block_h)
            max_bins_chunk = int((chunk_area / bin_area) * 1.5) + 1
            max_bins_chunk = max(max_bins_chunk, len(chunk)) # Fail safe fallback
            
            for _ in range(max_bins_chunk):
                packer.add_bin(bin_w, bin_h)
                
            packer.pack()
            
            # Converter resultados deste chunk para polígonos posicionados
            for abin in packer.rect_list():
                b_idx, x, y, rect_w, rect_h, rid = abin
                # Deslocar b_idx para continuar a contagem do batch anterior
                global_b_idx = b_idx + block_counter
                
                rx = x / float(multiplier)
                ry = y / float(multiplier)
                rw = rect_w / float(multiplier) - k
                rh = rect_h / float(multiplier) - k
                placed = box(rx, ry, rx + rw, ry + rh)

                if global_b_idx not in blocks_dict:
                    blocks_dict[global_b_idx] = []
                blocks_dict[global_b_idx].append(placed)
                
            # Atualizar contador de blocos para o próximo chunk
            if packer.rect_list():
                highest_bin_idx_in_chunk = max(abin[0] for abin in packer.rect_list())
                block_counter += (highest_bin_idx_in_chunk + 1)

        # Ordenar os blocos pelas chaves do dicionário de forma segura
        self.blocks_used = [blocks_dict[key] for key in sorted(blocks_dict.keys())]

    def calculate_stats(self):
        """Retorna (total_blocos, desperdicio_pct, maior_retalho_dim, pecas_por_bloco)."""
        if not self.blocks_used:
            return 0, 0.0, (0, 0), []

        total_blocks = len(self.blocks_used)
        block_area = self.block_w * self.block_h
        total_area = block_area * total_blocks

        used_area = 0
        pecas_por_bloco = []
        for block in self.blocks_used:
            pecas_por_bloco.append(len(block))
            for poly in block:
                used_area += poly.area

        waste_pct = ((total_area - used_area) / total_area * 100) if total_area > 0 else 0

        # Calcular maior retalho (heurística simples: sobra vertical no último bloco)
        last_block = self.blocks_used[-1]
        last_used = sum(p.area for p in last_block)
        last_free = block_area - last_used

        retalho_w, retalho_h = 0, 0
        if last_free > 0:
            max_y = 0
            for p in last_block:
                _, _, _, py1 = p.bounds
                max_y = max(max_y, py1)
            
            # Se a peça mais alta deixar mais que 10mm livres até o topo do bloco
            if self.block_h - max_y >= 10:
                retalho_h = self.block_h - max_y
                retalho_w = self.block_w

        return total_blocks, waste_pct, (retalho_w, retalho_h), pecas_por_bloco
