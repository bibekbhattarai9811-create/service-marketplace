from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
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


class LoginRequest(BaseModel):
    email: str
    password: str


# Register user
@router.post("/register")
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    role = payload.role.strip().lower()
    name = payload.name.strip()
    phone = payload.phone.strip()
    password = payload.password

    if role not in {"customer", "worker"}:
        raise HTTPException(status_code=400, detail="Role must be customer or worker")

    if len(password) < 4:
        raise HTTPException(
            status_code=400, detail="Password must be at least 4 characters"
        )

    new_user = User(
        name=name,
        email=email,
        phone=phone,
        role=role,
        password=hash_password(password)
    )

    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email is already registered")
    db.refresh(new_user)

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
