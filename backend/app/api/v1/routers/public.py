from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.blood_request import BloodRequest
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.donation import Donation
from app.models.city import City
from app.core.constants import REQUEST_STATUS_OPEN
from app.core.timezone import now_utc, format_pkt

router = APIRouter(prefix="/public", tags=["Public"])

@router.get("/stats")
async def get_public_stats(db: AsyncSession = Depends(get_db)):
    """
    Get aggregated live metrics for the public landing page:
    - Active open requests
    - Registered donors
    - Units fulfilled
    """
    current_time = now_utc()

    # Active requests count
    active_req_stmt = (
        select(func.count(BloodRequest.id))
        .where(
            BloodRequest.status == REQUEST_STATUS_OPEN,
            BloodRequest.required_by > current_time
        )
    )
    active_requests = (await db.execute(active_req_stmt)).scalar() or 0

    # Total donors count
    total_donors_stmt = select(func.count(Donor.user_id))
    total_donors = (await db.execute(total_donors_stmt)).scalar() or 0

    # Total units fulfilled
    fulfilled_stmt = select(func.coalesce(func.sum(Donation.units), 0))
    units_fulfilled = (await db.execute(fulfilled_stmt)).scalar() or 0

    # Total verified hospitals
    hosp_stmt = select(func.count(Hospital.user_id)).where(Hospital.verification_status == "verified")
    total_hospitals = (await db.execute(hosp_stmt)).scalar() or 0

    return {
        "active_requests": active_requests,
        "registered_donors": total_donors,
        "units_fulfilled": units_fulfilled,
        "verified_hospitals": total_hospitals
    }

@router.get("/emergencies")
async def get_public_emergencies(
    blood_group: Optional[str] = Query(None),
    city_id: Optional[int] = Query(None),
    urgency: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Get active blood requests for the public emergencies board.
    STRICT PRIVACY: Excludes patient names, ward details, hospital phone numbers,
    and all donor personal details.
    """
    current_time = now_utc()

    stmt = (
        select(BloodRequest, Hospital, City)
        .join(Hospital, BloodRequest.hospital_id == Hospital.user_id)
        .join(City, Hospital.city_id == City.id)
        .where(
            BloodRequest.status == REQUEST_STATUS_OPEN,
            BloodRequest.required_by > current_time
        )
        .order_by(
            # Order by Critical first, then Urgent, then Normal, then deadline
            BloodRequest.urgency == "critical",
            BloodRequest.urgency == "urgent",
            BloodRequest.required_by.asc()
        )
    )

    if blood_group:
        stmt = stmt.where(BloodRequest.blood_group == blood_group.strip().upper())
    if city_id:
        stmt = stmt.where(Hospital.city_id == city_id)
    if urgency:
        stmt = stmt.where(BloodRequest.urgency == urgency.strip().lower())

    res = await db.execute(stmt)
    rows = res.all()

    emergencies = []
    for req_obj, hosp_obj, city_obj in rows:
        units_rem = max(0, req_obj.units_needed - req_obj.units_fulfilled)
        emergencies.append({
            "id": req_obj.id,
            "blood_group": req_obj.blood_group,
            "units_needed": req_obj.units_needed,
            "units_fulfilled": req_obj.units_fulfilled,
            "units_remaining": units_rem,
            "urgency": req_obj.urgency,
            "hospital_name": hosp_obj.hospital_name,
            "city_name": city_obj.city_name,
            "province": city_obj.province,
            "required_by": req_obj.required_by.isoformat(),
            "required_by_pkt": format_pkt(req_obj.required_by),
            "status": req_obj.status,
            "created_at": req_obj.created_at.isoformat()
        })

    return emergencies

@router.get("/cities")
async def get_public_cities(db: AsyncSession = Depends(get_db)):
    """Get list of supported Pakistani cities and provinces."""
    stmt = select(City).order_by(City.city_name.asc())
    res = await db.execute(stmt)
    cities = res.scalars().all()
    return [
        {"id": c.id, "name": c.city_name, "city_name": c.city_name, "province": c.province}
        for c in cities
    ]
