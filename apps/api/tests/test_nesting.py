"""Tests for the nesting optimization endpoint."""
import pytest


VALID_REQUEST = {
    "parts": [
        {"width": 600, "height": 400, "quantity": 3},
        {"width": 300, "height": 200, "quantity": 5},
    ],
    "block": {"width": 4000, "height": 1200, "kerf": 3},
}

MINIMAL_REQUEST = {
    "parts": [{"width": 100, "height": 100, "quantity": 1}],
}


class TestNestingOptimize:
    def test_basic_nesting(self, client):
        """A valid nesting request should return success with placed_parts."""
        response = client.post("/api/v1/optimize", json=VALID_REQUEST)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_blocks"] >= 1
        assert 0 <= data["waste_percent"] <= 100
        assert len(data["placed_parts"]) == 8  # 3 + 5 pieces
        assert data["block_width"] == 4000
        assert data["block_height"] == 1200

    def test_minimal_request(self, client):
        """A single part request should work with default block."""
        response = client.post("/api/v1/optimize", json=MINIMAL_REQUEST)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["placed_parts"]) == 1

    def test_placed_parts_within_block(self, client):
        """All placed parts should fit within block bounds."""
        response = client.post("/api/v1/optimize", json=VALID_REQUEST)
        data = response.json()
        bw = data["block_width"]
        bh = data["block_height"]
        for part in data["placed_parts"]:
            assert part["x"] >= 0, f"Part x={part['x']} is negative"
            assert part["y"] >= 0, f"Part y={part['y']} is negative"
            assert part["x"] + part["width"] <= bw + 1, f"Part exceeds block width"
            assert part["y"] + part["height"] <= bh + 1, f"Part exceeds block height"

    def test_empty_parts_rejected(self, client):
        """Empty parts list should return 422."""
        response = client.post("/api/v1/optimize", json={"parts": []})
        assert response.status_code == 422

    def test_negative_dimension_rejected(self, client):
        """Negative dimensions should return 422."""
        response = client.post(
            "/api/v1/optimize",
            json={"parts": [{"width": -100, "height": 200, "quantity": 1}]},
        )
        assert response.status_code == 422

    def test_large_nesting(self, client):
        """50 pieces should complete without timeout."""
        request = {
            "parts": [
                {"width": 200, "height": 150, "quantity": 25},
                {"width": 300, "height": 100, "quantity": 25},
            ],
            "block": {"width": 4000, "height": 1200, "kerf": 3},
        }
        response = client.post("/api/v1/optimize", json=request)
        assert response.status_code == 200
        data = response.json()
        assert data["total_pieces"] == 50

    def test_custom_block_size(self, client):
        """Custom block dimensions should be respected."""
        response = client.post(
            "/api/v1/optimize",
            json={
                "parts": [{"width": 500, "height": 300, "quantity": 2}],
                "block": {"width": 2000, "height": 600, "kerf": 2},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["block_width"] == 2000
        assert data["block_height"] == 600

    def test_efficiency_reasonable(self, client):
        """Nesting efficiency should be > 0% for reasonable input."""
        request = {
            "parts": [{"width": 1000, "height": 500, "quantity": 4}],
            "block": {"width": 4000, "height": 1200, "kerf": 3},
        }
        response = client.post("/api/v1/optimize", json=request)
        data = response.json()
        efficiency = 100 - data["waste_percent"]
        assert efficiency > 0, "Efficiency should be positive"
