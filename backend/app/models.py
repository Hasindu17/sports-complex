from sqlalchemy import Column, Integer, String, DateTime, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from .database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False)
    contact    = Column(String(100), nullable=False)
    facility   = Column(String(100), nullable=False)
    date       = Column(String(20),  nullable=False)
    time_slot  = Column(String(50),  nullable=False)
    notes      = Column(String(500), nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Membership(Base):
    __tablename__ = "memberships"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False)
    contact    = Column(String(100), nullable=False)
    plan       = Column(String(50),  nullable=False)       # Starter, Pro, Elite
    start_date = Column(String(20),  nullable=False)       # YYYY-MM-DD
    status     = Column(String(50),  default="Pending")    # Pending, Active, Cancelled
    notes      = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())