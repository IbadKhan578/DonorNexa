from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.timezone import now_utc

class BloodInventory(Base):
    __tablename__ = "blood_inventory"

    hospital_id = Column(Integer, ForeignKey("hospitals.user_id", ondelete="CASCADE"), nullable=False)
    blood_group = Column(String(10), nullable=False)
    units_available = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("hospital_id", "blood_group", name="pk_hospital_blood_inventory"),
        CheckConstraint("units_available >= 0", name="chk_inventory_non_negative"),
    )

    hospital = relationship("Hospital", back_populates="inventory")
