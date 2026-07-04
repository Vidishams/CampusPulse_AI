"""
MongoDB stores an ObjectId under _id, but Pydantic/JSON need a plain
string "id". These two helpers are used everywhere a document goes
in/out of the DB so we don't repeat the conversion logic in every route.
"""
import re
from bson import ObjectId

ID_REGEX = re.compile(r"^[A-Z]\d{2}[A-Z]{2}\d{3}$")


def doc_to_out(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise ValueError("Invalid id format")


def normalize_id(value: str | None) -> str:
    if not value:
        return ""
    return value.strip().upper()


def is_valid_id(value: str) -> bool:
    return bool(ID_REGEX.fullmatch(normalize_id(value)))


def validate_id(value: str, field_name: str) -> str:
    normalized = normalize_id(value)
    if not ID_REGEX.fullmatch(normalized):
        raise ValueError(f"{field_name} must match pattern R23EQ113")
    return normalized
