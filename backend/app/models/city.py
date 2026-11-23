from sqlalchemy import Column, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class City(Base):
    __tablename__ = "cities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    city_name = Column(String(100), nullable=False, index=True)
    province = Column(String(100), nullable=False)

    __table_args__ = (
        UniqueConstraint("city_name", "province", name="uq_city_province"),
    )

    donors = relationship("Donor", back_populates="city")
    hospitals = relationship("Hospital", back_populates="city")
