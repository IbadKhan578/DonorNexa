from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, field_validator

class AdminAnalyticsOut(BaseModel):
    requests_this_week: int
    requests_last_week_diff: int
    fulfillment_rate: float
    pending_hospitals: int
    open_critical: int
    total_donors: int
    total_hospitals: int
    total_requests: int
    units_fulfilled_total: int
    weekly_requests: List[Dict[str, Any]]
    demand_vs_supply: List[Dict[str, Any]]
    fulfillment_history: List[Dict[str, Any]]
    needs_attention: List[Dict[str, str]]

class HospitalVerificationRequest(BaseModel):
    status: str  # "verified" or "rejected"
    reason: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("verified", "rejected"):
            raise ValueError("Status must be either 'verified' or 'rejected'")
        return v

class UserStatusUpdateRequest(BaseModel):
    status: str  # "active" or "blocked"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("active", "blocked"):
            raise ValueError("Status must be either 'active' or 'blocked'")
        return v

class SystemSettingsOut(BaseModel):
    cooldown_days: int = 90
    top_n_donors: int = 5
    max_open_critical: int = 3
    widen_critical_pool: bool = True
    exact_match_bonus: float = 40.0
    same_city_bonus: float = 25.0

class SystemSettingsUpdate(BaseModel):
    cooldown_days: Optional[int] = None
    top_n_donors: Optional[int] = None
    max_open_critical: Optional[int] = None
    widen_critical_pool: Optional[bool] = None

class CityCreateRequest(BaseModel):
    city_name: str
    province: str

class CityUpdateRequest(BaseModel):
    city_name: Optional[str] = None
    province: Optional[str] = None

class CityOut(BaseModel):
    id: int
    city_name: str
    province: str
    donors_count: int = 0
    hospitals_count: int = 0

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    created_at_pkt: str
