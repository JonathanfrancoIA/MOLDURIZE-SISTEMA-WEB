import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from db.schema import Base, PlanTier, User
from dependencies.auth import get_current_user_clerk_id
from main import app
from routers import billing


@pytest.fixture
def fake_stripe(monkeypatch):
    calls = {}

    class FakeCheckoutSession:
        @staticmethod
        def create(**kwargs):
            calls["checkout"] = kwargs
            return SimpleNamespace(url="https://stripe.test/checkout/cs_test", id="cs_test")

    class FakePortalSession:
        @staticmethod
        def create(**kwargs):
            calls["portal"] = kwargs
            return SimpleNamespace(url="https://stripe.test/portal/bps_test")

    fake_module = SimpleNamespace(
        api_key=None,
        checkout=SimpleNamespace(Session=FakeCheckoutSession),
        billing_portal=SimpleNamespace(Session=FakePortalSession),
    )
    monkeypatch.setitem(sys.modules, "stripe", fake_module)
    return calls


@pytest.fixture
def billing_client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    auth_context = {"clerk_id": "auth_clerk"}

    async def override_auth():
        return auth_context["clerk_id"]

    import db.database as database

    monkeypatch.setitem(app.dependency_overrides, get_current_user_clerk_id, override_auth)
    monkeypatch.setattr(database, "SessionLocal", lambda: db)
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_valid")
    monkeypatch.setitem(billing.PLAN_PRICES, "pro", "price_test_pro")

    try:
        with TestClient(app) as client:
            yield client, db, auth_context
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def _create_user(db, clerk_id, stripe_customer_id=None):
    user = User(
        clerk_id=clerk_id,
        email=f"{clerk_id}@example.com",
        name=f"Name {clerk_id}",
        plan=PlanTier.PRO,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id="sub_test_123" if stripe_customer_id else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_checkout_binds_stripe_session_to_authenticated_user(billing_client, fake_stripe):
    client, _, auth_context = billing_client
    auth_context["clerk_id"] = "user_checkout_auth"

    response = client.post(
        "/api/v1/billing/checkout",
        json={
            "plan": "pro",
            "clerk_id": "user_from_body_should_be_ignored",
            "customer_id": "cus_from_body_should_be_ignored",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "checkout_url": "https://stripe.test/checkout/cs_test",
        "session_id": "cs_test",
    }
    assert fake_stripe["checkout"]["client_reference_id"] == "user_checkout_auth"
    assert fake_stripe["checkout"]["metadata"] == {
        "plan": "pro",
        "clerk_id": "user_checkout_auth",
    }
    assert fake_stripe["checkout"]["line_items"] == [
        {"price": "price_test_pro", "quantity": 1}
    ]


def test_checkout_returns_400_when_price_is_not_configured(
    billing_client, fake_stripe, monkeypatch
):
    client, _, auth_context = billing_client
    auth_context["clerk_id"] = "user_checkout_auth"
    monkeypatch.setitem(billing.PLAN_PRICES, "starter", "price_starter_placeholder")

    response = client.post("/api/v1/billing/checkout", json={"plan": "starter"})

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Price ID not configured for plan 'starter'. Set STRIPE_PRICE_STARTER in .env"
    }
    assert "checkout" not in fake_stripe


def test_portal_uses_authenticated_users_stored_stripe_customer(
    billing_client, fake_stripe
):
    client, db, auth_context = billing_client
    auth_context["clerk_id"] = "user_portal_auth"
    _create_user(db, clerk_id="user_portal_auth", stripe_customer_id="cus_from_db")

    response = client.post(
        "/api/v1/billing/portal",
        json={
            "return_url": "https://app.example/settings",
            "customer_id": "cus_from_body_should_be_ignored",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"portal_url": "https://stripe.test/portal/bps_test"}
    assert fake_stripe["portal"] == {
        "customer": "cus_from_db",
        "return_url": "https://app.example/settings",
    }


def test_portal_returns_400_when_authenticated_user_has_no_stripe_customer(
    billing_client, fake_stripe
):
    client, db, auth_context = billing_client
    auth_context["clerk_id"] = "user_without_customer"
    _create_user(db, clerk_id="user_without_customer", stripe_customer_id=None)

    response = client.post("/api/v1/billing/portal", json={})

    assert response.status_code == 400
    assert response.json() == {"detail": "No active subscription found."}
    assert "portal" not in fake_stripe
