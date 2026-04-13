"""disputes and ops

Revision ID: 0005_disputes_and_ops
Revises: 0004_growth_features
Create Date: 2026-04-13 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_disputes_and_ops"
down_revision = "0004_growth_features"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "disputes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("reporter_id", sa.Integer(), nullable=False),
        sa.Column("target_user_id", sa.Integer(), nullable=True),
        sa.Column("dispute_type", sa.String(), nullable=True),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("details", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("resolution_note", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("disputes")
