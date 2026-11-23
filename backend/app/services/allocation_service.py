from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.blood_request import BloodRequest
from app.models.match import RequestMatch
from app.models.donor import Donor
from app.models.user import User
from app.core.constants import (
    REQUEST_STATUS_OPEN, MATCH_STATUS_NOTIFIED,
    MATCH_STATUS_ACCEPTED, MATCH_STATUS_DECLINED
)
from app.core.timezone import now_utc
from app.services.eligibility_service import check_donor_eligibility
from app.services.audit_service import log_audit_event

async def accept_match_concurrency_safe(
    session: AsyncSession,
    match_id: int,
    donor_user_id: int,
    ip_address: Optional[str] = None,
    cooldown_days: int = 90
) -> Tuple[RequestMatch, BloodRequest]:
    """
    Concurrency-safe donor allocation:
    Uses PostgreSQL row-level locking (SELECT ... FOR UPDATE) on the BloodRequest row
    to prevent over-allocation when multiple donors respond simultaneously.
    """
    # 1. Fetch match record
    match_stmt = (
        select(RequestMatch)
        .where(RequestMatch.id == match_id, RequestMatch.donor_id == donor_user_id)
    )
    match_res = await session.execute(match_stmt)
    match_obj = match_res.scalar_one_or_none()
    if not match_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match record not found or does not belong to you."
        )

    if match_obj.status != MATCH_STATUS_NOTIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This match has already been responded to (status: {match_obj.status})."
        )

    # 2. Lock the parent BloodRequest row using FOR UPDATE
    req_stmt = (
        select(BloodRequest)
        .where(BloodRequest.id == match_obj.request_id)
        .with_for_update()
    )
    req_res = await session.execute(req_stmt)
    req_obj = req_res.scalar_one_or_none()

    if not req_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated blood request not found."
        )

    # 3. Check request status
    if req_obj.status != REQUEST_STATUS_OPEN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This blood request is no longer open (current status: {req_obj.status})."
        )

    # 4. Check deadline
    current_time = now_utc()
    if req_obj.required_by <= current_time:
        req_obj.status = "expired"
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This request deadline has expired and can no longer accept responses."
        )

    # 5. Check remaining capacity (accepted + fulfilled vs needed)
    accepted_count_stmt = (
        select(func.count(RequestMatch.id))
        .where(
            RequestMatch.request_id == req_obj.id,
            RequestMatch.status.in_([MATCH_STATUS_ACCEPTED, "completed"])
        )
    )
    accepted_count = (await session.execute(accepted_count_stmt)).scalar() or 0

    if accepted_count >= req_obj.units_needed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This request has already reached its required donor allocation."
        )

    # 6. Re-verify donor eligibility
    donor_stmt = select(Donor, User).join(User, Donor.user_id == User.id).where(Donor.user_id == donor_user_id)
    donor_res = await session.execute(donor_stmt)
    donor_row = donor_res.first()
    if not donor_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor profile not found."
        )
    donor_obj, user_obj = donor_row

    is_eligible, reasons, _, _ = check_donor_eligibility(
        dob=donor_obj.dob,
        weight=donor_obj.weight,
        user_status=user_obj.status,
        is_available=donor_obj.is_available,
        last_donation_date=donor_obj.last_donation_date,
        cooldown_days=cooldown_days
    )

    if not is_eligible:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are currently not eligible to donate: {', '.join(reasons)}"
        )

    # 7. Update match status
    match_obj.status = MATCH_STATUS_ACCEPTED
    match_obj.responded_at = current_time

    # 8. Record audit events
    await log_audit_event(
        session=session,
        user_id=donor_user_id,
        action="Accepted",
        entity=f"request_match #{match_obj.id}",
        old_value="notified",
        new_value="accepted",
        ip_address=ip_address
    )

    await log_audit_event(
        session=session,
        user_id=donor_user_id,
        action="Contact reveal",
        entity=f"donor #{donor_user_id} → hospital #{req_obj.hospital_id}",
        old_value="—",
        new_value="revealed",
        ip_address=ip_address
    )

    # 9. Commit transaction atomically
    await session.commit()
    await session.refresh(match_obj)
    await session.refresh(req_obj)

    return match_obj, req_obj

async def decline_match(
    session: AsyncSession,
    match_id: int,
    donor_user_id: int,
    reason: Optional[str] = None,
    ip_address: Optional[str] = None
) -> RequestMatch:
    """Handle donor declining a matched request."""
    stmt = (
        select(RequestMatch)
        .where(RequestMatch.id == match_id, RequestMatch.donor_id == donor_user_id)
    )
    res = await session.execute(stmt)
    match_obj = res.scalar_one_or_none()
    if not match_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match record not found."
        )

    if match_obj.status != MATCH_STATUS_NOTIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This match has already been responded to (status: {match_obj.status})."
        )

    match_obj.status = MATCH_STATUS_DECLINED
    match_obj.decline_reason = reason
    match_obj.responded_at = now_utc()

    await log_audit_event(
        session=session,
        user_id=donor_user_id,
        action="Declined",
        entity=f"request_match #{match_obj.id}",
        old_value="notified",
        new_value="declined",
        ip_address=ip_address
    )

    await session.commit()
    await session.refresh(match_obj)
    return match_obj
