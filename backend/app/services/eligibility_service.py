from datetime import date, timedelta
from typing import Tuple, List, Optional
from app.core.constants import (
    MIN_DONOR_AGE, MAX_DONOR_AGE, MIN_DONOR_WEIGHT,
    DEFAULT_COOLDOWN_DAYS, USER_STATUS_ACTIVE
)
from app.core.timezone import calculate_age_pkt, today_pkt

def check_donor_eligibility(
    dob: date,
    weight: float,
    user_status: str,
    is_available: bool,
    last_donation_date: Optional[date] = None,
    cooldown_days: int = DEFAULT_COOLDOWN_DAYS
) -> Tuple[bool, List[str], Optional[date], int]:
    """
    Dynamically check a donor's eligibility based on:
    - Age (18 to 60 calculated in PKT)
    - Weight (>= 50 kg)
    - User account status ('active')
    - Availability flag ('is_available' == True)
    - Recovery cool-down period from last donation date

    Returns:
    (is_eligible, reasons, eligible_again_date, days_remaining_cooldown)
    """
    reasons = []
    pkt_today = today_pkt()

    # 1. Age check
    age = calculate_age_pkt(dob)
    if age < MIN_DONOR_AGE:
        reasons.append(f"Age {age} is below minimum {MIN_DONOR_AGE} years")
    elif age > MAX_DONOR_AGE:
        reasons.append(f"Age {age} exceeds maximum {MAX_DONOR_AGE} years")

    # 2. Weight check
    if weight < MIN_DONOR_WEIGHT:
        reasons.append(f"Weight {weight} kg is below minimum {MIN_DONOR_WEIGHT} kg")

    # 3. Account status
    if user_status != USER_STATUS_ACTIVE:
        reasons.append(f"Account is currently {user_status}")

    # 4. Availability toggle
    if not is_available:
        reasons.append("Availability is toggled off")

    # 5. Cooldown check
    eligible_again_date = None
    days_remaining = 0
    if last_donation_date is not None:
        cooldown_delta = timedelta(days=cooldown_days)
        eligible_again_date = last_donation_date + cooldown_delta
        days_since = (pkt_today - last_donation_date).days
        if days_since < cooldown_days:
            days_remaining = cooldown_days - days_since
            reasons.append(f"Cool-down in progress: {days_remaining} days remaining until {eligible_again_date.strftime('%d %b %Y')}")

    is_eligible = len(reasons) == 0
    return is_eligible, reasons, eligible_again_date, days_remaining
