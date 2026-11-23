import os
import uuid
import filetype
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

PROFILE_UPLOAD_DIR = os.path.join(settings.UPLOAD_DIR, "profiles")
LICENCE_UPLOAD_DIR = os.path.join(settings.UPLOAD_DIR, "licences")

os.makedirs(PROFILE_UPLOAD_DIR, exist_ok=True)
os.makedirs(LICENCE_UPLOAD_DIR, exist_ok=True)

async def validate_and_save_profile_photo(file: UploadFile) -> str:
    """
    Validate and save donor profile photo.
    - JPEG / PNG only
    - Max size: 2 MB
    - Validates magic bytes using filetype
    - Secure UUID filename
    """
    content = await file.read()
    if len(content) > settings.MAX_PROFILE_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Profile picture exceeds maximum allowed size of {settings.MAX_PROFILE_PHOTO_SIZE // (1024*1024)} MB."
        )

    # Magic byte check
    kind = filetype.guess(content)
    if kind is None or kind.mime not in ("image/jpeg", "image/png"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only JPG/JPEG and PNG files are accepted."
        )

    ext = ".jpg" if kind.mime == "image/jpeg" else ".png"
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    safe_path = os.path.join(PROFILE_UPLOAD_DIR, safe_filename)

    with open(safe_path, "wb") as f:
        f.write(content)

    return f"/uploads/profiles/{safe_filename}"

async def validate_and_save_licence_pdf(file: UploadFile) -> str:
    """
    Validate and save hospital medical licence file.
    - PDF only
    - Max size: 5 MB
    - Validates magic bytes (%PDF)
    - Secure UUID filename
    """
    content = await file.read()
    if len(content) > settings.MAX_LICENCE_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Licence file exceeds maximum allowed size of {settings.MAX_LICENCE_FILE_SIZE // (1024*1024)} MB."
        )

    # Magic byte check for PDF (%PDF header)
    if not content.startswith(b"%PDF"):
        # Double check with filetype
        kind = filetype.guess(content)
        if kind is None or kind.mime != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Only PDF documents are accepted for hospital medical licence."
            )

    safe_filename = f"{uuid.uuid4().hex}.pdf"
    safe_path = os.path.join(LICENCE_UPLOAD_DIR, safe_filename)

    with open(safe_path, "wb") as f:
        f.write(content)

    return f"/uploads/licences/{safe_filename}"
