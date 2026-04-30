import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from db import crud
from db.schema import Base, Nesting, NestingStatus, PlanTier, User
from dependencies.auth import get_current_user_clerk_id
from main import app
from routers import nesting, users


MINIMAL_OPTIMIZE_REQUEST = {
    "parts": [{"width": 100, "height": 100, "quantity": 1}],
    "block": {"width": 1000, "height": 500, "kerf": 3},
}

RESULT = {
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
def account_plan_client():
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
    previous_users_db = app.dependency_overrides.get(users._get_db_optional)
    previous_nesting_enabled = nesting.DB_ENABLED
    previous_users_enabled = users.DB_ENABLED

    app.dependency_overrides[get_current_user_clerk_id] = override_auth
    app.dependency_overrides[nesting._get_db_optional] = override_db
    app.dependency_overrides[users._get_db_optional] = override_db
    nesting.DB_ENABLED = True
    users.DB_ENABLED = True

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
        if previous_users_db is None:
            app.dependency_overrides.pop(users._get_db_optional, None)
        else:
            app.dependency_overrides[users._get_db_optional] = previous_users_db
        nesting.DB_ENABLED = previous_nesting_enabled
        users.DB_ENABLED = previous_users_enabled
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def _create_user(
    db,
    clerk_id="owner_clerk",
    plan=PlanTier.FREE,
    nestings_this_month=0,
    stripe_customer_id=None,
    stripe_subscription_id=None,
):
    user = User(
        clerk_id=clerk_id,
        email=f"{clerk_id}@example.com",
        name=f"Name {clerk_id}",
        plan=plan,
        nestings_this_month=nestings_this_month,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=stripe_subscription_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_completed_nesting(db, user):
    nesting_row = crud.create_nesting(
        db=db,
        user_id=user.id,
        block_width=1000,
        block_height=500,
        kerf=3,
        parts_input=[{"width": 100, "height": 100, "quantity": 2}],
        name="Scoped nesting",
    )
    return crud.update_nesting_result(db, nesting_row.id, RESULT)


def test_me_returns_authenticated_profile_and_billing_fields(account_plan_client):
    client, db, auth_context = account_plan_client
    auth_context["clerk_id"] = "profile_clerk"
    user = _create_user(
        db,
        clerk_id="profile_clerk",
        plan=PlanTier.STARTER,
        nestings_this_month=7,
        stripe_customer_id="cus_test_123",
        stripe_subscription_id="sub_test_123",
    )

    response = client.get("/api/v1/me")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["clerk_id"] == "profile_clerk"
    assert data["email"] == "profile_clerk@example.com"
    assert data["name"] == "Name profile_clerk"
    assert data["plan"] == "starter"
    assert data["usage"] == {
        "nestings_this_month": 7,
        "blocks_this_month": 0,
        "remnants_active": None,
    }
    assert data["limits"] == {
        "nestings_limit": 50,
        "blocks_limit": 5,
    }
    assert data["nestings_this_month"] == 7
    assert data["nestings_limit"] == 50
    assert data["blocks_limit"] == 5
    assert data["nestings_remaining"] == 43
    assert data["stripe_customer_id"] == "cus_test_123"
    assert data["billing"] == {
        "customer_id": "cus_test_123",
        "subscription_id": "sub_test_123",
        "has_customer": True,
        "has_subscription": True,
        "portal_available": True,
    }


def test_optimize_returns_403_when_plan_limit_reached(account_plan_client):
    client, db, auth_context = account_plan_client
    auth_context["clerk_id"] = "limited_clerk"
    user = _create_user(db, clerk_id="limited_clerk", nestings_this_month=5)

    response = client.post("/api/v1/optimize", json=MINIMAL_OPTIMIZE_REQUEST)

    assert response.status_code == 403
    detail = response.json()["detail"]
    assert detail["plan"] == "free"
    assert detail["nestings_limit"] == 5
    db.refresh(user)
    assert user.nestings_this_month == 5
    assert db.query(Nesting).count() == 0


def test_successful_persisted_optimize_increments_usage_once(account_plan_client):
    client, db, auth_context = account_plan_client
    auth_context["clerk_id"] = "usage_clerk"
    user = _create_user(db, clerk_id="usage_clerk", nestings_this_month=4)

    response = client.post("/api/v1/optimize", json=MINIMAL_OPTIMIZE_REQUEST)

    assert response.status_code == 200
    db.refresh(user)
    assert user.nestings_this_month == 5
    nestings = db.query(Nesting).filter(Nesting.user_id == user.id).all()
    assert len(nestings) == 1
    assert nestings[0].status == NestingStatus.COMPLETED


def test_unlimited_plan_can_optimize_past_numeric_limits(account_plan_client):
    client, db, auth_context = account_plan_client
    auth_context["clerk_id"] = "pro_clerk"
    user = _create_user(
        db,
        clerk_id="pro_clerk",
        plan=PlanTier.PRO,
        nestings_this_month=500,
    )

    response = client.post("/api/v1/optimize", json=MINIMAL_OPTIMIZE_REQUEST)

    assert response.status_code == 200
    db.refresh(user)
    assert user.nestings_this_month == 501


def test_nesting_detail_is_owner_scoped(account_plan_client):
    client, db, auth_context = account_plan_client
    auth_context["clerk_id"] = "owner_clerk"
    owner = _create_user(db, clerk_id="owner_clerk")
    other = _create_user(db, clerk_id="other_clerk")
    owner_nesting = _create_completed_nesting(db, owner)
    other_nesting = _create_completed_nesting(db, other)

    owner_response = client.get(f"/api/v1/nestings/{owner_nesting.id}")
    other_response = client.get(f"/api/v1/nestings/{other_nesting.id}")

    assert owner_response.status_code == 200
    assert owner_response.json()["id"] == owner_nesting.id
    assert owner_response.json()["total_pieces"] == 2
    assert other_response.status_code == 404
