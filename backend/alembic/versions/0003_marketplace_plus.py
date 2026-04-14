"""marketplace enhancements

Revision ID: 0003_marketplace_plus
Revises: 0002_avatar_url
Create Date: 2026-04-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_marketplace_plus"
down_revision = "0002_avatar_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.true()))
    op.add_column("user_profiles", sa.Column("service_area", sa.String(), nullable=True))
    op.add_column("user_profiles", sa.Column("portfolio", sa.String(), nullable=True))
    op.add_column("jobs", sa.Column("image_url", sa.String(), nullable=True))
    op.add_column("notifications", sa.Column("user_id", sa.Integer(), nullable=True))
    op.add_column("notifications", sa.Column("title", sa.String(), nullable=True))
    op.add_column("notifications", sa.Column("notification_type", sa.String(), nullable=True))
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_column("notifications", "notification_type")
    op.drop_column("notifications", "title")
    op.drop_column("notifications", "user_id")
    op.drop_column("jobs", "image_url")
    op.drop_column("user_profiles", "portfolio")
    op.drop_column("user_profiles", "service_area")
    op.drop_column("users", "is_active")
