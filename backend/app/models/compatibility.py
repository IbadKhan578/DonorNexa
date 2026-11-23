from sqlalchemy import Column, String, Boolean, PrimaryKeyConstraint
from app.db.base import Base

class BloodCompatibility(Base):
    __tablename__ = "blood_compatibility"

    recipient_group = Column(String(10), nullable=False)
    donor_group = Column(String(10), nullable=False)
    is_exact_match = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("recipient_group", "donor_group", name="pk_blood_compatibility"),
    )
