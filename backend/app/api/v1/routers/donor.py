from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.session import get_db
from app.models.user import User
from app.models.donor import Donor
from app.models.city import City
from app.models.match import RequestMatch
from app.models.blood_request import BloodRequest
from app.models.hospital import Hospital
from app.models.donation import Donation
from app.models.settings import SystemSetting
from app.schemas.donor import (
    DonorProfileOut, DonorUpdateProfileRequest,
    AvailabilityToggleRequest, MatchResponseRequest,
    MatchedRequestOut, DonationRecordOut, BadgeOut
)
from app.schemas.common import MessageResponse
from app.core.constants import (
    ROLE_DONOR, MATCH_STATUS_NOTIFIED, MATCH_STATUS_ACCEPTED,
    MATCH_STATUS_DECLINED, DEFAULT_COOLDOWN_DAYS
)
from app.core.timezone import now_utc, format_pkt, calculate_age_pkt
from app.api.deps import require_donor, get_client_ip
from app.services.eligibility_service import check_donor_eligibility
from app.services.allocation_service import accept_match_concurrency_safe, decline_match
from app.services.audit_service import log_audit_event
from app.utils.file_validator import validate_and_save_profile_photo

router = APIRouter(prefix="/donor", tags=["Donor"])

async def get_cooldown_days_setting(db: AsyncSession) -> int:
    stmt = select(SystemSetting).where(SystemSetting.key == "cooldown_days")
    setting = (await db.execute(stmt)).scalar_one_or_none()
    if setting and setting.value.isdigit():
        return int(setting.value)
    return DEFAULT_COOLDOWN_DAYS

@router.get("/profile", response_model=DonorProfileOut)
@router.get("/me", response_model=DonorProfileOut)
async def get_my_profile(
    current_user: User = Depends(require_donor),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the current donor's profile with dynamic eligibility check."""
    stmt = (
        select(Donor, City)
        .join(City, Donor.city_id == City.id)
        .where(Donor.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Donor profile not found.")
    donor_obj, city_obj = row

    cooldown_days = await get_cooldown_days_setting(db)

    # Dynamic eligibility check
    is_eligible, reasons, eligible_again, days_rem = check_donor_eligibility(
        dob=donor_obj.dob,
        weight=donor_obj.weight,
        user_status=current_user.status,
        is_available=donor_obj.is_available,
        last_donation_date=donor_obj.last_donation_date,
        cooldown_days=cooldown_days
    )

    # Total verified donations
    donations_stmt = (
        select(func.count(Donation.id))
        .join(RequestMatch, Donation.match_id == RequestMatch.id)
        .where(RequestMatch.donor_id == current_user.id)
    )
    total_donations = (await db.execute(donations_stmt)).scalar() or 0

    # Response rate
    total_notified_stmt = select(func.count(RequestMatch.id)).where(RequestMatch.donor_id == current_user.id)
    total_notified = (await db.execute(total_notified_stmt)).scalar() or 0

    responded_stmt = (
        select(func.count(RequestMatch.id))
        .where(
            RequestMatch.donor_id == current_user.id,
            RequestMatch.status.in_([MATCH_STATUS_ACCEPTED, MATCH_STATUS_DECLINED, "completed"])
        )
    )
    total_responded = (await db.execute(responded_stmt)).scalar() or 0

    response_rate = round((total_responded / total_notified) * 100.0, 1) if total_notified > 0 else 100.0

    return DonorProfileOut(
        user_id=donor_obj.user_id,
        name=current_user.name,
        email=current_user.email,
        cnic=current_user.cnic,
        phone=donor_obj.phone,
        blood_group=donor_obj.blood_group,
        dob=donor_obj.dob,
        age=calculate_age_pkt(donor_obj.dob),
        weight=donor_obj.weight,
        city_id=donor_obj.city_id,
        city_name=city_obj.city_name,
        province=city_obj.province,
        is_available=donor_obj.is_available,
        is_eligible=is_eligible,
        eligibility_reasons=reasons,
        last_donation_date=donor_obj.last_donation_date,
        eligible_again_date=eligible_again,
        days_remaining_cooldown=days_rem,
        photo_path=donor_obj.photo_path,
        total_donations=total_donations,
        response_rate=response_rate,
        cooldown_days_remaining=days_rem
    )

@router.patch("/profile", response_model=MessageResponse)
@router.patch("/me", response_model=MessageResponse)
async def update_my_profile(
    req: DonorUpdateProfileRequest,
    current_user: User = Depends(require_donor),
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """Update donor profile fields (weight, city, name)."""
    donor_stmt = select(Donor).where(Donor.user_id == current_user.id)
    donor_obj = (await db.execute(donor_stmt)).scalar_one_or_none()
    if not donor_obj:
        raise HTTPException(status_code=404, detail="Donor profile not found.")

    client_ip = get_client_ip(request) if request else None

    if req.name is not None and req.name.strip():
        current_user.name = req.name.strip()
    if req.weight is not None:
        donor_obj.weight = req.weight
    if req.city_id is not None:
        city_stmt = select(City).where(City.id == req.city_id)
        if not (await db.execute(city_stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid city ID.")
        donor_obj.city_id = req.city_id

    await log_audit_event(
        session=db,
        user_id=current_user.id,
        action="Updated profile",
        entity=f"donor #{current_user.id}",
        new_value=f"weight={donor_obj.weight}, city_id={donor_obj.city_id}",
        ip_address=client_ip
    )

    await db.commit()
    return MessageResponse(message="Profile updated successfully.")

@router.patch("/availability", response_model=MessageResponse)
@router.patch("/me/availability", response_model=MessageResponse)
async def toggle_availability(
    req: AvailabilityToggleRequest,
    current_user: User = Depends(require_donor),
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """Toggle donor availability ON/OFF."""
    donor_stmt = select(Donor).where(Donor.user_id == current_user.id)
    donor_obj = (await db.execute(donor_stmt)).scalar_one_or_none()
    if not donor_obj:
        raise HTTPException(status_code=404, detail="Donor profile not found.")

    old_val = donor_obj.is_available
    donor_obj.is_available = req.is_available

    client_ip = get_client_ip(request) if request else None
    await log_audit_event(
        session=db,
        user_id=current_user.id,
        action="Availability toggled",
        entity=f"donor #{current_user.id}",
        old_value=str(old_val),
        new_value=str(req.is_available),
        ip_address=client_ip
    )

    await db.commit()
    return MessageResponse(
        message=f"Availability toggled {'ON' if req.is_available else 'OFF'} successfully."
    )

@router.get("/matches", response_model=List[MatchedRequestOut])
@router.get("/me/matches", response_model=List[MatchedRequestOut])
async def get_my_matches(
    current_user: User = Depends(require_donor),
    db: AsyncSession = Depends(get_db)
):
    """
    Get blood requests matched for the current donor.
    Ordered by urgency (Critical > Urgent > Normal) and match score descending.
    """
    stmt = (
        select(RequestMatch, BloodRequest, Hospital, City)
        .join(BloodRequest, RequestMatch.request_id == BloodRequest.id)
        .join(Hospital, BloodRequest.hospital_id == Hospital.user_id)
        .join(City, Hospital.city_id == City.id)
        .where(
            RequestMatch.donor_id == current_user.id,
            # Show matches that are notified, accepted, or recently declined
            RequestMatch.status.in_([MATCH_STATUS_NOTIFIED, MATCH_STATUS_ACCEPTED])
        )
        .order_by(
            BloodRequest.urgency == "critical",
            BloodRequest.urgency == "urgent",
            RequestMatch.score.desc()
        )
    )

    res = await db.execute(stmt)
    rows = res.all()

    matches = []
    for match_obj, req_obj, hosp_obj, city_obj in rows:
        units_rem = max(0, req_obj.units_needed - req_obj.units_fulfilled)

        # Ward notes only shown if donor accepted
        notes_shown = req_obj.notes if match_obj.status == MATCH_STATUS_ACCEPTED else None

        matches.append(MatchedRequestOut(
            match_id=match_obj.id,
            id=match_obj.id,
            request_id=req_obj.id,
            blood_group=req_obj.blood_group,
            units_needed=req_obj.units_needed,
            units_fulfilled=req_obj.units_fulfilled,
            units_remaining=units_rem,
            urgency=req_obj.urgency,
            hospital_name=hosp_obj.hospital_name,
            hospital_city=city_obj.city_name,
            city_name=city_obj.city_name,
            required_by=req_obj.required_by,
            required_by_pkt=format_pkt(req_obj.required_by),
            deadline=req_obj.required_by.isoformat(),
            match_score=match_obj.score,
            score=match_obj.score,
            status=match_obj.status,
            ward_notes=notes_shown,
            notes=notes_shown,
            hospital_address="Main Blood Bank Dept, Karachi",
            hospital_phone="0300-1112233",
            responded_at=match_obj.responded_at
        ))

    return matches

@router.post("/matches/{id}/respond", response_model=MessageResponse)
@router.post("/me/matches/{id}/respond", response_model=MessageResponse)
async def respond_to_match(
    id: int,
    req: MatchResponseRequest,
    request: Request,
    current_user: User = Depends(require_donor),
    db: AsyncSession = Depends(get_db)
):
    """
    Accept or decline a matched blood request.
    Acceptance is protected by PostgreSQL row-level locks (SELECT ... FOR UPDATE)
    to prevent race conditions and over-allocation.
    """
    client_ip = get_client_ip(request)
    cooldown_days = await get_cooldown_days_setting(db)

    if req.action == "accept":
        await accept_match_concurrency_safe(
            session=db,
            match_id=id,
            donor_user_id=current_user.id,
            ip_address=client_ip,
            cooldown_days=cooldown_days
        )
        return MessageResponse(
            message="Request accepted successfully.",
            detail="Your contact number has been shared with the hospital blood bank for direct coordination."
        )
    else:
        await decline_match(
            session=db,
            match_id=id,
            donor_user_id=current_user.id,
            reason=req.decline_reason,
            ip_address=client_ip
        )
        return MessageResponse(message="Request declined.")

@router.get("/donations", response_model=List[DonationRecordOut])
@router.get("/me/donations", response_model=List[DonationRecordOut])
async def get_my_donations(
    current_user: User = Depends(require_donor),
    db: AsyncSession = Depends(get_db)
):
    """Get verified past blood donation history."""
    stmt = (
        select(Donation, RequestMatch, BloodRequest, Hospital, City)
        .join(RequestMatch, Donation.match_id == RequestMatch.id)
        .join(BloodRequest, RequestMatch.request_id == BloodRequest.id)
        .join(Hospital, Donation.verified_by == Hospital.user_id)
        .join(City, Hospital.city_id == City.id)
        .where(RequestMatch.donor_id == current_user.id)
        .order_by(Donation.donated_on.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    donations = []
    for don_obj, match_obj, req_obj, hosp_obj, city_obj in rows:
        formatted_date = format_pkt(don_obj.donated_on, "%d %b %Y")
        donations.append(DonationRecordOut(
            id=don_obj.id,
            match_id=match_obj.id,
            hospital_name=hosp_obj.hospital_name,
            hospital_city=city_obj.city_name,
            blood_group=req_obj.blood_group,
            units=don_obj.units,
            donated_on=don_obj.donated_on,
            donated_on_pkt=formatted_date,
            donation_date=formatted_date,
            verified_by=hosp_obj.hospital_name,
            status="Donated"
        ))

    return donations

@router.get("/badges", response_model=List[BadgeOut])
@router.get("/me/badges", response_model=List[BadgeOut])
async def get_my_badges(
    current_user: User = Depends(require_donor),
    db: AsyncSession = Depends(get_db)
):
    """
    Get gamification badges earned based on verified donation records:
    - 1 Donation: First drop
    - 5 Donations: Fifth donation
    - 10 Donations: Tenth donation
    - 25 Donations: Quarter-century
    """
    stmt = (
        select(func.count(Donation.id))
        .join(RequestMatch, Donation.match_id == RequestMatch.id)
        .where(RequestMatch.donor_id == current_user.id)
    )
    count = (await db.execute(stmt)).scalar() or 0

    badge_defs = [
        {"id": "b1", "milestone": 1, "title": "First drop", "desc": "Completed your first blood donation."},
        {"id": "b5", "milestone": 5, "title": "Fifth donation", "desc": "Honoured life saver — 5 donations verified."},
        {"id": "b10", "milestone": 10, "title": "Tenth donation", "desc": "Pillar of hope — 10 lives touched."},
        {"id": "b25", "milestone": 25, "title": "Quarter-century", "desc": "Distinguished hero — 25 lifetime donations."}
    ]

    badges = []
    for b in badge_defs:
        unlocked = count >= b["milestone"]
        badges.append(BadgeOut(
            id=b["id"],
            milestone=b["milestone"],
            title=b["title"],
            description=b["desc"],
            unlocked=unlocked,
            unlocked_at=None,
            progress=min(count, b["milestone"]),
            target=b["milestone"]
        ))

    return badges

@router.post("/me/photo", response_model=MessageResponse)
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_donor),
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """Upload donor profile photo (JPG/PNG, max 2MB, magic byte validated)."""
    donor_stmt = select(Donor).where(Donor.user_id == current_user.id)
    donor_obj = (await db.execute(donor_stmt)).scalar_one_or_none()
    if not donor_obj:
        raise HTTPException(status_code=404, detail="Donor profile not found.")

    photo_path = await validate_and_save_profile_photo(file)
    donor_obj.photo_path = photo_path

    client_ip = get_client_ip(request) if request else None
    await log_audit_event(
        session=db,
        user_id=current_user.id,
        action="Updated photo",
        entity=f"donor #{current_user.id}",
        new_value=photo_path,
        ip_address=client_ip
    )

    await db.commit()
    return MessageResponse(
        message="Profile photo uploaded successfully.",
        detail=photo_path
    )
