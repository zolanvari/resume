"""PDF text extraction.

Best-effort. We hand the result to an LLM that normalizes wildly inconsistent
résumé layouts into structured fields, so we don't need a heroic parser here.
"""

import io

from pypdf import PdfReader


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages: list[str] = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n\n".join(p for p in pages if p.strip())
