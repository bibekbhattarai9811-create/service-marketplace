import json
import os
import smtplib
import ssl
from email.message import EmailMessage
from urllib import request

import httpx


SMTP_HOST = os.getenv("SERVICE_MARKETPLACE_SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SERVICE_MARKETPLACE_SMTP_PORT", "587") or "587")
SMTP_USER = os.getenv("SERVICE_MARKETPLACE_SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SERVICE_MARKETPLACE_SMTP_PASSWORD", "").strip()
SMTP_FROM = os.getenv("SERVICE_MARKETPLACE_SMTP_FROM", "").strip() or SMTP_USER
RESEND_API_KEY = os.getenv("SERVICE_MARKETPLACE_RESEND_API_KEY", "").strip()
RESEND_FROM = os.getenv("SERVICE_MARKETPLACE_RESEND_FROM", "").strip()
SMS_WEBHOOK_URL = os.getenv("SERVICE_MARKETPLACE_SMS_WEBHOOK_URL", "").strip()


def send_email_notification(to_email: str, subject: str, body: str) -> bool:
    if RESEND_API_KEY and RESEND_FROM and to_email:
        return _send_resend_email(to_email, subject, body)

    if not (SMTP_HOST and SMTP_FROM and to_email):
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = to_email
    message.set_content(body)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.starttls(context=context)
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception:
        return False


def _send_resend_email(to_email: str, subject: str, body: str) -> bool:
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": RESEND_FROM,
                "to": [to_email],
                "subject": subject,
                "text": body,
            },
            timeout=20,
        )
        response.raise_for_status()
        return True
    except Exception:
        return False


def send_sms_notification(phone: str, message: str) -> bool:
    if not (SMS_WEBHOOK_URL and phone and message):
        return False

    payload = json.dumps({"phone": phone, "message": message}).encode("utf-8")
    req = request.Request(
        SMS_WEBHOOK_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=20):
            return True
    except Exception:
        return False
