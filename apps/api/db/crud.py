"""
MOLDURIZE WEB — CRUD Operations
Database access layer for Nesting and Remnants
"""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
import uuid

from .schema import User, Nesting, Remnant, NestingStatus, RemnantStatus, PlanTier


# ---- Plan limits ----
PLAN_LIMITS = {
    PlanTier.FREE: 500,      # increased for development testing
    PlanTier.STARTER: 50,
    PlanTier.PRO: -1,        # unlimited
    PlanTier.ENTERPRISE: -1, # unlimited
}

BLOCK_LIMITS = {
    PlanTier.FREE: 50,       # increased for development testing
    PlanTier.STARTER: 5,
    PlanTier.PRO: -1,        # unlimited
    PlanTier.ENTERPRISE: -1, # unlimited
}


def _normalize_plan(plan) -> PlanTier:
    if isinstance(plan, PlanTier):
        return plan
    if isinstance(plan, str):
        try:
            return PlanTier(plan.lower())
        except ValueError:
            return PlanTier[plan.upper()]
    return PlanTier.FREE


def get_plan_limit(plan) -> int:
    try:
        return PLAN_LIMITS.get(_normalize_plan(plan), 0)
    except (KeyError, ValueError):
        return 0


def get_block_limit(plan) -> int:
    try:
        return BLOCK_LIMITS.get(_normalize_plan(plan), 0)
    except (KeyError, ValueError):
        return 0


# ---- Users ----
def get_or_create_user(db: Session, clerk_id: str, email: str, name: Optional[str] = None) -> User:
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            clerk_id=clerk_id,
            email=email,
            name=name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_user_by_clerk_id(db: Session, clerk_id: str) -> Optional[User]:
    return db.query(User).filter(User.clerk_id == clerk_id).first()


def get_user_by_stripe_customer(db: Session, customer_id: str) -> Optional[User]:
    return db.query(User).filter(User.stripe_customer_id == customer_id).first()


def update_user(db: Session, clerk_id: str, **fields) -> Optional[User]:
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        return None
    for k, v in fields.items():
        if hasattr(user, k) and v is not None:
            setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, clerk_id: str) -> bool:
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True


def set_user_plan(db: Session, clerk_id: str, plan: PlanTier,
                   stripe_customer_id: Optional[str] = None,
                   stripe_subscription_id: Optional[str] = None) -> Optional[User]:
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        return None
    user.plan = plan
    if stripe_customer_id:
        user.stripe_customer_id = stripe_customer_id
    if stripe_subscription_id:
        user.stripe_subscription_id = stripe_subscription_id
    db.commit()
    db.refresh(user)
    return user


def set_plan_by_stripe_customer(db: Session, customer_id: str, plan: PlanTier) -> Optional[User]:
    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        return None
    user.plan = plan
    db.commit()
    db.refresh(user)
    return user


def can_user_nest(db: Session, user: User) -> bool:
    limit = get_plan_limit(user.plan)
    if limit == -1:
        return True
    return (user.nestings_this_month or 0) < limit


def increment_nesting_count(db: Session, user: User) -> User:
    user.nestings_this_month = (user.nestings_this_month or 0) + 1
    db.commit()
    db.refresh(user)
    return user


# ---- Nestings ----
def create_nesting(
    db: Session,
    user_id: str,
    block_width: float,
    block_height: float,
    kerf: float,
    parts_input: list,
    name: Optional[str] = None,
) -> Nesting:
    nesting = Nesting(
        id=str(uuid.uuid4()),
        user_id=user_id,
        block_width=block_width,
        block_height=block_height,
        kerf=kerf,
        parts_input=parts_input,
        name=name,
        status=NestingStatus.PENDING,
    )
    db.add(nesting)
    db.commit()
    db.refresh(nesting)
    return nesting


def update_nesting_result(db: Session, nesting_id: str, result: dict) -> Optional[Nesting]:
    nesting = db.query(Nesting).filter(Nesting.id == nesting_id).first()
    if not nesting:
        return None
    nesting.status = NestingStatus.COMPLETED
    nesting.total_blocks = result["total_blocks"]
    nesting.waste_percent = result["waste_percent"]
    nesting.largest_remnant_w = result["largest_remnant_w"]
    nesting.largest_remnant_h = result["largest_remnant_h"]
    nesting.pieces_per_block = result["pieces_per_block"]
    nesting.placed_parts = result["placed_parts"]
    nesting.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(nesting)
    return nesting


def list_nestings(db: Session, user_id: str, limit: int = 20) -> List[Nesting]:
    return (
        db.query(Nesting)
        .filter(Nesting.user_id == user_id)
        .order_by(Nesting.created_at.desc())
        .limit(limit)
        .all()
    )


def get_nesting_for_user(db: Session, nesting_id: str, user_id: str) -> Optional[Nesting]:
    return (
        db.query(Nesting)
        .filter(Nesting.id == nesting_id, Nesting.user_id == user_id)
        .first()
    )


# ---- Remnants ----
def create_remnant(
    db: Session,
    user_id: str,
    width: float,
    height: float,
    depth: float = 100.0,
    nesting_id: Optional[str] = None,
) -> Remnant:
    remnant = Remnant(
        id=str(uuid.uuid4()),
        user_id=user_id,
        width=width,
        height=height,
        depth=depth,
        nesting_id=nesting_id,
    )
    db.add(remnant)
    db.commit()
    db.refresh(remnant)
    return remnant


def list_remnants(db: Session, user_id: str, status: Optional[str] = None) -> List[Remnant]:
    q = db.query(Remnant).filter(Remnant.user_id == user_id)
    if status:
        q = q.filter(Remnant.status == status)
    return q.order_by(Remnant.created_at.desc()).all()


def update_remnant_status(db: Session, remnant_id: str, user_id: str, status: str) -> Optional[Remnant]:
    remnant = db.query(Remnant).filter(
        Remnant.id == remnant_id,
        Remnant.user_id == user_id,
    ).first()
    if not remnant:
        return None
    remnant.status = status
    db.commit()
    db.refresh(remnant)
    return remnant


def delete_remnant(db: Session, remnant_id: str, user_id: str) -> bool:
    remnant = db.query(Remnant).filter(
        Remnant.id == remnant_id,
        Remnant.user_id == user_id,
    ).first()
    if not remnant:
        return False
    db.delete(remnant)
    db.commit()
    return True
