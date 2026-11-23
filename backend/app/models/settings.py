from sqlalchemy import Column, String, DateTime
from app.db.base import Base
from app.core.timezone import now_utc

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(50), primary_key=True)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)
