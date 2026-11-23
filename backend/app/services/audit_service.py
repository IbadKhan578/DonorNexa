from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog
from app.core.timezone import now_utc

async def log_audit_event(
    session: AsyncSession,
    action: str,
    entity: str,
    user_id: Optional[int] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Record an immutable audit log entry.
    """
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
        created_at=now_utc()
    )
    session.add(entry)
    # Note: caller commits the transaction
    return entry
