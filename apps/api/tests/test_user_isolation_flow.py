"""DB-backed isolation tests for authenticated users."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from db import crud
from db.schema import Base
from dependencies.auth import get_current_user_clerk_id
from main import app
from routers import nesting, remnants


NESTING_RESULT = {
    "total_blocks": 1,
    "waste_percent": 10.0,
    "largest_remnant_w": 500.0,
    "largest_remnant_h": 250.0,
    "pieces_per_block": 1.0,
    "placed_parts": [
        {
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100,
            "rotated": False,
            "label": "test",
            "block_index": 0,
        }
    ],
}


@pytest.fixture
def db_enabled_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    auth_context = {"clerk_id": "owner_clerk"}

    def override_db():
        yield db

    async def override_auth():
        return auth_context["clerk_id"]

    previous_auth = app.dependency_overrides.get(get_current_user_clerk_id)
    previous_nesting_db = app.dependency_overrides.get(nesting._get_db_optional)
    previous_remnants_db = app.dependency_overrides.get(remnants._get_db_optional)
    previous_nesting_enabled = nesting.DB_ENABLED
    previous_remnants_enabled = remnants.DB_ENABLED

    app.dependency_overrides[get_current_user_clerk_id] = override_auth
    app.dependency_overrides[nesting._get_db_optional] = override_db
    app.dependency_overrides[remnants._get_db_optional] = override_db
    nesting.DB_ENABLED = True
    remnants.DB_ENABLED = True

    try:
        with TestClient(app) as client:
            yield client, db, auth_context
    finally:
        if previous_auth is None:
            app.dependency_overrides.pop(get_current_user_clerk_id, None)
        else:
            app.dependency_overrides[get_current_user_clerk_id] = previous_auth
        if previous_nesting_db is None:
            app.dependency_overrides.pop(nesting._get_db_optional, None)
        else:
            app.dependency_overrides[nesting._get_db_optional] = previous_nesting_db
        if previous_remnants_db is None:
            app.dependency_overrides.pop(remnants._get_db_optional, None)
        else:
            app.dependency_overrides[remnants._get_db_optional] = previous_remnants_db
        nesting.DB_ENABLED = previous_nesting_enabled
        remnants.DB_ENABLED = previous_remnants_enabled
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def _create_completed_nesting(db, user, name):
    nesting_row = crud.create_nesting(
        db=db,
        user_id=user.id,
        block_width=1000,
        block_height=500,
        kerf=3,
        parts_input=[{"width": 100, "height": 100, "quantity": 2}],
        name=name,
    )
    return crud.update_nesting_result(db, nesting_row.id, NESTING_RESULT)


def test_remnants_are_scoped_to_authenticated_user(db_enabled_client):
    client, _db, auth_context = db_enabled_client

    auth_context["clerk_id"] = "owner_clerk"
    owner_response = client.post(
        "/api/v1/remnants",
        json={"width": 1200.0, "height": 800.0, "depth": 100.0},
    )
    assert owner_response.status_code == 201
    owner_id = owner_response.json()["id"]

    auth_context["clerk_id"] = "other_clerk"
    other_response = client.post(
        "/api/v1/remnants",
        json={"width": 600.0, "height": 400.0, "depth": 50.0},
    )
    assert other_response.status_code == 201
    other_id = other_response.json()["id"]

    other_list = client.get("/api/v1/remnants")
    assert other_list.status_code == 200
    assert [item["id"] for item in other_list.json()] == [other_id]

    assert client.get(f"/api/v1/remnants/{owner_id}").status_code == 404
    assert client.patch(
        f"/api/v1/remnants/{owner_id}",
        json={"status": "descartado"},
    ).status_code == 404
    assert client.delete(f"/api/v1/remnants/{owner_id}").status_code == 404

    auth_context["clerk_id"] = "owner_clerk"
    owner_list = client.get("/api/v1/remnants")
    assert owner_list.status_code == 200
    assert [item["id"] for item in owner_list.json()] == [owner_id]


def test_nesting_list_and_detail_are_scoped_to_authenticated_user(db_enabled_client):
    client, db, auth_context = db_enabled_client
    owner = crud.get_or_create_user(db, "owner_clerk", "owner@example.com")
    other = crud.get_or_create_user(db, "other_clerk", "other@example.com")
    owner_nesting = _create_completed_nesting(db, owner, "Owner nesting")
    other_nesting = _create_completed_nesting(db, other, "Other nesting")

    auth_context["clerk_id"] = "owner_clerk"
    owner_list = client.get("/api/v1/nestings")
    assert owner_list.status_code == 200
    assert [item["id"] for item in owner_list.json()] == [owner_nesting.id]
    assert client.get(f"/api/v1/nestings/{owner_nesting.id}").status_code == 200
    assert client.get(f"/api/v1/nestings/{other_nesting.id}").status_code == 404

    auth_context["clerk_id"] = "other_clerk"
    other_list = client.get("/api/v1/nestings")
    assert other_list.status_code == 200
    assert [item["id"] for item in other_list.json()] == [other_nesting.id]
    assert client.get(f"/api/v1/nestings/{other_nesting.id}").status_code == 200
    assert client.get(f"/api/v1/nestings/{owner_nesting.id}").status_code == 404
