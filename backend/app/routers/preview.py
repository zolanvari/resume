"""Theme preview endpoint - returns vector SVG pages for the sample resume.

Used by the frontend ThemePicker to show a sharp, zoomable preview of each
template instead of a static PNG thumbnail. Output is cached per theme since
the sample resume is fixed and the template is read-only.
"""

from fastapi import APIRouter, HTTPException

from app.sample_data import SAMPLE_RESUME
from app.schemas import Theme
from app.services.typst_render import TypstCompileError, get_sample_preview_svg

router = APIRouter(prefix="/api/preview", tags=["preview"])


@router.get("/{theme}")
def get_preview(theme: Theme) -> dict[str, list[str]]:
    try:
        pages = get_sample_preview_svg(theme, SAMPLE_RESUME)
    except TypstCompileError as exc:
        raise HTTPException(status_code=500, detail=f"preview failed: {exc}") from exc
    return {"pages": pages}
