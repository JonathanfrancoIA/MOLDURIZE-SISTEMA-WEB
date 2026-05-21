"""Hot-wire G-Code generation for MOLDURIZE.

This module is intentionally not a router/tool-depth generator. For hot-wire
EPS machines, the wire is controlled by synchronized endpoints:

- X/Y: left tower endpoint
- Z/A: right tower endpoint

For straight 2D cuts both endpoints receive the same projected coordinates.
That keeps Mach3/PlanetCNC 4-axis machines aligned and avoids the invalid
"plunge Z negative" pattern used by router-style G-Code.

The default output uses the compact devFoam-like dialect used by common hot-wire
setups: G21/G17/G90 header, four decimal places, no comments, continuous G1
moves, and X/Y mirrored into Z/A.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List, Optional, Sequence, Tuple


Point = Tuple[float, float]


@dataclass
class GCodeStats:
    line_count: int
    cut_distance_mm: float
    rapid_distance_mm: float
    estimated_time_min: float


@dataclass(frozen=True)
class _GridCell:
    x: float
    y: float
    width: float
    height: float

    @property
    def right(self) -> float:
        return self.x + self.width

    @property
    def bottom(self) -> float:
        return self.y + self.height


AXIS_PROFILES = {
    "mach3": ("X", "Y", "Z", "A"),
    "planet_cnc": ("X", "Y", "Z", "A"),
    "planetcnc": ("X", "Y", "Z", "A"),
    "grbl": ("X", "Y", None, None),
}


class MoldurizeGCodeGenerator:
    """Generate synchronized hot-wire G-Code with serpentine ordering."""

    def __init__(
        self,
        feed_rate: float = 800.0,
        rapid_rate: Optional[float] = None,
        wire_temp: float = 80.0,
        units: str = "mm",
        lead_in_length: float = 0.0,
        clearance: float = 10.0,
        block_gap: float = 50.0,
        profile: str = "mach3",
        output_style: str = "devfoam",
        precision: Optional[int] = None,
        corner_radius: float = 0.5,
        corner_segments: int = 3,
        plunge_rate: Optional[float] = None,
        safety_height: Optional[float] = None,
    ):
        self.feed_rate = float(feed_rate)
        self.rapid_rate = float(rapid_rate or feed_rate * 2.0)
        self.wire_temp = float(wire_temp)
        self.units = units
        self.lead_in_length = max(0.0, float(lead_in_length))
        self.clearance = max(0.0, float(safety_height if safety_height is not None else clearance))
        self.block_gap = max(0.0, float(block_gap))
        self.profile = profile.replace("-", "_").lower()
        self.axes = AXIS_PROFILES.get(self.profile, AXIS_PROFILES["mach3"])
        self.output_style = output_style.replace("-", "_").lower()
        self.compact_output = self.output_style in {"devfoam", "compact"}
        self.precision = int(precision if precision is not None else (4 if self.compact_output else 3))
        self.include_comments = not self.compact_output
        self.use_rapid_moves = not self.compact_output
        self.corner_radius = max(0.0, float(corner_radius))
        self.corner_segments = max(1, int(corner_segments))

        # Router-style fields are accepted for API compatibility only.
        self.plunge_rate = plunge_rate

        self.current_x = 0.0
        self.current_y = 0.0
        self.lines: List[str] = []
        self.cut_distance_mm = 0.0
        self.rapid_distance_mm = 0.0
        self._first_cut_move = True
        self.park_x = self.clearance
        self.park_y = 0.0

    def _add(self, line: str) -> None:
        self.lines.append(line)

    def _fmt(self, value: float) -> str:
        return f"{value:.{self.precision}f}"

    def _comment(self, line: str) -> None:
        if self.include_comments:
            self._add(line)

    def _same_position(self, x: float, y: float, tolerance: float = 0.0001) -> bool:
        return math.isclose(self.current_x, x, abs_tol=tolerance) and math.isclose(
            self.current_y, y, abs_tol=tolerance
        )

    def header(self, job_name: str = "MOLDURIZE Hotwire Cut", total_pieces: int = 0) -> None:
        self.lines = []
        self.current_x = 0.0
        self.current_y = 0.0
        self.cut_distance_mm = 0.0
        self.rapid_distance_mm = 0.0
        self._first_cut_move = True
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        unit_code = "G21" if self.units == "mm" else "G20"
        four_axis = self.axes[2] is not None and self.axes[3] is not None

        if self.compact_output:
            self._add(unit_code)
            self._add("G17")
            self._add("G90")
            self._add(f"F{self._fmt(self.feed_rate)}")
            self._add("M3")
            return

        self._add("; ============================================================")
        self._add(f"; MOLDURIZE WEB - {job_name}")
        self._add(f"; Gerado em {now}")
        self._add(f"; Perfil: {self.profile.upper()}")
        self._add(f"; Total de pecas: {total_pieces}")
        self._add("; Processo: fio quente sincronizado")
        if four_axis:
            self._add("; Eixos: X/Y esquerda, Z/A direita")
        else:
            self._add("; Eixos: X/Y somente (perfil sem 4o eixo)")
        self._add("; ============================================================")
        self._add(f"{unit_code}       ; Unidades")
        self._add("G17       ; Plano XY")
        self._add("G90       ; Coordenadas absolutas")
        self._add("G94       ; Feed em unidades/min")
        self._add(f"M3 S{self.wire_temp:.0f}       ; Ligar fio quente")
        self._add(f"F{self._fmt(self.feed_rate)}")
        self._add("")

    def footer(self) -> None:
        if self.compact_output:
            if not (
                math.isclose(self.current_x, self.park_x, abs_tol=0.0001)
                and math.isclose(self.current_y, self.park_y, abs_tol=0.0001)
            ):
                self.linear_move(self.park_x, self.park_y)
            self._add("M5")
            return

        self._add("; ==== FIM DO PROGRAMA ====")
        self.rapid_move(0.0, 0.0, comment="Retornar a origem")
        self._add("M5    ; Parar fio")
        self._add("M30   ; Fim")

    def _format_axes(
        self,
        left_x: float,
        left_y: float,
        right_x: Optional[float] = None,
        right_y: Optional[float] = None,
    ) -> str:
        ax_x, ax_y, ax_rx, ax_ry = self.axes
        rx = left_x if right_x is None else right_x
        ry = left_y if right_y is None else right_y
        parts = [f"{ax_x}{self._fmt(left_x)}", f"{ax_y}{self._fmt(left_y)}"]
        if ax_rx and ax_ry:
            parts.append(f"{ax_rx}{self._fmt(rx)}")
            parts.append(f"{ax_ry}{self._fmt(ry)}")
        return "".join(parts) if self.compact_output else " ".join(parts)

    def _track_distance(self, x: float, y: float, *, rapid: bool) -> None:
        dist = math.hypot(x - self.current_x, y - self.current_y)
        if rapid:
            self.rapid_distance_mm += dist
        else:
            self.cut_distance_mm += dist
        self.current_x = x
        self.current_y = y

    def rapid_move(self, x: float, y: float, comment: Optional[str] = None) -> None:
        if not self.use_rapid_moves:
            self.linear_move(x, y, feed=self.feed_rate if self._first_cut_move else None)
            return

        if self._same_position(x, y):
            return

        cmd = f"G0 {self._format_axes(x, y)}"
        if comment and self.include_comments:
            cmd += f"   ; {comment}"
        self._track_distance(x, y, rapid=True)
        self._add(cmd)

    def linear_move(self, x: float, y: float, feed: Optional[float] = None, comment: Optional[str] = None) -> None:
        if self._same_position(x, y) and not self._first_cut_move:
            return

        move_feed = float(feed or self.feed_rate)
        separator = "" if self.compact_output else " "
        cmd = f"G1{separator}{self._format_axes(x, y)}"
        if self.compact_output:
            if self._first_cut_move or not math.isclose(move_feed, self.feed_rate):
                cmd += f"F{self._fmt(move_feed)}"
        else:
            cmd += f" F{self._fmt(move_feed)}"
        if comment and self.include_comments:
            cmd += f"   ; {comment}"
        self._track_distance(x, y, rapid=False)
        self._add(cmd)
        self._first_cut_move = False

    def arc_move(
        self,
        x: float,
        y: float,
        i: float,
        j: float,
        clockwise: bool = True,
        feed: Optional[float] = None,
    ) -> None:
        # Arc commands are kept for DXF curves. The synchronized endpoint still
        # follows the same projected destination.
        code = "G2" if clockwise else "G3"
        move_feed = float(feed or self.feed_rate)
        separator = "" if self.compact_output else " "
        axis_separator = "" if self.compact_output else " "
        cmd = (
            f"{code}{separator}{self._format_axes(x, y)}"
            f"{axis_separator}I{self._fmt(i)}{axis_separator}J{self._fmt(j)}"
        )
        if self.compact_output:
            if self._first_cut_move or not math.isclose(move_feed, self.feed_rate):
                cmd += f"F{self._fmt(move_feed)}"
        else:
            cmd += f" F{self._fmt(move_feed)}"
        self._track_distance(x, y, rapid=False)
        self._add(cmd)
        self._first_cut_move = False

    @staticmethod
    def _signed_area(points: Sequence[Point]) -> float:
        area = 0.0
        for idx, point in enumerate(points):
            nxt = points[(idx + 1) % len(points)]
            area += point[0] * nxt[1] - nxt[0] * point[1]
        return area / 2.0

    def _apply_direction(self, points: List[Point], clockwise: Optional[bool]) -> List[Point]:
        if clockwise is None or len(points) < 3:
            return points
        is_clockwise = self._signed_area(points) < 0
        if is_clockwise == clockwise:
            return points
        return [points[0], *reversed(points[1:])]

    def cut_contour(
        self,
        points: Sequence[Point],
        *,
        closed: bool = True,
        clockwise: Optional[bool] = False,
    ) -> None:
        if len(points) < 2:
            return

        pts = self._apply_direction(list(points), clockwise)
        start_x, start_y = pts[0]

        if self.lead_in_length > 0 and len(pts) >= 2:
            next_x, next_y = pts[1]
            dx = next_x - start_x
            dy = next_y - start_y
            dist = math.hypot(dx, dy)
            if dist > 0:
                lead_x = start_x - (dx / dist) * self.lead_in_length
                lead_y = start_y - (dy / dist) * self.lead_in_length
                self.rapid_move(lead_x, lead_y, comment="Aproximacao")
                self.linear_move(start_x, start_y, comment="Lead-in")
            else:
                self.rapid_move(start_x, start_y)
        elif self.compact_output and not self._same_position(start_x, start_y):
            # Compact / devFoam mode: transit with axis-aligned moves so the
            # wire never cuts diagonally through uncut EPS foam.
            # Strategy: move vertically first (along the current column's already-
            # cut left edge), then horizontally into the new row.
            if not math.isclose(self.current_y, start_y, abs_tol=0.0001):
                self.linear_move(self.current_x, start_y)
            if not math.isclose(self.current_x, start_x, abs_tol=0.0001):
                self.linear_move(start_x, start_y)
        else:
            self.rapid_move(start_x, start_y)

        for x, y in pts[1:]:
            self.linear_move(x, y)

        if closed and len(pts) > 2:
            self.linear_move(start_x, start_y, comment="Fechar contorno")

        if self.lead_in_length > 0 and len(pts) >= 2:
            if closed and len(pts) > 2:
                prev_x, prev_y = pts[-1]
                last_x, last_y = start_x, start_y
            else:
                prev_x, prev_y = pts[-2]
                last_x, last_y = pts[-1]
            dx = last_x - prev_x
            dy = last_y - prev_y
            dist = math.hypot(dx, dy)
            if dist > 0:
                self.linear_move(
                    last_x + (dx / dist) * self.lead_in_length,
                    last_y + (dy / dist) * self.lead_in_length,
                    comment="Lead-out",
                )
        if self.include_comments:
            self._add("")

    @staticmethod
    def _rectangle_points(x: float, y: float, width: float, height: float) -> List[Point]:
        return [
            (x, y),
            (x + width, y),
            (x + width, y + height),
            (x, y + height),
        ]

    @staticmethod
    def _arc_points(center_x: float, center_y: float, radius: float, start_deg: float, end_deg: float, segments: int) -> List[Point]:
        step = (end_deg - start_deg) / segments
        points: List[Point] = []
        for idx in range(1, segments + 1):
            angle = math.radians(start_deg + step * idx)
            points.append((center_x + math.cos(angle) * radius, center_y + math.sin(angle) * radius))
        return points

    def _rounded_rectangle_points(self, x: float, y: float, width: float, height: float) -> List[Point]:
        radius = min(self.corner_radius, width / 2.0, height / 2.0)
        if radius <= 0:
            return self._rectangle_points(x, y, width, height)

        left = x
        right = x + width
        top = y
        bottom = y + height
        segments = self.corner_segments

        points: List[Point] = [(left + radius, top)]
        points.extend(self._arc_points(left + radius, top + radius, radius, -90, -180, segments))
        points.append((left, bottom - radius))
        points.extend(self._arc_points(left + radius, bottom - radius, radius, 180, 90, segments))
        points.append((right - radius, bottom))
        points.extend(self._arc_points(right - radius, bottom - radius, radius, 90, 0, segments))
        points.append((right, top + radius))
        points.extend(self._arc_points(right - radius, top + radius, radius, 0, -90, segments))
        return points

    def cut_rectangle(self, x: float, y: float, width: float, height: float) -> None:
        points = self._rounded_rectangle_points(x, y, width, height)
        self.cut_contour(points, clockwise=None if self.corner_radius > 0 else False)

    def cut_smart_piece(self, x: float, y: float, width: float, height: float) -> None:
        """Corta 3 lados da peça baseando-se na posição atual para evitar backtracking.

        Imita um caminho Euleriano contínuo: entra por um lado, percorre topo e
        base, e para na extremidade oposta — pronto para a próxima peça sem
        que o fio quente atravesse o EPS já cortado.
        """
        if self.current_x <= (x + width / 2.0):
            # Fio vem da esquerda: entra pela esquerda, sai pela direita
            pts: list[Point] = [
                (x, y),
                (x, y + height),
                (x + width, y + height),
                (x + width, y),
            ]
        else:
            # Fio vem da direita: entra pela direita, sai pela esquerda
            pts = [
                (x + width, y),
                (x + width, y + height),
                (x, y + height),
                (x, y),
            ]

        # closed=False evita que o fio retorne ao ponto de origem derretendo o EPS duas vezes
        self.cut_contour(pts, closed=False, clockwise=None)


    def _cell_radius(self, cell: _GridCell) -> float:
        return min(self.corner_radius, cell.width / 2.0, cell.height / 2.0)

    def _emit_arc(self, center_x: float, center_y: float, radius: float, start_deg: float, end_deg: float) -> None:
        if radius <= 0:
            return
        for x, y in self._arc_points(center_x, center_y, radius, start_deg, end_deg, self.corner_segments):
            self.linear_move(x, y)

    def _emit_left_side_down(self, cell: _GridCell) -> None:
        radius = self._cell_radius(cell)
        self._emit_arc(cell.x + radius, cell.y + radius, radius, -90, -180)
        self.linear_move(cell.x, cell.bottom - radius)
        self._emit_arc(cell.x + radius, cell.bottom - radius, radius, 180, 90)

    def _emit_bottom_to_right_side(self, cell: _GridCell) -> None:
        radius = self._cell_radius(cell)
        self.linear_move(cell.right - radius, cell.bottom)
        self._emit_arc(cell.right - radius, cell.bottom - radius, radius, 90, 0)

    def _emit_right_side_up_to_top(self, cell: _GridCell) -> None:
        radius = self._cell_radius(cell)
        self.linear_move(cell.right, cell.y + radius)
        self._emit_arc(cell.right - radius, cell.y + radius, radius, 0, -90)

    def _emit_top_edge_left(self, cell: _GridCell) -> None:
        radius = self._cell_radius(cell)
        self.linear_move(cell.x + radius, cell.y)

    def _emit_top_left_and_left_side_down(self, cell: _GridCell) -> None:
        radius = self._cell_radius(cell)
        self._emit_arc(cell.x + radius, cell.y + radius, radius, -90, -180)
        self.linear_move(cell.x, cell.bottom - radius)

    def _detect_shared_grid(
        self,
        pieces: Sequence[object],
        *,
        base_x: float,
        base_y: float,
        row_tolerance: float = 5.0,
        geometry_tolerance: float = 1.0,
    ) -> Optional[List[List[_GridCell]]]:
        cells = [
            _GridCell(
                x=base_x + float(getattr(piece, "x")),
                y=base_y + float(getattr(piece, "y")),
                width=float(getattr(piece, "width")),
                height=float(getattr(piece, "height")),
            )
            for piece in pieces
        ]
        if not cells or any(cell.width <= 0 or cell.height <= 0 for cell in cells):
            return None

        rows: List[List[_GridCell]] = []
        row_y: List[float] = []
        for cell in sorted(cells, key=lambda item: (item.y, item.x)):
            for idx, base_row_y in enumerate(row_y):
                if abs(cell.y - base_row_y) <= row_tolerance:
                    rows[idx].append(cell)
                    break
            else:
                row_y.append(cell.y)
                rows.append([cell])

        rows = [sorted(row, key=lambda item: item.x) for row in rows]
        if not rows:
            return None

        expected_columns = len(rows[0])
        if expected_columns < 1 or any(len(row) != expected_columns for row in rows):
            return None

        first_row = rows[0]

        for row in rows:
            base_row = row[0]
            if any(abs(cell.y - base_row.y) > geometry_tolerance for cell in row):
                return None
            # Cells within the same row must share the same height; rows may
            # differ in height from each other (devFoam handles adjacent rows of
            # varying height via vertical transitions along the left-edge corridor).
            if any(abs(cell.height - base_row.height) > geometry_tolerance for cell in row):
                return None
            for left_cell, right_cell in zip(row, row[1:]):
                if right_cell.x < left_cell.right - geometry_tolerance:
                    return None

        for col_idx, base_cell in enumerate(first_row):
            for row in rows[1:]:
                cell = row[col_idx]
                if abs(cell.x - base_cell.x) > geometry_tolerance:
                    return None
                if abs(cell.width - base_cell.width) > geometry_tolerance:
                    return None

        for top_row, bottom_row in zip(rows, rows[1:]):
            if bottom_row[0].y < top_row[0].bottom - geometry_tolerance:
                return None

        return rows

    @staticmethod
    def _angle_in_quadrant(angle_deg: float, start_deg: float, end_deg: float) -> bool:
        low = min(start_deg, end_deg)
        high = max(start_deg, end_deg)
        return low < angle_deg < high

    def _angle_from_center(self, center_x: float, center_y: float, x: float, y: float) -> float:
        return math.degrees(math.atan2(y - center_y, x - center_x))

    def _emit_arc_between_angles(
        self,
        center_x: float,
        center_y: float,
        radius: float,
        start_deg: float,
        end_deg: float,
        *,
        include_start: bool = False,
    ) -> None:
        if include_start:
            start_rad = math.radians(start_deg)
            self.linear_move(center_x + math.cos(start_rad) * radius, center_y + math.sin(start_rad) * radius)

        sweep = abs(end_deg - start_deg)
        segments = max(1, math.ceil(sweep / 30.0))
        step = (end_deg - start_deg) / segments
        for idx in range(1, segments + 1):
            angle = math.radians(start_deg + step * idx)
            self.linear_move(center_x + math.cos(angle) * radius, center_y + math.sin(angle) * radius)

    def _move_to_shared_grid_start(self, cell: _GridCell) -> bool:
        radius = self._cell_radius(cell)
        start_x = cell.x + radius
        start_y = cell.y

        if not self.compact_output:
            self.rapid_move(start_x, start_y)
            return False

        center_x = cell.x + radius
        center_y = cell.y + radius
        entry_angle = self._angle_from_center(center_x, center_y, self.park_x, self.park_y)
        if radius > 0 and self._angle_in_quadrant(entry_angle, -180.0, -90.0):
            self._emit_arc_between_angles(
                center_x,
                center_y,
                radius,
                entry_angle,
                -180.0,
                include_start=True,
            )
            return True

        if not math.isclose(self.current_y, start_y, abs_tol=0.0001):
            self.linear_move(self.current_x, start_y)
        self.linear_move(start_x, start_y)
        return False

    def _finish_left_side_down(self, cell: _GridCell) -> None:
        radius = self._cell_radius(cell)
        self.linear_move(cell.x, cell.bottom - radius)
        self._emit_arc(cell.x + radius, cell.bottom - radius, radius, 180, 90)

    def _exit_shared_grid_to_park(self, cell: _GridCell) -> bool:
        if not self.compact_output:
            return False

        radius = self._cell_radius(cell)
        center_x = cell.x + radius
        center_y = cell.y + radius
        exit_angle = self._angle_from_center(center_x, center_y, self.park_x, self.park_y)
        if radius > 0 and self._angle_in_quadrant(exit_angle, -180.0, -90.0):
            self._emit_arc_between_angles(center_x, center_y, radius, -90.0, exit_angle)
            self.linear_move(self.park_x, self.park_y)
            return True

        return False

    def _cut_shared_grid_row(self, row: Sequence[_GridCell]) -> None:
        for idx, cell in enumerate(row):
            if idx > 0:
                radius = self._cell_radius(cell)
                self.linear_move(cell.x, cell.bottom - radius)
                self._emit_arc(cell.x + radius, cell.bottom - radius, radius, 180, 90)
            self._emit_bottom_to_right_side(cell)

        last_cell = row[-1]
        self._emit_right_side_up_to_top(last_cell)
        self._emit_top_edge_left(last_cell)

        for idx in range(len(row) - 1, 0, -1):
            cell = row[idx]
            previous = row[idx - 1]
            previous_radius = self._cell_radius(previous)
            self._emit_top_left_and_left_side_down(cell)
            self.linear_move(previous.right, previous.bottom - previous_radius)
            self._emit_right_side_up_to_top(previous)
            self._emit_top_edge_left(previous)

    def _cut_shared_grid(self, rows: Sequence[Sequence[_GridCell]]) -> None:
        first_cell = rows[0][0]
        first_left_side_started = self._move_to_shared_grid_start(first_cell)

        for idx, row in enumerate(rows):
            cell = row[0]
            if idx > 0:
                self.linear_move(cell.x + self._cell_radius(cell), cell.y)
            if idx == 0 and first_left_side_started:
                self._finish_left_side_down(cell)
            else:
                self._emit_left_side_down(cell)

        for row_idx in range(len(rows) - 1, -1, -1):
            self._cut_shared_grid_row(rows[row_idx])
            if row_idx > 0:
                previous_cell = rows[row_idx - 1][0]
                self.linear_move(previous_cell.x + self._cell_radius(previous_cell), previous_cell.bottom)

        if self._exit_shared_grid_to_park(first_cell):
            return

        if self.compact_output and not math.isclose(self.current_x, self.park_x, abs_tol=0.0001):
            self.linear_move(self.park_x, self.current_y)

    def _emit_inner_from_left_bottom_to_right_bottom(self, left_cell: _GridCell, right_cell: _GridCell) -> None:
        radius = self._cell_radius(left_cell)
        self._emit_bottom_to_right_side(left_cell)
        self.linear_move(left_cell.right, left_cell.y + radius)
        self.linear_move(right_cell.x, right_cell.y + radius)
        self.linear_move(right_cell.x, right_cell.bottom - radius)
        self._emit_arc(right_cell.x + radius, right_cell.bottom - radius, radius, 180, 90)

    def _emit_inner_from_right_top_to_left_top(
        self,
        left_cell: _GridCell,
        right_cell: _GridCell,
        *,
        include_right_top_edge: bool,
    ) -> None:
        radius = self._cell_radius(left_cell)
        if include_right_top_edge:
            self.linear_move(right_cell.x + radius, right_cell.y)
        self._emit_arc(right_cell.x + radius, right_cell.y + radius, radius, -90, -180)
        self.linear_move(left_cell.right, left_cell.y + radius)
        self._emit_arc(left_cell.right - radius, left_cell.y + radius, radius, 0, -90)
        self.linear_move(left_cell.x + radius, left_cell.y)

    def _emit_right_bottom_edge(self, right_cell: _GridCell) -> None:
        radius = self._cell_radius(right_cell)
        self.linear_move(right_cell.right - radius, right_cell.bottom)

    def _emit_right_side_up(self, right_cell: _GridCell, *, include_top_edge: bool) -> None:
        radius = self._cell_radius(right_cell)
        self._emit_arc(right_cell.right - radius, right_cell.bottom - radius, radius, 90, 0)
        self.linear_move(right_cell.right, right_cell.y + radius)
        self._emit_arc(right_cell.right - radius, right_cell.y + radius, radius, 0, -90)
        if include_top_edge:
            self.linear_move(right_cell.x + radius, right_cell.y)

    def _cut_banded_full_row_from_left_bottom(self, row: Sequence[_GridCell]) -> None:
        left_cell, right_cell = row[0], row[1]
        self._emit_inner_from_left_bottom_to_right_bottom(left_cell, right_cell)
        self._emit_right_bottom_edge(right_cell)
        self._emit_right_side_up(right_cell, include_top_edge=True)
        self._emit_inner_from_right_top_to_left_top(left_cell, right_cell, include_right_top_edge=False)

    @staticmethod
    def _banded_pivot_row(row_count: int) -> int:
        if row_count <= 1:
            return 0
        return max(0, min(row_count - 1, (row_count // 2) - 3))

    @staticmethod
    def _banded_immediate_bottom_rows(row_count: int, pivot_row: int) -> set[int]:
        span = max(0, row_count - 1 - pivot_row)
        if span == 0:
            return {pivot_row}
        # Matches the commercial devFoam reference pattern for 36 rows while
        # scaling to other two-column batches as an experimental strategy.
        ratios = (0.0, 0.05, 0.20, 0.25, 0.40, 0.60, 0.75, 1.0)
        rows = {pivot_row + round(span * ratio) for ratio in ratios}
        return {max(pivot_row, min(row_count - 1, row)) for row in rows}

    def _cut_banded_grid(self, rows: Sequence[Sequence[_GridCell]]) -> bool:
        if len(rows) < 2 or any(len(row) != 2 for row in rows):
            return False

        # Banded strategy uses cross-row inner paths that assume uniform cell
        # height.  Delegate to _cut_shared_grid when heights vary between rows.
        first_height = rows[0][0].height
        if any(
            abs(cell.height - first_height) > 1.0
            for row in rows
            for cell in row
        ):
            return False

        first_cell = rows[0][0]
        pivot_row = self._banded_pivot_row(len(rows))
        immediate_bottom_rows = self._banded_immediate_bottom_rows(len(rows), pivot_row)
        first_left_side_started = self._move_to_shared_grid_start(first_cell)

        for row_idx in range(0, pivot_row + 1):
            left_cell = rows[row_idx][0]
            if row_idx > 0:
                self.linear_move(left_cell.x + self._cell_radius(left_cell), left_cell.y)
            if row_idx == 0 and first_left_side_started:
                self._finish_left_side_down(left_cell)
            else:
                self._emit_left_side_down(left_cell)

        top_right_done = [False] * len(rows)
        bottom_right_done = [False] * len(rows)

        left_cell, right_cell = rows[pivot_row]
        self._emit_inner_from_left_bottom_to_right_bottom(left_cell, right_cell)
        if pivot_row in immediate_bottom_rows:
            self._emit_right_bottom_edge(right_cell)
            bottom_right_done[pivot_row] = True
            current_right_track = "outer"
        else:
            current_right_track = "inner"

        for row_idx in range(pivot_row + 1, len(rows)):
            left_cell, right_cell = rows[row_idx]
            radius = self._cell_radius(right_cell)
            include_right_top_edge = current_right_track == "outer"
            if include_right_top_edge:
                self.linear_move(right_cell.right - radius, right_cell.y)
                top_right_done[row_idx] = True
            else:
                self.linear_move(right_cell.x + radius, right_cell.y)

            self._emit_inner_from_right_top_to_left_top(
                left_cell,
                right_cell,
                include_right_top_edge=include_right_top_edge,
            )
            self._emit_left_side_down(left_cell)
            self._emit_inner_from_left_bottom_to_right_bottom(left_cell, right_cell)

            if row_idx in immediate_bottom_rows:
                self._emit_right_bottom_edge(right_cell)
                bottom_right_done[row_idx] = True
                current_right_track = "outer"
            else:
                current_right_track = "inner"

        top_idx = len(rows) - 1
        if bottom_right_done[top_idx]:
            self._emit_right_side_up(rows[top_idx][1], include_top_edge=True)
            top_right_done[top_idx] = True

        for row_idx in range(top_idx - 1, pivot_row - 1, -1):
            right_cell = rows[row_idx][1]
            radius = self._cell_radius(right_cell)
            if bottom_right_done[row_idx]:
                self.linear_move(right_cell.right - radius, right_cell.bottom)
            else:
                self.linear_move(right_cell.x + radius, right_cell.bottom)
                self._emit_right_bottom_edge(right_cell)
                bottom_right_done[row_idx] = True

            self._emit_right_side_up(right_cell, include_top_edge=not top_right_done[row_idx])
            top_right_done[row_idx] = True

        self._emit_inner_from_right_top_to_left_top(
            rows[pivot_row][0],
            rows[pivot_row][1],
            include_right_top_edge=False,
        )

        for row_idx in range(pivot_row - 1, -1, -1):
            left_cell = rows[row_idx][0]
            self.linear_move(left_cell.x + self._cell_radius(left_cell), left_cell.bottom)
            self._cut_banded_full_row_from_left_bottom(rows[row_idx])

        self._exit_shared_grid_to_park(first_cell)
        return True

    def _try_cut_shared_grid(self, pieces: Sequence[object], *, base_x: float, base_y: float) -> bool:
        rows = self._detect_shared_grid(pieces, base_x=base_x, base_y=base_y)
        if rows is None:
            return False
        self._cut_shared_grid(rows)
        return True

    def _try_cut_banded_grid(self, pieces: Sequence[object], *, base_x: float, base_y: float) -> bool:
        rows = self._detect_shared_grid(pieces, base_x=base_x, base_y=base_y)
        if rows is None:
            return False
        return self._cut_banded_grid(rows)

    @staticmethod
    def _ordered_serpentine(pieces: List[object], row_tolerance: float = 5.0) -> List[object]:
        sorted_pieces = sorted(pieces, key=lambda p: (float(getattr(p, "y")), float(getattr(p, "x"))))
        rows: List[List[object]] = []
        row_y: List[float] = []

        for piece in sorted_pieces:
            y = float(getattr(piece, "y"))
            matched = False
            for idx, base_y in enumerate(row_y):
                if abs(y - base_y) <= row_tolerance:
                    rows[idx].append(piece)
                    matched = True
                    break
            if not matched:
                row_y.append(y)
                rows.append([piece])

        ordered: List[object] = []
        for idx, row in enumerate(rows):
            row.sort(key=lambda p: float(getattr(p, "x")), reverse=bool(idx % 2))
            ordered.extend(row)
        return ordered

    def generate_from_pieces(
        self,
        pieces: Iterable[object],
        *,
        origin_x: float = 0.0,
        origin_y: float = 0.0,
        block_width: float = 0.0,
        strategy: str = "serpentine",
    ) -> None:
        piece_list = list(pieces)
        blocks = sorted({int(getattr(piece, "block_index", 0)) for piece in piece_list})
        counter = 0
        strategy_mode = strategy.replace("-", "_").lower()
        auto_strategies = {"devfoam_auto", "auto"}
        shared_strategies = {"devfoam_shared", "shared_grid", "shared_serpentine"}
        banded_strategies = {"devfoam_banded", "banded_grid", "banded_serpentine"}
        self.park_x = origin_x + self.clearance
        self.park_y = origin_y

        for block_index in blocks:
            block_pieces = [p for p in piece_list if int(getattr(p, "block_index", 0)) == block_index]
            if strategy_mode == "serpentine":
                block_pieces = self._ordered_serpentine(block_pieces)
            else:
                block_pieces.sort(key=lambda p: (float(getattr(p, "y")), float(getattr(p, "x"))))

            x_offset = block_index * (block_width + self.block_gap) if block_width > 0 else 0.0
            self._comment(f"; --- BLOCO {block_index + 1} ({len(block_pieces)} pecas) ---")
            if x_offset:
                self._comment(f"; Offset X do bloco: {x_offset:.1f} mm")

            if strategy_mode in auto_strategies.union(banded_strategies) and self._try_cut_banded_grid(
                block_pieces,
                base_x=origin_x + x_offset,
                base_y=origin_y,
            ):
                counter += len(block_pieces)
                continue

            if strategy_mode in auto_strategies.union(shared_strategies) and self._try_cut_shared_grid(
                block_pieces,
                base_x=origin_x + x_offset,
                base_y=origin_y,
            ):
                counter += len(block_pieces)
                continue

            for piece in block_pieces:
                counter += 1
                label = getattr(piece, "label", None) or f"Peca {counter}"
                x = origin_x + x_offset + float(getattr(piece, "x"))
                y = origin_y + float(getattr(piece, "y"))
                width = float(getattr(piece, "width"))
                height = float(getattr(piece, "height"))

                self._comment(f"; Peca {counter}: {label}")
                self._comment(f"; Dimensoes: {width:.1f} x {height:.1f} mm")
                self.cut_smart_piece(x, y, width, height)

        self._comment(f"; === Total: {counter} pecas cortadas ===")

    def generate_from_nesting(self, blocks_used, block_width: float = 0.0, block_gap: float = 50.0) -> None:
        pieces = []
        for block_index, block in enumerate(blocks_used):
            for poly in block:
                minx, miny, maxx, maxy = poly.bounds
                pieces.append(
                    type(
                        "Piece",
                        (),
                        {
                            "x": minx,
                            "y": miny,
                            "width": maxx - minx,
                            "height": maxy - miny,
                            "block_index": block_index,
                            "label": None,
                        },
                    )()
                )
        self.block_gap = block_gap
        self.generate_from_pieces(pieces, block_width=block_width)

    def get_gcode(self) -> str:
        return "\n".join(self.lines)

    def get_stats(self) -> GCodeStats:
        cutting_minutes = self.cut_distance_mm / self.feed_rate if self.feed_rate > 0 else 0.0
        rapid_minutes = self.rapid_distance_mm / self.rapid_rate if self.rapid_rate > 0 else 0.0
        return GCodeStats(
            line_count=len(self.lines),
            cut_distance_mm=round(self.cut_distance_mm, 3),
            rapid_distance_mm=round(self.rapid_distance_mm, 3),
            estimated_time_min=round(cutting_minutes + rapid_minutes, 2),
        )
