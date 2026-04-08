import base64
import json
import hashlib
import hmac
import os
import time

from fastapi import HTTPException


PBKDF2_ITERATIONS = 120_000
TOKEN_SECRET = os.environ.get("SERVICE_MARKETPLACE_TOKEN_SECRET", "service-marketplace-dev-secret")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    salt_b64 = base64.b64encode(salt).decode("utf-8")
    key_b64 = base64.b64encode(derived_key).decode("utf-8")
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt_b64}${key_b64}"


def verify_password(password: str, stored_value: str) -> bool:
    if not stored_value or not stored_value.startswith("pbkdf2_sha256$"):
        return hmac.compare_digest(stored_value or "", password)

    try:
        _, iterations, salt_b64, key_b64 = stored_value.split("$", 3)
        salt = base64.b64decode(salt_b64.encode("utf-8"))
        expected_key = base64.b64decode(key_b64.encode("utf-8"))
    except (ValueError, TypeError):
        return False

    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        int(iterations),
    )
    return hmac.compare_digest(derived_key, expected_key)


def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")
    signature = hmac.new(
        TOKEN_SECRET.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")
    return f"{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> dict:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc

    expected_signature = hmac.new(
        TOKEN_SECRET.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    provided_signature = base64.urlsafe_b64decode(_pad_base64(signature_b64))
    if not hmac.compare_digest(expected_signature, provided_signature):
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    payload = json.loads(
        base64.urlsafe_b64decode(_pad_base64(payload_b64)).decode("utf-8")
    )
    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=401, detail="Authentication token expired")
    return payload


def _pad_base64(value: str) -> str:
    return value + "=" * (-len(value) % 4)
