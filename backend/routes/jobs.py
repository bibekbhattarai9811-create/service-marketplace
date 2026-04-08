from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

from auth import get_current_user, require_role
from database import SessionLocal
from models import Job, Rating, Notification, Payment, ChatMessage, User
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


class CreateJobRequest(BaseModel):
    title: str
    description: str
    location: str
    price: int


class PaymentRequest(BaseModel):
    job_id: int


class RatingRequest(BaseModel):
    job_id: int
    rating: int
    review: str


class ChatMessageRequest(BaseModel):
    job_id: int
    receiver_id: int
    message: str


@router.post("/complete-job")
def complete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to complete this job")

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
    payload: CreateJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):

    new_job = Job(
        title=payload.title.strip(),
        description=payload.description.strip(),
        location=payload.location.strip(),
        price=payload.price,
        customer_id=current_user.id
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    notification = {
        "type": "new_job",
        "title": new_job.title,
        "location": new_job.location,
        "price": new_job.price
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
def accept_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "OPEN" or job.worker_id is not None:
        raise HTTPException(status_code=400, detail="Job is no longer available")

    job.worker_id = current_user.id
    job.status = "ACCEPTED"

    db.commit()
    db.refresh(job)

    return {
        "message": "Job accepted successfully",
        "job_status": job.status,
        "worker_id": job.worker_id,
    }


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
@router.get("/worker-jobs/me")
def get_worker_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):

    jobs = db.query(Job).filter(Job.worker_id == current_user.id).all()

    return jobs


# -------------------------
# Customer Jobs
# -------------------------
@router.get("/customer-jobs/me")
def get_customer_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):

    jobs = db.query(Job).filter(Job.customer_id == current_user.id).all()

    return jobs


# -------------------------
# Rate Worker
# -------------------------
@router.post("/rate-worker")
def rate_worker(
    payload: RatingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to rate this job")
    if job.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Job not completed")
    if not job.paid:
        raise HTTPException(status_code=400, detail="Job not paid")
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    if job.rating is not None:
        raise HTTPException(status_code=400, detail="Job has already been rated")

    new_rating = Rating(
        worker_id=job.worker_id,
        rating=payload.rating,
        review=payload.review.strip()
    )

    db.add(new_rating)
    job.rating = payload.rating
    db.commit()
    db.refresh(new_rating)

    return {
        "message": "Worker rated successfully",
        "rating_id": new_rating.id,
        "rating": job.rating,
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
def send_message(
    payload: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    allowed_ids = {job.customer_id, job.worker_id}
    if current_user.id not in allowed_ids or payload.receiver_id not in allowed_ids:
        raise HTTPException(status_code=403, detail="Not authorized to chat on this job")

    chat = ChatMessage(
        job_id=payload.job_id,
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        message=payload.message.strip()
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
def get_chat(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.id not in {job.customer_id, job.worker_id}:
        raise HTTPException(status_code=403, detail="Not authorized to view this chat")

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
def make_payment(
    payload: PaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this job")
    if job.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Job must be completed before payment")
    if not job.worker_id:
        raise HTTPException(status_code=400, detail="Job has no assigned worker")
    if job.paid:
        raise HTTPException(status_code=400, detail="Job has already been paid")
    existing_payment = db.query(Payment).filter(Payment.job_id == job.id).first()
    if existing_payment:
        job.paid = True
        db.commit()
        raise HTTPException(status_code=400, detail="Job already has a payment record")

    amount = int(job.price)

    platform_fee = int(amount * 0.10)
    worker_amount = amount - platform_fee

    payment = Payment(
        job_id=job.id,
        customer_id=current_user.id,
        worker_id=job.worker_id,
        amount=amount,
        platform_fee=platform_fee,
        worker_amount=worker_amount,
        status="completed"
    )

    db.add(payment)
    job.paid = True
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
def cancel_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.customer_id != current_user.id:
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
        Job.status == "COMPLETED"
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
