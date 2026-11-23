from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.security import decode_token
from app.models.user import User
from app.models.hospital import Hospital
from app.models.donor import Donor
from app.core.constants import (
    ROLE_ADMIN, ROLE_HOSPITAL, ROLE_DONOR,
    USER_STATUS_BLOCKED, HOSPITAL_STATUS_VERIFIED
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Validate JWT access token and return active authenticated user."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == int(user_id))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status == USER_STATUS_BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been blocked by an administrator.",
        )

    return user

def require_role(required_role: str):
    """Dependency factory enforcing specific user role."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role and current_user.role != ROLE_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires {required_role} role.",
            )
        return current_user
    return role_checker

async def require_donor(current_user: User = Depends(require_role(ROLE_DONOR))) -> User:
    return current_user

async def require_admin(current_user: User = Depends(require_role(ROLE_ADMIN))) -> User:
    return current_user

async def require_hospital(
    current_user: User = Depends(require_role(ROLE_HOSPITAL)),
    db: AsyncSession = Depends(get_db)
) -> Hospital:
    """Ensures user is a hospital."""
    stmt = select(Hospital).where(Hospital.user_id == current_user.id)
    res = await db.execute(stmt)
    hospital = res.scalar_one_or_none()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital profile not found."
        )
    return hospital

async def require_verified_hospital(
    hospital: Hospital = Depends(require_hospital)
) -> Hospital:
    """Ensures hospital has been verified by an administrator."""
    if hospital.verification_status != HOSPITAL_STATUS_VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Hospital verification status is '{hospital.verification_status}'. Verified status is required to perform this action."
        )
    return hospital
