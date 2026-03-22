from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

from database import SessionLocal
from models import Job, JobAcceptance, Rating, Notification, Payment, ChatMessage, User, Availability
from connections import active_connections

router = APIRouter()


# -------------------------
# Database Dependency
# -------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/complete-job")
def complete_job(job_id: int, db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        return {"message": "Job not found"}

    job.status = "COMPLETED"

    db.commit()

    return {
        "message": "Job completed successfully",
        "job_id": job.id
    }


# -------------------------
# Create Job + WebSocket Notification
# -------------------------
@router.post("/create-job")
async def create_job(
    title: str,
    description: str,
    location: str,
    price: str,
    customer_id: int,
    db: Session = Depends(get_db)
):

    new_job = Job(
        title=title,
        description=description,
        location=location,
        price=price,
        customer_id=customer_id
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    notification = {
        "type": "new_job",
        "title": title,
        "location": location,
        "price": price
    }

    for connection in active_connections:
        await connection.send_text(json.dumps(notification))

    return {
        "message": "Job created",
        "job_id": new_job.id
    }


# -------------------------
# Accept Job
# -------------------------
@router.post("/accept-job")
def accept_job(job_id: int, worker_id: int, db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.worker_id = worker_id
    job.status = "ACCEPTED"

    db.commit()
    db.refresh(job)

    return {
        "message": "Job accepted successfully",
        "job_status": job.status,
        "worker_id": job.worker_id
    }


# -------------------------
# Update Job Status
# -------------------------
@router.post("/update-job-status")
def update_job_status(job_id: int, status: str, db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = status

    db.commit()
    db.refresh(job)

    return {
        "message": "Job status updated",
        "new_status": job.status
    }


# -------------------------
# Get All Jobs
# -------------------------
@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(Job).all()


# -------------------------
# Available Jobs
# -------------------------
@router.get("/available-jobs")
def get_available_jobs(db: Session = Depends(get_db)):

    jobs = db.query(Job).filter(Job.status == "OPEN").all()

    return jobs


# -------------------------
# Worker Jobs
# -------------------------
@router.get("/worker-jobs/{worker_id}")
def get_worker_jobs(worker_id: int, db: Session = Depends(get_db)):

    jobs = db.query(Job).filter(Job.worker_id == worker_id).all()

    return jobs


# -------------------------
# Customer Jobs
# -------------------------
@router.get("/customer-jobs/{customer_id}")
def get_customer_jobs(customer_id: int, db: Session = Depends(get_db)):

    jobs = db.query(Job).filter(Job.customer_id == customer_id).all()

    return jobs


# -------------------------
# Rate Worker
# -------------------------
@router.post("/rate-worker")
def rate_worker(worker_id: int, rating: int, review: str, db: Session = Depends(get_db)):

    new_rating = Rating(
        worker_id=worker_id,
        rating=rating,
        review=review
    )

    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)

    return {
        "message": "Worker rated successfully",
        "rating_id": new_rating.id
    }


# -------------------------
# Worker Rating
# -------------------------
@router.get("/worker-rating/{worker_id}")
def get_worker_rating(worker_id: int, db: Session = Depends(get_db)):

    avg_rating = db.query(func.avg(Rating.rating)).filter(
        Rating.worker_id == worker_id
    ).scalar()

    if avg_rating is None:
        avg_rating = 0

    return {
        "worker_id": worker_id,
        "average_rating": round(avg_rating, 2)
    }


# -------------------------
# Send Chat Message
# -------------------------
@router.post("/send-message")
def send_message(job_id: int, sender_id: int, receiver_id: int, message: str, db: Session = Depends(get_db)):

    chat = ChatMessage(
        job_id=job_id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        message=message
    )

    db.add(chat)
    db.commit()
    db.refresh(chat)

    return {
        "message": "Message sent",
        "chat_id": chat.id
    }


# -------------------------
# Get Chat
# -------------------------
@router.get("/chat/{job_id}")
def get_chat(job_id: int, db: Session = Depends(get_db)):

    messages = db.query(ChatMessage).filter(
        ChatMessage.job_id == job_id
    ).all()

    return messages


# -------------------------
# Notifications
# -------------------------
@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db)):

    return db.query(Notification).all()


# -------------------------
# Payment
# -------------------------
@router.post("/pay")
def make_payment(job_id: int, customer_id: int, worker_id: int, amount: int, db: Session = Depends(get_db)):

    platform_fee = int(amount * 0.10)
    worker_amount = amount - platform_fee

    payment = Payment(
        job_id=job_id,
        customer_id=customer_id,
        worker_id=worker_id,
        amount=amount,
        platform_fee=platform_fee,
        worker_amount=worker_amount,
        status="completed"
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return {
        "message": "Payment successful",
        "payment_id": payment.id,
        "platform_fee": platform_fee,
        "worker_received": worker_amount
    }
# -------------------------
# Cancel Job
# -------------------------


@router.post("/cancel-job")
def cancel_job(job_id: int, customer_id: int, db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.customer_id != customer_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to cancel this job")

    if job.status == "COMPLETED":
        raise HTTPException(
            status_code=400, detail="Cannot cancel a completed job")

    job.status = "CANCELLED"
    job.worker_id = None

    db.commit()

    return {
        "message": "Job cancelled successfully",
        "job_id": job.id
    }

# -------------------------
# Platform Analytics
# -------------------------


@router.get("/platform-summary")
def platform_summary(db: Session = Depends(get_db)):

    total_users = db.query(func.count(User.id)).scalar()
    total_jobs = db.query(func.count(Job.id)).scalar()

    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.status == "completed"
    ).scalar()

    revenue = db.query(func.sum(Payment.platform_fee)).scalar()

    if revenue is None:
        revenue = 0

    return {
        "total_users": total_users,
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "platform_revenue": revenue
    }
