from datetime import timedelta
from typing import Optional, Any, Union
from jose import jwt, JWTError
import bcrypt
from app.core.config import settings
from app.core.timezone import now_utc

def get_password_hash(password: str) -> str:
    """Hash password securely using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generate JWT access token."""
    expire = now_utc() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "type": "access"
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(subject: Union[str, Any], role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generate JWT refresh token."""
    expire = now_utc() + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "type": "refresh"
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def mask_phone_number(phone: Optional[str]) -> str:
    """
    Mask a Pakistani mobile number according to design reference:
    Example: '0312-3456789' -> '03••-•••••89'
    """
    if not phone or len(phone) < 6:
        return "03••-•••••••"
    clean = phone.strip()
    prefix = clean[:2] # e.g. '03'
    suffix = clean[-2:] # last 2 digits
    return f"{prefix}••-•••••{suffix}"
