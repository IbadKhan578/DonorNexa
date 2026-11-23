from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.timezone import now_utc
from app.core.constants import REQUEST_STATUS_OPEN, URGENCY_NORMAL

class BloodRequest(Base):
    __tablename__ = "blood_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.user_id", ondelete="CASCADE"), nullable=False, index=True)
    blood_group = Column(String(10), nullable=False, index=True)
    units_needed = Column(Integer, nullable=False)
    units_fulfilled = Column(Integer, default=0, nullable=False)
    urgency = Column(String(20), default=URGENCY_NORMAL, nullable=False, index=True)
    required_by = Column(DateTime(timezone=True), nullable=False, index=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default=REQUEST_STATUS_OPEN, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    __table_args__ = (
        CheckConstraint("units_needed > 0", name="chk_units_needed_pos"),
        CheckConstraint("units_fulfilled >= 0", name="chk_units_fulfilled_non_neg"),
        Index("idx_requests_status_urg_reqby", "status", "urgency", "required_by"),
    )

    hospital = relationship("Hospital", back_populates="requests")
    matches = relationship("RequestMatch", back_populates="request", cascade="all, delete-orphan")
