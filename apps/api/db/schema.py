"""
MOLDURIZE WEB — Database Schema
PostgreSQL via SQLAlchemy 2.0 (async-compatible)
"""
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Text,
    ForeignKey, Enum, JSON, func
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum


class Base(DeclarativeBase):
    pass


class PlanTier(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class RemnantStatus(str, enum.Enum):
    DISPONIVEL = "disponivel"
    DESCARTADO = "descartado"


class NestingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    clerk_id = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    plan = Column(Enum(PlanTier, values_callable=lambda obj: [e.value for e in obj]), default=PlanTier.FREE, nullable=False)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    nestings_this_month = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    nestings = relationship("Nesting", back_populates="user", cascade="all, delete-orphan")
    remnants = relationship("Remnant", back_populates="user", cascade="all, delete-orphan")


class Nesting(Base):
    __tablename__ = "nestings"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Block configuration
    block_width = Column(Float, nullable=False)
    block_height = Column(Float, nullable=False)
    kerf = Column(Float, default=3.0)

    # Input parts (JSON)
    parts_input = Column(JSON, nullable=False)  # List of {width, height, quantity, label}

    # Results
    status = Column(Enum(NestingStatus, values_callable=lambda obj: [e.value for e in obj]), default=NestingStatus.PENDING, nullable=False)
    total_blocks = Column(Integer, nullable=True)
    waste_percent = Column(Float, nullable=True)
    largest_remnant_w = Column(Float, nullable=True)
    largest_remnant_h = Column(Float, nullable=True)
    pieces_per_block = Column(Float, nullable=True)
    placed_parts = Column(JSON, nullable=True)  # List of PlacedPart dicts
    gcode = Column(Text, nullable=True)

    # Metadata
    name = Column(String, nullable=True)  # Optional user-given name
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="nestings")


class Remnant(Base):
    __tablename__ = "remnants"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    depth = Column(Float, default=100.0)
    status = Column(Enum(RemnantStatus, values_callable=lambda obj: [e.value for e in obj]), default=RemnantStatus.DISPONIVEL, nullable=False)

    # Optional: linked to the nesting that generated this remnant
    nesting_id = Column(String, ForeignKey("nestings.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="remnants")
