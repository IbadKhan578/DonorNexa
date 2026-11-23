from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.constants import HOSPITAL_STATUS_PENDING, INITIAL_TRUST_SCORE

class Hospital(Base):
    __tablename__ = "hospitals"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    hospital_name = Column(String(200), nullable=False, index=True)
    licence_no = Column(String(100), unique=True, nullable=False, index=True)
    licence_file_path = Column(String(255), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False, index=True)
    verification_status = Column(String(20), default=HOSPITAL_STATUS_PENDING, nullable=False, index=True)
    trust_score = Column(Integer, default=INITIAL_TRUST_SCORE, nullable=False)

    user = relationship("User", back_populates="hospital")
    city = relationship("City", back_populates="hospitals")
    requests = relationship("BloodRequest", back_populates="hospital", cascade="all, delete-orphan")
    inventory = relationship("BloodInventory", back_populates="hospital", cascade="all, delete-orphan")
