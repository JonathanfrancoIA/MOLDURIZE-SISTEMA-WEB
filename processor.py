"""MOLDURIZE — Processador de Dados Multi-Entrada (Manual, DXF, Visão)

Versão melhorada com:
- Suporte a Bulge Values em LWPOLYLINE (arcos entre pontos)
- Suporte a entidades ARC e CIRCLE do DXF
- Interpolação de arcos para polígonos Shapely
"""

import math
from shapely.geometry import Polygon, box
import numpy as np


class DataProcessor:
    """Processa entrada de dados para o motor de nesting."""

    @staticmethod
    def create_rectangle(width, height):
        """Cria um polígono retangular."""
        return box(0, 0, width, height)

    @staticmethod
    def _interpolate_arc(p1, p2, bulge, num_segments=16):
        """Interpola pontos ao longo de um arco definido por bulge value.

        Técnica extraída do devFoam (csarnevesht/devFoam).
        Bulge = tan(arc_angle / 4), onde:
        - bulge > 0 = arco CCW
        - bulge < 0 = arco CW
        - |bulge| = 1 = semicírculo

        Args:
            p1: Ponto inicial (x, y)
            p2: Ponto final (x, y)
            bulge: Valor de bulge do DXF
            num_segments: Número de segmentos para interpolação

        Returns:
            Lista de pontos (x, y) ao longo do arco (excluindo p1 e p2)
        """
        if abs(bulge) < 1e-6:
            return []

        # Ângulo do arco
        arc_angle = 4.0 * math.atan(abs(bulge))

        # Distância entre pontos
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        chord = math.sqrt(dx * dx + dy * dy)

        if chord < 1e-6:
            return []

        # Raio do arco
        radius = chord / (2.0 * math.sin(arc_angle / 2.0))

        # Ponto médio do chord
        mid_x = (p1[0] + p2[0]) / 2.0
        mid_y = (p1[1] + p2[1]) / 2.0

        # Vetor perpendicular ao chord (normalizado)
        perp_x = -dy / chord
        perp_y = dx / chord

        # Distância do centro ao ponto médio do chord
        sagitta = radius * (1.0 - math.cos(arc_angle / 2.0))
        center_dist = radius - sagitta

        # Direção do centro depende do sinal do bulge
        sign = 1.0 if bulge > 0 else -1.0
        center_x = mid_x + sign * center_dist * perp_x
        center_y = mid_y + sign * center_dist * perp_y

        # Ângulos de início e fim
        start_angle = math.atan2(p1[1] - center_y, p1[0] - center_x)
        end_angle = math.atan2(p2[1] - center_y, p2[0] - center_x)

        # Ajustar direção
        if bulge > 0:  # CCW
            if end_angle <= start_angle:
                end_angle += 2.0 * math.pi
        else:  # CW
            if end_angle >= start_angle:
                end_angle -= 2.0 * math.pi

        # Interpolar pontos ao longo do arco
        arc_points = []
        for i in range(1, num_segments):
            t = i / float(num_segments)
            angle = start_angle + t * (end_angle - start_angle)
            ax = center_x + radius * math.cos(angle)
            ay = center_y + radius * math.sin(angle)
            arc_points.append((ax, ay))

        return arc_points

    @staticmethod
    def _circle_to_polygon(cx, cy, radius, num_segments=32):
        """Converte um círculo em polígono aproximado.

        Args:
            cx, cy: Centro do círculo
            radius: Raio
            num_segments: Número de segmentos (mais = mais preciso)

        Returns:
            Polygon Shapely
        """
        points = []
        for i in range(num_segments):
            angle = 2.0 * math.pi * i / num_segments
            x = cx + radius * math.cos(angle)
            y = cy + radius * math.sin(angle)
            points.append((x, y))
        return Polygon(points)

    @staticmethod
    def _arc_to_points(cx, cy, radius, start_angle_deg, end_angle_deg, num_segments=16):
        """Converte um arco DXF em lista de pontos.

        Args:
            cx, cy: Centro do arco
            radius: Raio
            start_angle_deg, end_angle_deg: Ângulos em graus
            num_segments: Número de segmentos

        Returns:
            Lista de pontos (x, y)
        """
        start_rad = math.radians(start_angle_deg)
        end_rad = math.radians(end_angle_deg)

        if end_rad <= start_rad:
            end_rad += 2.0 * math.pi

        points = []
        for i in range(num_segments + 1):
            t = i / float(num_segments)
            angle = start_rad + t * (end_rad - start_rad)
            x = cx + radius * math.cos(angle)
            y = cy + radius * math.sin(angle)
            points.append((x, y))
        return points

    @staticmethod
    def parse_dxf(filepath):
        """Lê geometrias fechadas de um arquivo DXF.

        Melhorias vs versão anterior:
        - Suporte a bulge values em LWPOLYLINE (arcos)
        - Suporte a entidades CIRCLE
        - Suporte a entidades ARC
        - Interpolação precisa de arcos para polígonos
        """
        try:
            import ezdxf
        except ImportError:
            raise ImportError("Biblioteca ezdxf não instalada. Execute: pip install ezdxf")

        doc = ezdxf.readfile(filepath)
        msp = doc.modelspace()
        polygons = []

        # LWPOLYLINES (com suporte a bulge — técnica devFoam)
        for entity in msp.query("LWPOLYLINE"):
            if entity.closed:
                pl_points = list(entity.get_points())
                points = []

                for i, pt in enumerate(pl_points):
                    x, y = float(pt[0]), float(pt[1])
                    bulge = float(pt[4]) if len(pt) > 4 else 0.0
                    points.append((x, y))

                    # Se este segmento tem bulge, interpolar arco
                    if abs(bulge) > 1e-6:
                        next_idx = (i + 1) % len(pl_points)
                        next_pt = pl_points[next_idx]
                        p2 = (float(next_pt[0]), float(next_pt[1]))
                        arc_pts = DataProcessor._interpolate_arc((x, y), p2, bulge)
                        points.extend(arc_pts)

                if len(points) >= 3:
                    poly = Polygon(points)
                    if poly.is_valid and poly.area > 0:
                        polygons.append(poly)
                    elif not poly.is_valid:
                        # Tentar corrigir geometria inválida
                        fixed = poly.buffer(0)
                        if fixed.is_valid and fixed.area > 0:
                            polygons.append(fixed)

        # POLYLINEs (3D polylines)
        for entity in msp.query("POLYLINE"):
            if entity.is_closed:
                points = [(v.dxf.location.x, v.dxf.location.y)
                          for v in entity.vertices]
                if len(points) >= 3:
                    poly = Polygon(points)
                    if poly.is_valid and poly.area > 0:
                        polygons.append(poly)

        # CIRCLE entities → polígono aproximado
        for entity in msp.query("CIRCLE"):
            cx = entity.dxf.center.x
            cy = entity.dxf.center.y
            radius = entity.dxf.radius
            if radius > 0:
                poly = DataProcessor._circle_to_polygon(cx, cy, radius)
                polygons.append(poly)

        # ARC entities → segmento de arco (polilinha aberta, não fecha sozinho)
        # Arcos são adicionados como informação geométrica, mas não como peças cortáveis
        # a menos que façam parte de um contorno fechado

        # LINEs formando contorno fechado (fallback)
        lines = list(msp.query("LINE"))
        if lines and not polygons:
            points = []
            for line in lines:
                points.append((line.dxf.start.x, line.dxf.start.y))
            if len(points) >= 3:
                poly = Polygon(points)
                if poly.is_valid and poly.area > 0:
                    polygons.append(poly)

        return polygons

    @staticmethod
    def parse_image(image_path, calibration_mm=100.0):
        """Extrai contornos de uma imagem usando OpenCV."""
        try:
            import cv2
            import imutils
        except ImportError:
            raise ImportError("OpenCV/imutils não instalados. Execute: pip install opencv-python imutils")

        imagem = cv2.imread(image_path)
        if imagem is None:
            raise ValueError(f"Não foi possível ler a imagem: {image_path}")

        gray = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)

        contours = cv2.findContours(edges.copy(), cv2.RETR_EXTERNAL,
                                     cv2.CHAIN_APPROX_SIMPLE)
        contours = imutils.grab_contours(contours)

        if not contours:
            return None

        # Maior contorno
        c = max(contours, key=cv2.contourArea)
        epsilon = 0.02 * cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, epsilon, True)

        points = [(p[0][0], p[0][1]) for p in approx]
        if len(points) < 3:
            return None

        poly = Polygon(points)
        if not poly.is_valid or poly.area == 0:
            return None

        # Escalar para mm
        minx, miny, maxx, maxy = poly.bounds
        largura_pixels = maxx - minx
        if largura_pixels == 0:
            return None

        scale = calibration_mm / largura_pixels
        scaled_points = [((x - minx) * scale, (y - miny) * scale) for x, y in points]

        return Polygon(scaled_points)
