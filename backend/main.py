from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from auth import get_current_user, require_role
from database import engine, SessionLocal
from models import Base, Job, Payment, User

from routes import users
from routes import jobs
from connections import active_connections

# -----------------------------
# Create FastAPI App
# -----------------------------
app = FastAPI()

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Reset & Create Tables
# -----------------------------
Base.metadata.create_all(bind=engine)

# -----------------------------
# Include Routers
# -----------------------------
app.include_router(users.router)
app.include_router(jobs.router, prefix="/jobs")

# -----------------------------
# Root Endpoint
# -----------------------------


@app.get("/")
def home():
    return {"message": "Service Marketplace backend version 2 is running"}

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
    await websocket.accept()
    active_connections.append(websocket)
    print("WebSocket connected")
    try:
        while True:
            await websocket.receive_text()
    except Exception as e:
        print("WebSocket error:", e)
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        print("WebSocket disconnected")

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

