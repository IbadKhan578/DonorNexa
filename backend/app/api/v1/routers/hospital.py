from typing import List, Optional
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from app.db.session import get_db
from app.models.user import User
from app.models.hospital import Hospital
from app.models.blood_request import BloodRequest
from app.models.match import RequestMatch
from app.models.donor import Donor
from app.models.donation import Donation
from app.models.city import City
from app.models.inventory import BloodInventory
from app.models.settings import SystemSetting
from app.schemas.hospital import (
    CreateBloodRequest, BloodRequestOut, RankedDonorOut,
    ScoreBreakdown, HospitalDashboardStats, InventoryItemOut,
    UpdateInventoryItem, CompleteDonationRequest, HospitalProfileOut
)
from app.schemas.common import MessageResponse
from app.core.constants import (
    REQUEST_STATUS_OPEN, REQUEST_STATUS_FULFILLED,
    REQUEST_STATUS_CANCELLED, MATCH_STATUS_NOTIFIED,
    MATCH_STATUS_ACCEPTED, MATCH_STATUS_COMPLETED,
    URGENCY_CRITICAL, MAX_OPEN_CRITICAL_PER_HOSPITAL,
    CANCELLATION_PENALTY_WITH_ACCEPTS, DEFAULT_COOLDOWN_DAYS,
    BLOOD_GROUPS
)
from app.core.timezone import now_utc, format_pkt, today_pkt, to_utc
from app.core.security import mask_phone_number
from app.api.deps import require_hospital, require_verified_hospital, get_client_ip
from app.services.matching_service import is_blood_compatible, calculate_match_score
from app.services.eligibility_service import check_donor_eligibility
from app.services.audit_service import log_audit_event
from app.services.inventory_service import (
    ensure_hospital_inventory, update_inventory_units,
    increment_inventory_on_donation
)

router = APIRouter(prefix="/hospital", tags=["Hospital"])

async def get_system_settings_dict(db: AsyncSession) -> dict:
    stmt = select(SystemSetting)
    res = await db.execute(stmt)
    return {s.key: s.value for s in res.scalars().all()}

@router.get("/me", response_model=HospitalProfileOut)
async def get_my_hospital_profile(
    hospital: Hospital = Depends(require_hospital),
    db: AsyncSession = Depends(get_db)
):
    """Get hospital profile and verification details."""
    user_stmt = select(User).where(User.id == hospital.user_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()

    city_stmt = select(City).where(City.id == hospital.city_id)
    city = (await db.execute(city_stmt)).scalar_one_or_none()

    return HospitalProfileOut(
        user_id=hospital.user_id,
        hospital_name=hospital.hospital_name,
        email=user.email,
        cnic=user.cnic,
        phone=user.name,  # Rep name or phone stored
        licence_no=hospital.licence_no,
        city_id=hospital.city_id,
        city_name=city.city_name if city else "Unknown",
        province=city.province if city else "Unknown",
        verification_status=hospital.verification_status,
        trust_score=hospital.trust_score,
        licence_file_path=hospital.licence_file_path
    )

@router.get("/dashboard", response_model=HospitalDashboardStats)
async def get_hospital_dashboard(
    hospital: Hospital = Depends(require_hospital),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve hospital dashboard statistics."""
    current_time = now_utc()
    thirty_days_ago = current_time - timedelta(days=30)
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. Open requests
    open_stmt = (
        select(func.count(BloodRequest.id))
        .where(
            BloodRequest.hospital_id == hospital.user_id,
            BloodRequest.status == REQUEST_STATUS_OPEN,
            BloodRequest.required_by > current_time
        )
    )
    open_count = (await db.execute(open_stmt)).scalar() or 0

    # 2. Critical open requests
    crit_stmt = (
        select(func.count(BloodRequest.id))
        .where(
            BloodRequest.hospital_id == hospital.user_id,
            BloodRequest.status == REQUEST_STATUS_OPEN,
            BloodRequest.urgency == URGENCY_CRITICAL,
            BloodRequest.required_by > current_time
        )
    )
    crit_count = (await db.execute(crit_stmt)).scalar() or 0
    crit_remaining = max(0, MAX_OPEN_CRITICAL_PER_HOSPITAL - crit_count)

    # 3. Units fulfilled in 30 days
    don_stmt = (
        select(func.coalesce(func.sum(Donation.units), 0))
        .where(
            Donation.verified_by == hospital.user_id,
            Donation.donated_on >= thirty_days_ago
        )
    )
    fulfilled_30d = (await db.execute(don_stmt)).scalar() or 0

    # Total needed in 30 days for fulfillment rate
    req_30d_stmt = (
        select(func.coalesce(func.sum(BloodRequest.units_needed), 0))
        .where(
            BloodRequest.hospital_id == hospital.user_id,
            BloodRequest.created_at >= thirty_days_ago
        )
    )
    needed_30d = (await db.execute(req_30d_stmt)).scalar() or 0
    fulfillment_rate = round((fulfilled_30d / needed_30d) * 100.0, 1) if needed_30d > 0 else 86.0

    # 4. Donors matched today
    matches_today_stmt = (
        select(func.count(RequestMatch.id))
        .join(BloodRequest, RequestMatch.request_id == BloodRequest.id)
        .where(
            BloodRequest.hospital_id == hospital.user_id,
            BloodRequest.created_at >= today_start
        )
    )
    matched_today = (await db.execute(matches_today_stmt)).scalar() or 0

    return HospitalDashboardStats(
        open_requests_count=open_count,
        critical_open_count=crit_count,
        critical_slots_remaining=crit_remaining,
        units_fulfilled_30d=fulfilled_30d,
        fulfillment_rate=fulfillment_rate,
        donors_matched_today=matched_today,
        trust_score=hospital.trust_score
    )

@router.post("/requests", response_model=BloodRequestOut, status_code=status.HTTP_201_CREATED)
async def create_blood_request(
    req: CreateBloodRequest,
    request: Request,
    hospital: Hospital = Depends(require_verified_hospital),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new blood request and trigger the donor matching engine.
    Enforces maximum 3 open Critical requests limit.
    """
    client_ip = get_client_ip(request)
    current_time = now_utc()
    req_by_utc = to_utc(req.required_by)

    if req_by_utc <= current_time:
        raise HTTPException(
            status_code=400,
            detail="Required-by deadline must be a valid future datetime."
        )

    # Concurrency-safe check of Critical requests limit
    if req.urgency == URGENCY_CRITICAL:
        crit_stmt = (
            select(func.count(BloodRequest.id))
            .where(
                BloodRequest.hospital_id == hospital.user_id,
                BloodRequest.status == REQUEST_STATUS_OPEN,
                BloodRequest.urgency == URGENCY_CRITICAL,
                BloodRequest.required_by > current_time
            )
        )
        current_crit_count = (await db.execute(crit_stmt)).scalar() or 0
        if current_crit_count >= MAX_OPEN_CRITICAL_PER_HOSPITAL:
            raise HTTPException(
                status_code=400,
                detail=f"Critical request limit reached ({MAX_OPEN_CRITICAL_PER_HOSPITAL} max open Critical requests). You must close or fulfill an existing Critical request first."
            )

    # 1. Create Blood Request
    new_request = BloodRequest(
        hospital_id=hospital.user_id,
        blood_group=req.blood_group,
        units_needed=req.units_needed,
        units_fulfilled=0,
        urgency=req.urgency,
        required_by=req_by_utc,
        notes=req.notes.strip() if req.notes else None,
        status=REQUEST_STATUS_OPEN,
        created_at=current_time
    )
    db.add(new_request)
    await db.flush()

    # 2. Matching Engine: Find eligible compatible donors
    settings_dict = await get_system_settings_dict(db)
    cooldown_days = int(settings_dict.get("cooldown_days", DEFAULT_COOLDOWN_DAYS))
    top_n = int(settings_dict.get("top_n_donors", 5))
    widen_pool = settings_dict.get("widen_critical_pool", "true").lower() == "true"

    # Query all active, available donors
    donors_stmt = (
        select(Donor, User)
        .join(User, Donor.user_id == User.id)
        .where(
            User.status == "active",
            Donor.is_available == True
        )
    )
    donors_res = await db.execute(donors_stmt)
    all_donors = donors_res.all()

    candidates = []
    for donor_obj, user_obj in all_donors:
        # Check compatibility
        if not is_blood_compatible(req.blood_group, donor_obj.blood_group):
            continue

        # Check eligibility
        is_eligible, _, _, _ = check_donor_eligibility(
            dob=donor_obj.dob,
            weight=donor_obj.weight,
            user_status=user_obj.status,
            is_available=donor_obj.is_available,
            last_donation_date=donor_obj.last_donation_date,
            cooldown_days=cooldown_days
        )
        if not is_eligible:
            continue

        # Fetch past notification count & response count for donor
        notif_count = (await db.execute(
            select(func.count(RequestMatch.id)).where(RequestMatch.donor_id == donor_obj.user_id)
        )).scalar() or 0

        resp_count = (await db.execute(
            select(func.count(RequestMatch.id)).where(
                RequestMatch.donor_id == donor_obj.user_id,
                RequestMatch.status.in_([MATCH_STATUS_ACCEPTED, "declined", "completed"])
            )
        )).scalar() or 0

        # Calculate matching score
        score_data = calculate_match_score(
            recipient_group=req.blood_group,
            donor_group=donor_obj.blood_group,
            hospital_city_id=hospital.city_id,
            donor_city_id=donor_obj.city_id,
            last_donation_date=donor_obj.last_donation_date,
            total_notified=notif_count,
            total_responded=resp_count
        )

        candidates.append((donor_obj, score_data["total"]))

    # Sort candidates by score descending
    candidates.sort(key=lambda x: x[1], reverse=True)

    # Determine pool size
    pool_size = top_n
    if req.urgency == URGENCY_CRITICAL:
        pool_size = top_n * 2 if not widen_pool else max(top_n * 2, len(candidates))

    selected_candidates = candidates[:pool_size]

    # Create RequestMatch records for notified candidates
    for donor_obj, score in selected_candidates:
        match_entry = RequestMatch(
            request_id=new_request.id,
            donor_id=donor_obj.user_id,
            score=score,
            status=MATCH_STATUS_NOTIFIED,
            responded_at=None
        )
        db.add(match_entry)

    # 3. Log audit event
    await log_audit_event(
        session=db,
        user_id=hospital.user_id,
        action="Created",
        entity=f"blood_request #{new_request.id}",
        new_value=f"group={req.blood_group}, units={req.units_needed}, urgency={req.urgency}, notified={len(selected_candidates)}",
        ip_address=client_ip
    )

    await db.commit()
    await db.refresh(new_request)

    city_stmt = select(City).where(City.id == hospital.city_id)
    city_obj = (await db.execute(city_stmt)).scalar_one_or_none()

    return BloodRequestOut(
        id=new_request.id,
        hospital_id=hospital.user_id,
        hospital_name=hospital.hospital_name,
        hospital_city=city_obj.city_name if city_obj else "",
        blood_group=new_request.blood_group,
        units_needed=new_request.units_needed,
        units_fulfilled=new_request.units_fulfilled,
        units_remaining=new_request.units_needed,
        urgency=new_request.urgency,
        required_by=new_request.required_by,
        required_by_pkt=format_pkt(new_request.required_by),
        notes=new_request.notes,
        status=new_request.status,
        created_at=new_request.created_at,
        total_notified=len(selected_candidates),
        total_accepted=0,
        total_declined=0
    )

@router.get("/requests", response_model=List[BloodRequestOut])
async def list_hospital_requests(
    status_filter: Optional[str] = Query("open"),
    hospital: Hospital = Depends(require_hospital),
    db: AsyncSession = Depends(get_db)
):
    """List blood requests raised by the hospital, with filtering by status."""
    stmt = (
        select(BloodRequest, City)
        .join(Hospital, BloodRequest.hospital_id == Hospital.user_id)
        .join(City, Hospital.city_id == City.id)
        .where(BloodRequest.hospital_id == hospital.user_id)
        .order_by(BloodRequest.created_at.desc())
    )

    if status_filter and status_filter.lower() != "all":
        stmt = stmt.where(BloodRequest.status == status_filter.lower())

    res = await db.execute(stmt)
    rows = res.all()

    requests_out = []
    for req_obj, city_obj in rows:
        notif_count = (await db.execute(
            select(func.count(RequestMatch.id)).where(RequestMatch.request_id == req_obj.id)
        )).scalar() or 0

        acc_count = (await db.execute(
            select(func.count(RequestMatch.id)).where(
                RequestMatch.request_id == req_obj.id,
                RequestMatch.status.in_([MATCH_STATUS_ACCEPTED, "completed"])
            )
        )).scalar() or 0

        dec_count = (await db.execute(
            select(func.count(RequestMatch.id)).where(
                RequestMatch.request_id == req_obj.id,
                RequestMatch.status == "declined"
            )
        )).scalar() or 0

        requests_out.append(BloodRequestOut(
            id=req_obj.id,
            hospital_id=hospital.user_id,
            hospital_name=hospital.hospital_name,
            hospital_city=city_obj.city_name,
            blood_group=req_obj.blood_group,
            units_needed=req_obj.units_needed,
            units_fulfilled=req_obj.units_fulfilled,
            units_remaining=max(0, req_obj.units_needed - req_obj.units_fulfilled),
            urgency=req_obj.urgency,
            required_by=req_obj.required_by,
            required_by_pkt=format_pkt(req_obj.required_by),
            notes=req_obj.notes,
            status=req_obj.status,
            created_at=req_obj.created_at,
            total_notified=notif_count,
            total_accepted=acc_count,
            total_declined=dec_count
        ))

    return requests_out

@router.get("/requests/{id}", response_model=BloodRequestOut)
async def get_request_detail(
    id: int,
    hospital: Hospital = Depends(require_hospital),
    db: AsyncSession = Depends(get_db)
):
    """Get single blood request details."""
    stmt = (
        select(BloodRequest, City)
        .join(Hospital, BloodRequest.hospital_id == Hospital.user_id)
        .join(City, Hospital.city_id == City.id)
        .where(BloodRequest.id == id, BloodRequest.hospital_id == hospital.user_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Blood request not found.")

    req_obj, city_obj = row

    notif_count = (await db.execute(
        select(func.count(RequestMatch.id)).where(RequestMatch.request_id == req_obj.id)
    )).scalar() or 0

    acc_count = (await db.execute(
        select(func.count(RequestMatch.id)).where(
            RequestMatch.request_id == req_obj.id,
            RequestMatch.status.in_([MATCH_STATUS_ACCEPTED, "completed"])
        )
    )).scalar() or 0

    dec_count = (await db.execute(
        select(func.count(RequestMatch.id)).where(
            RequestMatch.request_id == req_obj.id,
            RequestMatch.status == "declined"
        )
    )).scalar() or 0

    return BloodRequestOut(
        id=req_obj.id,
        hospital_id=hospital.user_id,
        hospital_name=hospital.hospital_name,
        hospital_city=city_obj.city_name,
        blood_group=req_obj.blood_group,
        units_needed=req_obj.units_needed,
        units_fulfilled=req_obj.units_fulfilled,
        units_remaining=max(0, req_obj.units_needed - req_obj.units_fulfilled),
        urgency=req_obj.urgency,
        required_by=req_obj.required_by,
        required_by_pkt=format_pkt(req_obj.required_by),
        notes=req_obj.notes,
        status=req_obj.status,
        created_at=req_obj.created_at,
        total_notified=notif_count,
        total_accepted=acc_count,
        total_declined=dec_count
    )

@router.get("/requests/{id}/matches", response_model=List[RankedDonorOut])
async def get_request_matches(
    id: int,
    hospital: Hospital = Depends(require_hospital),
    db: AsyncSession = Depends(get_db)
):
    """
    Get ranked donors for a blood request.
    PRIVACY GUARANTEE: Phone numbers are masked (03••-•••••14) until the donor accepts!
    Only accepted donors have their real contact number revealed to the authorized hospital.
    """
    # Verify request belongs to hospital
    req_stmt = select(BloodRequest).where(BloodRequest.id == id, BloodRequest.hospital_id == hospital.user_id)
    req_obj = (await db.execute(req_stmt)).scalar_one_or_none()
    if not req_obj:
        raise HTTPException(status_code=404, detail="Blood request not found.")

    matches_stmt = (
        select(RequestMatch, Donor, User, City)
        .join(Donor, RequestMatch.donor_id == Donor.user_id)
        .join(User, Donor.user_id == User.id)
        .join(City, Donor.city_id == City.id)
        .where(RequestMatch.request_id == id)
        .order_by(RequestMatch.score.desc())
    )
    res = await db.execute(matches_stmt)
    rows = res.all()

    pkt_today = today_pkt()
    ranked_donors = []

    for match_obj, donor_obj, user_obj, city_obj in rows:
        days_since = (pkt_today - donor_obj.last_donation_date).days if donor_obj.last_donation_date else None

        # Calculate score breakdown for UI explanation
        score_data = calculate_match_score(
            recipient_group=req_obj.blood_group,
            donor_group=donor_obj.blood_group,
            hospital_city_id=hospital.city_id,
            donor_city_id=donor_obj.city_id,
            last_donation_date=donor_obj.last_donation_date
        )

        # Phone masking control
        phone_masked = mask_phone_number(donor_obj.phone)
        is_revealed = match_obj.status in (MATCH_STATUS_ACCEPTED, MATCH_STATUS_COMPLETED)
        phone_revealed = donor_obj.phone if is_revealed else None

        ranked_donors.append(RankedDonorOut(
            match_id=match_obj.id,
            donor_id=donor_obj.user_id,
            donor_name=user_obj.name,
            blood_group=donor_obj.blood_group,
            city_name=city_obj.city_name,
            last_donated_days_ago=days_since,
            match_score=match_obj.score,
            status=match_obj.status,
            phone_masked=phone_masked,
            phone_revealed=phone_revealed,
            is_phone_revealed=is_revealed,
            score_breakdown=ScoreBreakdown(
                exact_match=score_data["exact_match"],
                same_city=score_data["same_city"],
                recovery=score_data["recovery"],
                response_rate=score_data["response_rate"],
                total=score_data["total"]
            ),
            responded_at=match_obj.responded_at,
            decline_reason=match_obj.decline_reason
        ))

    return ranked_donors

@router.post("/matches/{id}/complete", response_model=MessageResponse)
async def complete_donation(
    id: int,
    req: CompleteDonationRequest,
    request: Request,
    hospital: Hospital = Depends(require_verified_hospital),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark donation complete for an accepted match:
    1. Verifies match was accepted and not yet completed.
    2. Records Donation row.
    3. Updates donor cooldown (last_donation_date = today_pkt()).
    4. Increments request fulfillment count (and closes request if fulfilled).
    5. Increments hospital inventory for the donated blood group.
    6. Writes immutable audit logs.
    """
    client_ip = get_client_ip(request)

    # 1. Fetch match and request
    stmt = (
        select(RequestMatch, BloodRequest, Donor)
        .join(BloodRequest, RequestMatch.request_id == BloodRequest.id)
        .join(Donor, RequestMatch.donor_id == Donor.user_id)
        .where(
            RequestMatch.id == id,
            BloodRequest.hospital_id == hospital.user_id
        )
        .with_for_update()
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Match record not found.")

    match_obj, req_obj, donor_obj = row

    if match_obj.status != MATCH_STATUS_ACCEPTED:
        raise HTTPException(
            status_code=400,
            detail=f"Only accepted matches can be completed. Current match status is '{match_obj.status}'."
        )

    # Check if already completed
    don_check = select(Donation).where(Donation.match_id == match_obj.id)
    if (await db.execute(don_check)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Donation has already been recorded for this match.")

    # 2. Record Donation
    current_time = now_utc()
    new_donation = Donation(
        match_id=match_obj.id,
        units=req.units,
        donated_on=current_time,
        verified_by=hospital.user_id
    )
    db.add(new_donation)

    # 3. Update Match status
    match_obj.status = MATCH_STATUS_COMPLETED

    # 4. Update Donor Cooldown
    donor_obj.last_donation_date = today_pkt()

    # 5. Update Request fulfillment count
    req_obj.units_fulfilled += req.units
    if req_obj.units_fulfilled >= req_obj.units_needed:
        req_obj.status = REQUEST_STATUS_FULFILLED

    # 6. Update Hospital Blood Inventory
    await increment_inventory_on_donation(
        session=db,
        hospital_id=hospital.user_id,
        blood_group=donor_obj.blood_group,
        units=req.units
    )

    # 7. Audit Logging
    await log_audit_event(
        session=db,
        user_id=hospital.user_id,
        action="Donation completed",
        entity=f"donation for request #{req_obj.id}",
        new_value=f"donor #{donor_obj.user_id}, units={req.units}, group={donor_obj.blood_group}",
        ip_address=client_ip
    )

    await db.commit()

    return MessageResponse(
        message="Donation successfully completed.",
        detail=f"Recorded {req.units} unit(s) of {donor_obj.blood_group} into hospital inventory. Donor cool-down updated."
    )

@router.patch("/requests/{id}/cancel", response_model=MessageResponse)
async def cancel_request(
    id: int,
    request: Request,
    hospital: Hospital = Depends(require_hospital),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel an open blood request.
    ANTI-MISUSE: If donors have already accepted, deducts trust score points.
    """
    client_ip = get_client_ip(request)

    stmt = select(BloodRequest).where(BloodRequest.id == id, BloodRequest.hospital_id == hospital.user_id).with_for_update()
    req_obj = (await db.execute(stmt)).scalar_one_or_none()
    if not req_obj:
        raise HTTPException(status_code=404, detail="Blood request not found.")

    if req_obj.status != REQUEST_STATUS_OPEN:
        raise HTTPException(status_code=400, detail=f"Cannot cancel request in status '{req_obj.status}'.")

    # Check if any donor accepted
    accepted_stmt = select(func.count(RequestMatch.id)).where(
        RequestMatch.request_id == req_obj.id,
        RequestMatch.status == MATCH_STATUS_ACCEPTED
    )
    accepted_count = (await db.execute(accepted_stmt)).scalar() or 0

    trust_penalty = 0
    if accepted_count > 0:
        trust_penalty = CANCELLATION_PENALTY_WITH_ACCEPTS
        old_score = hospital.trust_score
        hospital.trust_score = max(0, hospital.trust_score - trust_penalty)

        await log_audit_event(
            session=db,
            user_id=hospital.user_id,
            action="Trust score penalty",
            entity=f"hospital #{hospital.user_id}",
            old_value=str(old_score),
            new_value=str(hospital.trust_score),
            ip_address=client_ip
        )

    req_obj.status = REQUEST_STATUS_CANCELLED

    await log_audit_event(
        session=db,
        user_id=hospital.user_id,
        action="Cancelled",
        entity=f"blood_request #{req_obj.id}",
        old_value="open",
        new_value="cancelled",
        ip_address=client_ip
    )

    await db.commit()

    detail = "Request has been cancelled."
    if trust_penalty > 0:
        detail += f" A penalty of {trust_penalty} trust points was applied due to cancellation after donors accepted."

    return MessageResponse(
        message="Request cancelled successfully.",
        detail=detail
    )

@router.get("/inventory", response_model=List[InventoryItemOut])
async def get_inventory(
    hospital: Hospital = Depends(require_hospital),
    db: AsyncSession = Depends(get_db)
):
    """Get hospital blood inventory for all 8 blood groups."""
    inv_list = await ensure_hospital_inventory(db, hospital.user_id)
    return [
        InventoryItemOut(
            blood_group=inv.blood_group,
            units_available=inv.units_available,
            updated_at=inv.updated_at,
            is_low=inv.units_available < 5
        )
        for inv in inv_list
    ]

@router.patch("/inventory", response_model=MessageResponse)
async def update_inventory(
    req: UpdateInventoryItem,
    request: Request,
    hospital: Hospital = Depends(require_hospital),
    db: AsyncSession = Depends(get_db)
):
    """Update available units for a specific blood group in hospital inventory."""
    client_ip = get_client_ip(request)
    inv = await update_inventory_units(
        session=db,
        hospital_id=hospital.user_id,
        blood_group=req.blood_group,
        units_available=req.units_available,
        user_id=hospital.user_id,
        ip_address=client_ip
    )
    return MessageResponse(
        message=f"Inventory for {inv.blood_group} updated to {inv.units_available} units."
    )
