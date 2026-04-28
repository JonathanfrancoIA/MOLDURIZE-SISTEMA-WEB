"""MOLDURIZE — Motor True Shape Nesting (Heurística Bottom-Left Fill OTIMIZADO)

Versão otimizada com:
- STRtree spatial index para O(log n) collision detection
- Prepared geometries para interseção acelerada
- 4 rotações (0°, 90°, 180°, 270°) 
- Step adaptativo inteligente com refinamento local
"""

from shapely.geometry import box, Polygon
from shapely.affinity import translate, rotate
from shapely.prepared import prep
from shapely import STRtree
import logging

logger = logging.getLogger("moldurize.trueshape")


class TrueShapeEngine:
    """Motor de nesting para geometrias irregulares (DXF)."""

    def __init__(self, block_w, block_h, kerf=2.0):
        self.block_w = block_w
        self.block_h = block_h
        self.kerf = kerf
        self.parts = []
        self.blocks_used = []

    def add_part(self, polygon):
        """Adiciona polígono com buffer de kerf."""
        buffered = polygon.buffer(self.kerf / 2.0, join_style=2)
        self.parts.append(buffered)

    def generate_layout(self, parts=None):
        """Executa nesting com heurística Bottom-Left Fill otimizada."""
        if parts is not None:
            self.parts = parts

        if not self.parts:
            return []

        # Ordenar por área decrescente (Best-Fit Decreasing)
        sorted_parts = sorted(self.parts, key=lambda p: p.area, reverse=True)

        self.blocks_used = []
        placed_per_block = []
        trees_per_block = []

        logger.info(f"Iniciando True Shape Nest com {len(sorted_parts)} peças.")

        for part_idx, part in enumerate(sorted_parts):
            placed = False

            for b_idx, block_polys in enumerate(placed_per_block):
                result = self._try_place(part, block_polys, trees_per_block[b_idx])
                if result is not None:
                    block_polys.append(result)
                    self.blocks_used[b_idx].append(result)
                    trees_per_block[b_idx] = STRtree(block_polys)
                    placed = True
                    break

            if not placed:
                result = self._try_place(part, [], None)
                if result is not None:
                    new_block = [result]
                    self.blocks_used.append([result])
                    placed_per_block.append(new_block)
                    trees_per_block.append(STRtree(new_block))
                else:
                    logger.warning(f"Peça {part_idx} maior que o bloco. Não pode ser encaixada.")

            if (part_idx + 1) % 50 == 0:
                logger.info(f"  Progresso: {part_idx + 1}/{len(sorted_parts)} peças posicionadas")

        logger.info(f"Nesting terminado. Usados {len(self.blocks_used)} blocos.")
        return self.blocks_used

    def _get_dynamic_step(self, piece_dim):
        """Adapta a resolução de busca heurística ao tamanho da peça."""
        if piece_dim <= 20:
            return 1.0
        if piece_dim <= 100:
            return 5.0
        if piece_dim <= 500:
            return 15.0
        if piece_dim <= 1000:
            return 40.0
        return 80.0

    def _try_place(self, part, existing, tree):
        """Tenta posicionar peça usando Bottom-Left Fill com STRtree."""
        minx, miny, maxx, maxy = part.bounds
        pw, ph = maxx - minx, maxy - miny

        rotations = [part]
        for angle in [90, 180, 270]:
            rotated = rotate(part, angle, origin='centroid')
            rminx, rminy, rmaxx, rmaxy = rotated.bounds
            rpw, rph = rmaxx - rminx, rmaxy - rminy
            if rpw <= self.block_w + 0.1 and rph <= self.block_h + 0.1:
                rotations.append(rotated)

        step_x = self._get_dynamic_step(pw)
        step_y = self._get_dynamic_step(ph)

        for candidate in rotations:
            cminx, cminy, cmaxx, cmaxy = candidate.bounds
            cpw, cph = cmaxx - cminx, cmaxy - cminy

            y = 0.0
            while y + cph <= self.block_h + 0.1:
                x = 0.0
                while x + cpw <= self.block_w + 0.1:
                    placed = translate(candidate, xoff=x - cminx, yoff=y - cminy)

                    px0, py0, px1, py1 = placed.bounds
                    if px1 > self.block_w + 0.01 or py1 > self.block_h + 0.01:
                        x += step_x
                        continue

                    collision = False

                    if existing and tree is not None:
                        nearby_indices = tree.query(placed)
                        if len(nearby_indices) > 0:
                            prep_placed = prep(placed)
                            for idx in nearby_indices:
                                if prep_placed.intersects(existing[idx]):
                                    collision = True
                                    break
                    elif existing:
                        for ep in existing:
                            ex0, ey0, ex1, ey1 = ep.bounds
                            if px1 <= ex0 or px0 >= ex1 or py1 <= ey0 or py0 >= ey1:
                                continue
                            if placed.intersects(ep):
                                collision = True
                                break

                    if not collision:
                        return placed

                    x += step_x
                y += step_y

        return None
