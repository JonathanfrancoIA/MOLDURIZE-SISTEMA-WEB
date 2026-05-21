"""Tests for hot-wire G-Code generation endpoint."""

import copy
import math
import re
from pathlib import Path

from gcode_compare import compare_gcode, validate_comparison


DEVFOAM_BANDED_REFERENCE_PATH = Path(__file__).parent / "fixtures" / "gcode" / "devfoam_banded_reference.nc"


VALID_GCODE_REQUEST = {
    "pieces": [
        {"x": 0, "y": 0, "width": 600, "height": 400, "block_index": 0},
        {"x": 603, "y": 0, "width": 300, "height": 200, "block_index": 0},
    ],
    "block_width": 4000,
    "block_height": 1200,
    "config": {
        "feed_rate": 800,
        "clearance": 10.0,
        "origin_x": 0,
        "origin_y": 0,
        "wire_temp": 80,
        "lead_in_length": 0,
        "output_style": "devfoam",
        "corner_radius": 0.5,
        "corner_segments": 3,
    },
    "machine_profile": "mach3",
}


SHARED_GRID_REQUEST = {
    "pieces": [
        {"x": 0, "y": 0, "width": 100, "height": 30, "block_index": 0},
        {"x": 103, "y": 0, "width": 100, "height": 30, "block_index": 0},
        {"x": 0, "y": 33, "width": 100, "height": 30, "block_index": 0},
        {"x": 103, "y": 33, "width": 100, "height": 30, "block_index": 0},
    ],
    "block_width": 4000,
    "block_height": 1200,
    "config": {
        "feed_rate": 800,
        "clearance": 10.0,
        "origin_x": 0,
        "origin_y": 0,
        "wire_temp": 80,
        "lead_in_length": 0,
        "output_style": "devfoam",
        "corner_radius": 0.5,
        "corner_segments": 3,
    },
    "machine_profile": "mach3",
    "strategy": "devfoam_shared",
}


HOME_ENTRY_REQUEST = {
    "pieces": [
        {"x": 0.414, "y": 0.5, "width": 501, "height": 31, "block_index": 0},
    ],
    "block_width": 4000,
    "block_height": 1200,
    "config": {
        "feed_rate": 800,
        "clearance": 0,
        "origin_x": 0,
        "origin_y": 0,
        "wire_temp": 80,
        "lead_in_length": 0,
        "output_style": "devfoam",
        "corner_radius": 0.5,
        "corner_segments": 3,
    },
    "machine_profile": "mach3",
    "strategy": "devfoam_shared",
}


BANDED_GRID_ROWS = [round(0.5 + row * ((1154.5541 - 0.5) / 35), 4) for row in range(36)]

BANDED_GRID_REQUEST = {
    "pieces": [
        piece
        for y in BANDED_GRID_ROWS
        for piece in (
            {"x": 0.414, "y": y, "width": 501, "height": 31, "block_index": 0},
            {"x": 503.002, "y": y, "width": 501, "height": 31, "block_index": 0},
        )
    ],
    "block_width": 4000,
    "block_height": 1200,
    "config": {
        "feed_rate": 800,
        "clearance": 0,
        "origin_x": 0,
        "origin_y": 0,
        "wire_temp": 80,
        "lead_in_length": 0,
        "output_style": "devfoam",
        "corner_radius": 0.5,
        "corner_segments": 3,
    },
    "machine_profile": "mach3",
    "strategy": "devfoam_banded",
}


# Two pieces with different heights in the same column — used to trigger the
# "diagonal inter-piece cut" bug when the shared-grid detector rejected them.
DIFFERENT_HEIGHT_REQUEST = {
    "pieces": [
        {"x": 0, "y": 0, "width": 600, "height": 300, "block_index": 0},
        {"x": 0, "y": 303, "width": 600, "height": 600, "block_index": 0},
    ],
    "block_width": 4000,
    "block_height": 1200,
    "config": {
        "feed_rate": 800,
        "clearance": 0,
        "origin_x": 0,
        "origin_y": 0,
        "wire_temp": 80,
        "lead_in_length": 0,
        "output_style": "devfoam",
        "corner_radius": 0.5,
        "corner_segments": 3,
    },
    "machine_profile": "mach3",
    "strategy": "serpentine",
}

# Mixed rows: 1 wide piece in row 0, 2 narrower pieces in row 1 (different widths
# between rows so no shared-grid is possible, tests the axis-aligned fallback).
MIXED_ROWS_REQUEST = {
    "pieces": [
        {"x": 0, "y": 0, "width": 1200, "height": 300, "block_index": 0},
        {"x": 0, "y": 303, "width": 600, "height": 300, "block_index": 0},
        {"x": 603, "y": 303, "width": 597, "height": 300, "block_index": 0},
    ],
    "block_width": 4000,
    "block_height": 1200,
    "config": {
        "feed_rate": 800,
        "clearance": 0,
        "origin_x": 0,
        "origin_y": 0,
        "wire_temp": 80,
        "lead_in_length": 0,
        "output_style": "devfoam",
        "corner_radius": 0.5,
        "corner_segments": 3,
    },
    "machine_profile": "mach3",
    "strategy": "serpentine",
}


def _has_large_diagonal_move(gcode: str, threshold_mm: float = 10.0) -> bool:
    """Return True if any G1 move has both dx and dy above threshold_mm."""
    for (x1, y1), (x2, y2) in zip(
        _g1_coordinates(gcode), _g1_coordinates(gcode)[1:]
    ):
        if abs(x2 - x1) > threshold_mm and abs(y2 - y1) > threshold_mm:
            return True
    return False


def _g1_coordinates(gcode: str):
    coordinates = []
    for line in gcode.splitlines():
        if not line.startswith("G1X"):
            continue
        values = dict(re.findall(r"([XYZA])(-?\d+\.\d+)", line))
        coordinates.append((float(values["X"]), float(values["Y"])))
    return coordinates


def _path_distance(gcode: str) -> float:
    coordinates = _g1_coordinates(gcode)
    return sum(
        math.hypot(x2 - x1, y2 - y1)
        for (x1, y1), (x2, y2) in zip(coordinates, coordinates[1:])
    )


def _has_consecutive_duplicate_moves(gcode: str) -> bool:
    coordinates = _g1_coordinates(gcode)
    return any(
        math.isclose(x1, x2, abs_tol=0.0001) and math.isclose(y1, y2, abs_tol=0.0001)
        for (x1, y1), (x2, y2) in zip(coordinates, coordinates[1:])
    )


class TestGCode:
    def test_gcode_generation(self, client):
        """G-Code endpoint should return synchronized hot-wire G-Code."""
        response = client.post("/api/v1/gcode", json=VALID_GCODE_REQUEST)
        assert response.status_code == 200
        gcode = response.text
        assert gcode.splitlines()[:5] == ["G21", "G17", "G90", "F800.0000", "M3"]
        assert "M30" not in gcode
        assert ";" not in gcode
        assert "G0" not in gcode
        assert "F800.0000" in gcode

    def test_gcode_contains_all_pieces(self, client):
        """G-Code should contain toolpath for all pieces."""
        response = client.post("/api/v1/gcode", json=VALID_GCODE_REQUEST)
        gcode = response.text
        assert "G1X0.5000Y0.0000Z0.5000A0.0000" in gcode
        assert "G1X603.5000Y0.0000Z603.5000A0.0000" in gcode

    def test_hotwire_does_not_plunge_z_negative(self, client):
        """Z is the synced right X axis, not router tool depth."""
        response = client.post("/api/v1/gcode", json=VALID_GCODE_REQUEST)
        assert "Z-100" not in response.text
        assert "G1X10.0000Y0.0000Z10.0000A0.0000F800.0000" in response.text

    def test_gcode_download(self, client):
        """Download endpoint should return file with correct headers."""
        response = client.post("/api/v1/gcode/download", json=VALID_GCODE_REQUEST)
        assert response.status_code == 200
        assert "attachment" in response.headers.get("content-disposition", "")
        assert ".nc" in response.headers.get("content-disposition", "")

    def test_empty_pieces_rejected(self, client):
        """Empty pieces list should return 422."""
        response = client.post("/api/v1/gcode", json={"pieces": [], "config": {}})
        assert response.status_code == 422

    def test_planet_cnc_profile(self, client):
        """PlanetCNC profile should be accepted."""
        request = dict(VALID_GCODE_REQUEST)
        request["machine_profile"] = "planet_cnc"
        response = client.post("/api/v1/gcode", json=request)
        assert response.status_code == 200
        assert "G1X10.0000Y0.0000Z10.0000A0.0000F800.0000" in response.text


class TestGCodeContent:
    def test_coordinates_are_synchronized(self, client):
        """Mach3/PlanetCNC output should mirror X/Y into Z/A."""
        response = client.post("/api/v1/gcode", json=VALID_GCODE_REQUEST)
        coordinate_lines = [line for line in response.text.splitlines() if line.startswith("G1X")]
        assert coordinate_lines
        for line in coordinate_lines:
            values = dict(re.findall(r"([XYZA])(-?\d+\.\d+)", line))
            assert values["X"] == values["Z"]
            assert values["Y"] == values["A"]

    def test_grbl_uses_xy_only(self, client):
        """GRBL fallback should avoid unsupported A-axis output."""
        request = dict(VALID_GCODE_REQUEST)
        request["machine_profile"] = "grbl"
        response = client.post("/api/v1/gcode", json=request)
        assert response.status_code == 200
        assert not re.search(r"A-?\d", response.text)

    def test_no_consecutive_duplicate_cut_moves(self, client):
        """Generator should suppress repeated G1 commands at the same coordinate."""
        response = client.post("/api/v1/gcode", json=SHARED_GRID_REQUEST)
        assert response.status_code == 200
        assert not _has_consecutive_duplicate_moves(response.text)

    def test_devfoam_shared_grid_reduces_travel_against_contour_mode(self, client):
        """Grid-compatible batches should use shared devFoam-style cuts."""
        contour_request = copy.deepcopy(SHARED_GRID_REQUEST)
        contour_request["strategy"] = "contour"

        shared_response = client.post("/api/v1/gcode", json=SHARED_GRID_REQUEST)
        contour_response = client.post("/api/v1/gcode", json=contour_request)

        assert shared_response.status_code == 200
        assert contour_response.status_code == 200
        assert _path_distance(shared_response.text) < _path_distance(contour_response.text)

    def test_devfoam_shared_grid_uses_corner_arc_entry_from_home(self, client):
        """Home-origin jobs should enter and leave through the first corner arc."""
        response = client.post("/api/v1/gcode", json=HOME_ENTRY_REQUEST)
        assert response.status_code == 200

        lines = response.text.splitlines()
        assert lines[5:9] == [
            "G1X0.0000Y0.0000Z0.0000A0.0000F800.0000",
            "G1X0.5767Y0.6309Z0.5767A0.6309",
            "G1X0.4565Y0.7983Z0.4565A0.7983",
            "G1X0.4140Y1.0000Z0.4140A1.0000",
        ]
        assert lines[-4:] == [
            "G1X0.7331Y0.5339Z0.7331A0.5339",
            "G1X0.5767Y0.6309Z0.5767A0.6309",
            "G1X0.0000Y0.0000Z0.0000A0.0000",
            "M5",
        ]

    def test_devfoam_banded_grid_matches_reference_metrics(self, client):
        """Banded two-column strategy should reproduce the commercial devFoam sweep shape."""
        response = client.post("/api/v1/gcode", json=BANDED_GRID_REQUEST)
        assert response.status_code == 200

        lines = response.text.splitlines()
        assert len(lines) == 1304
        assert sum(1 for line in lines if line.startswith("G1X")) == 1298
        assert not _has_consecutive_duplicate_moves(response.text)
        assert math.isclose(_path_distance(response.text), 76797.774, abs_tol=0.01)

    def test_devfoam_banded_grid_matches_reference_file(self, client):
        """Generated banded output should stay within the devFoam reference tolerance."""
        response = client.post("/api/v1/gcode", json=BANDED_GRID_REQUEST)
        assert response.status_code == 200

        reference = DEVFOAM_BANDED_REFERENCE_PATH.read_text(encoding="utf-8")
        comparison = compare_gcode(reference, response.text)
        failures = validate_comparison(
            comparison,
            max_g1_delta=0.0001,
            max_distance_delta=0.01,
            require_same_counts=True,
            require_clean_candidate=True,
        )

        assert failures == []
        assert comparison.candidate.min_x == comparison.reference.min_x
        assert comparison.candidate.max_x == comparison.reference.max_x
        assert comparison.candidate.min_y == comparison.reference.min_y
        assert comparison.candidate.max_y == comparison.reference.max_y

    def test_devfoam_auto_selects_banded_grid_for_two_column_reference(self, client):
        """Auto strategy should use the banded devFoam path for compatible two-column grids."""
        auto_request = copy.deepcopy(BANDED_GRID_REQUEST)
        auto_request["strategy"] = "devfoam_auto"
        default_request = copy.deepcopy(BANDED_GRID_REQUEST)
        default_request.pop("strategy")

        banded_response = client.post("/api/v1/gcode", json=BANDED_GRID_REQUEST)
        auto_response = client.post("/api/v1/gcode", json=auto_request)
        default_response = client.post("/api/v1/gcode", json=default_request)

        assert banded_response.status_code == 200
        assert auto_response.status_code == 200
        assert default_response.status_code == 200
        assert auto_response.text == banded_response.text
        assert default_response.text == banded_response.text

    def test_no_diagonal_cuts_for_different_height_pieces(self, client):
        """Same-column pieces with different heights must not produce diagonal cuts.

        Regression for the bug where _detect_shared_grid rejected grids with
        varying row heights, causing the fallback loop to emit diagonal G1 moves
        between rows (which destroy the foam material).
        """
        response = client.post("/api/v1/gcode", json=DIFFERENT_HEIGHT_REQUEST)
        assert response.status_code == 200
        assert not _has_large_diagonal_move(response.text), (
            "Diagonal inter-piece cut detected for different-height pieces"
        )
        assert not _has_consecutive_duplicate_moves(response.text)

    def test_no_diagonal_cuts_for_mixed_row_widths(self, client):
        """Pieces with different widths per row must not produce diagonal cuts.

        Regression for the fallback loop diagonal bug: when rows have different
        widths (can't form a shared grid), serpentine ordering used to jump
        diagonally from the end of one row to the start of the next.
        """
        response = client.post("/api/v1/gcode", json=MIXED_ROWS_REQUEST)
        assert response.status_code == 200
        assert not _has_large_diagonal_move(response.text), (
            "Diagonal inter-piece cut detected for mixed row-width pieces"
        )

    def test_shared_grid_accepts_different_height_rows(self, client):
        """Shared grid strategy should handle rows with different heights.

        Two pieces stacked vertically with different heights should be cut as
        a single connected path, not as two independent rectangles.
        """
        shared_request = copy.deepcopy(DIFFERENT_HEIGHT_REQUEST)
        shared_request["strategy"] = "devfoam_shared"
        response = client.post("/api/v1/gcode", json=shared_request)
        assert response.status_code == 200
        # Shared-grid path is shorter than two independent contour loops
        contour_request = copy.deepcopy(DIFFERENT_HEIGHT_REQUEST)
        contour_request["strategy"] = "contour"
        contour_response = client.post("/api/v1/gcode", json=contour_request)
        assert contour_response.status_code == 200
        assert _path_distance(response.text) <= _path_distance(contour_response.text)
