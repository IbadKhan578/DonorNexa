from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.core.constants import (
    BLOOD_GROUPS, CNIC_PATTERN, MOBILE_PATTERN,
    MIN_DONOR_WEIGHT, MIN_DONOR_AGE, MAX_DONOR_AGE
)
from app.core.timezone import calculate_age_pkt

class DonorRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    cnic: str
    phone: str
    dob: date
    weight: float
    blood_group: str
    city_id: int

    @field_validator("cnic")
    @classmethod
    def validate_cnic(cls, v: str) -> str:
        v = v.strip()
        if not CNIC_PATTERN.match(v):
            raise ValueError("CNIC must follow format #####-#######-# (e.g. 42101-1234567-1)")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not MOBILE_PATTERN.match(v):
            raise ValueError("Mobile number must follow format 03XX-XXXXXXX (e.g. 0312-3456789)")
        return v

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in BLOOD_GROUPS:
            raise ValueError(f"Invalid blood group. Allowed groups: {', '.join(BLOOD_GROUPS)}")
        return v

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v: float) -> float:
        if v < MIN_DONOR_WEIGHT:
            raise ValueError(f"Minimum weight for blood donation is {MIN_DONOR_WEIGHT} kg")
        return v

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, v: date) -> date:
        age = calculate_age_pkt(v)
        if age < MIN_DONOR_AGE:
            raise ValueError(f"Donor must be at least {MIN_DONOR_AGE} years old (calculated in PKT: {age} years)")
        if age > MAX_DONOR_AGE:
            raise ValueError(f"Donor must be at most {MAX_DONOR_AGE} years old (calculated in PKT: {age} years)")
        return v

class HospitalRegisterRequest(BaseModel):
    hospital_name: str
    email: EmailStr
    password: str
    cnic: str
    phone: str
    licence_no: str
    city_id: int

    @field_validator("cnic")
    @classmethod
    def validate_cnic(cls, v: str) -> str:
        v = v.strip()
        if not CNIC_PATTERN.match(v):
            raise ValueError("Representative CNIC must follow format #####-#######-# (e.g. 42101-1234567-1)")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not MOBILE_PATTERN.match(v):
            raise ValueError("Mobile number must follow format 03XX-XXXXXXX (e.g. 0312-3456789)")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    cnic: str
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    donor_profile: Optional[dict] = None
    hospital_profile: Optional[dict] = None
