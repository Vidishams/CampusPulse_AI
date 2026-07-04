import csv
import io
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pymongo.errors import DuplicateKeyError

from models.schemas import RosterStudentCreate, RosterStudentOut, RosterFacultyCreate, RosterFacultyOut
from auth.deps import require_role
from database.db import roster_students_collection, roster_faculty_collection
from utils.helpers import normalize_id, validate_id

router = APIRouter(prefix="/api/roster", tags=["Enrollment Roster"])


# ---------- Students ----------
@router.post("/students", response_model=RosterStudentOut, status_code=status.HTTP_201_CREATED)
async def add_roster_student(payload: RosterStudentCreate, admin: dict = Depends(require_role("admin"))):
    doc = payload.model_dump()
    try:
        doc["srn"] = validate_id(normalize_id(doc["srn"]), "SRN")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    doc["claimed"] = False
    doc["claimedBy"] = None
    try:
        await roster_students_collection.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, f"SRN {doc['srn']} is already on the roster")
    return RosterStudentOut(**doc)


@router.post("/students/bulk")
async def bulk_add_roster_students(file: UploadFile = File(...), admin: dict = Depends(require_role("admin"))):
    """
    CSV with header: srn,name,department,semester
    Existing SRNs are skipped (not overwritten) so re-uploading a roster
    with a few new rows added is safe to do repeatedly.
    """
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    required = {"srn", "name", "department", "semester"}
    if not reader.fieldnames or not required.issubset({f.strip().lower() for f in reader.fieldnames}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                             "CSV must have columns: srn, name, department, semester")

    added, skipped = 0, 0
    for row in reader:
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        if not row.get("srn"):
            continue
        try:
            srn = validate_id(normalize_id(row["srn"]), "SRN")
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid SRN format in CSV row: {row['srn']} ({exc})")
        try:
            await roster_students_collection.insert_one({
                "srn": srn,
                "name": row["name"],
                "department": row["department"],
                "semester": int(row["semester"]),
                "claimed": False,
                "claimedBy": None,
            })
            added += 1
        except DuplicateKeyError:
            skipped += 1

    return {"added": added, "skipped_existing": skipped}


@router.get("/students", response_model=List[RosterStudentOut])
async def list_roster_students(admin: dict = Depends(require_role("admin"))):
    cursor = roster_students_collection.find({}).sort("srn", 1)
    return [RosterStudentOut(**r) async for r in cursor]


@router.delete("/students/{srn}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_roster_student(srn: str, admin: dict = Depends(require_role("admin"))):
    result = await roster_students_collection.delete_one({"srn": srn})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SRN not found on roster")


# ---------- Faculty ----------
@router.post("/faculty", response_model=RosterFacultyOut, status_code=status.HTTP_201_CREATED)
async def add_roster_faculty(payload: RosterFacultyCreate, admin: dict = Depends(require_role("admin"))):
    doc = payload.model_dump()
    try:
        doc["employeeId"] = validate_id(normalize_id(doc["employeeId"]), "Employee ID")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    doc["claimed"] = False
    doc["claimedBy"] = None
    try:
        await roster_faculty_collection.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Employee ID {doc['employeeId']} is already on the roster")
    return RosterFacultyOut(**doc)


@router.post("/faculty/bulk")
async def bulk_add_roster_faculty(file: UploadFile = File(...), admin: dict = Depends(require_role("admin"))):
    """CSV with header: employeeId,name,department"""
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    required = {"employeeid", "name", "department"}
    if not reader.fieldnames or not required.issubset({f.strip().lower() for f in reader.fieldnames}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                             "CSV must have columns: employeeId, name, department")

    added, skipped = 0, 0
    for row in reader:
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        if not row.get("employeeid"):
            continue
        try:
            employee_id = validate_id(normalize_id(row["employeeid"]), "Employee ID")
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid Employee ID format in CSV row: {row['employeeid']} ({exc})")
        try:
            await roster_faculty_collection.insert_one({
                "employeeId": employee_id,
                "name": row["name"],
                "department": row["department"],
                "claimed": False,
                "claimedBy": None,
            })
            added += 1
        except DuplicateKeyError:
            skipped += 1

    return {"added": added, "skipped_existing": skipped}


@router.get("/faculty", response_model=List[RosterFacultyOut])
async def list_roster_faculty(admin: dict = Depends(require_role("admin"))):
    cursor = roster_faculty_collection.find({}).sort("employeeId", 1)
    return [RosterFacultyOut(**r) async for r in cursor]


@router.delete("/faculty/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_roster_faculty(employee_id: str, admin: dict = Depends(require_role("admin"))):
    result = await roster_faculty_collection.delete_one({"employeeId": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee ID not found on roster")
