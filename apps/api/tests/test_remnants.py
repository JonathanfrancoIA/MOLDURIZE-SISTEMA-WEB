"""Tests for remnants CRUD endpoints."""
import pytest


class TestRemnants:
    def test_list_empty(self, client):
        """Initially, remnants list should be empty or return a list."""
        response = client.get("/api/v1/remnants")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_remnant(self, client):
        """Creating a remnant should return the created object."""
        response = client.post(
            "/api/v1/remnants",
            json={"width": 1200.0, "height": 800.0, "depth": 100.0},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["width"] == 1200.0
        assert data["height"] == 800.0
        assert data["depth"] == 100.0
        assert data["status"] == "disponivel"
        assert "id" in data
        assert "created_at" in data

    def test_create_and_list(self, client):
        """After creating, remnant should appear in list."""
        # Create
        res = client.post(
            "/api/v1/remnants",
            json={"width": 500.0, "height": 300.0},
        )
        assert res.status_code == 201
        created_id = res.json()["id"]

        # List
        list_res = client.get("/api/v1/remnants")
        assert list_res.status_code == 200
        ids = [r["id"] for r in list_res.json()]
        assert created_id in ids

    def test_update_status(self, client):
        """Should be able to update remnant status to 'descartado'."""
        # Create
        res = client.post(
            "/api/v1/remnants",
            json={"width": 400.0, "height": 200.0},
        )
        rid = res.json()["id"]

        # Update
        update_res = client.patch(
            f"/api/v1/remnants/{rid}",
            json={"status": "descartado"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "descartado"

    def test_delete_remnant(self, client):
        """Deleting a remnant should return 204."""
        res = client.post(
            "/api/v1/remnants",
            json={"width": 100.0, "height": 100.0},
        )
        rid = res.json()["id"]

        del_res = client.delete(f"/api/v1/remnants/{rid}")
        assert del_res.status_code == 204

    def test_invalid_dimensions_rejected(self, client):
        """Negative or zero dimensions should return 422."""
        response = client.post(
            "/api/v1/remnants",
            json={"width": -100.0, "height": 200.0},
        )
        assert response.status_code == 422

    def test_filter_by_status(self, client):
        """Should be able to filter remnants by status."""
        response = client.get("/api/v1/remnants?status=disponivel")
        assert response.status_code == 200
        data = response.json()
        for item in data:
            assert item["status"] == "disponivel"
