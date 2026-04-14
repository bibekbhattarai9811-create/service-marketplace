# Service Marketplace Backend

This backend powers the live Service Marketplace API.

## Main Features

- token-based authentication
- customer, worker, and admin roles
- password reset endpoints
- realtime chat over WebSocket
- notifications
- profile and avatar management
- worker directory and availability
- job image upload
- disputes and admin moderation
- PostgreSQL-ready database setup with Alembic migrations

## Local Development

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment variables

Create a `.env` file or set environment variables in your shell.

Example local setup:

```env
DATABASE_URL=sqlite:///test.db
AUTO_CREATE_TABLES=true
SERVICE_MARKETPLACE_PASSWORD_RESET_URL=http://127.0.0.1:3000/reset-password
```

### 3. Run the backend

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open:

- [http://127.0.0.1:8000](http://127.0.0.1:8000)
- [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Production Render Environment

Recommended backend environment variables:

```env
DATABASE_URL=postgresql://...
AUTO_CREATE_TABLES=false
SERVICE_MARKETPLACE_ADMIN_SIGNUP_SECRET=change-me
SERVICE_MARKETPLACE_PASSWORD_RESET_URL=https://service-marketplace-17.onrender.com/reset-password
SERVICE_MARKETPLACE_UPLOADS_BASE_URL=
SERVICE_MARKETPLACE_CLOUDINARY_CLOUD_NAME=
SERVICE_MARKETPLACE_CLOUDINARY_UPLOAD_PRESET=
SERVICE_MARKETPLACE_S3_BUCKET=
SERVICE_MARKETPLACE_S3_REGION=
SERVICE_MARKETPLACE_S3_ACCESS_KEY_ID=
SERVICE_MARKETPLACE_S3_SECRET_ACCESS_KEY=
SERVICE_MARKETPLACE_S3_PUBLIC_BASE_URL=
SERVICE_MARKETPLACE_RESEND_API_KEY=
SERVICE_MARKETPLACE_RESEND_FROM=
SERVICE_MARKETPLACE_SMTP_HOST=
SERVICE_MARKETPLACE_SMTP_PORT=587
SERVICE_MARKETPLACE_SMTP_USER=
SERVICE_MARKETPLACE_SMTP_PASSWORD=
SERVICE_MARKETPLACE_SMTP_FROM=
SERVICE_MARKETPLACE_SMS_WEBHOOK_URL=
```

Important notes:

- `AUTO_CREATE_TABLES` should stay `false` in production.
- Run `alembic upgrade head` when new migrations are added.
- `SERVICE_MARKETPLACE_ADMIN_SIGNUP_SECRET` must be set before creating admin users through the API.
- Set either the Cloudinary variables or the S3 variables for durable image storage on Render.
- Resend can be used for password reset and notification email delivery without managing SMTP credentials.
- `websockets` is required in production for the `/ws` endpoint.
- Run `alembic upgrade head` after deploying migrations such as `0005_disputes_and_ops`.

## Tests

Run backend tests:

```bash
python -m pytest tests/test_app_flow.py -q
```

## Deployment Notes

- Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

- Temporary migration command when needed:

```bash
alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT
```
