import os
import re

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session
from auth import get_current_user, require_role
from database import SessionLocal
from models import Availability, Dispute, Job, Notification, Payment, Rating, User, UserProfile
from notification_service import send_email_notification, send_sms_notification
from security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
    verify_password,
)
from storage import store_image, validate_image_extension

router = APIRouter()
EMAIL_RE = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.IGNORECASE)
PASSWORD_RE = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    role: str
    password: str
    admin_secret: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirmRequest(BaseModel):
    token: str
    password: str


class ProfileUpdateRequest(BaseModel):
    name: str = ""
    phone: str = ""
    bio: str = ""
    city: str = ""
    skills: str = ""
    hourly_rate: int | None = None
    service_area: str = ""
    portfolio: str = ""


class AdminUserUpdateRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None


class AvailabilitySlotRequest(BaseModel):
    day: str
    start_time: str
    end_time: str


def validate_email_address(email: str) -> str:
    cleaned_email = email.strip().lower()
    if not EMAIL_RE.match(cleaned_email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    return cleaned_email


def validate_password_strength(password: str):
    if not PASSWORD_RE.match(password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters and include uppercase, lowercase, and a number",
        )


def get_table_columns(db: Session, table_name: str) -> set[str]:
    try:
        return {column["name"] for column in inspect(db.bind).get_columns(table_name)}
    except Exception:
        return set()


def scalar_count(db: Session, sql: str, params: dict | None = None) -> int:
    return int(db.execute(text(sql), params or {}).scalar() or 0)


# Register user
@router.post("/register")
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = validate_email_address(payload.email)
    role = payload.role.strip().lower()
    name = payload.name.strip()
    phone = payload.phone.strip()
    password = payload.password

    if role not in {"customer", "worker", "admin"}:
        raise HTTPException(status_code=400, detail="Role must be customer, worker, or admin")

    if role == "admin":
        expected_secret = os.getenv("SERVICE_MARKETPLACE_ADMIN_SIGNUP_SECRET", "").strip()
        if not expected_secret or payload.admin_secret != expected_secret:
            raise HTTPException(status_code=403, detail="Admin registration is restricted")

    validate_password_strength(password)

    new_user = User(
        name=name,
        email=email,
        phone=phone,
        role=role,
        password=hash_password(password),
        is_active=True,
    )

    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email is already registered")
    db.refresh(new_user)

    db.add(UserProfile(user_id=new_user.id))
    db.commit()

    return {
        "message": "User registered successfully",
        "user_id": new_user.id
    }


# Login user
@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = validate_email_address(payload.email)
    password = payload.password

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account is inactive")

    # Upgrade legacy plain-text passwords on the next successful login.
    if not user.password.startswith("pbkdf2_sha256$"):
        user.password = hash_password(password)
        db.commit()

    return {
        "message": "Login successful",
        "user_id": user.id,
        "role": user.role,
        "token": create_access_token(user.id, user.role),
    }


@router.get("/users")
def get_users():
    return {"users": []}


@router.post("/password-reset/request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    email = validate_email_address(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "If that account exists, a reset link has been sent."}

    token = create_password_reset_token(user.id, user.email)
    reset_link = os.getenv(
        "SERVICE_MARKETPLACE_PASSWORD_RESET_URL",
        "http://127.0.0.1:3000/reset-password",
    )
    # Render env values can accidentally include line breaks when pasted in manually.
    reset_link = re.sub(r"\s+", "", reset_link).rstrip("/")
    reset_url = f"{reset_link}?token={token}"
    body = (
        f"Hello {user.name},\n\n"
        f"Use this link to reset your password:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    email_sent = send_email_notification(user.email, "Reset your Service Marketplace password", body)
    sms_sent = send_sms_notification(user.phone, f"Reset your password: {reset_url}")

    response = {"message": "If that account exists, a reset link has been sent."}
    if not email_sent and not sms_sent:
        response["reset_token"] = token
        response["reset_url"] = reset_url
    return response


@router.post("/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    validate_password_strength(payload.password)

    token_payload = decode_password_reset_token(payload.token)
    user = db.query(User).filter(
        User.id == token_payload["user_id"],
        User.email == token_payload["email"],
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = hash_password(payload.password)
    db.commit()
    return {"message": "Password reset successful"}


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    completed_jobs = 0
    active_jobs = 0
    average_rating = 0
    review_count = 0
    total_earnings = 0

    if current_user.role == "worker":
        completed_jobs = db.query(func.count(Job.id)).filter(
            Job.worker_id == current_user.id,
            Job.status == "COMPLETED",
        ).scalar() or 0
        active_jobs = db.query(func.count(Job.id)).filter(
            Job.worker_id == current_user.id,
            Job.status.in_(["ACCEPTED", "IN_PROGRESS"]),
        ).scalar() or 0
        average_rating = db.query(func.avg(Rating.rating)).filter(
            Rating.worker_id == current_user.id
        ).scalar() or 0
        review_count = db.query(func.count(Rating.id)).filter(
            Rating.worker_id == current_user.id
        ).scalar() or 0
        total_earnings = db.query(func.sum(Payment.worker_amount)).filter(
            Payment.worker_id == current_user.id
        ).scalar() or 0
    elif current_user.role == "customer":
        completed_jobs = db.query(func.count(Job.id)).filter(
            Job.customer_id == current_user.id,
            Job.status == "COMPLETED",
        ).scalar() or 0
        active_jobs = db.query(func.count(Job.id)).filter(
            Job.customer_id == current_user.id,
            Job.status.in_(["OPEN", "OFFERED", "ACCEPTED", "IN_PROGRESS"]),
        ).scalar() or 0

    disputes_count = db.query(func.count(Dispute.id)).filter(
        (Dispute.reporter_id == current_user.id) | (Dispute.target_user_id == current_user.id)
    ).scalar() or 0
    unread_notifications = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == 0,
    ).scalar() or 0
    availability_count = db.query(func.count(Availability.id)).filter(
        Availability.worker_id == current_user.id
    ).scalar() or 0

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "stripe_account_id": current_user.stripe_account_id or "",
        "id_verified": getattr(current_user, "id_verified", False),
        "bio": profile.bio or "",
        "city": profile.city or "",
        "skills": profile.skills or "",
        "hourly_rate": profile.hourly_rate,
        "avatar_url": profile.avatar_url or "",
        "service_area": profile.service_area or "",
        "portfolio": profile.portfolio or "",
        "stats": {
            "completed_jobs": completed_jobs,
            "active_jobs": active_jobs,
            "average_rating": round(average_rating, 2),
            "review_count": review_count,
            "total_earnings": total_earnings,
            "disputes_count": disputes_count,
            "unread_notifications": unread_notifications,
            "availability_count": availability_count,
        },
    }


@router.get("/workers")
def list_public_workers(
    search: str | None = Query(default=None),
    city: str | None = Query(default=None),
    min_rating: float | None = Query(default=None),
    sort_by: str | None = Query(default="top_rated"),
    db: Session = Depends(get_db),
):
    user_columns = get_table_columns(db, "users")
    profile_columns = get_table_columns(db, "user_profiles")
    has_availability_table = bool(get_table_columns(db, "availability"))

    worker_select = ["id", "name", "role"]
    if "id_verified" in user_columns:
        worker_select.append("id_verified")
    if "is_active" in user_columns:
        worker_select.append("is_active")

    worker_sql = f"SELECT {', '.join(worker_select)} FROM users WHERE role = :role"
    if "is_active" in user_columns:
        worker_sql += " AND COALESCE(is_active, TRUE) = TRUE"

    workers = db.execute(text(worker_sql), {"role": "worker"}).mappings().all()
    worker_ids = [worker["id"] for worker in workers] or [0]

    profiles = {}
    if profile_columns:
        profile_select = ["user_id"]
        for optional_column in ["city", "service_area", "skills", "portfolio", "hourly_rate", "avatar_url"]:
            if optional_column in profile_columns:
                profile_select.append(optional_column)
        profile_rows = db.execute(
            text(f"SELECT {', '.join(profile_select)} FROM user_profiles"),
        ).mappings().all()
        profiles = {profile["user_id"]: profile for profile in profile_rows}

    result = []
    for worker in workers:
        worker_id = worker["id"]
        profile = profiles.get(worker_id, {})
        average_rating = db.query(func.avg(Rating.rating)).filter(Rating.worker_id == worker_id).scalar() or 0
        review_count = db.query(func.count(Rating.id)).filter(Rating.worker_id == worker_id).scalar() or 0
        completed_jobs = db.query(func.count(Job.id)).filter(
            Job.worker_id == worker_id,
            Job.status == "COMPLETED",
        ).scalar() or 0
        availability_count = 0
        if has_availability_table:
            availability_count = scalar_count(
                db,
                "SELECT COUNT(id) FROM availability WHERE worker_id = :worker_id",
                {"worker_id": worker_id},
            )
        result.append({
            "id": worker_id,
            "name": worker.get("name", ""),
            "city": profile.get("city", ""),
            "service_area": profile.get("service_area", ""),
            "skills": profile.get("skills", ""),
            "portfolio": profile.get("portfolio", ""),
            "hourly_rate": profile.get("hourly_rate"),
            "avatar_url": profile.get("avatar_url", ""),
            "average_rating": round(average_rating, 2),
            "review_count": review_count,
            "id_verified": bool(worker.get("id_verified", False)),
            "completed_jobs": completed_jobs,
            "availability_count": availability_count,
        })

    search_term = (search or "").strip().lower()
    city_term = (city or "").strip().lower()
    filtered = []
    for worker in result:
        text = " ".join(
            [
                worker["name"],
                worker["city"],
                worker["service_area"],
                worker["skills"],
                worker["portfolio"],
            ]
        ).lower()
        if search_term and search_term not in text:
            continue
        if city_term and city_term not in f'{worker["city"]} {worker["service_area"]}'.lower():
            continue
        if min_rating is not None and worker["average_rating"] < min_rating:
            continue
        filtered.append(worker)

    if sort_by == "reviews":
        filtered.sort(key=lambda worker: (worker["review_count"], worker["average_rating"]), reverse=True)
    elif sort_by == "completed":
        filtered.sort(key=lambda worker: (worker["completed_jobs"], worker["average_rating"]), reverse=True)
    elif sort_by == "price_low":
        filtered.sort(key=lambda worker: (worker["hourly_rate"] or 10**9, worker["name"]))
    elif sort_by == "price_high":
        filtered.sort(key=lambda worker: (worker["hourly_rate"] or 0, worker["average_rating"]), reverse=True)
    elif sort_by == "name":
        filtered.sort(key=lambda worker: worker["name"].lower())
    else:
        filtered.sort(
            key=lambda worker: (
                worker["average_rating"],
                worker["completed_jobs"],
                worker["review_count"],
            ),
            reverse=True,
        )

    return filtered


@router.get("/workers/{worker_id}")
def get_public_worker_profile(worker_id: int, db: Session = Depends(get_db)):
    user_columns = get_table_columns(db, "users")
    profile_columns = get_table_columns(db, "user_profiles")
    has_availability_table = bool(get_table_columns(db, "availability"))

    worker_select = ["id", "name", "role"]
    if "id_verified" in user_columns:
        worker_select.append("id_verified")
    if "is_active" in user_columns:
        worker_select.append("is_active")

    worker_sql = f"SELECT {', '.join(worker_select)} FROM users WHERE id = :worker_id AND role = :role"
    if "is_active" in user_columns:
        worker_sql += " AND COALESCE(is_active, TRUE) = TRUE"

    worker = db.execute(
        text(worker_sql),
        {"worker_id": worker_id, "role": "worker"},
    ).mappings().first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    profile = {}
    if profile_columns:
        profile_select = ["user_id"]
        for optional_column in ["city", "service_area", "skills", "portfolio", "hourly_rate", "bio", "avatar_url"]:
            if optional_column in profile_columns:
                profile_select.append(optional_column)
        profile_row = db.execute(
            text(f"SELECT {', '.join(profile_select)} FROM user_profiles WHERE user_id = :worker_id"),
            {"worker_id": worker_id},
        ).mappings().first()
        if profile_row:
            profile = dict(profile_row)
    reviews = db.query(Rating).filter(Rating.worker_id == worker_id).order_by(Rating.id.desc()).limit(5).all()
    availability = []
    if has_availability_table:
        availability = db.query(Availability).filter(Availability.worker_id == worker_id).order_by(
            Availability.day.asc(), Availability.start_time.asc()
        ).all()
    average_rating = db.query(func.avg(Rating.rating)).filter(Rating.worker_id == worker_id).scalar() or 0
    review_count = db.query(func.count(Rating.id)).filter(Rating.worker_id == worker_id).scalar() or 0
    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.worker_id == worker_id,
        Job.status == "COMPLETED",
    ).scalar() or 0
    active_jobs = db.query(func.count(Job.id)).filter(
        Job.worker_id == worker_id,
        Job.status.in_(["ACCEPTED", "IN_PROGRESS"]),
    ).scalar() or 0
    total_earnings = db.query(func.sum(Payment.worker_amount)).filter(
        Payment.worker_id == worker_id
    ).scalar() or 0

    return {
        "id": worker_id,
        "name": worker.get("name", ""),
        "city": profile.get("city", ""),
        "service_area": profile.get("service_area", ""),
        "skills": profile.get("skills", ""),
        "portfolio": profile.get("portfolio", ""),
        "hourly_rate": profile.get("hourly_rate"),
        "bio": profile.get("bio", ""),
        "avatar_url": profile.get("avatar_url", ""),
        "average_rating": round(average_rating, 2),
        "review_count": review_count,
        "id_verified": bool(worker.get("id_verified", False)),
        "completed_jobs": completed_jobs,
        "active_jobs": active_jobs,
        "total_earnings": total_earnings,
        "reviews": [
            {"rating": review.rating, "review": review.review}
            for review in reviews
        ],
        "availability": [
            {"day": slot.day, "start_time": slot.start_time, "end_time": slot.end_time}
            for slot in availability
        ],
    }


@router.put("/me")
def update_my_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cleaned_name = payload.name.strip()
    cleaned_phone = payload.phone.strip()
    if cleaned_name:
        current_user.name = cleaned_name
    if cleaned_phone:
        current_user.phone = cleaned_phone

    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    profile.bio = payload.bio.strip()
    profile.city = payload.city.strip()
    profile.skills = payload.skills.strip()
    profile.hourly_rate = payload.hourly_rate if current_user.role == "worker" else None
    profile.service_area = payload.service_area.strip()
    profile.portfolio = payload.portfolio.strip()

    db.commit()
    db.refresh(profile)

    return {
        "message": "Profile updated successfully",
        "profile": {
            "name": current_user.name,
            "phone": current_user.phone,
            "bio": profile.bio or "",
            "city": profile.city or "",
            "skills": profile.skills or "",
            "hourly_rate": profile.hourly_rate,
            "avatar_url": profile.avatar_url or "",
            "service_area": profile.service_area or "",
            "portfolio": profile.portfolio or "",
        },
    }


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Avatar file is required")

    validate_image_extension(file.filename, label="Avatar")
    profile.avatar_url = await store_image(
        file,
        folder="avatars",
        file_prefix=str(current_user.id),
    )
    db.commit()
    db.refresh(profile)

    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": profile.avatar_url,
    }


@router.get("/admin/users")
def list_users_for_admin(
    search: str | None = Query(default=None),
    role: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    users_query = db.query(User)
    if search:
        search_term = f"%{search.strip()}%"
        users_query = users_query.filter(
            (User.name.ilike(search_term)) | (User.email.ilike(search_term)) | (User.phone.ilike(search_term))
        )
    if role:
        users_query = users_query.filter(User.role == role.strip().lower())
    if status == "active":
        users_query = users_query.filter(User.is_active == True)  # noqa: E712
    elif status == "inactive":
        users_query = users_query.filter(User.is_active == False)  # noqa: E712

    users = users_query.order_by(User.id.asc()).all()
    profiles = {
        profile.user_id: profile
        for profile in db.query(UserProfile).filter(
            UserProfile.user_id.in_([user.id for user in users] or [0])
        ).all()
    }
    worker_ids = [user.id for user in users if user.role == "worker"] or [0]
    completed_jobs = {
        worker_id: count
        for worker_id, count in db.query(Job.worker_id, func.count(Job.id)).filter(
            Job.worker_id.in_(worker_ids),
            Job.status == "COMPLETED",
        ).group_by(Job.worker_id).all()
    }
    dispute_counts = {
        user_id: count
        for user_id, count in db.query(Dispute.reporter_id, func.count(Dispute.id)).filter(
            Dispute.reporter_id.in_([user.id for user in users] or [0])
        ).group_by(Dispute.reporter_id).all()
    }

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_active": bool(user.is_active),
            "city": profiles.get(user.id).city if profiles.get(user.id) else "",
            "service_area": profiles.get(user.id).service_area if profiles.get(user.id) else "",
            "completed_jobs": completed_jobs.get(user.id, 0),
            "reported_disputes": dispute_counts.get(user.id, 0),
        }
        for user in users
    ]


@router.put("/admin/users/{user_id}")
def update_user_for_admin(
    user_id: int,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.role is not None:
        next_role = payload.role.strip().lower()
        if next_role not in {"customer", "worker", "admin"}:
            raise HTTPException(status_code=400, detail="Invalid role")
        if user.id == current_user.id and next_role != "admin":
            raise HTTPException(status_code=400, detail="Admins cannot remove their own admin access")
        user.role = next_role

    if payload.is_active is not None:
        if user.id == current_user.id and payload.is_active is False:
            raise HTTPException(status_code=400, detail="Admins cannot disable their own account")
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)

    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "role": user.role,
            "is_active": bool(user.is_active),
        },
    }


@router.get("/availability/me")
def get_my_availability(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    slots = db.query(Availability).filter(Availability.worker_id == current_user.id).order_by(
        Availability.day.asc(), Availability.start_time.asc()
    ).all()
    return slots


@router.post("/availability/me")
def save_my_availability(
    slots: list[AvailabilitySlotRequest],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    db.query(Availability).filter(Availability.worker_id == current_user.id).delete()
    for slot in slots:
        db.add(
            Availability(
                worker_id=current_user.id,
                day=slot.day.strip(),
                start_time=slot.start_time.strip(),
                end_time=slot.end_time.strip(),
            )
        )
    db.commit()
    return {"message": "Availability updated successfully"}
