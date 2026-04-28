"""initial schema: users, nestings, remnants

Revision ID: 20260417_0001
Revises:
Create Date: 2026-04-17 00:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260417_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    plan_enum = sa.Enum("free", "starter", "pro", "enterprise", name="plantier")
    remnant_status_enum = sa.Enum("disponivel", "descartado", name="remnantstatus")
    nesting_status_enum = sa.Enum(
        "pending", "processing", "completed", "failed", name="nestingstatus"
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("clerk_id", sa.String(), nullable=False, unique=True, index=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("plan", plan_enum, nullable=False, server_default="free"),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column(
            "nestings_this_month", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "nestings",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("block_width", sa.Float(), nullable=False),
        sa.Column("block_height", sa.Float(), nullable=False),
        sa.Column("kerf", sa.Float(), nullable=True, server_default="3.0"),
        sa.Column("parts_input", sa.JSON(), nullable=False),
        sa.Column("status", nesting_status_enum, nullable=False, server_default="pending"),
        sa.Column("total_blocks", sa.Integer(), nullable=True),
        sa.Column("waste_percent", sa.Float(), nullable=True),
        sa.Column("largest_remnant_w", sa.Float(), nullable=True),
        sa.Column("largest_remnant_h", sa.Float(), nullable=True),
        sa.Column("pieces_per_block", sa.Float(), nullable=True),
        sa.Column("placed_parts", sa.JSON(), nullable=True),
        sa.Column("gcode", sa.Text(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "remnants",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("width", sa.Float(), nullable=False),
        sa.Column("height", sa.Float(), nullable=False),
        sa.Column("depth", sa.Float(), nullable=True, server_default="100.0"),
        sa.Column(
            "status",
            remnant_status_enum,
            nullable=False,
            server_default="disponivel",
        ),
        sa.Column(
            "nesting_id",
            sa.String(),
            sa.ForeignKey("nestings.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("remnants")
    op.drop_table("nestings")
    op.drop_table("users")
    sa.Enum(name="nestingstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="remnantstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="plantier").drop(op.get_bind(), checkfirst=True)
