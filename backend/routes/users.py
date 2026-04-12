import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from auth import get_current_user
from database import SessionLocal
from models import User, UserProfile
from security import create_access_token, hash_password, verify_password

router = APIRouter()


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


class ProfileUpdateRequest(BaseModel):
    bio: str = ""
    city: str = ""
    skills: str = ""
    hourly_rate: int | None = None
    service_area: str = ""
    portfolio: str = ""


class AdminUserUpdateRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None


UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads" / "avatars"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


# Register user
@router.post("/register")
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
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

    if len(password) < 4:
        raise HTTPException(
            status_code=400, detail="Password must be at least 4 characters"
        )

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
    email = payload.email.strip().lower()
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

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "bio": profile.bio or "",
        "city": profile.city or "",
        "skills": profile.skills or "",
        "hourly_rate": profile.hourly_rate,
        "avatar_url": profile.avatar_url or "",
        "service_area": profile.service_area or "",
        "portfolio": profile.portfolio or "",
    }


@router.put("/me")
def update_my_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    extension = Path(file.filename).suffix.lower()
    if extension not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=400, detail="Avatar must be png, jpg, jpeg, or webp")

    file_name = f"{current_user.id}-{uuid.uuid4().hex}{extension}"
    destination = UPLOADS_DIR / file_name
    destination.write_bytes(await file.read())

    profile.avatar_url = f"/uploads/avatars/{file_name}"
    db.commit()
    db.refresh(profile)

    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": profile.avatar_url,
    }


@router.get("/admin/users")
def list_users_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    users = db.query(User).order_by(User.id.asc()).all()
    profiles = {
        profile.user_id: profile
        for profile in db.query(UserProfile).filter(
            UserProfile.user_id.in_([user.id for user in users] or [0])
        ).all()
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
        user.role = next_role

    if payload.is_active is not None:
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
