from sqlalchemy import Column, Integer, String
from database import Base


# ---------------------------
# User Table
# ---------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    role = Column(String)  # customer / worker
    password = Column(String)


# ---------------------------
# Job Table
# ---------------------------
class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    location = Column(String)

    # price should be integer for calculations
    price = Column(Integer)

    status = Column(String, default="OPEN")

    customer_id = Column(Integer)
    worker_id = Column(Integer, nullable=True)
    paid = Column(Boolean, default=False)


# ---------------------------
# Job Acceptance History
# ---------------------------
class JobAcceptance(Base):
    __tablename__ = "job_acceptance"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer)
    worker_id = Column(Integer)


# ---------------------------
# Worker Ratings
# ---------------------------
class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer)
    rating = Column(Integer)
    review = Column(String)


# ---------------------------
# Notifications
# ---------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String)
    location = Column(String)
    is_read = Column(Integer, default=0)


# ---------------------------
# Payments / Escrow
# ---------------------------
class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    job_id = Column(Integer)
    customer_id = Column(Integer)
    worker_id = Column(Integer)

    amount = Column(Integer)
    platform_fee = Column(Integer)
    worker_amount = Column(Integer)

    status = Column(String)  # escrow / released


# ---------------------------
# Chat System
# ---------------------------
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)

    job_id = Column(Integer)
    sender_id = Column(Integer)
    receiver_id = Column(Integer)

    message = Column(String)


# ---------------------------
# Worker Availability
# ---------------------------
class Availability(Base):
    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)

    worker_id = Column(Integer)
    day = Column(String)

    start_time = Column(String)
    end_time = Column(String)
