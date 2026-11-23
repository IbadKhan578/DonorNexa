from sqlalchemy import Column, Integer, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.timezone import now_utc

class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey("request_matches.id", ondelete="CASCADE"), unique=True, nullable=False)
    units = Column(Integer, default=1, nullable=False)
    donated_on = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    verified_by = Column(Integer, ForeignKey("hospitals.user_id"), nullable=False)

    __table_args__ = (
        CheckConstraint("units > 0", name="chk_donation_units_pos"),
    )

    match = relationship("RequestMatch", back_populates="donation")
    hospital = relationship("Hospital")
