from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, SessionLocal
from models import Base, Job

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
Base.metadata.drop_all(bind=engine)
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
    return {"message": "NEW VERSION WORKING"}

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
# Complete Job
# -----------------------------


@app.post("/jobs/{job_id}/complete")
def complete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "COMPLETED"
    db.commit()
    db.refresh(job)
    return {"message": "Job completed", "job_id": job.id, "status": job.status}

# -----------------------------
# Pay for Job
# -----------------------------


@app.post("/jobs/{job_id}/pay")
def pay_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Job not completed")
    job.paid = True
    db.commit()
    db.refresh(job)
    return {"message": "Payment successful", "job_id": job.id, "paid": job.paid}

# -----------------------------
# Transactions
# -----------------------------


@app.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    from models import Payment
    payments = db.query(Payment).all()
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
# Worker Jobs
# -----------------------------


@app.get("/worker-jobs")
def worker_jobs(worker_id: int, db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.worker_id == worker_id).all()
    return jobs

# -----------------------------
# Worker Earnings
# -----------------------------


@app.get("/worker-earnings")
def worker_earnings(worker_id: int, db: Session = Depends(get_db)):
    from models import Payment
    jobs = db.query(Job).filter(
        Job.worker_id == worker_id,
        Job.status == "COMPLETED"
    ).all()
    payments = db.query(Payment).filter(Payment.worker_id == worker_id).all()
    total = sum(p.worker_amount for p in payments if p.worker_amount)
    return {"completed_jobs": len(jobs), "total_earnings": total}

# -----------------------------
# Rate Worker
# -----------------------------


@app.post("/jobs/{job_id}/rate")
def rate_worker(job_id: int, rating: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Job not completed")
    if not job.paid:
        raise HTTPException(status_code=400, detail="Job not paid")
    if rating < 1 or rating > 5:
        raise HTTPException(
            status_code=400, detail="Rating must be between 1 and 5")
    job.rating = rating
    db.commit()
    db.refresh(job)
    return {"message": "Worker rated successfully", "job_id": job.id, "rating": job.rating}
