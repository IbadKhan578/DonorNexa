from datetime import datetime, timezone, date
from zoneinfo import ZoneInfo
from typing import Optional

PKT_TZ = ZoneInfo("Asia/Karachi")

def now_utc() -> datetime:
    """Current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)

def now_pkt() -> datetime:
    """Current Pakistan Standard Time datetime (timezone-aware)."""
    return datetime.now(PKT_TZ)

def today_pkt() -> date:
    """Current Pakistan Standard Time date."""
    return now_pkt().date()

def to_utc(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware and converted to UTC."""
    if dt.tzinfo is None:
        # If naive, assume it's PKT
        dt = dt.replace(tzinfo=PKT_TZ)
    return dt.astimezone(timezone.utc)

def to_pkt(dt: datetime) -> datetime:
    """Convert a UTC or timezone-aware datetime to Pakistan Standard Time."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(PKT_TZ)

def format_pkt(dt: Optional[datetime], fmt: str = "%d %b %Y, %H:%M") -> str:
    """Format datetime in Pakistan Standard Time."""
    if dt is None:
        return "—"
    return to_pkt(dt).strftime(fmt)

def calculate_age_pkt(dob: date) -> int:
    """
    Calculate donor age accurately using current Pakistan Standard Time date.
    Accounts for whether the birthday has occurred yet this year.
    """
    pkt_today = today_pkt()
    age = pkt_today.year - dob.year
    if (pkt_today.month, pkt_today.day) < (dob.month, dob.day):
        age -= 1
    return age
