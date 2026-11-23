from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, field_validator
from app.core.constants import BLOOD_GROUPS, URGENCIES

class CreateBloodRequest(BaseModel):
    blood_group: str
    units_needed: int
    urgency: str
    required_by: datetime
    notes: Optional[str] = None

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in BLOOD_GROUPS:
            raise ValueError(f"Invalid blood group. Allowed: {', '.join(BLOOD_GROUPS)}")
        return v

    @field_validator("units_needed")
    @classmethod
    def validate_units(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Units needed must be at least 1")
        if v > 6:
            raise ValueError("Maximum 6 units per blood request")
        return v

    @field_validator("urgency")
    @classmethod
    def validate_urgency(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in URGENCIES:
            raise ValueError(f"Invalid urgency. Allowed: {', '.join(URGENCIES)}")
        return v

class BloodRequestOut(BaseModel):
    id: int
    hospital_id: int
    hospital_name: str
    hospital_city: str
    blood_group: str
    units_needed: int
    units_fulfilled: int
    units_remaining: int
    urgency: str
    required_by: datetime
    required_by_pkt: str
    notes: Optional[str] = None
    status: str
    created_at: datetime
    total_notified: int = 0
    total_accepted: int = 0
    total_declined: int = 0

class ScoreBreakdown(BaseModel):
    exact_match: float
    same_city: float
    recovery: float
    response_rate: float
    total: float

class RankedDonorOut(BaseModel):
    match_id: int
    donor_id: int
    donor_name: str
    blood_group: str
    city_name: str
    last_donated_days_ago: Optional[int] = None
    match_score: float
    status: str
    phone_masked: str
    phone_revealed: Optional[str] = None
    is_phone_revealed: bool = False
    score_breakdown: ScoreBreakdown
    responded_at: Optional[datetime] = None
    decline_reason: Optional[str] = None

class HospitalDashboardStats(BaseModel):
    open_requests_count: int
    critical_open_count: int
    critical_slots_remaining: int
    units_fulfilled_30d: int
    fulfillment_rate: float
    donors_matched_today: int
    trust_score: int

class InventoryItemOut(BaseModel):
    blood_group: str
    units_available: int
    updated_at: datetime
    is_low: bool = False

class UpdateInventoryItem(BaseModel):
    blood_group: str
    units_available: int

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in BLOOD_GROUPS:
            raise ValueError(f"Invalid blood group. Allowed: {', '.join(BLOOD_GROUPS)}")
        return v

    @field_validator("units_available")
    @classmethod
    def validate_units(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Units available cannot be negative")
        return v

class CompleteDonationRequest(BaseModel):
    units: int = 1

    @field_validator("units")
    @classmethod
    def validate_units(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Donated units must be at least 1")
        return v

class HospitalProfileOut(BaseModel):
    user_id: int
    hospital_name: str
    email: str
    cnic: str
    phone: str
    licence_no: str
    city_id: int
    city_name: str
    province: str
    verification_status: str
    trust_score: int
    licence_file_path: str
