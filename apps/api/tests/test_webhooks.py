"""
MOLDURIZE WEB — Webhook Tests
Test coverage for Clerk and Stripe webhook endpoints.
Uses SQLite in-memory with monkeypatched Clerk/Stripe libraries.
"""
import sys
import json
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from db.schema import Base, PlanTier, User
from dependencies.auth import get_current_user_clerk_id
from main import app


@pytest.fixture
def webhook_client(monkeypatch):
    """Set up in-memory SQLite, override dependencies, and return TestClient."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    import db.database as database
    monkeypatch.setattr(database, "SessionLocal", lambda: db)

    async def override_auth():
        return "test_user"
    monkeypatch.setitem(app.dependency_overrides, get_current_user_clerk_id, override_auth)

    try:
        with TestClient(app) as client:
            yield client, db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def _create_user(db, clerk_id: str, email: str, plan: PlanTier = PlanTier.FREE,
                 stripe_customer_id: str = None, stripe_subscription_id: str = None) -> User:
    user = User(
        clerk_id=clerk_id,
        email=email,
        name=f"User {clerk_id}",
        plan=plan,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=stripe_subscription_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_clerk_user_created_with_valid_signature_creates_db_user(webhook_client, monkeypatch):
    client, db = webhook_client

    fake_event = {
        "type": "user.created",
        "data": {
            "id": "clerk_user_123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "John",
            "last_name": "Doe",
        }
    }

    class FakeWebhook:
        def __init__(self, secret):
            self.secret = secret
        def verify(self, payload, headers):
            return fake_event

    monkeypatch.setitem(sys.modules, "svix.webhooks", SimpleNamespace(
        Webhook=FakeWebhook,
        WebhookVerificationError=Exception,
    ))
    monkeypatch.setenv("CLERK_WEBHOOK_SECRET", "whsec_real_secret_123")

    response = client.post(
        "/api/v1/webhooks/clerk",
        content=json.dumps(fake_event),
        headers={
            "svix-id": "msg_123",
            "svix-timestamp": "1234567890",
            "svix-signature": "v1,sig_123",
            "content-type": "application/json",
        }
    )

    assert response.status_code == 200
    assert response.json()["event"] == "user.created"

    user = db.query(User).filter(User.clerk_id == "clerk_user_123").first()
    assert user is not None
    assert user.email == "test@example.com"
    assert user.name == "John Doe"


def test_clerk_invalid_signature_returns_403_when_secret_configured(webhook_client, monkeypatch):
    client, db = webhook_client

    class FakeWebhookVerificationError(Exception):
        pass

    class FakeWebhook:
        def __init__(self, secret):
            pass
        def verify(self, payload, headers):
            raise FakeWebhookVerificationError("Invalid signature")

    monkeypatch.setitem(sys.modules, "svix.webhooks", SimpleNamespace(
        Webhook=FakeWebhook,
        WebhookVerificationError=FakeWebhookVerificationError,
    ))
    monkeypatch.setenv("CLERK_WEBHOOK_SECRET", "whsec_real_secret_123")

    payload = {"type": "user.created", "data": {"id": "clerk_123"}}
    response = client.post(
        "/api/v1/webhooks/clerk",
        content=json.dumps(payload),
        headers={
            "svix-id": "msg_123",
            "svix-timestamp": "1234567890",
            "svix-signature": "v1,invalid_sig",
            "content-type": "application/json",
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid signature"


def test_clerk_dev_mode_with_placeholder_secret_accepts_unsigned_json(webhook_client, monkeypatch):
    client, db = webhook_client
    monkeypatch.setenv("CLERK_WEBHOOK_SECRET", "SUBSTITUA_AQUI")

    payload = {
        "type": "user.created",
        "data": {
            "id": "clerk_dev_user",
            "email_addresses": [{"email_address": "dev@example.com"}],
        }
    }

    response = client.post(
        "/api/v1/webhooks/clerk",
        content=json.dumps(payload),
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json()["event"] == "user.created"

    user = db.query(User).filter(User.clerk_id == "clerk_dev_user").first()
    assert user is not None
    assert user.email == "dev@example.com"


def test_clerk_user_deleted_removes_user(webhook_client, monkeypatch):
    client, db = webhook_client

    user = _create_user(db, "clerk_delete_me", "delete@example.com")
    assert db.query(User).filter(User.clerk_id == "clerk_delete_me").first() is not None

    class FakeWebhook:
        def __init__(self, secret):
            pass
        def verify(self, payload, headers):
            return {
                "type": "user.deleted",
                "data": {"id": "clerk_delete_me"}
            }

    monkeypatch.setitem(sys.modules, "svix.webhooks", SimpleNamespace(
        Webhook=FakeWebhook,
        WebhookVerificationError=Exception,
    ))
    monkeypatch.setenv("CLERK_WEBHOOK_SECRET", "whsec_real_secret_123")

    response = client.post(
        "/api/v1/webhooks/clerk",
        content=json.dumps({"type": "user.deleted", "data": {"id": "clerk_delete_me"}}),
        headers={
            "svix-id": "msg_123",
            "svix-timestamp": "1234567890",
            "svix-signature": "v1,sig_123",
            "content-type": "application/json",
        }
    )

    assert response.status_code == 200
    assert response.json()["event"] == "user.deleted"

    deleted_user = db.query(User).filter(User.clerk_id == "clerk_delete_me").first()
    assert deleted_user is None


def test_stripe_checkout_session_completed_upgrades_user_plan_in_db(webhook_client, monkeypatch):
    client, db = webhook_client

    user = _create_user(db, "clerk_stripe_upgrade", "upgrade@example.com", plan=PlanTier.FREE)
    assert user.plan == PlanTier.FREE

    fake_event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "customer": "cus_stripe_123",
                "subscription": "sub_stripe_123",
                "client_reference_id": "clerk_stripe_upgrade",
                "metadata": {"plan": "pro"}
            }
        }
    }

    class FakeStripe:
        class Webhook:
            @staticmethod
            def construct_event(payload, signature, secret):
                return fake_event
        class error:
            SignatureVerificationError = Exception

    monkeypatch.setitem(sys.modules, "stripe", FakeStripe())
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_stripe_real_123")

    response = client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(fake_event),
        headers={
            "stripe-signature": "t=1234567890,v1=sig123",
            "content-type": "application/json",
        }
    )

    assert response.status_code == 200
    assert response.json()["event"] == "checkout.session.completed"

    updated_user = db.query(User).filter(User.clerk_id == "clerk_stripe_upgrade").first()
    assert updated_user is not None
    assert updated_user.plan == PlanTier.PRO
    assert updated_user.stripe_customer_id == "cus_stripe_123"
    assert updated_user.stripe_subscription_id == "sub_stripe_123"


def test_stripe_subscription_deleted_downgrades_to_free(webhook_client, monkeypatch):
    client, db = webhook_client

    user = _create_user(
        db, "clerk_stripe_downgrade", "downgrade@example.com",
        plan=PlanTier.PRO,
        stripe_customer_id="cus_stripe_456"
    )
    assert user.plan == PlanTier.PRO

    fake_event = {
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_stripe_deleted",
                "customer": "cus_stripe_456",
                "status": "canceled",
            }
        }
    }

    class FakeStripe:
        class Webhook:
            @staticmethod
            def construct_event(payload, signature, secret):
                return fake_event
        class error:
            SignatureVerificationError = Exception

    monkeypatch.setitem(sys.modules, "stripe", FakeStripe())
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_stripe_real_123")

    response = client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(fake_event),
        headers={
            "stripe-signature": "t=1234567890,v1=sig456",
            "content-type": "application/json",
        }
    )

    assert response.status_code == 200
    assert response.json()["event"] == "customer.subscription.deleted"

    updated_user = db.query(User).filter(User.clerk_id == "clerk_stripe_downgrade").first()
    assert updated_user is not None
    assert updated_user.plan == PlanTier.FREE


def test_stripe_invoice_payment_failed_logs_event(webhook_client, monkeypatch, caplog):
    client, db = webhook_client

    user = _create_user(
        db, "clerk_stripe_payment_fail", "payfail@example.com",
        plan=PlanTier.PRO,
        stripe_customer_id="cus_stripe_789"
    )

    fake_event = {
        "type": "invoice.payment_failed",
        "data": {
            "object": {
                "id": "in_stripe_failed",
                "customer": "cus_stripe_789",
                "status": "open",
            }
        }
    }

    class FakeStripe:
        class Webhook:
            @staticmethod
            def construct_event(payload, signature, secret):
                return fake_event
        class error:
            SignatureVerificationError = Exception

    monkeypatch.setitem(sys.modules, "stripe", FakeStripe())
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_stripe_real_123")

    with caplog.at_level("INFO"):
        response = client.post(
            "/api/v1/webhooks/stripe",
            content=json.dumps(fake_event),
            headers={
                "stripe-signature": "t=1234567890,v1=sig789",
                "content-type": "application/json",
            }
        )

    assert response.status_code == 200
    assert response.json()["event"] == "invoice.payment_failed"

    updated_user = db.query(User).filter(User.clerk_id == "clerk_stripe_payment_fail").first()
    assert updated_user is not None
    assert updated_user.plan == PlanTier.PRO

    assert "Stripe event: invoice.payment_failed" in caplog.text


def test_stripe_invalid_signature_returns_400_when_secret_configured(webhook_client, monkeypatch):
    client, db = webhook_client

    class FakeSignatureVerificationError(Exception):
        pass

    class FakeStripe:
        class Webhook:
            @staticmethod
            def construct_event(payload, signature, secret):
                raise FakeSignatureVerificationError("Invalid signature")
        class error:
            SignatureVerificationError = FakeSignatureVerificationError

    monkeypatch.setitem(sys.modules, "stripe", FakeStripe())
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_stripe_real_123")

    payload = {"type": "checkout.session.completed", "data": {"object": {}}}
    response = client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(payload),
        headers={
            "stripe-signature": "t=1234567890,v1=invalid_sig",
            "content-type": "application/json",
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid signature"


def test_stripe_dev_mode_with_placeholder_secret_accepts_unsigned_json(webhook_client, monkeypatch):
    client, db = webhook_client

    user = _create_user(db, "clerk_stripe_dev", "dev_stripe@example.com", plan=PlanTier.FREE)
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "SUBSTITUA_AQUI_stripe")

    payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_dev_123",
                "customer": "cus_dev_123",
                "subscription": "sub_dev_123",
                "client_reference_id": "clerk_stripe_dev",
                "metadata": {"plan": "pro"}
            }
        }
    }

    response = client.post(
        "/api/v1/webhooks/stripe",
        content=json.dumps(payload),
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json()["event"] == "checkout.session.completed"

    updated_user = db.query(User).filter(User.clerk_id == "clerk_stripe_dev").first()
    assert updated_user is not None
    assert updated_user.plan == PlanTier.PRO
