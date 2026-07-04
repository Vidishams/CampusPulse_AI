"""
Extracts raw text from an uploaded notice file.

- Images (.png/.jpg/.jpeg): Tesseract OCR directly.
- PDFs: try native text extraction first (PyMuPDF) since most college
  notices are exported from Word/Canva and already have a text layer --
  this is instant and 100% accurate. Only fall back to rasterizing each
  page + OCR if the PDF has no extractable text (i.e. it's a scanned
  image saved as PDF).
- DOCX: python-docx style extraction (kept simple, paragraph join).
"""
import io
import pytesseract
from PIL import Image


def extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    return pytesseract.image_to_string(image)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    import fitz  # PyMuPDF

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text_parts = []
    for page in doc:
        page_text = page.get_text().strip()
        if page_text:
            text_parts.append(page_text)
        else:
            # No text layer -> this page is a scanned image, OCR it
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            text_parts.append(extract_text_from_image(img_bytes))
    doc.close()
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_text(filename: str, file_bytes: bytes) -> str:
    lower = filename.lower()
    if lower.endswith((".png", ".jpg", ".jpeg")):
        return extract_text_from_image(file_bytes)
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    if lower.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    raise ValueError(f"Unsupported file type: {filename}")
