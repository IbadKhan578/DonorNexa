from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.db.base import Base

class Donor(Base):
    __tablename__ = "donors"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    blood_group = Column(String(10), nullable=False, index=True)
    dob = Column(Date, nullable=False)
    weight = Column(Float, nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=False)
    last_donation_date = Column(Date, nullable=True)
    is_available = Column(Boolean, default=True, nullable=False, index=True)
    photo_path = Column(String(255), nullable=True)

    __table_args__ = (
        CheckConstraint("weight >= 50.0", name="chk_donor_min_weight"),
        Index("idx_donors_search", "blood_group", "city_id", "is_available"),
    )

    user = relationship("User", back_populates="donor")
    city = relationship("City", back_populates="donors")
    matches = relationship("RequestMatch", back_populates="donor", cascade="all, delete-orphan")
