from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

from auth import get_current_user, require_role
from database import SessionLocal
from models import Job, Rating, Notification, Payment, ChatMessage, User, UserProfile
from connections import active_connections
from notification_service import send_email_notification, send_sms_notification
from storage import store_image, validate_image_extension

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
    image_url: str | None = None
    category: str = ""
    service_date: str = ""
    service_window: str = ""


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


def create_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "general",
    action_url: str = "",
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        action_url=action_url,
        location="",
        is_read=0,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
async def push_notification(user_id: int, payload: dict):
    for connection in list(active_connections.get(user_id, set())):
        try:
            await connection.send_text(json.dumps(payload))
        except Exception:
            pass


def notify_user_channels(user: User, *, subject: str, body: str, sms_message: str):
    send_email_notification(user.email, subject, body)
    send_sms_notification(user.phone, sms_message)


@router.post("/complete-job")
async def complete_job(
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
    customer = db.query(User).filter(User.id == job.customer_id).first()

    notification = create_notification(
        db,
        user_id=job.customer_id,
        title="Job completed",
        message=f"{job.title} has been marked completed by the worker.",
        notification_type="job_completed",
        action_url="/customer-dashboard",
    )
    await push_notification(
        job.customer_id,
        {
            "type": "notification",
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "action_url": notification.action_url,
        },
    )
    if customer:
        notify_user_channels(
            customer,
            subject="Job completed",
            body=f"{job.title} has been marked completed by the worker.",
            sms_message=f"Job completed: {job.title}",
        )

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
        customer_id=current_user.id,
        image_url=(payload.image_url or "").strip(),
        category=payload.category.strip(),
        service_date=payload.service_date.strip(),
        service_window=payload.service_window.strip(),
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    workers = db.query(User).filter(User.role == "worker", User.is_active == True).all()  # noqa: E712
    for worker in workers:
        stored_notification = create_notification(
            db,
            user_id=worker.id,
            title="New job available",
            message=f"{new_job.title} is open in {new_job.location} for ${new_job.price}.",
            notification_type="new_job",
            action_url="/home",
        )
        await push_notification(
            worker.id,
            {
                "type": "notification",
                "id": stored_notification.id,
                "title": stored_notification.title,
                "message": stored_notification.message,
                "notification_type": stored_notification.notification_type,
                "action_url": stored_notification.action_url,
            },
        )
        notify_user_channels(
            worker,
            subject="New job available",
            body=f"{new_job.title} is open in {new_job.location} for ${new_job.price}.",
            sms_message=f"New job: {new_job.title} in {new_job.location}",
        )

    notification = {
        "type": "new_job",
        "title": new_job.title,
        "location": new_job.location,
        "price": new_job.price
    }

    for user_connections in active_connections.values():
        for connection in list(user_connections):
            try:
                await connection.send_text(json.dumps(notification))
            except Exception:
                pass

    return {
        "message": "Job created",
        "job_id": new_job.id
    }


# -------------------------
# Accept Job
# -------------------------
@router.post("/accept-job")
async def accept_job(
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
    customer = db.query(User).filter(User.id == job.customer_id).first()

    notification = create_notification(
        db,
        user_id=job.customer_id,
        title="Job accepted",
        message=f"{job.title} has been accepted by a worker.",
        notification_type="job_accepted",
        action_url="/customer-dashboard",
    )
    await push_notification(
        job.customer_id,
        {
            "type": "notification",
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "action_url": notification.action_url,
        },
    )
    if customer:
        notify_user_channels(
            customer,
            subject="Job accepted",
            body=f"{job.title} has been accepted by a worker.",
            sms_message=f"Job accepted: {job.title}",
        )

    return {
        "message": "Job accepted successfully",
        "job_status": job.status,
        "worker_id": job.worker_id,
        "notification_id": notification.id,
    }


# -------------------------
# Available Jobs
# -------------------------
@router.get("/available-jobs")
def get_available_jobs(
    search: str | None = Query(default=None),
    location: str | None = Query(default=None),
    category: str | None = Query(default=None),
    service_date: str | None = Query(default=None),
    min_price: int | None = Query(default=None),
    max_price: int | None = Query(default=None),
    sort_by: str | None = Query(default="newest"),
    db: Session = Depends(get_db),
):

    jobs_query = db.query(Job).filter(Job.status == "OPEN")

    if search:
        search_term = f"%{search.strip()}%"
        jobs_query = jobs_query.filter(
            (Job.title.ilike(search_term)) | (Job.description.ilike(search_term))
        )
    if location:
        jobs_query = jobs_query.filter(Job.location.ilike(f"%{location.strip()}%"))
    if category:
        jobs_query = jobs_query.filter(Job.category.ilike(f"%{category.strip()}%"))
    if service_date:
        jobs_query = jobs_query.filter(Job.service_date == service_date.strip())
    if min_price is not None:
        jobs_query = jobs_query.filter(Job.price >= min_price)
    if max_price is not None:
        jobs_query = jobs_query.filter(Job.price <= max_price)

    if sort_by == "price_low":
        jobs_query = jobs_query.order_by(Job.price.asc(), Job.id.desc())
    elif sort_by == "price_high":
        jobs_query = jobs_query.order_by(Job.price.desc(), Job.id.desc())
    elif sort_by == "location":
        jobs_query = jobs_query.order_by(Job.location.asc(), Job.id.desc())
    elif sort_by == "service_date":
        jobs_query = jobs_query.order_by(Job.service_date.asc(), Job.id.desc())
    elif sort_by == "category":
        jobs_query = jobs_query.order_by(Job.category.asc(), Job.id.desc())
    else:
        jobs_query = jobs_query.order_by(Job.id.desc())

    jobs = jobs_query.all()

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

    notification = create_notification(
        db,
        user_id=job.worker_id,
        title="New rating received",
        message=f"You received a {payload.rating}/5 rating for {job.title}.",
        notification_type="rating",
        action_url="/dashboard",
    )

    return {
        "message": "Worker rated successfully",
        "rating_id": new_rating.id,
        "rating": job.rating,
        "notification_id": notification.id,
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
async def send_message(
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

    notification = create_notification(
        db,
        user_id=payload.receiver_id,
        title="New chat message",
        message=f"You have a new message about {job.title}.",
        notification_type="chat_message",
        action_url=f"/chat?job_id={payload.job_id}&receiver_id={current_user.id}",
    )

    chat_notification = {
        "type": "chat_message",
        "job_id": payload.job_id,
        "sender_id": current_user.id,
        "receiver_id": payload.receiver_id,
        "message": chat.message,
        "id": chat.id,
    }

    for connection in list(active_connections.get(payload.receiver_id, set())):
        try:
            await connection.send_text(json.dumps(chat_notification))
        except Exception:
            pass

    for connection in list(active_connections.get(current_user.id, set())):
        try:
            await connection.send_text(json.dumps(chat_notification))
        except Exception:
            pass

    receiver = db.query(User).filter(User.id == payload.receiver_id).first()
    if receiver:
        notify_user_channels(
            receiver,
            subject="New chat message",
            body=f"You have a new message about {job.title}.",
            sms_message=f"New message about {job.title}",
        )

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
@router.get("/notifications/me")
def get_notifications(
    unread_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications_query = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )
    if unread_only:
        notifications_query = notifications_query.filter(Notification.is_read == 0)
    notifications = notifications_query.order_by(Notification.id.desc()).all()
    return notifications


@router.get("/notifications/summary")
def get_notification_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unread_count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == 0,
    ).scalar() or 0
    return {"unread_count": unread_count}


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = 1
    db.commit()
    return {"message": "Notification marked as read"}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == 0,
    ).update({"is_read": 1})
    db.commit()
    return {"message": "All notifications marked as read"}


# -------------------------
# Payment
# -------------------------
@router.post("/pay")
async def make_payment(
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
    worker = db.query(User).filter(User.id == job.worker_id).first()

    notification = create_notification(
        db,
        user_id=job.worker_id,
        title="Payment received",
        message=f"Payment for {job.title} has been completed.",
        notification_type="payment",
        action_url="/dashboard",
    )
    await push_notification(
        job.worker_id,
        {
            "type": "notification",
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "action_url": notification.action_url,
        },
    )
    if worker:
        notify_user_channels(
            worker,
            subject="Payment received",
            body=f"Payment for {job.title} has been completed.",
            sms_message=f"Payment received for {job.title}",
        )

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


@router.post("/{job_id}/image")
async def upload_job_image(
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("customer")),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Job image is required")

    validate_image_extension(file.filename, label="Job image")
    job.image_url = await store_image(
        file,
        folder="jobs",
        file_prefix=f"job-{job.id}",
    )
    db.commit()
    db.refresh(job)

    return {"message": "Job image uploaded successfully", "image_url": job.image_url}


@router.get("/admin/summary")
def admin_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_jobs = db.query(func.count(Job.id)).scalar() or 0
    open_jobs = db.query(func.count(Job.id)).filter(Job.status == "OPEN").scalar() or 0
    accepted_jobs = db.query(func.count(Job.id)).filter(Job.status == "ACCEPTED").scalar() or 0
    completed_jobs = db.query(func.count(Job.id)).filter(Job.status == "COMPLETED").scalar() or 0
    cancelled_jobs = db.query(func.count(Job.id)).filter(Job.status == "CANCELLED").scalar() or 0
    platform_revenue = db.query(func.sum(Payment.platform_fee)).scalar() or 0
    total_payments = db.query(func.sum(Payment.amount)).scalar() or 0

    users = db.query(User).all()
    workers = [user for user in users if user.role == "worker"]
    profiles = {
        profile.user_id: profile
        for profile in db.query(UserProfile).filter(
            UserProfile.user_id.in_([worker.id for worker in workers] or [0])
        ).all()
    }

    top_workers = []
    for worker in workers:
        avg_rating = db.query(func.avg(Rating.rating)).filter(Rating.worker_id == worker.id).scalar() or 0
        completed_count = db.query(func.count(Job.id)).filter(
            Job.worker_id == worker.id,
            Job.status == "COMPLETED",
        ).scalar() or 0
        worker_payments = db.query(func.sum(Payment.worker_amount)).filter(
            Payment.worker_id == worker.id
        ).scalar() or 0
        profile = profiles.get(worker.id)
        top_workers.append({
            "id": worker.id,
            "name": worker.name,
            "email": worker.email,
            "city": profile.city if profile else "",
            "skills": profile.skills if profile else "",
            "hourly_rate": profile.hourly_rate if profile else None,
            "average_rating": round(avg_rating, 2),
            "completed_jobs": completed_count,
            "total_earnings": worker_payments,
            "service_area": profile.service_area if profile else "",
        })

    top_workers.sort(
        key=lambda worker: (
            worker["completed_jobs"],
            worker["average_rating"],
            worker["total_earnings"],
        ),
        reverse=True,
    )

    recent_jobs = db.query(Job).order_by(Job.id.desc()).limit(8).all()

    return {
        "summary": {
            "total_users": total_users,
            "total_jobs": total_jobs,
            "open_jobs": open_jobs,
            "accepted_jobs": accepted_jobs,
            "completed_jobs": completed_jobs,
            "cancelled_jobs": cancelled_jobs,
            "platform_revenue": platform_revenue,
            "total_payments": total_payments,
            "customers": len([user for user in users if user.role == "customer"]),
            "workers": len(workers),
            "admins": len([user for user in users if user.role == "admin"]),
        },
        "top_workers": top_workers[:5],
        "recent_jobs": [
            {
                "id": job.id,
                "title": job.title,
                "status": job.status,
                "price": job.price,
                "location": job.location,
                "category": job.category,
                "service_date": job.service_date,
                "customer_id": job.customer_id,
                "worker_id": job.worker_id,
            }
            for job in recent_jobs
        ],
        "status_breakdown": [
            {"label": "Open", "value": open_jobs},
            {"label": "Accepted", "value": accepted_jobs},
            {"label": "Completed", "value": completed_jobs},
            {"label": "Cancelled", "value": cancelled_jobs},
        ],
        "revenue_breakdown": [
            {"label": "Platform Revenue", "value": platform_revenue},
            {"label": "Worker Payouts", "value": max(total_payments - platform_revenue, 0)},
        ],
    }
