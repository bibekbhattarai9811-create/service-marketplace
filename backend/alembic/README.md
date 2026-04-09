Run Alembic from the `backend` directory.

Common commands:

- `alembic stamp head`
  Use this once for an existing database that was created before Alembic was added.

- `alembic revision --autogenerate -m "describe change"`
  Create a new migration from model changes.

- `alembic upgrade head`
  Apply all migrations.
