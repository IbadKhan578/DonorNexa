from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.timezone import now_utc
from app.core.constants import ROLE_DONOR, USER_STATUS_ACTIVE

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    cnic = Column(String(20), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=ROLE_DONOR, index=True)
    status = Column(String(20), nullable=False, default=USER_STATUS_ACTIVE, index=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    donor = relationship("Donor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    hospital = relationship("Hospital", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
