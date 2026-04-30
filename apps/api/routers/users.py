import os
import sys
from types import SimpleNamespace
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from dependencies.auth import get_current_user_clerk_id

# Ensure engine is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

router = APIRouter()

_db_url = os.getenv("DATABASE_URL", "")
DB_ENABLED = bool(_db_url) and not _db_url.startswith("postgresql://user:password")


def _get_db_optional():
    """Yield a DB session when DB is enabled, else yield None."""
    if DB_ENABLED:
        from db.database import get_db
        yield from get_db()
    else:
        yield None


class BillingInfo(BaseModel):
    customer_id: Optional[str] = None
    subscription_id: Optional[str] = None
    has_customer: bool
    has_subscription: bool
    portal_available: bool


class UsageInfo(BaseModel):
    nestings_this_month: int
    blocks_this_month: Optional[int] = None
    remnants_active: Optional[int] = None


class LimitsInfo(BaseModel):
    nestings_limit: int
    blocks_limit: int


class MeResponse(BaseModel):
    id: str
    clerk_id: str
    email: str
    name: Optional[str] = None
    plan: str
    usage: UsageInfo
    limits: LimitsInfo
    nestings_this_month: int
    nestings_limit: int
    blocks_limit: int
    nestings_remaining: Optional[int] = None
    has_unlimited_nestings: bool
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    billing: BillingInfo


def _serialize_user(
    user,
    nestings_limit: int,
    blocks_limit: int,
    remnants_active: Optional[int] = None,
) -> MeResponse:
    plan = user.plan.value if hasattr(user.plan, "value") else str(user.plan)
    used = user.nestings_this_month or 0
    unlimited = nestings_limit == -1
    return MeResponse(
        id=user.id,
        clerk_id=user.clerk_id,
        email=user.email,
        name=user.name,
        plan=plan,
        usage=UsageInfo(
            nestings_this_month=used,
            blocks_this_month=0,
            remnants_active=remnants_active,
        ),
        limits=LimitsInfo(
            nestings_limit=nestings_limit,
            blocks_limit=blocks_limit,
        ),
        nestings_this_month=used,
        nestings_limit=nestings_limit,
        blocks_limit=blocks_limit,
        nestings_remaining=None if unlimited else max(nestings_limit - used, 0),
        has_unlimited_nestings=unlimited,
        stripe_customer_id=user.stripe_customer_id,
        stripe_subscription_id=user.stripe_subscription_id,
        billing=BillingInfo(
            customer_id=user.stripe_customer_id,
            subscription_id=user.stripe_subscription_id,
            has_customer=bool(user.stripe_customer_id),
            has_subscription=bool(user.stripe_subscription_id),
            portal_available=bool(user.stripe_customer_id),
        ),
    )


@router.get("/me", response_model=MeResponse)
async def get_me(
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(_get_db_optional),
):
    """Return the authenticated user's MVP account and billing profile."""
    if DB_ENABLED and db is not None:
        from db import crud

        user = crud.get_or_create_user(
            db,
            clerk_id=clerk_id,
            email=f"{clerk_id}@mocked.email",
        )
        return _serialize_user(
            user,
            nestings_limit=crud.get_plan_limit(user.plan),
            blocks_limit=crud.get_block_limit(user.plan),
        )

    dev_user = SimpleNamespace(
        id=clerk_id,
        clerk_id=clerk_id,
        email=f"{clerk_id}@mocked.email",
        name=None,
        plan="free",
        nestings_this_month=0,
        stripe_customer_id=None,
        stripe_subscription_id=None,
    )
    return _serialize_user(dev_user, nestings_limit=5, blocks_limit=1)
