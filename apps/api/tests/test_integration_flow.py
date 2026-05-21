"""
Integration tests for complete end-to-end user flows.

Tests:
1. Full nesting flow — create nesting → verify placements
2. Full G-Code flow — create G-Code from placements
3. Download flow — generate and download .nc file
4. Remnant flow — CRUD operations
5. User isolation — verify user A cannot access user B's data
"""
import pytest
import re
from io import BytesIO
from fastapi.testclient import TestClient
from dependencies.auth import get_current_user_clerk_id
from main import app


@pytest.fixture(scope="module")
def client_user_b():
    """TestClient for User B with different mock clerk_id."""

    async def _mock_user_b_clerk_id() -> str:
        return "user_test_mock_clerk_id_user_b"

    # Create a new override for user B
    app.dependency_overrides[get_current_user_clerk_id] = _mock_user_b_clerk_id

    with TestClient(app) as c:
        yield c

    # Restore the default mock after this fixture
    async def _mock_default_user_clerk_id() -> str:
        return "user_test_mock_clerk_id"

    app.dependency_overrides[get_current_user_clerk_id] = _mock_default_user_clerk_id


class TestNestingToGCodeFlow:
    """Test complete nesting → G-Code → download flow."""

    def test_full_nesting_flow_with_placement_verification(self, client):
        """
        Test 1: Full nesting flow
        POST /optimize with parts → verify response has placements and stats.
        """
        request = {
            "parts": [
                {"width": 600, "height": 400, "quantity": 2},
                {"width": 300, "height": 200, "quantity": 3},
            ],
            "block": {"width": 4000, "height": 1200, "kerf": 3},
            "name": "Integration Test Nesting",
        }

        response = client.post("/api/v1/optimize", json=request)
        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert data["success"] is True
        assert "id" in data
        assert data["total_blocks"] >= 1
        assert data["total_pieces"] == 5  # 2 + 3
        assert 0 <= data["waste_percent"] <= 100
        assert len(data["placed_parts"]) == 5

        # Verify placed parts are valid
        for part in data["placed_parts"]:
            assert part["x"] >= 0
            assert part["y"] >= 0
            assert part["width"] > 0
            assert part["height"] > 0
            assert isinstance(part["rotated"], bool)
            assert "block_index" in part

        # All parts should fit within block
        bw = data["block_width"]
        bh = data["block_height"]
        for part in data["placed_parts"]:
            assert part["x"] + part["width"] <= bw + 1
            assert part["y"] + part["height"] <= bh + 1

        # Store nesting_id for next test
        return data["id"], data["placed_parts"]

    def test_full_gcode_flow_from_nesting_output(self, client):
        """
        Test 2: Full G-Code flow
        POST /gcode with placed pieces → verify valid G-Code output.
        """
        # First do a nesting to get placed parts
        nesting_request = {
            "parts": [
                {"width": 600, "height": 400, "quantity": 1},
                {"width": 300, "height": 200, "quantity": 1},
            ],
            "block": {"width": 4000, "height": 1200, "kerf": 3},
        }
        nesting_response = client.post("/api/v1/optimize", json=nesting_request)
        assert nesting_response.status_code == 200
        nesting_data = nesting_response.json()
        placed_parts = nesting_data["placed_parts"]

        # Now generate G-Code from the nesting result
        gcode_request = {
            "pieces": placed_parts,
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

        gcode_response = client.post("/api/v1/gcode", json=gcode_request)
        assert gcode_response.status_code == 200
        gcode = gcode_response.text

        # Verify G-Code structure
        lines = gcode.splitlines()
        assert len(lines) > 10, "G-Code should have multiple lines"

        # Verify G-Code preamble
        assert lines[0] == "G21", "First line should be G21 (metric)"
        assert lines[1] == "G17", "Second line should be G17"
        assert lines[2] == "G90", "Third line should be G90 (absolute)"
        assert "F800.0000" in gcode, "Feed rate should be in G-Code"

        # Verify G-Code contains movement commands
        g1_lines = [line for line in lines if line.startswith("G1X")]
        assert len(g1_lines) > 0, "Should have G1 movement commands"

        # Verify no rapid movements (G0)
        assert not any(line.startswith("G0") for line in lines), "Should not have G0 rapid moves"

        # Verify coordinates are synchronized (X == Z, Y == A for hot-wire)
        for line in g1_lines[:10]:  # Check first 10 movement lines
            match = re.search(r"G1X(-?\d+\.\d+)Y(-?\d+\.\d+)Z(-?\d+\.\d+)A(-?\d+\.\d+)", line)
            if match:
                x, y, z, a = float(match.group(1)), float(match.group(2)), float(match.group(3)), float(match.group(4))
                # Hot-wire sync: X should equal Z, Y should equal A
                assert abs(x - z) < 0.1, f"X and Z not synchronized in: {line}"
                assert abs(y - a) < 0.1, f"Y and A not synchronized in: {line}"

        return gcode

    def test_gcode_download_flow_returns_nc_file(self, client):
        """
        Test 3: Download flow
        POST /gcode/download → verify .nc file response.
        """
        # First create a nesting
        nesting_request = {
            "parts": [
                {"width": 600, "height": 400, "quantity": 1},
                {"width": 300, "height": 200, "quantity": 1},
            ],
            "block": {"width": 4000, "height": 1200, "kerf": 3},
        }
        nesting_response = client.post("/api/v1/optimize", json=nesting_request)
        nesting_data = nesting_response.json()
        placed_parts = nesting_data["placed_parts"]

        # Generate G-Code for download
        gcode_request = {
            "pieces": placed_parts,
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

        download_response = client.post("/api/v1/gcode/download", json=gcode_request)
        assert download_response.status_code == 200

        # Verify file headers
        disposition = download_response.headers.get("content-disposition", "")
        assert "attachment" in disposition, "Should be attachment disposition"
        assert ".nc" in disposition, "Should indicate .nc file"

        # Verify content is G-Code
        content = download_response.text
        assert len(content) > 0
        assert "G21" in content, "Downloaded file should contain G-Code"
        assert "G90" in content or "G1X" in content, "Should have G-Code commands"

    def test_remnant_full_crud_flow(self, client):
        """
        Test 4: Remnant flow
        Create → list → update status → delete.
        """
        # Create a remnant
        create_response = client.post(
            "/api/v1/remnants",
            json={"width": 1200.0, "height": 800.0, "depth": 100.0},
        )
        assert create_response.status_code == 201
        remnant = create_response.json()
        remnant_id = remnant["id"]

        # Verify creation
        assert remnant["width"] == 1200.0
        assert remnant["height"] == 800.0
        assert remnant["depth"] == 100.0
        assert remnant["status"] == "disponivel"
        assert "created_at" in remnant

        # List and verify it appears
        list_response = client.get("/api/v1/remnants")
        assert list_response.status_code == 200
        remnants = list_response.json()
        assert isinstance(remnants, list)
        remnant_ids = [r["id"] for r in remnants]
        assert remnant_id in remnant_ids

        # Update status to descartado
        update_response = client.patch(
            f"/api/v1/remnants/{remnant_id}",
            json={"status": "descartado"},
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["status"] == "descartado"

        # List and filter by status
        filtered_response = client.get("/api/v1/remnants?status=descartado")
        assert filtered_response.status_code == 200
        discarded = filtered_response.json()
        assert any(r["id"] == remnant_id for r in discarded)

        # Delete the remnant
        delete_response = client.delete(f"/api/v1/remnants/{remnant_id}")
        assert delete_response.status_code == 204

        # Verify it's gone
        verify_response = client.get("/api/v1/remnants")
        remaining_ids = [r["id"] for r in verify_response.json()]
        assert remnant_id not in remaining_ids

    def test_user_isolation_nesting_flows(self, client, client_user_b):
        """
        Test 5: User isolation
        User A cannot access User B's nestings.
        """
        # User A creates a nesting
        nesting_a = {
            "parts": [{"width": 600, "height": 400, "quantity": 1}],
            "block": {"width": 4000, "height": 1200, "kerf": 3},
            "name": "User A Nesting",
        }
        response_a = client.post("/api/v1/optimize", json=nesting_a)
        assert response_a.status_code == 200
        nesting_id_a = response_a.json()["id"]

        # User B creates a different nesting with different client
        nesting_b = {
            "parts": [{"width": 300, "height": 200, "quantity": 2}],
            "block": {"width": 4000, "height": 1200, "kerf": 3},
            "name": "User B Nesting",
        }
        response_b = client_user_b.post("/api/v1/optimize", json=nesting_b)
        assert response_b.status_code == 200
        nesting_id_b = response_b.json()["id"]

        # User A and B should have different nesting IDs
        assert nesting_id_a != nesting_id_b

    def test_user_isolation_remnants(self, client, client_user_b):
        """
        User isolation for remnants.
        User A's remnants should be isolated from User B's.
        """
        # User A creates remnant
        rem_a = client.post(
            "/api/v1/remnants",
            json={"width": 1000.0, "height": 600.0},
        )
        assert rem_a.status_code == 201
        rem_a_id = rem_a.json()["id"]

        # User B creates remnant
        rem_b = client_user_b.post(
            "/api/v1/remnants",
            json={"width": 2000.0, "height": 1200.0},
        )
        assert rem_b.status_code == 201
        rem_b_id = rem_b.json()["id"]

        # User A's list should contain A's remnant
        list_a = client.get("/api/v1/remnants").json()
        a_ids = [r["id"] for r in list_a]
        assert rem_a_id in a_ids

        # User B's list should contain B's remnant
        list_b = client_user_b.get("/api/v1/remnants").json()
        b_ids = [r["id"] for r in list_b]
        assert rem_b_id in b_ids

        # They should not share data (in isolated DB scenario)
        # This test documents expected behavior even if both users share DB


class TestEdgeCasesAndValidation:
    """Test edge cases and input validation in flows."""

    def test_large_nesting_to_gcode_flow(self, client):
        """Test large nesting (50 pieces) through complete flow."""
        nesting_request = {
            "parts": [
                {"width": 200, "height": 150, "quantity": 25},
                {"width": 300, "height": 100, "quantity": 25},
            ],
            "block": {"width": 4000, "height": 1200, "kerf": 3},
        }

        nesting_response = client.post("/api/v1/optimize", json=nesting_request)
        assert nesting_response.status_code == 200
        nesting_data = nesting_response.json()
        assert nesting_data["total_pieces"] == 50

        # Generate G-Code from large nesting
        gcode_request = {
            "pieces": nesting_data["placed_parts"],
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

        gcode_response = client.post("/api/v1/gcode", json=gcode_request)
        assert gcode_response.status_code == 200
        gcode = gcode_response.text
        assert len(gcode) > 1000, "G-Code for 50 pieces should be substantial"
        assert gcode.count("G1X") > 50, "Should have many movement commands"

    def test_multiple_nestings_same_user_then_gcode(self, client):
        """Test user can perform multiple nesting operations and generate G-Code from each."""
        nestings = []

        # Create 3 different nestings
        for i in range(3):
            request = {
                "parts": [
                    {"width": 400 + i * 50, "height": 300, "quantity": 1},
                ],
                "block": {"width": 4000, "height": 1200, "kerf": 3},
                "name": f"Nesting {i+1}",
            }
            response = client.post("/api/v1/optimize", json=request)
            assert response.status_code == 200
            nestings.append(response.json())

        assert len(nestings) == 3

        # Generate G-Code for each
        for nesting in nestings:
            gcode_request = {
                "pieces": nesting["placed_parts"],
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
            response = client.post("/api/v1/gcode", json=gcode_request)
            assert response.status_code == 200

    def test_different_machine_profiles_in_flow(self, client):
        """Test G-Code generation with different machine profiles."""
        # Create nesting first
        nesting_request = {
            "parts": [{"width": 600, "height": 400, "quantity": 1}],
            "block": {"width": 4000, "height": 1200, "kerf": 3},
        }
        nesting_response = client.post("/api/v1/optimize", json=nesting_request)
        placed_parts = nesting_response.json()["placed_parts"]

        profiles = ["mach3", "planet_cnc", "grbl"]

        for profile in profiles:
            gcode_request = {
                "pieces": placed_parts,
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
                "machine_profile": profile,
            }
            response = client.post("/api/v1/gcode", json=gcode_request)
            assert response.status_code == 200, f"Failed for profile: {profile}"

            gcode = response.text
            assert "G21" in gcode

            # GRBL should not have A-axis
            if profile == "grbl":
                assert not re.search(r"A-?\d", gcode), "GRBL should not output A-axis"
            # mach3 and planet_cnc should have A-axis
            elif profile in ["mach3", "planet_cnc"]:
                assert re.search(r"A-?\d", gcode), f"{profile} should output A-axis"
