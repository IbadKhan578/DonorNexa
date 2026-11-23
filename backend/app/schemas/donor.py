from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, field_validator
from app.core.constants import MIN_DONOR_WEIGHT

class DonorProfileOut(BaseModel):
    user_id: int
    name: str
    email: str
    cnic: str
    phone: str
    blood_group: str
    dob: date
    age: int
    weight: float
    city_id: int
    city_name: str
    province: str
    is_available: bool
    is_eligible: bool
    eligibility_reasons: List[str]
    last_donation_date: Optional[date] = None
    eligible_again_date: Optional[date] = None
    days_remaining_cooldown: int = 0
    cooldown_days_remaining: int = 0
    photo_path: Optional[str] = None
    total_donations: int = 0
    response_rate: float = 0.0

class DonorUpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    weight: Optional[float] = None
    city_id: Optional[int] = None

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < MIN_DONOR_WEIGHT:
            raise ValueError(f"Weight must be at least {MIN_DONOR_WEIGHT} kg")
        return v

class AvailabilityToggleRequest(BaseModel):
    is_available: bool

class MatchResponseRequest(BaseModel):
    action: str  # "accept" or "decline"
    decline_reason: Optional[str] = None

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("accept", "decline"):
            raise ValueError("Action must be either 'accept' or 'decline'")
        return v

class MatchedRequestOut(BaseModel):
    match_id: int
    id: Optional[int] = None
    request_id: int
    blood_group: str
    units_needed: int
    units_fulfilled: int
    units_remaining: int
    urgency: str
    hospital_name: str
    hospital_city: str
    city_name: Optional[str] = None
    required_by: datetime
    required_by_pkt: str
    deadline: Optional[str] = None
    match_score: float
    score: Optional[float] = None
    status: str
    ward_notes: Optional[str] = None
    notes: Optional[str] = None
    hospital_address: Optional[str] = None
    hospital_phone: Optional[str] = None
    responded_at: Optional[datetime] = None

class DonationRecordOut(BaseModel):
    id: int
    match_id: int
    hospital_name: str
    hospital_city: str
    blood_group: str
    units: int
    donated_on: datetime
    donated_on_pkt: str
    donation_date: Optional[str] = None
    verified_by: Optional[str] = None
    status: str = "Donated"

class BadgeOut(BaseModel):
    id: str
    milestone: int
    title: str
    description: str
    unlocked: bool
    unlocked_at: Optional[str] = None
    progress: int = 0
    target: int = 0
