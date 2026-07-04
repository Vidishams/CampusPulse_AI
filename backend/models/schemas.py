"""
Pydantic schemas for every collection.

Split into *Create* (what the client sends), *InDB* (what's stored, incl.
server-generated fields) and *Out* (what we return -- never leaks the
password hash) so we don't accidentally serialize sensitive fields back
to the client.
"""
import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Annotated
from datetime import datetime
from enum import Enum

ID_REGEX = r"^[A-Z]\d{2}[A-Z]{2}\d{3}$"
ValidIdStr = Annotated[str, Field(min_length=8, max_length=8, pattern=ID_REGEX)]


class Role(str, Enum):
    student = "student"
    faculty = "faculty"
    admin = "admin"


class PublicRole(str, Enum):
    """
    Roles selectable on the public /register form. "admin" is deliberately
    excluded -- admin accounts are created only by seeding the database
    directly (see backend/scripts/create_admin.py) or by an existing admin
    promoting an existing user via PATCH /api/users/{id}/role. This closes
    the gap where anyone could self-register as an administrator.
    """
    student = "student"
    faculty = "faculty"


class Category(str, Enum):
    placement = "Placement"
    exam = "Exam"
    workshop = "Workshop"
    club = "Club"
    circular = "Circular"
    holiday = "Holiday"
    scholarship = "Scholarship"
    internship = "Internship"


# ---------- Users ----------
class UserCreate(BaseModel):
    """
    Note: department and semester are NOT accepted here for students --
    they're pulled from the roster record matched by `srn`, so a user
    can't just type "Computer Science, Sem 5" and have it be true. See
    the roster-matching logic in routes/auth_routes.py.
    """
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: PublicRole = PublicRole.student
    srn: Optional[ValidIdStr] = None          # required when role == student
    employeeId: Optional[ValidIdStr] = None   # required when role == faculty
    interests: List[str] = []

    @field_validator("srn", "employeeId", mode="before")
    def uppercase_ids(cls, value):
        if value is None:
            return None
        value = value.strip()
        if value == "":
            return None
        return value.upper()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    department: Optional[str] = None
    semester: Optional[int] = None
    srn: Optional[str] = None
    employeeId: Optional[str] = None
    interests: List[str] = []
    clubs: List[str] = []
    isVerified: bool = False


class RoleUpdate(BaseModel):
    role: Role


# ---------- Enrollment roster ----------
# Pre-loaded by an admin (one at a time or via CSV) so that registration
# can be checked against actual college records instead of trusting
# whatever a signup form submits. This is what makes "department" and
# "semester" trustworthy elsewhere in the app -- see auth_routes.py.
class RosterStudentCreate(BaseModel):
    srn: ValidIdStr
    name: str
    department: str
    semester: int

    @field_validator("srn", mode="before")
    def uppercase_srn(cls, value):
        return value.strip().upper()


class RosterStudentOut(RosterStudentCreate):
    claimed: bool = False
    claimedBy: Optional[str] = None


class RosterFacultyCreate(BaseModel):
    employeeId: ValidIdStr
    name: str
    department: str

    @field_validator("employeeId", mode="before")
    def uppercase_employee_id(cls, value):
        return value.strip().upper()


class RosterFacultyOut(RosterFacultyCreate):
    claimed: bool = False
    claimedBy: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str = Field(min_length=6)


class VerifyEmailRequest(BaseModel):
    token: str


class UserUpdate(BaseModel):
    """
    Deliberately excludes department/semester -- those come from the
    enrollment roster at registration and shouldn't be user-editable
    afterward (that would defeat the point of validating against the
    roster in the first place). An admin can correct them by updating the
    roster and re-running the match, or via a future admin-only endpoint.
    """
    name: Optional[str] = None
    interests: Optional[List[str]] = None


# ---------- Notices ----------
class NoticeCreate(BaseModel):
    title: str
    description: str
    category: Optional[Category] = None
    department: Optional[str] = None  # None/"All" => visible to everyone
    semester: Optional[int] = None
    deadline: Optional[datetime] = None
    venue: Optional[str] = None
    eligibility: Optional[str] = None


class NoticeStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class NoticeOut(BaseModel):
    id: str
    title: str
    description: str
    summary: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    deadline: Optional[datetime] = None
    venue: Optional[str] = None
    eligibility: Optional[str] = None
    actionRequired: Optional[str] = None
    uploadedBy: str
    uploadDate: datetime
    attachments: List[str] = []
    status: NoticeStatus = NoticeStatus.pending
    rejectionReason: Optional[str] = None


class RejectNotice(BaseModel):
    reason: Optional[str] = None


# ---------- Events ----------
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    venue: str
    department: Optional[str] = None
    registrationLink: Optional[str] = None
    date: datetime
    tags: List[str] = []


class EventOut(EventCreate):
    id: str
    createdBy: str


# ---------- Bookmarks ----------
class BookmarkCreate(BaseModel):
    noticeId: str


# ---------- Notifications ----------
class NotificationOut(BaseModel):
    id: str
    userId: str
    message: str
    noticeId: Optional[str] = None
    isRead: bool = False
    createdAt: datetime


# ---------- Chat (AI Assistant) ----------
class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []


# ---------- Clubs ----------
class ClubCreate(BaseModel):
    name: str
    description: Optional[str] = None
    facultyCoordinator: Optional[str] = None


class ClubOut(ClubCreate):
    id: str
    members: List[str] = []


# ---------- Placements ----------
class PlacementCreate(BaseModel):
    company: str
    role: Optional[str] = None
    package: Optional[str] = None
    eligibility: Optional[str] = None
    deadline: Optional[datetime] = None
    registrationLink: Optional[str] = None


class PlacementOut(PlacementCreate):
    id: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
