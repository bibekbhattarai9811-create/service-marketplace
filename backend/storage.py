import mimetypes
import os
import uuid
from pathlib import Path

import httpx
from fastapi import HTTPException, UploadFile


BASE_UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
BASE_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

CLOUDINARY_CLOUD_NAME = os.getenv("SERVICE_MARKETPLACE_CLOUDINARY_CLOUD_NAME", "").strip()
CLOUDINARY_UPLOAD_PRESET = os.getenv("SERVICE_MARKETPLACE_CLOUDINARY_UPLOAD_PRESET", "").strip()
S3_BUCKET = os.getenv("SERVICE_MARKETPLACE_S3_BUCKET", "").strip()
S3_REGION = os.getenv("SERVICE_MARKETPLACE_S3_REGION", "").strip()
S3_ACCESS_KEY_ID = os.getenv("SERVICE_MARKETPLACE_S3_ACCESS_KEY_ID", "").strip()
S3_SECRET_ACCESS_KEY = os.getenv("SERVICE_MARKETPLACE_S3_SECRET_ACCESS_KEY", "").strip()
S3_PUBLIC_BASE_URL = os.getenv("SERVICE_MARKETPLACE_S3_PUBLIC_BASE_URL", "").strip().rstrip("/")
UPLOADS_BASE_URL = os.getenv("SERVICE_MARKETPLACE_UPLOADS_BASE_URL", "").strip().rstrip("/")


def public_upload_url(path: str) -> str:
    if UPLOADS_BASE_URL:
        return f"{UPLOADS_BASE_URL}{path}"
    return path


def validate_image_extension(filename: str, *, label: str) -> str:
    extension = Path(filename or "").suffix.lower()
    if extension not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(
            status_code=400,
            detail=f"{label} must be png, jpg, jpeg, or webp",
        )
    return extension


async def store_image(
    file: UploadFile,
    *,
    folder: str,
    file_prefix: str,
) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Image file is required")

    extension = validate_image_extension(file.filename, label="Image")
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    file_name = f"{file_prefix}-{uuid.uuid4().hex}{extension}"

    s3_url = _store_in_s3(
        file_bytes=file_bytes,
        file_name=file_name,
        folder=folder,
    )
    if s3_url:
        return s3_url

    cloudinary_url = await _store_in_cloudinary(
        file_bytes=file_bytes,
        file_name=file_name,
        folder=folder,
    )
    if cloudinary_url:
        return cloudinary_url

    return _store_locally(
        file_bytes=file_bytes,
        folder=folder,
        file_name=file_name,
    )


async def _store_in_cloudinary(*, file_bytes: bytes, file_name: str, folder: str) -> str | None:
    if not (CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET):
        return None

    upload_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"
    content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                upload_url,
                data={
                    "upload_preset": CLOUDINARY_UPLOAD_PRESET,
                    "folder": folder,
                    "public_id": Path(file_name).stem,
                },
                files={"file": (file_name, file_bytes, content_type)},
            )
        response.raise_for_status()
        secure_url = response.json().get("secure_url", "").strip()
        if secure_url:
            return secure_url
    except Exception:
        return None

    return None


def _store_in_s3(*, file_bytes: bytes, file_name: str, folder: str) -> str | None:
    if not (S3_BUCKET and S3_REGION and S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY):
        return None

    object_key = f"{folder}/{file_name}"
    content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"

    try:
        import boto3

        client = boto3.client(
            "s3",
            region_name=S3_REGION,
            aws_access_key_id=S3_ACCESS_KEY_ID,
            aws_secret_access_key=S3_SECRET_ACCESS_KEY,
        )
        client.put_object(
            Bucket=S3_BUCKET,
            Key=object_key,
            Body=file_bytes,
            ContentType=content_type,
            ACL="public-read",
        )
        if S3_PUBLIC_BASE_URL:
            return f"{S3_PUBLIC_BASE_URL}/{object_key}"
        return f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{object_key}"
    except Exception:
        return None


def _store_locally(*, file_bytes: bytes, folder: str, file_name: str) -> str:
    target_dir = BASE_UPLOADS_DIR / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    destination = target_dir / file_name
    destination.write_bytes(file_bytes)
    return public_upload_url(f"/uploads/{folder}/{file_name}")
