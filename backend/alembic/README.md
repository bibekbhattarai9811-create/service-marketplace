Run Alembic from the `backend` directory.

Common commands:

- `alembic stamp head`
  Use this once for an existing database that was created before Alembic was added.

- `alembic revision --autogenerate -m "describe change"`
  Create a new migration from model changes.

- `alembic upgrade head`
  Apply all migrations.

Recommended workflow:

1. Update SQLAlchemy models.
2. Create a new Alembic revision.
3. Review the generated migration and keep revision ids short.
4. Apply `alembic upgrade head` locally.
5. Push the migration file with the code change.
6. Run the migration in production before switching the backend back to its normal start command.

Production note:

- Local SQLite can auto-create tables for convenience.
- PostgreSQL production should use migrations as the main schema path.
