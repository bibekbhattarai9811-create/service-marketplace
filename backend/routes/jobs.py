from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Job, JobAcceptance, Rating, Notification, Payment, ChatMessage, User, Availability
from connections import active_connections
from sqlalchemy import func
router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/create-job")
async def create_job(title: str, description: str, location: str, price: str, customer_id: int, db: Session = Depends(get_db)):

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

    message = f"New job posted: {title} in {location}"

    for connection in active_connections:
        await connection.send_text(message)

    return {
        "message": "Job created",
        "job_id": new_job.id
    }


@router.post("/accept-job")
def accept_job(job_id: int, worker_id: int, db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        return {"error": "Job not found"}

    job.status = "ACCEPTED"

    acceptance = JobAcceptance(
        job_id=job_id,
        worker_id=worker_id
    )

    db.add(acceptance)
    db.commit()
    db.refresh(job)

    return {
        "message": "Job accepted successfully",
        "job_status": job.status
    }


@router.post("/update-job-status")
def update_job_status(job_id: int, status: str, db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        return {"error": "Job not found"}

    job.status = status

    db.commit()
    db.refresh(job)

    return {
        "message": "Job status updated",
        "new_status": job.status
    }


@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).all()

    return jobs


@router.get("/available-jobs")
def get_available_jobs(db: Session = Depends(get_db)):

    jobs = db.query(Job).filter(Job.status == "OPEN").all()

    return jobs


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


@router.get("/worker-rating/{worker_id}")
def get_worker_rating(worker_id: int, db: Session = Depends(get_db)):

    avg_rating = db.query(func.avg(Rating.rating)).filter(
        Rating.worker_id == worker_id
    ).scalar()

    if avg_rating is None:
        return {
            "worker_id": worker_id,
            "average_rating": 0,
            "message": "No ratings yet"
        }

    return {
        "worker_id": worker_id,
        "average_rating": round(avg_rating, 2)
    }


@router.get("/jobs-by-location/{location}")
def get_jobs_by_location(location: str, db: Session = Depends(get_db)):

    jobs = db.query(Job).filter(
        Job.location == location,
        Job.status == "OPEN"
    ).all()

    return jobs


@router.get("/worker-jobs/{worker_id}")
def get_worker_jobs(worker_id: int, db: Session = Depends(get_db)):

    jobs = db.query(Job).join(JobAcceptance).filter(
        JobAcceptance.worker_id == worker_id
    ).all()

    return jobs


@router.get("/customer-jobs/{customer_id}")
def get_customer_jobs(customer_id: int, db: Session = Depends(get_db)):

    jobs = db.query(Job).filter(
        Job.customer_id == customer_id
    ).all()

    return jobs


@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db)):

    notifications = db.query(Notification).all()

    return notifications


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


@router.post("/create-escrow")
def create_escrow(job_id: int, customer_id: int, worker_id: int, amount: int, db: Session = Depends(get_db)):

    platform_fee = int(amount * 0.10)
    worker_amount = amount - platform_fee

    escrow = Payment(
        job_id=job_id,
        customer_id=customer_id,
        worker_id=worker_id,
        amount=amount,
        platform_fee=platform_fee,
        worker_amount=worker_amount,
        status="escrow"
    )

    db.add(escrow)
    db.commit()
    db.refresh(escrow)

    return {
        "message": "Payment held in escrow",
        "payment_id": escrow.id,
        "worker_amount": worker_amount
    }


@router.post("/release-payment")
def release_payment(payment_id: int, db: Session = Depends(get_db)):

    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not payment:
        return {"error": "Payment not found"}

    payment.status = "released"

    db.commit()

    return {
        "message": "Payment released to worker",
        "worker_received": payment.worker_amount
    }


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


@router.get("/chat/{job_id}")
def get_chat(job_id: int, db: Session = Depends(get_db)):

    messages = db.query(ChatMessage).filter(
        ChatMessage.job_id == job_id
    ).all()

    return messages


@router.get("/match-workers/{job_id}")
def match_workers(job_id: int, db: Session = Depends(get_db)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        return {"error": "Job not found"}

    workers = db.query(User).filter(User.role == "worker").all()

    worker_scores = []

    for worker in workers:

        avg_rating = db.query(func.avg(Rating.rating)).filter(
            Rating.worker_id == worker.id
        ).scalar()

        if avg_rating is None:
            avg_rating = 0

        score = avg_rating

        worker_scores.append({
            "worker_id": worker.id,
            "name": worker.name,
            "rating": round(avg_rating, 2),
            "score": score
        })

    worker_scores.sort(key=lambda x: x["score"], reverse=True)

    return worker_scores[:5]


@router.post("/set-availability")
def set_availability(worker_id: int, day: str, start_time: str, end_time: str, db: Session = Depends(get_db)):

    availability = Availability(
        worker_id=worker_id,
        day=day,
        start_time=start_time,
        end_time=end_time
    )

    db.add(availability)
    db.commit()
    db.refresh(availability)

    return {
        "message": "Availability saved",
        "availability_id": availability.id
    }


@router.get("/availability/{worker_id}")
def get_availability(worker_id: int, db: Session = Depends(get_db)):

    schedule = db.query(Availability).filter(
        Availability.worker_id == worker_id
    ).all()

    return schedule


@router.get("/admin/users")
def admin_get_users(db: Session = Depends(get_db)):

    users = db.query(User).all()

    return users


@router.get("/admin/jobs")
def admin_get_jobs(db: Session = Depends(get_db)):

    jobs = db.query(Job).all()

    return jobs


@router.get("/admin/payments")
def admin_get_payments(db: Session = Depends(get_db)):

    payments = db.query(Payment).all()

    return payments


@router.post("/admin/ban-user")
def ban_user(user_id: int, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        return {"error": "User not found"}

    user.role = "banned"

    db.commit()

    return {"message": "User banned successfully"}


@router.get("/admin/analytics")
def platform_analytics(db: Session = Depends(get_db)):

    total_users = db.query(func.count(User.id)).scalar()
    total_jobs = db.query(func.count(Job.id)).scalar()
    total_payments = db.query(func.count(Payment.id)).scalar()

    total_revenue = db.query(func.sum(Payment.platform_fee)).scalar()

    if total_revenue is None:
        total_revenue = 0

    return {
        "total_users": total_users,
        "total_jobs": total_jobs,
        "total_payments": total_payments,
        "platform_revenue": total_revenue
    }


@router.get("/admin/top-workers")
def top_workers(db: Session = Depends(get_db)):

    workers = db.query(
        Rating.worker_id,
        func.avg(Rating.rating).label("avg_rating")
    ).group_by(Rating.worker_id).order_by(
        func.avg(Rating.rating).desc()
    ).limit(5).all()

    return workers


@router.get("/admin/suspicious-users")
def suspicious_users(db: Session = Depends(get_db)):

    suspicious = db.query(User).filter(User.role == "banned").all()

    return suspicious


@router.get("/admin/low-rated-workers")
def low_rated_workers(db: Session = Depends(get_db)):

    workers = db.query(
        Rating.worker_id,
        func.avg(Rating.rating).label("avg_rating")
    ).group_by(Rating.worker_id).having(
        func.avg(Rating.rating) < 3
    ).all()

    return workers


@router.get("/platform-summary")
def platform_summary(db: Session = Depends(get_db)):

    total_users = db.query(func.count(User.id)).scalar()

    total_jobs = db.query(func.count(Job.id)).scalar()

    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.status == "completed"
    ).scalar()

    active_jobs = db.query(func.count(Job.id)).filter(
        Job.status == "open"
    ).scalar()

    revenue = db.query(func.sum(Payment.platform_fee)).scalar()

    if revenue is None:
        revenue = 0

    return {
        "total_users": total_users,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "completed_jobs": completed_jobs,
        "platform_revenue": revenue
    }


@router.get("/live-marketplace")
def live_marketplace(db: Session = Depends(get_db)):

    jobs = db.query(Job).filter(Job.status == "open").all()

    return jobs
