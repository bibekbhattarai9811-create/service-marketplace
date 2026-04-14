from pathlib import Path

from fastapi import FastAPI, WebSocket, Depends, WebSocketDisconnect, UploadFile, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from auth import get_current_user, require_role
from database import AUTO_CREATE_TABLES, engine, SessionLocal
from models import Base, Job, Payment, User
from security import decode_access_token

from routes import users
from routes import jobs
from routes import stripe_routes
from connections import add_connection, remove_connection

# -----------------------------
# Create FastAPI App
# -----------------------------
app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "traceback": traceback.format_exc()}
    )

# -----------------------------
# Database Dependency
# -----------------------------


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://service-marketplace-17.onrender.com",
        "http://service-marketplace-17.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Reset & Create Tables
# -----------------------------
if AUTO_CREATE_TABLES:
    Base.metadata.create_all(bind=engine)

@app.on_event("startup")
def run_migrations():
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db.execute(text('ALTER TABLE users ADD COLUMN stripe_account_id VARCHAR DEFAULT \'\''))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE jobs ADD COLUMN category VARCHAR DEFAULT \'\''))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE jobs ADD COLUMN service_date VARCHAR DEFAULT \'\''))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE jobs ADD COLUMN service_window VARCHAR DEFAULT \'\''))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE notifications ADD COLUMN message VARCHAR DEFAULT \'\''))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE notifications ADD COLUMN location VARCHAR DEFAULT \'\''))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE chat_messages ADD COLUMN image_url VARCHAR DEFAULT \'\''))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE payments ADD COLUMN worker_id INTEGER DEFAULT 0'))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE payments ADD COLUMN platform_fee INTEGER DEFAULT 0'))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE payments ADD COLUMN worker_amount INTEGER DEFAULT 0'))
        db.commit()
    except Exception:
        db.rollback()

    try:
        db.execute(text('ALTER TABLE payments ADD COLUMN stripe_payment_intent_id VARCHAR DEFAULT \'\''))
        db.commit()
    except Exception:
        db.rollback()
    
    finally:
        db.close()

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# -----------------------------
# Include Routers
# -----------------------------
app.include_router(users.router)
app.include_router(jobs.router, prefix="/jobs")
app.include_router(stripe_routes.router, prefix="/stripe")

# -----------------------------
# Root Endpoint
# -----------------------------


@app.post("/upload-chat-image")
async def upload_chat_image(
    file: UploadFile,
    current_user: User = Depends(get_current_user)
):
    from storage import store_image
    url = await store_image(file, folder="chat", file_prefix="chat")
    return {"image_url": url}

@app.get("/")
def home():
    return {
        "message": "Service Marketplace backend version 2 is running",
        "schema_mode": "auto-create" if AUTO_CREATE_TABLES else "migrations",
    }

# -----------------------------
# Debug Endpoint
# -----------------------------


@app.get("/debug")
def debug(db: Session = Depends(get_db)):
    try:
        jobs = db.query(Job).all()
        return {"status": "ok", "job_count": len(jobs)}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# -----------------------------
# WebSocket Endpoint
# -----------------------------


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token", "").strip()
    if not token:
        await websocket.close(code=4401)
        return

    try:
        payload = decode_access_token(token)
        user_id = int(payload["user_id"])
    except Exception:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    add_connection(user_id, websocket)
    print("WebSocket connected", user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print("WebSocket error:", e)
    finally:
        remove_connection(user_id, websocket)
        print("WebSocket disconnected", user_id)

# -----------------------------
# Transactions
# -----------------------------


@app.get("/transactions")
def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payments_query = db.query(Payment)
    if current_user.role == "customer":
        payments_query = payments_query.filter(Payment.customer_id == current_user.id)
    elif current_user.role == "worker":
        payments_query = payments_query.filter(Payment.worker_id == current_user.id)

    payments = payments_query.all()
    result = []
    for p in payments:
        job = db.query(Job).filter(Job.id == p.job_id).first()
        result.append({
            "payment_id": p.id,
            "job_id": p.job_id,
            "job_title": job.title if job else "Unknown",
            "customer_id": p.customer_id,
            "worker_id": p.worker_id,
            "total_amount": p.amount,
            "worker_received": p.worker_amount,
            "platform_fee": p.platform_fee,
        })
    return result

# -----------------------------
# Worker Earnings
# -----------------------------


@app.get("/worker-earnings")
def worker_earnings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    jobs = db.query(Job).filter(
        Job.worker_id == current_user.id,
        Job.status == "COMPLETED"
    ).all()
    payments = db.query(Payment).filter(Payment.worker_id == current_user.id).all()
    total = sum(p.worker_amount for p in payments if p.worker_amount)
    return {"completed_jobs": len(jobs), "total_earnings": total}

