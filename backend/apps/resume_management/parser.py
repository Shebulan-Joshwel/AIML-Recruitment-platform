"""
Extract text from PDF/DOC for NLP/AIML. Step 2.
"""
import io


def extract_text_from_file(file) -> str:
    """Extract raw text from uploaded file (PDF or DOC/DOCX). Returns empty string on failure."""
    name = getattr(file, "name", "") or ""
    content = file.read()
    if isinstance(content, str):
        content = content.encode("utf-8")
    buf = io.BytesIO(content)
    if hasattr(file, "seek"):
        file.seek(0)
    try:
        if name.lower().endswith(".pdf"):
            return _extract_pdf(buf)
        if name.lower().endswith(".docx") or name.lower().endswith(".doc"):
            return _extract_docx(buf)
    except Exception:
        pass
    return ""


def _extract_pdf(file) -> str:
    from pypdf import PdfReader
    reader = PdfReader(file)
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts)


def _extract_docx(file) -> str:
    from docx import Document
    doc = Document(file)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
