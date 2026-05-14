from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response

from app.schemas import RenderRequest
from app.services.notify import notify_render
from app.services.typst_render import TypstCompileError, render_pdf

router = APIRouter(prefix="/api", tags=["render"])


@router.post("/render")
def post_render(
    req: RenderRequest, request: Request, background_tasks: BackgroundTasks
) -> Response:
    try:
        pdf_bytes = render_pdf(req.resume, req.theme)
    except TypstCompileError as exc:
        raise HTTPException(status_code=500, detail=f"render failed: {exc}") from exc

    client_ip = request.client.host if request.client else None
    background_tasks.add_task(
        notify_render,
        ip=client_ip,
        theme=req.theme.value,
        size_kb=max(1, len(pdf_bytes) // 1024),
    )

    safe_name = (req.resume.contact.firstname + "-" + req.resume.contact.lastname).strip("-")
    filename = (safe_name or "resume") + ".pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
