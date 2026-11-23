from datetime import date
from typing import Dict, Any, List, Optional
from app.core.constants import (
    BLOOD_COMPATIBILITY_MAP, EXACT_MATCH_BONUS,
    COMPATIBLE_MATCH_BONUS, SAME_CITY_BONUS,
    MAX_RECOVERY_SCORE, MAX_RESPONSE_RATE_SCORE,
    RECOVERY_CAP_DAYS
)
from app.core.timezone import today_pkt

def is_blood_compatible(recipient_group: str, donor_group: str) -> bool:
    """Check if donor blood group is compatible with recipient blood group."""
    compatible_donors = BLOOD_COMPATIBILITY_MAP.get(recipient_group.upper(), [])
    return donor_group.upper() in compatible_donors

def calculate_match_score(
    recipient_group: str,
    donor_group: str,
    hospital_city_id: int,
    donor_city_id: int,
    last_donation_date: Optional[date] = None,
    total_notified: int = 0,
    total_responded: int = 0
) -> Dict[str, Any]:
    """
    Compute matching score using the formula:
    Score = Exact Group Bonus + Same City Bonus + Recovery Fairness Factor + Response Rate Factor
    """
    recipient_group = recipient_group.upper()
    donor_group = donor_group.upper()

    # 1. Blood Group Compatibility & Exact Bonus
    if donor_group == recipient_group:
        exact_match = EXACT_MATCH_BONUS
    elif is_blood_compatible(recipient_group, donor_group):
        exact_match = COMPATIBLE_MATCH_BONUS
    else:
        # Incompatible
        return {
            "exact_match": 0.0,
            "same_city": 0.0,
            "recovery": 0.0,
            "response_rate": 0.0,
            "total": 0.0,
            "is_compatible": False
        }

    # 2. Same City Bonus
    same_city = SAME_CITY_BONUS if donor_city_id == hospital_city_id else 0.0

    # 3. Recovery Fairness Factor
    pkt_today = today_pkt()
    if last_donation_date is None:
        # Never donated before: full recovery score to encourage participation
        recovery = MAX_RECOVERY_SCORE
        days_since = None
    else:
        days_since = max(0, (pkt_today - last_donation_date).days)
        ratio = min(days_since, RECOVERY_CAP_DAYS) / float(RECOVERY_CAP_DAYS)
        recovery = round(ratio * MAX_RECOVERY_SCORE, 1)

    # 4. Response Rate Factor
    if total_notified == 0:
        # New donor without prior notifications: grant full response rate score
        response_rate = MAX_RESPONSE_RATE_SCORE
    else:
        rate = total_responded / float(total_notified)
        response_rate = round(rate * MAX_RESPONSE_RATE_SCORE, 1)

    total_score = round(exact_match + same_city + recovery + response_rate, 1)

    return {
        "exact_match": exact_match,
        "same_city": same_city,
        "recovery": recovery,
        "response_rate": response_rate,
        "total": total_score,
        "is_compatible": True,
        "days_since_last_donation": days_since
    }
