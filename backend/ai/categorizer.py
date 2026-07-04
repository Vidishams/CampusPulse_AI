"""
Extracts structured fields from raw notice text: category, dates, venue,
eligibility, action-required line.

Why rule/keyword based instead of a full NER model for the extraction
part? These fields follow predictable patterns in real college notices
("Venue:", "Last date to apply:", "Eligible: 3rd/4th year CSE students").
A keyword + regex pass gets ~90% of the value with zero latency and zero
model download, and is far easier to debug/extend than a black-box model
when a college asks "why did it miss this field?". Category classification
falls back to a zero-shot HF model only when AI_LIGHTWEIGHT_MODE=false.
"""
import os
import re
from datetime import datetime

LIGHTWEIGHT = os.getenv("AI_LIGHTWEIGHT_MODE", "true").lower() == "true"

CATEGORY_KEYWORDS = {
    "Placement": ["placement", "recruit", "hiring", "job offer", "package", "ctc"],
    "Exam": ["exam", "examination", "test schedule", "mid-sem", "end-sem", "hall ticket"],
    "Workshop": ["workshop", "bootcamp", "training session"],
    "Club": ["club", "society", "chapter"],
    "Circular": ["circular", "notice to all", "office order"],
    "Holiday": ["holiday", "vacation", "closed on"],
    "Scholarship": ["scholarship", "fee waiver", "financial aid"],
    "Internship": ["internship", "intern", "summer training"],
}

DATE_PATTERN = re.compile(
    r"\b(\d{1,2}[\/\-\s](?:\d{1,2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\-\s]\d{2,4})\b",
    re.IGNORECASE,
)
VENUE_PATTERN = re.compile(r"(?:venue|location|held at)\s*[:\-]\s*([^\n.]+)", re.IGNORECASE)
ELIGIBILITY_PATTERN = re.compile(r"(?:eligibility|eligible)\s*[:\-]\s*([^\n.]+)", re.IGNORECASE)
DEADLINE_PATTERN = re.compile(
    r"(?:last date|deadline|apply by|register by)\s*[:\-]?\s*([^\n.]+)", re.IGNORECASE
)

_zero_shot = None


def _get_zero_shot():
    global _zero_shot
    if _zero_shot is None:
        from transformers import pipeline
        _zero_shot = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    return _zero_shot


def categorize(text: str) -> str:
    lowered = text.lower()
    scores = {cat: sum(lowered.count(kw) for kw in kws) for cat, kws in CATEGORY_KEYWORDS.items()}
    best = max(scores, key=scores.get)
    if scores[best] > 0:
        return best

    if not LIGHTWEIGHT:
        labels = list(CATEGORY_KEYWORDS.keys())
        result = _get_zero_shot()(text[:512], candidate_labels=labels)
        return result["labels"][0]

    return "Circular"  # sensible default for uncategorized administrative notices


def extract_fields(text: str) -> dict:
    venue_match = VENUE_PATTERN.search(text)
    eligibility_match = ELIGIBILITY_PATTERN.search(text)
    deadline_match = DEADLINE_PATTERN.search(text)
    dates = DATE_PATTERN.findall(text)

    return {
        "venue": venue_match.group(1).strip() if venue_match else None,
        "eligibility": eligibility_match.group(1).strip() if eligibility_match else None,
        "deadline_text": deadline_match.group(1).strip() if deadline_match else None,
        "dates_found": dates,
        "actionRequired": _infer_action(text),
    }


def _infer_action(text: str) -> str:
    lowered = text.lower()
    if "register" in lowered or "apply" in lowered:
        return "Registration required"
    if "attend" in lowered:
        return "Attendance required"
    if "read" in lowered and "acknowledge" in lowered:
        return "Read and acknowledge"
    return "For information"
