"""
MOLDURIZE WEB — Webhook Handlers
Integração com Clerk (auth events) e Stripe (billing events).

Ambos webhooks verificam a assinatura HMAC quando o segredo está configurado,
e caem num modo dev seguro (log + aceitar payload JSON cru) se o segredo for
placeholder — útil para iterar localmente sem expor o backend.
"""
import os
import json
import logging
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Header

logger = logging.getLogger(__name__)
router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _db_enabled() -> bool:
    return bool(os.getenv("DATABASE_URL"))


def _build_stripe_plan_map() -> dict:
    """Monta o mapa Price ID → Plan Tier a partir das envs STRIPE_PRICE_*."""
    return {
        os.getenv("STRIPE_PRICE_STARTER", "price_starter"): "starter",
        os.getenv("STRIPE_PRICE_PRO", "price_pro"): "pro",
        os.getenv("STRIPE_PRICE_ENTERPRISE", "price_enterprise"): "enterprise",
    }


def _is_placeholder(value: Optional[str]) -> bool:
    if not value:
        return True
    return "SUBSTITUA" in value or value.endswith("_placeholder")


# ═══════════════════════════════════════════════════════════════════════════
# CLERK WEBHOOKS  —  events: user.created / user.updated / user.deleted
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/webhooks/clerk")
async def clerk_webhook(
    request: Request,
    svix_id: Optional[str] = Header(None, alias="svix-id"),
    svix_timestamp: Optional[str] = Header(None, alias="svix-timestamp"),
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
):
    """
    Recebe eventos do Clerk e sincroniza usuários no banco.

    Configurar em:
        Clerk Dashboard → Webhooks → Add Endpoint
        URL:  https://seu-dominio.com/api/v1/webhooks/clerk
        Events: user.created, user.updated, user.deleted
        Signing Secret → CLERK_WEBHOOK_SECRET
    """
    payload = await request.body()
    webhook_secret = os.getenv("CLERK_WEBHOOK_SECRET")

    if not _is_placeholder(webhook_secret):
        try:
            from svix.webhooks import Webhook, WebhookVerificationError
        except ImportError:
            logger.error("svix package missing — install via `pip install svix`")
            raise HTTPException(status_code=500, detail="svix not installed")

        try:
            wh = Webhook(webhook_secret)
            event = wh.verify(payload, {
                "svix-id": svix_id or "",
                "svix-timestamp": svix_timestamp or "",
                "svix-signature": svix_signature or "",
            })
        except WebhookVerificationError as e:
            logger.warning(f"Clerk webhook: invalid signature — {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        logger.warning("Clerk webhook: dev mode (no CLERK_WEBHOOK_SECRET)")
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("type")
    data = event.get("data", {}) or {}

    logger.info(f"Clerk event: {event_type}")

    handlers = {
        "user.created": _handle_user_created,
        "user.updated": _handle_user_updated,
        "user.deleted": _handle_user_deleted,
    }
    handler = handlers.get(event_type)
    if handler:
        try:
            await handler(data)
        except Exception as e:
            logger.exception(f"Clerk handler {event_type} failed: {e}")
            # Return 200 anyway — don't make Clerk retry indefinitely
    return {"status": "ok", "event": event_type}


async def _handle_user_created(data: dict):
    clerk_id = data.get("id")
    email_addresses = data.get("email_addresses", []) or []
    email = email_addresses[0].get("email_address", "") if email_addresses else ""
    first = (data.get("first_name") or "").strip()
    last = (data.get("last_name") or "").strip()
    name = f"{first} {last}".strip() or None

    logger.info(f"  → user.created clerk_id={clerk_id} email={email}")

    if not _db_enabled():
        return

    from db.database import SessionLocal
    from db import crud
    db = SessionLocal()
    try:
        crud.get_or_create_user(db, clerk_id=clerk_id, email=email, name=name)
    finally:
        db.close()


async def _handle_user_updated(data: dict):
    clerk_id = data.get("id")
    email_addresses = data.get("email_addresses", []) or []
    email = email_addresses[0].get("email_address") if email_addresses else None
    first = (data.get("first_name") or "").strip()
    last = (data.get("last_name") or "").strip()
    name = f"{first} {last}".strip() or None

    logger.info(f"  → user.updated clerk_id={clerk_id}")

    if not _db_enabled():
        return

    from db.database import SessionLocal
    from db import crud
    db = SessionLocal()
    try:
        crud.update_user(db, clerk_id=clerk_id, email=email, name=name)
    finally:
        db.close()


async def _handle_user_deleted(data: dict):
    clerk_id = data.get("id")
    logger.info(f"  → user.deleted clerk_id={clerk_id}")

    if not _db_enabled():
        return

    from db.database import SessionLocal
    from db import crud
    db = SessionLocal()
    try:
        crud.delete_user(db, clerk_id=clerk_id)
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════
# STRIPE WEBHOOKS  —  events: checkout.session.completed, subscription.*
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
):
    """
    Recebe eventos do Stripe e atualiza planos.

    Configurar em:
        Stripe Dashboard → Developers → Webhooks → Add Endpoint
        URL:  https://seu-dominio.com/api/v1/webhooks/stripe
        Events:
          - checkout.session.completed
          - customer.subscription.updated
          - customer.subscription.deleted
        Signing Secret → STRIPE_WEBHOOK_SECRET
    """
    payload = await request.body()
    stripe_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not _is_placeholder(stripe_secret):
        try:
            import stripe
        except ImportError:
            logger.error("stripe package missing — install via `pip install stripe`")
            raise HTTPException(status_code=500, detail="stripe not installed")

        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature or "", stripe_secret
            )
        except ValueError as e:
            logger.warning(f"Stripe webhook: invalid payload — {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.warning(f"Stripe webhook: invalid signature — {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        logger.warning("Stripe webhook: dev mode (no STRIPE_WEBHOOK_SECRET)")
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("type") if isinstance(event, dict) else event["type"]
    data_obj = (
        event.get("data", {}).get("object", {})
        if isinstance(event, dict)
        else event["data"]["object"]
    )

    logger.info(f"Stripe event: {event_type}")

    handlers = {
        "checkout.session.completed": _handle_checkout_completed,
        "customer.subscription.created": _handle_subscription_updated,
        "customer.subscription.updated": _handle_subscription_updated,
        "customer.subscription.deleted": _handle_subscription_deleted,
    }
    handler = handlers.get(event_type)
    if handler:
        try:
            await handler(data_obj)
        except Exception as e:
            logger.exception(f"Stripe handler {event_type} failed: {e}")
    return {"status": "ok", "event": event_type}


async def _handle_checkout_completed(session: dict):
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    clerk_id = session.get("client_reference_id")
    plan = (session.get("metadata") or {}).get("plan", "starter")

    logger.info(
        f"  → checkout.session.completed "
        f"customer={customer_id} sub={subscription_id} "
        f"user={clerk_id} plan={plan}"
    )

    if not _db_enabled() or not clerk_id:
        return

    from db.database import SessionLocal
    from db import crud
    from db.schema import PlanTier
    db = SessionLocal()
    try:
        tier = PlanTier(plan) if plan in PlanTier._value2member_map_ else PlanTier.STARTER
        crud.set_user_plan(
            db,
            clerk_id=clerk_id,
            plan=tier,
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id,
        )
    finally:
        db.close()


async def _handle_subscription_updated(subscription: dict):
    customer_id = subscription.get("customer")
    items = subscription.get("items", {}).get("data", [])
    price_id = None
    if items:
        price_id = items[0].get("price", {}).get("id")

    plan_map = _build_stripe_plan_map()
    plan = plan_map.get(price_id, "starter")
    status = subscription.get("status")

    logger.info(
        f"  → customer.subscription.updated "
        f"customer={customer_id} price={price_id} plan={plan} status={status}"
    )

    if not _db_enabled():
        return

    # If subscription is canceled/past_due, downgrade to free
    if status in {"canceled", "unpaid", "past_due"}:
        plan = "free"

    from db.database import SessionLocal
    from db import crud
    from db.schema import PlanTier
    db = SessionLocal()
    try:
        tier = PlanTier(plan)
        crud.set_plan_by_stripe_customer(db, customer_id=customer_id, plan=tier)
    finally:
        db.close()


async def _handle_subscription_deleted(subscription: dict):
    customer_id = subscription.get("customer")
    logger.info(
        f"  → customer.subscription.deleted "
        f"customer={customer_id} → downgrade to free"
    )

    if not _db_enabled():
        return

    from db.database import SessionLocal
    from db import crud
    from db.schema import PlanTier
    db = SessionLocal()
    try:
        crud.set_plan_by_stripe_customer(db, customer_id=customer_id, plan=PlanTier.FREE)
    finally:
        db.close()
