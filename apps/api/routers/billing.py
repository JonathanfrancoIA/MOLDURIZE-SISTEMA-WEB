"""
MOLDURIZE WEB — Billing Router
Stripe Checkout Session creation and subscription management
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from dependencies.auth import get_current_user_clerk_id

logger = logging.getLogger(__name__)
router = APIRouter()

# Planos MOLDURIZE → Stripe Price IDs
# Preencher com os IDs reais do Stripe Dashboard
PLAN_PRICES = {
    "starter": os.getenv("STRIPE_PRICE_STARTER", "price_starter_placeholder"),
    "pro": os.getenv("STRIPE_PRICE_PRO", "price_pro_placeholder"),
    "enterprise": os.getenv("STRIPE_PRICE_ENTERPRISE", "price_enterprise_placeholder"),
}

PLAN_NAMES = {
    "starter": "Starter — R$ 97/mês",
    "pro": "Pro — R$ 197/mês",
    "enterprise": "Enterprise — R$ 497/mês",
}


class CheckoutRequest(BaseModel):
    plan: str = Field(..., pattern="^(starter|pro|enterprise)$")
    success_url: str = Field(default="http://localhost:3000/dashboard?checkout=success")
    cancel_url: str = Field(default="http://localhost:3000/pricing?checkout=cancelled")


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalRequest(BaseModel):
    return_url: str = Field(default="http://localhost:3000/settings")


@router.post("/billing/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    clerk_id: str = Depends(get_current_user_clerk_id)
):
    """
    Cria uma sessão de checkout do Stripe para upgrade de plano.

    No frontend, redirecione o usuário para `checkout_url` após receber a resposta.
    """
    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")

    if not stripe_key or stripe_key.startswith("sk_test_SUBSTITUA"):
        # Dev mode: return mock response
        logger.warning("Stripe not configured — returning mock checkout URL")
        return CheckoutResponse(
            checkout_url=f"http://localhost:3000/pricing?mock=true&plan={request.plan}",
            session_id="mock_session_" + request.plan,
        )

    try:
        import stripe
        stripe.api_key = stripe_key

        price_id = PLAN_PRICES.get(request.plan)
        if not price_id or price_id.endswith("_placeholder"):
            raise HTTPException(
                status_code=400,
                detail=f"Price ID not configured for plan '{request.plan}'. Set STRIPE_PRICE_{request.plan.upper()} in .env"
            )

        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=request.success_url + "&session_id={CHECKOUT_SESSION_ID}",
            cancel_url=request.cancel_url,
            client_reference_id=clerk_id,
            metadata={"plan": request.plan, "clerk_id": clerk_id},
            payment_method_types=["card"],
            billing_address_collection="required",
            locale="pt-BR",
        )

        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.id,
        )
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Stripe not installed. Run: pip install stripe"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/billing/portal")
async def create_customer_portal(
    request: PortalRequest,
    clerk_id: str = Depends(get_current_user_clerk_id)
):
    """
    Abre o Portal do Cliente Stripe para gerenciar assinatura.
    Permite cancelar, atualizar cartão, ver faturas.
    """
    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")

    if not stripe_key or stripe_key.startswith("sk_test_SUBSTITUA"):
        return {"portal_url": "http://localhost:3000/settings?mock=portal"}

    try:
        from db.database import SessionLocal
        from db.crud import get_user_by_clerk_id
        db = SessionLocal()
        try:
            user = get_user_by_clerk_id(db, clerk_id=clerk_id)
            if not user or not user.stripe_customer_id:
                raise HTTPException(status_code=400, detail="No active subscription found.")
            customer_id = user.stripe_customer_id
        finally:
            db.close()

        import stripe
        stripe.api_key = stripe_key

        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=request.return_url,
        )
        return {"portal_url": session.url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/billing/plans")
async def get_plans():
    """Retorna os planos disponíveis com preços e features."""
    return {
        "currency": "BRL",
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "period": "mês",
                "nestings_limit": 5,
                "blocks_limit": 1,
                "features": [
                    "5 nestings/mês",
                    "1 bloco de EPS",
                    "G-Code básico",
                    "Suporte comunidade",
                ],
            },
            {
                "id": "starter",
                "name": "Starter",
                "price": 97,
                "period": "mês",
                "nestings_limit": 50,
                "blocks_limit": 5,
                "features": [
                    "50 nestings/mês",
                    "5 blocos de EPS",
                    "G-Code básico",
                    "Gestão de retalhos",
                    "Suporte por email",
                ],
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 197,
                "period": "mês",
                "nestings_limit": -1,
                "blocks_limit": -1,
                "popular": True,
                "features": [
                    "Nestings ilimitados",
                    "Blocos ilimitados",
                    "G-Code multi-perfil",
                    "Importação DXF",
                    "Assistente IA",
                    "Suporte prioritário",
                ],
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": 497,
                "period": "mês",
                "nestings_limit": -1,
                "blocks_limit": -1,
                "features": [
                    "Tudo do Pro",
                    "Multi-usuário",
                    "SSO corporativo",
                    "API REST completa",
                    "Integração ERP",
                    "SLA 99.9% uptime",
                ],
            },
        ],
    }
