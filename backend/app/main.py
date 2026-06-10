from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from . import models, schemas
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Apex Sports Complex API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# All available time slots
ALL_SLOTS = [
    "6:00 AM - 7:00 AM",
    "7:00 AM - 8:00 AM",
    "8:00 AM - 9:00 AM",
    "10:00 AM - 11:00 AM",
    "2:00 PM - 3:00 PM",
    "4:00 PM - 5:00 PM",
    "6:00 PM - 7:00 PM",
    "7:00 PM - 8:00 PM"
]

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "apex-sports-complex-api"}

@app.get("/api/availability")
def check_availability(facility: str, date: str, db: Session = Depends(get_db)):
    """Returns booked and available slots for a facility on a date"""
    booked = db.query(models.Booking.time_slot).filter(
        and_(
            models.Booking.facility  == facility,
            models.Booking.date      == date,
            models.Booking.is_active == True
        )
    ).all()

    booked_slots = [b.time_slot for b in booked]
    available_slots = [s for s in ALL_SLOTS if s not in booked_slots]

    return {
        "facility":        facility,
        "date":            date,
        "booked_slots":    booked_slots,
        "available_slots": available_slots,
        "total_slots":     len(ALL_SLOTS),
        "booked_count":    len(booked_slots),
        "available_count": len(available_slots)
    }

@app.post("/api/bookings", response_model=schemas.BookingResponse, status_code=201)
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    """Create a booking — rejects if slot already taken"""
    existing = db.query(models.Booking).filter(
        and_(
            models.Booking.facility  == booking.facility,
            models.Booking.date      == booking.date,
            models.Booking.time_slot == booking.time_slot,
            models.Booking.is_active == True
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sorry! This slot is already booked. Please choose another time."
        )

    db_booking = models.Booking(**booking.model_dump())
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

@app.get("/api/admin/bookings", response_model=List[schemas.BookingResponse])
def get_all_bookings(
    facility: Optional[str] = None,
    date:     Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Admin endpoint — returns all bookings"""
    query = db.query(models.Booking).filter(models.Booking.is_active == True)
    if facility:
        query = query.filter(models.Booking.facility == facility)
    if date:
        query = query.filter(models.Booking.date == date)
    return query.order_by(models.Booking.date, models.Booking.time_slot).all()

@app.delete("/api/bookings/{booking_id}")
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    """Cancel a booking"""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.is_active = False
    db.commit()
    return {"message": f"Booking #{booking_id} cancelled"}
@app.post("/api/bookings/bulk")
def create_bulk_booking(
    booking: schemas.BulkBookingCreate,
    db: Session = Depends(get_db)
):
    created = []

    # Check all slots first
    for slot in booking.time_slots:

        existing = db.query(models.Booking).filter(
            and_(
                models.Booking.facility == booking.facility,
                models.Booking.date == booking.date,
                models.Booking.time_slot == slot,
                models.Booking.is_active == True
            )
        ).first()

        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Slot already booked: {slot}"
            )

    # Create bookings
    for slot in booking.time_slots:

        db_booking = models.Booking(
            name=booking.name,
            contact=booking.contact,
            facility=booking.facility,
            date=booking.date,
            time_slot=slot,
            notes=booking.notes,
            is_active=True
        )

        db.add(db_booking)
        created.append(db_booking)

    db.commit()

    return {
        "message": "Booking successful",
        "booked_count": len(created)
    }


@app.post("/api/memberships", response_model=schemas.MembershipResponse, status_code=201)
def create_membership(membership: schemas.MembershipCreate, db: Session = Depends(get_db)):
    """Register a new membership"""
    db_membership = models.Membership(**membership.model_dump())
    db.add(db_membership)
    db.commit()
    db.refresh(db_membership)
    return db_membership


@app.get("/api/admin/memberships", response_model=List[schemas.MembershipResponse])
def get_all_memberships(
    plan: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Admin endpoint — returns all memberships"""
    query = db.query(models.Membership)
    if plan:
        query = query.filter(models.Membership.plan == plan)
    return query.order_by(models.Membership.created_at.desc()).all()