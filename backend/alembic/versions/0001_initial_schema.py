"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column("password", sa.String(), nullable=True),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("bio", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("skills", sa.String(), nullable=True),
        sa.Column("hourly_rate", sa.Integer(), nullable=True),
    )
    op.create_index("ix_user_profiles_id", "user_profiles", ["id"], unique=False)
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"], unique=True)

    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("price", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("customer_id", sa.Integer(), nullable=True),
        sa.Column("worker_id", sa.Integer(), nullable=True),
        sa.Column("paid", sa.Boolean(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
    )
    op.create_index("ix_jobs_id", "jobs", ["id"], unique=False)

    op.create_table(
        "job_acceptance",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), nullable=True),
        sa.Column("worker_id", sa.Integer(), nullable=True),
    )
    op.create_index("ix_job_acceptance_id", "job_acceptance", ["id"], unique=False)

    op.create_table(
        "ratings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("worker_id", sa.Integer(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("review", sa.String(), nullable=True),
    )
    op.create_index("ix_ratings_id", "ratings", ["id"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("message", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("is_read", sa.Integer(), nullable=True),
    )
    op.create_index("ix_notifications_id", "notifications", ["id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), nullable=True),
        sa.Column("customer_id", sa.Integer(), nullable=True),
        sa.Column("worker_id", sa.Integer(), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("platform_fee", sa.Integer(), nullable=True),
        sa.Column("worker_amount", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
    )
    op.create_index("ix_payments_id", "payments", ["id"], unique=False)

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), nullable=True),
        sa.Column("sender_id", sa.Integer(), nullable=True),
        sa.Column("receiver_id", sa.Integer(), nullable=True),
        sa.Column("message", sa.String(), nullable=True),
    )
    op.create_index("ix_chat_messages_id", "chat_messages", ["id"], unique=False)

    op.create_table(
        "availability",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("worker_id", sa.Integer(), nullable=True),
        sa.Column("day", sa.String(), nullable=True),
        sa.Column("start_time", sa.String(), nullable=True),
        sa.Column("end_time", sa.String(), nullable=True),
    )
    op.create_index("ix_availability_id", "availability", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_availability_id", table_name="availability")
    op.drop_table("availability")
    op.drop_index("ix_chat_messages_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_payments_id", table_name="payments")
    op.drop_table("payments")
    op.drop_index("ix_notifications_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_ratings_id", table_name="ratings")
    op.drop_table("ratings")
    op.drop_index("ix_job_acceptance_id", table_name="job_acceptance")
    op.drop_table("job_acceptance")
    op.drop_index("ix_jobs_id", table_name="jobs")
    op.drop_table("jobs")
    op.drop_index("ix_user_profiles_user_id", table_name="user_profiles")
    op.drop_index("ix_user_profiles_id", table_name="user_profiles")
    op.drop_table("user_profiles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
