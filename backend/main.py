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
# Active WebSocket Connections
# -----------------------------


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
# Create Tables
# -----------------------------
Base.metadata.create_all(bind=engine)

# -----------------------------
# Include Routers
# -----------------------------
app.include_router(users.router)
app.include_router(jobs.router)

# -----------------------------
# Root Endpoint
# -----------------------------


@app.get("/")
def home():
    return {"message": "Service Marketplace API is running"}

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
            # keep connection alive
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


@app.post("/complete-job")
def complete_job(job_id: int, db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "completed"
    db.commit()

    return {"message": "Job completed successfully"}

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

    jobs = db.query(Job).filter(
        Job.worker_id == worker_id,
        Job.status == "completed"
    ).all()

    total = sum(int(job.price) for job in jobs if job.price)

    return {
        "completed_jobs": len(jobs),
        "total_earnings": total
    }
