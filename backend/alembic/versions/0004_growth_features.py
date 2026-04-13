"""growth features

Revision ID: 0004_growth_features
Revises: 0003_marketplace_plus
Create Date: 2026-04-13 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_growth_features"
down_revision = "0003_marketplace_plus"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("category", sa.String(), nullable=True))
    op.add_column("jobs", sa.Column("service_date", sa.String(), nullable=True))
    op.add_column("jobs", sa.Column("service_window", sa.String(), nullable=True))
    op.add_column("notifications", sa.Column("action_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "action_url")
    op.drop_column("jobs", "service_window")
    op.drop_column("jobs", "service_date")
    op.drop_column("jobs", "category")
