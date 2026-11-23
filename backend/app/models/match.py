from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.constants import MATCH_STATUS_NOTIFIED

class RequestMatch(Base):
    __tablename__ = "request_matches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey("blood_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    donor_id = Column(Integer, ForeignKey("donors.user_id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    status = Column(String(20), default=MATCH_STATUS_NOTIFIED, nullable=False, index=True)
    decline_reason = Column(Text, nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("request_id", "donor_id", name="uq_request_donor_match"),
        Index("idx_matches_donor_status", "donor_id", "status"),
    )

    request = relationship("BloodRequest", back_populates="matches")
    donor = relationship("Donor", back_populates="matches")
    donation = relationship("Donation", back_populates="match", uselist=False, cascade="all, delete-orphan")
