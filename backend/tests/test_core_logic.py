import pytest
import re
from datetime import date, timedelta
from app.core.constants import (
    CNIC_REGEX, MOBILE_REGEX,
    BLOOD_COMPATIBILITY_MAP
)
from app.services.matching_service import is_blood_compatible, calculate_match_score
from app.core.security import mask_phone_number
from app.core.timezone import calculate_age_pkt, today_pkt

def test_cnic_regex_validation():
    # Valid Pakistan CNIC formats: #####-#######-#
    valid_cnics = [
        "42101-1234567-1",
        "35202-9876543-2",
        "61101-5555555-5",
    ]
    for cnic in valid_cnics:
        assert re.match(CNIC_REGEX, cnic) is not None, f"Failed for valid CNIC: {cnic}"

    # Invalid CNICs
    invalid_cnics = [
        "4210112345671",      # No dashes
        "4210-1234567-1",     # 4 digits in first block
        "42101-123456-1",     # 6 digits in middle block
        "42101-1234567-12",   # 2 digits in last block
        "ABCDE-1234567-1",    # Letters
        "",
    ]
    for cnic in invalid_cnics:
        assert re.match(CNIC_REGEX, cnic) is None, f"Should have failed for invalid CNIC: {cnic}"

def test_pakistan_phone_regex():
    # Valid Pakistan mobile formats: 03XX-XXXXXXX
    valid_phones = [
        "0300-1234567",
        "0321-9876543",
        "0333-5555555",
        "0345-0000000",
    ]
    for phone in valid_phones:
        assert re.match(MOBILE_REGEX, phone) is not None, f"Failed for valid phone: {phone}"

    # Invalid phone numbers
    invalid_phones = [
        "03001234567",        # No dash
        "+923001234567",      # International code not in format
        "042-1234567",        # Landline
        "0300-123456",        # 6 digits after dash
        "0300-12345678",      # 8 digits after dash
        "0200-1234567",       # Does not start with 03
    ]
    for phone in invalid_phones:
        assert re.match(MOBILE_REGEX, phone) is None, f"Should have failed for invalid phone: {phone}"

def test_phone_masking():
    # Privacy protection requirement: 03••-•••••14
    masked = mask_phone_number("0300-1234514")
    assert masked == "03••-•••••14"
    assert "12345" not in masked
    assert masked.startswith("03")
    assert masked.endswith("14")

    # Edge cases
    assert mask_phone_number(None) == "03••-•••••••"
    assert mask_phone_number("") == "03••-•••••••"

def test_blood_compatibility_matrix():
    # O- is universal donor (can donate to all 8 groups)
    recipient_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    for recipient in recipient_groups:
        assert is_blood_compatible(recipient_group=recipient, donor_group="O-") is True

    # AB+ is universal recipient (can receive from all 8 groups)
    for donor in recipient_groups:
        assert is_blood_compatible(recipient_group="AB+", donor_group=donor) is True

    # O- recipient can only receive from O-
    assert is_blood_compatible(recipient_group="O-", donor_group="O+") is False
    assert is_blood_compatible(recipient_group="O-", donor_group="A-") is False
    assert is_blood_compatible(recipient_group="O-", donor_group="B-") is False
    assert is_blood_compatible(recipient_group="O-", donor_group="AB-") is False

    # B+ recipient compatibility
    assert is_blood_compatible(recipient_group="B+", donor_group="B+") is True
    assert is_blood_compatible(recipient_group="B+", donor_group="B-") is True
    assert is_blood_compatible(recipient_group="B+", donor_group="O+") is True
    assert is_blood_compatible(recipient_group="B+", donor_group="O-") is True
    assert is_blood_compatible(recipient_group="B+", donor_group="A+") is False
    assert is_blood_compatible(recipient_group="B+", donor_group="AB+") is False

def test_age_calculation_pkt():
    today = today_pkt()
    # Exactly 25 years old today
    dob_25 = date(today.year - 25, today.month, today.day)
    assert calculate_age_pkt(dob_25) == 25

    # Birthday is tomorrow (should be 24 until tomorrow)
    # Using 1 day offset
    if today.month < 12 or today.day < 28:
        dob_almost = date(today.year - 25, today.month, today.day + 1)
        assert calculate_age_pkt(dob_almost) == 24

def test_matching_score_formula():
    today = date(2026, 11, 22)
    # 1. Exact match, same city, fully recovered
    res_exact_local = calculate_match_score(
        recipient_group="O-",
        donor_group="O-",
        hospital_city_id=1,
        donor_city_id=1,
        last_donation_date=today - timedelta(days=120),
        total_notified=3,
        total_responded=3
    )
    score_exact_local = res_exact_local["total"]

    # 2. Compatible but not exact, different city
    res_diff_city = calculate_match_score(
        recipient_group="B+",
        donor_group="O-",
        hospital_city_id=1,
        donor_city_id=2,
        last_donation_date=today - timedelta(days=95),
        total_notified=2,
        total_responded=1
    )
    score_diff_city = res_diff_city["total"]

    # Exact group + same city must score significantly higher
    assert score_exact_local > score_diff_city
    assert score_exact_local > 80.0
    assert res_exact_local["is_compatible"] is True
    assert res_diff_city["is_compatible"] is True
