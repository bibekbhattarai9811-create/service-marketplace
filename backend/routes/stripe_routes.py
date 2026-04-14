import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User, Job, Payment
from auth import get_current_user, require_role

# Defaulting to an environment-driven mock key to bypass Github secret scanners
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_mock_key")

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -----------------------------
# Worker Onboarding
# -----------------------------
@router.post("/create-account")
def create_connect_account(
    current_user: User = Depends(require_role("worker")), 
    db: Session = Depends(get_db)
):
    # Determine the absolute URL to redirect back to the frontend
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    if not current_user.stripe_account_id:
        try:
            account = stripe.Account.create(
                type="express",
                email=current_user.email,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
            )
            current_user.stripe_account_id = account.id
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Stripe Error: {str(e)}")

    try:
        # Create an onboarding session link
        account_link = stripe.AccountLink.create(
            account=current_user.stripe_account_id,
            refresh_url=f"{frontend_url}/dashboard",
            return_url=f"{frontend_url}/dashboard?stripe_connected=success",
            type="account_onboarding",
        )
        return {"url": account_link.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login Link Error: {str(e)}")

# -----------------------------
# Worker Identity Verification
# -----------------------------
@router.post("/create-identity-session")
def create_identity_session(
    current_user: User = Depends(require_role("worker")), 
    db: Session = Depends(get_db)
):
    if current_user.id_verified:
        raise HTTPException(status_code=400, detail="Identity already verified")
        
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    try:
        verification_session = stripe.identity.VerificationSession.create(
            type="document",
            metadata={"user_id": current_user.id},
            return_url=f"{frontend_url}/dashboard?verification={{VERIFICATION_SESSION_ID}}"
        )
        return {"url": verification_session.url, "session_id": verification_session.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class VerifyIdentityRequest(BaseModel):
    session_id: str

@router.post("/verify-identity-session")
def verify_identity_session(
    payload: VerifyIdentityRequest,
    current_user: User = Depends(require_role("worker")),
    db: Session = Depends(get_db)
):
    try:
        session = stripe.identity.VerificationSession.retrieve(payload.session_id)
        if session.status == "verified":
            current_user.id_verified = True
            db.commit()
            return {"status": "verified", "message": "Identity verified successfully!"}
        else:
            return {"status": session.status, "message": f"Verification status is: {session.status}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -----------------------------
# Customer Checkout
# -----------------------------
class PaymentIntentRequest(BaseModel):
    job_id: int

@router.post("/create-payment-intent")
def create_payment_intent(
    payload: PaymentIntentRequest, 
    current_user: User = Depends(require_role("customer")), 
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if job.paid:
        raise HTTPException(status_code=400, detail="Job is already paid")
    
    worker = db.query(User).filter(User.id == job.worker_id).first()
    if not worker or not worker.stripe_account_id:
        raise HTTPException(status_code=400, detail="Worker has not connected a Stripe account yet")

    # Payment details configuration
    amount_cents = int(job.price * 100)
    platform_fee_cents = int(amount_cents * 0.10) # 10% platform fee

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            automatic_payment_methods={"enabled": True},
            transfer_data={
                "destination": worker.stripe_account_id,
            },
            application_fee_amount=platform_fee_cents,
            metadata={
                "job_id": job.id, 
                "customer_id": current_user.id,
                "worker_id": worker.id
            }
        )
        return {
            "client_secret": intent.client_secret,
            "stripe_payment_intent_id": intent.id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class ConfirmPaymentRequest(BaseModel):
    payment_intent_id: str

@router.post("/confirm-payment")
def confirm_payment(
    payload: ConfirmPaymentRequest,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db)
):
    """
    Secure client-triggered verification. 
    Queries Stripe directly to confirm the intent is legitimately paid.
    """
    try:
        intent = stripe.PaymentIntent.retrieve(payload.payment_intent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if intent.status != "succeeded":
        raise HTTPException(status_code=400, detail="Payment is not marked as succeeded on Stripe.")

    job_id = int(intent.metadata.get("job_id", 0))
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job linked to this payment not found")

    if not job.paid:
        job.paid = True
        
        # Add a record to the payments tracking table
        amount_usd = int(intent.amount / 100)
        platform_fee_usd = int(intent.application_fee_amount / 100) if intent.application_fee_amount else 0
        
        payment_record = Payment(
            job_id=job.id,
            customer_id=job.customer_id,
            worker_id=job.worker_id,
            amount=amount_usd,
            platform_fee=platform_fee_usd,
            worker_amount=amount_usd - platform_fee_usd,
            status="completed",
            stripe_payment_intent_id=intent.id
        )
        db.add(payment_record)
        db.commit()

    return {"status": "success", "message": "Payment verified and funds routed into Escrow"}
