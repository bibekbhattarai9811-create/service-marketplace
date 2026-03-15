from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import User

router = APIRouter()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Register user
@router.post("/register")
def register_user(name: str, email: str, phone: str, role: str, password: str, db: Session = Depends(get_db)):

    new_user = User(
        name=name,
        email=email,
        phone=phone,
        role=role,
        password=password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id
    }


# Login user
@router.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == email).first()

    if not user:
        return {"error": "User not found"}

    if user.password != password:
        return {"error": "Incorrect password"}

    return {
        "message": "Login successful",
        "user_id": user.id,
        "role": user.role
    }


@router.get("/users")
def get_users():
    return {"users": []}
