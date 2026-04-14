import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_mock_key")

try:
    frontend_url = "http://localhost:3000"
    verification_session = stripe.identity.VerificationSession.create(
        type="document",
        metadata={"user_id": 1},
        return_url=f"{frontend_url}/dashboard?verification={{CHECKOUT_SESSION_ID}}"
    )
    print("SUCCESS", verification_session.url)
except Exception as e:
    print("ERROR:", str(e))
