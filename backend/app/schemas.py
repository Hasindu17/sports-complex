from pydantic import BaseModel
from typing import Optional , List
from datetime import datetime

class BookingCreate(BaseModel):
    name:      str
    contact:   str
    facility:  str
    date:      str
    time_slot: str
    notes:     Optional[str] = None

class BookingResponse(BaseModel):
    id:         int
    name:       str
    contact:    str
    facility:   str
    date:       str
    time_slot:  str
    notes:      Optional[str]
    is_active:  bool
    created_at: datetime

    
class BulkBookingCreate(BaseModel):
    name:  str
    contact: str
    facility: str
    date: str
    time_slots: List[str]   
    notes: Optional[str] = None
    
    
    class Config:
        from_attributes = True


class MembershipCreate(BaseModel):
    name:       str
    contact:    str
    plan:       str
    start_date: str
    notes:      Optional[str] = None


class MembershipResponse(BaseModel):
    id:         int
    name:       str
    contact:    str
    plan:       str
    start_date: str
    status:     str
    notes:      Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

        