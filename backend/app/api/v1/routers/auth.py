from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.city import City
from app.schemas.auth import DonorRegisterRequest, LoginRequest, TokenResponse, UserOut
from app.schemas.common import MessageResponse
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.core.constants import (
    ROLE_DONOR, ROLE_HOSPITAL, USER_STATUS_ACTIVE,
    USER_STATUS_BLOCKED, HOSPITAL_STATUS_PENDING,
    CNIC_PATTERN, MOBILE_PATTERN
)
from app.core.timezone import now_utc, calculate_age_pkt
from app.core.config import settings
from app.api.deps import get_client_ip, get_current_user
from app.services.audit_service import log_audit_event
from app.utils.file_validator import validate_and_save_licence_pdf

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_cookie_security_params():
    is_prod = settings.ENVIRONMENT.lower() == "production"
    return {
        "secure": is_prod,
        "samesite": "none" if is_prod else "lax"
    }

@router.post("/register/donor", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_donor(
    req: DonorRegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Register a new blood donor and return authentication tokens."""
    client_ip = get_client_ip(request)

    # 1. Check existing email or CNIC
    stmt = select(User).where((User.email == req.email) | (User.cnic == req.cnic))
    existing_user = (await db.execute(stmt)).scalar_one_or_none()
    if existing_user:
        if existing_user.email == req.email:
            raise HTTPException(status_code=400, detail="Email is already registered.")
        else:
            raise HTTPException(status_code=400, detail="CNIC is already registered.")

    # 2. Check existing phone
    phone_stmt = select(Donor).where(Donor.phone == req.phone)
    if (await db.execute(phone_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mobile number is already registered.")

    # 3. Check city exists
    city_stmt = select(City).where(City.id == req.city_id)
    city_obj = (await db.execute(city_stmt)).scalar_one_or_none()
    if not city_obj:
        raise HTTPException(status_code=400, detail="Selected city is not supported.")

    # 4. Create User
    new_user = User(
        name=req.name,
        email=req.email,
        cnic=req.cnic,
        password_hash=get_password_hash(req.password),
        role=ROLE_DONOR,
        status=USER_STATUS_ACTIVE,
        created_at=now_utc()
    )
    db.add(new_user)
    await db.flush()

    # 5. Create Donor Profile
    new_donor = Donor(
        user_id=new_user.id,
        blood_group=req.blood_group,
        dob=req.dob,
        weight=req.weight,
        city_id=req.city_id,
        phone=req.phone,
        is_available=True,
        last_donation_date=None
    )
    db.add(new_donor)

    # 6. Audit log
    await log_audit_event(
        session=db,
        user_id=new_user.id,
        action="Registered",
        entity=f"donor #{new_user.id}",
        new_value=f"role={ROLE_DONOR}, blood_group={req.blood_group}, city={city_obj.city_name}",
        ip_address=client_ip
    )

    await db.commit()
    await db.refresh(new_user)
    await db.refresh(new_donor)

    # Generate tokens
    access_token = create_access_token(subject=new_user.id, role=new_user.role)
    refresh_token = create_refresh_token(subject=new_user.id, role=new_user.role)

    # Set HttpOnly refresh token cookie
    cookie_params = get_cookie_security_params()
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=cookie_params["secure"],
        samesite=cookie_params["samesite"],
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

    return TokenResponse(
        access_token=access_token,
        user=UserOut.model_validate(new_user),
        donor_profile={
            "user_id": new_donor.user_id,
            "blood_group": new_donor.blood_group,
            "city_id": new_donor.city_id,
            "city_name": city_obj.city_name,
            "province": city_obj.province,
            "is_available": new_donor.is_available,
            "weight": new_donor.weight
        }
    )

@router.post("/register/hospital", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register_hospital(
    request: Request,
    hospital_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    cnic: str = Form(...),
    phone: Optional[str] = Form(None),
    focal_person_phone: Optional[str] = Form(None),
    licence_no: Optional[str] = Form(None),
    registration_number: Optional[str] = Form(None),
    city_id: int = Form(...),
    licence_file: Optional[UploadFile] = File(None),
    license_doc: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new hospital with PDF licence document.
    Defaults to 'pending' verification by an administrator.
    """
    client_ip = get_client_ip(request)

    actual_phone = (phone or focal_person_phone or "").strip()
    actual_licence_no = (licence_no or registration_number or "").strip()
    actual_file = licence_file or license_doc

    if not actual_phone:
        raise HTTPException(status_code=400, detail="Mobile phone number is required.")
    if not actual_licence_no:
        raise HTTPException(status_code=400, detail="Hospital medical licence number is required.")
    if not actual_file:
        raise HTTPException(status_code=400, detail="Medical licence document file is required.")

    # Validate regex
    if not CNIC_PATTERN.match(cnic.strip()):
        raise HTTPException(status_code=400, detail="CNIC must follow format #####-#######-#")
    if not MOBILE_PATTERN.match(actual_phone):
        raise HTTPException(status_code=400, detail="Mobile number must follow format 03XX-XXXXXXX")

    # 1. Check existing email or CNIC
    stmt = select(User).where((User.email == email.strip().lower()) | (User.cnic == cnic.strip()))
    existing_user = (await db.execute(stmt)).scalar_one_or_none()
    if existing_user:
        if existing_user.email == email.strip().lower():
            raise HTTPException(status_code=400, detail="Email is already registered.")
        else:
            raise HTTPException(status_code=400, detail="Representative CNIC is already registered.")

    # 2. Check licence number
    lic_stmt = select(Hospital).where(Hospital.licence_no == actual_licence_no)
    if (await db.execute(lic_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Hospital licence number is already registered.")

    # 3. Check city exists
    city_stmt = select(City).where(City.id == city_id)
    city_obj = (await db.execute(city_stmt)).scalar_one_or_none()
    if not city_obj:
        raise HTTPException(status_code=400, detail="Selected city is not supported.")

    # 4. Save and validate medical licence PDF
    licence_file_path = await validate_and_save_licence_pdf(actual_file)

    # 5. Create User
    new_user = User(
        name=hospital_name.strip(),
        email=email.strip().lower(),
        cnic=cnic.strip(),
        password_hash=get_password_hash(password),
        role=ROLE_HOSPITAL,
        status=USER_STATUS_ACTIVE,
        created_at=now_utc()
    )
    db.add(new_user)
    await db.flush()

    # 6. Create Hospital Profile
    new_hospital = Hospital(
        user_id=new_user.id,
        hospital_name=hospital_name.strip(),
        licence_no=actual_licence_no,
        licence_file_path=licence_file_path,
        city_id=city_id,
        verification_status=HOSPITAL_STATUS_PENDING,
        trust_score=100
    )
    db.add(new_hospital)

    # 7. Audit log
    await log_audit_event(
        session=db,
        user_id=new_user.id,
        action="Registered",
        entity=f"hospital #{new_user.id}",
        new_value=f"licence={actual_licence_no}, city={city_obj.city_name}, status=pending",
        ip_address=client_ip
    )

    await db.commit()

    return MessageResponse(
        message="Hospital registration submitted successfully.",
        detail="Your medical licence document is under review by our administration team. You will be able to raise blood requests once verified."
    )

@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return access token with HttpOnly refresh cookie."""
    client_ip = get_client_ip(request)

    stmt = select(User).where(User.email == req.email.strip().lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if user.status == USER_STATUS_BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been blocked by an administrator."
        )

    donor_profile = None
    hospital_profile = None

    if user.role == ROLE_DONOR:
        donor_stmt = select(Donor, City).join(City, Donor.city_id == City.id).where(Donor.user_id == user.id)
        d_res = await db.execute(donor_stmt)
        row = d_res.first()
        if row:
            d_obj, c_obj = row
            donor_profile = {
                "user_id": d_obj.user_id,
                "blood_group": d_obj.blood_group,
                "phone": d_obj.phone,
                "city_id": d_obj.city_id,
                "city_name": c_obj.city_name,
                "province": c_obj.province,
                "is_available": d_obj.is_available,
                "weight": d_obj.weight,
                "dob": d_obj.dob.isoformat()
            }

    elif user.role == ROLE_HOSPITAL:
        hosp_stmt = select(Hospital, City).join(City, Hospital.city_id == City.id).where(Hospital.user_id == user.id)
        h_res = await db.execute(hosp_stmt)
        row = h_res.first()
        if row:
            h_obj, c_obj = row
            hospital_profile = {
                "user_id": h_obj.user_id,
                "hospital_name": h_obj.hospital_name,
                "licence_no": h_obj.licence_no,
                "city_id": h_obj.city_id,
                "city_name": c_obj.city_name,
                "province": c_obj.province,
                "verification_status": h_obj.verification_status,
                "trust_score": h_obj.trust_score
            }

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    # Set HttpOnly refresh cookie
    cookie_params = get_cookie_security_params()
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=cookie_params["secure"],
        samesite=cookie_params["samesite"],
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

    await log_audit_event(
        session=db,
        user_id=user.id,
        action="Login",
        entity=f"user #{user.id}",
        new_value=f"role={user.role}",
        ip_address=client_ip
    )
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        user=UserOut.model_validate(user),
        donor_profile=donor_profile,
        hospital_profile=hospital_profile
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Generate new access token using HttpOnly refresh cookie."""
    token = request.cookies.get("refresh_token")
    if not token:
        # Check Authorization header as fallback
        auth_hdr = request.headers.get("authorization")
        if auth_hdr and auth_hdr.startswith("Bearer "):
            token = auth_hdr[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing."
        )

    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    user_id = payload.get("sub")
    stmt = select(User).where(User.id == int(user_id))
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or user.status == USER_STATUS_BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account blocked."
        )

    new_access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id, role=user.role)

    cookie_params = get_cookie_security_params()
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=cookie_params["secure"],
        samesite=cookie_params["samesite"],
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

    donor_profile = None
    hospital_profile = None
    if user.role == ROLE_DONOR:
        donor_stmt = select(Donor, City).join(City, Donor.city_id == City.id).where(Donor.user_id == user.id)
        row = (await db.execute(donor_stmt)).first()
        if row:
            d_obj, c_obj = row
            donor_profile = {
                "user_id": d_obj.user_id,
                "blood_group": d_obj.blood_group,
                "phone": d_obj.phone,
                "city_id": d_obj.city_id,
                "city_name": c_obj.city_name,
                "province": c_obj.province,
                "is_available": d_obj.is_available,
                "weight": d_obj.weight,
                "dob": d_obj.dob.isoformat()
            }
    elif user.role == ROLE_HOSPITAL:
        hosp_stmt = select(Hospital, City).join(City, Hospital.city_id == City.id).where(Hospital.user_id == user.id)
        row = (await db.execute(hosp_stmt)).first()
        if row:
            h_obj, c_obj = row
            hospital_profile = {
                "user_id": h_obj.user_id,
                "hospital_name": h_obj.hospital_name,
                "licence_no": h_obj.licence_no,
                "city_id": h_obj.city_id,
                "city_name": c_obj.city_name,
                "province": c_obj.province,
                "verification_status": h_obj.verification_status,
                "trust_score": h_obj.trust_score
            }

    return TokenResponse(
        access_token=new_access_token,
        user=UserOut.model_validate(user),
        donor_profile=donor_profile,
        hospital_profile=hospital_profile
    )

@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    """Clear HttpOnly refresh token cookie on logout."""
    cookie_params = get_cookie_security_params()
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=cookie_params["secure"],
        samesite=cookie_params["samesite"]
    )
    return MessageResponse(message="Successfully logged out.")
