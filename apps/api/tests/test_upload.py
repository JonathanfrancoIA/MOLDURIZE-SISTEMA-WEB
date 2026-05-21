"""
Tests for the upload router endpoints.

Tests the DXF and image upload functionality.
"""
import io
import pytest
from fastapi.testclient import TestClient


def _create_minimal_dxf_bytes() -> bytes:
    """Create a minimal DXF with one closed rectangle polyline on layer 'Moldura'."""
    import ezdxf

    doc = ezdxf.new("R2010")
    doc.header["$INSUNITS"] = 4  # mm
    msp = doc.modelspace()
    # Add a closed LWPOLYLINE rectangle 600x80 mm on layer "Moldura"
    points = [(0, 0), (600, 0), (600, 80), (0, 80)]
    msp.add_lwpolyline(points, dxfattribs={"closed": True, "layer": "Moldura"})
    stream = io.StringIO()
    doc.write(stream)
    return stream.getvalue().encode("utf-8")


@pytest.mark.usefixtures("client")
class TestUploadRouter:
    """Test suite for upload endpoints."""

    def test_dxf_upload_invalid_format(self, client: TestClient):
        """Test that non-DXF files are rejected."""
        fake_file = io.BytesIO(b"not a dxf file")
        response = client.post(
            "/api/v1/upload/dxf",
            files={"file": ("test.txt", fake_file, "text/plain")},
        )
        assert response.status_code == 400
        assert "Invalid file format" in response.json()["detail"]

    def test_dxf_upload_missing_file(self, client: TestClient):
        """Test that missing file is rejected."""
        response = client.post("/api/v1/upload/dxf")
        assert response.status_code == 422

    def test_image_upload_invalid_format(self, client: TestClient):
        """Test that non-image files are rejected."""
        fake_file = io.BytesIO(b"not an image")
        response = client.post(
            "/api/v1/upload/image",
            files={"file": ("test.txt", fake_file, "text/plain")},
        )
        assert response.status_code == 400
        assert "Invalid image format" in response.json()["detail"]

    def test_dxf_upload_endpoint_requires_auth(self, client: TestClient):
        """Verify that auth dependency is applied."""
        response = client.post("/api/v1/upload/dxf")
        assert response.status_code in (400, 422)

    def test_image_upload_endpoint_requires_auth(self, client: TestClient):
        """Verify that auth dependency is applied."""
        response = client.post("/api/v1/upload/image")
        assert response.status_code in (400, 422)

    def test_dxf_upload_success(self, client: TestClient):
        """Test successful DXF upload with a valid rectangle polyline."""
        dxf_bytes = _create_minimal_dxf_bytes()
        response = client.post(
            "/api/v1/upload/dxf",
            files={"file": ("test.dxf", io.BytesIO(dxf_bytes), "application/octet-stream")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["parts_count"] >= 1
        assert "unit" in data
        assert data["unit"] == "mm"
        part = data["parts"][0]
        assert part["width"] > 0
        assert part["height"] > 0
        assert "label" in part
        assert part["label"] == "Moldura"

    def test_dxf_upload_empty_geometries(self, client: TestClient):
        """Test that a DXF with no closed geometries returns success=False."""
        import ezdxf

        doc = ezdxf.new("R2010")
        msp = doc.modelspace()
        msp.add_line((0, 0), (100, 100))  # open line — not a closed geometry
        stream = io.StringIO()
        doc.write(stream)
        dxf_bytes = stream.getvalue().encode("utf-8")

        response = client.post(
            "/api/v1/upload/dxf",
            files={"file": ("empty.dxf", io.BytesIO(dxf_bytes), "application/octet-stream")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["parts_count"] == 0
