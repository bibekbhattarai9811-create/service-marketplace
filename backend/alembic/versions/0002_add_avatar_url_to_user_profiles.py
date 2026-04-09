"""add avatar url to user profiles

Revision ID: 0002_avatar_url
Revises: 0001_initial_schema
Create Date: 2026-04-09 00:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_avatar_url"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("avatar_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("user_profiles", "avatar_url")
