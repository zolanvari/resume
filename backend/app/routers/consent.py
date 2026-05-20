"""Consent-gated download endpoint.

Called only when a user ticks the opt-in box in the download dialog. It
persists the minimal consented data (name/email/headline, encrypted) and sends
the owner a copy of the generated CV over Telegram. The user's own PDF download
happens client-side and never depends on this endpoint succeeding.

Privacy: this handler never logs phone, address or the résumé body.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.rate_limit import limiter
from app.schemas import ConsentDownloadRequest, ConsentResponse
from app.services import store
from app.services.notify import notify_cv_consent
from app.services.turnstile import verify_turnstile_token
from app.services.typst_render import TypstCompileError, render_pdf

router = APIRouter(prefix="/api", tags=["consent"])

logger = logging.getLogger("resume-builder")

_CONSENT_LIMIT = "10/hour"


@router.post("/consent-download", response_model=ConsentResponse)
@limiter.limit(_CONSENT_LIMIT)
async def post_consent_download(
    req: ConsentDownloadRequest, request: Request, background_tasks: BackgroundTasks
) -> ConsentResponse:
    client_ip = request.client.host if request.client else None
    if not await verify_turnstile_token(req.turnstile_token, remote_ip=client_ip):
        raise HTTPException(status_code=403, detail="Turnstile verification failed.")

    headline = req.resume.contact.headline

    # Render the copy the owner receives. A render failure must not fail the
    # consent itself - the user's own download already happened client-side.
    pdf_bytes: bytes | None = None
    try:
        pdf_bytes = render_pdf(req.resume, req.theme)
    except TypstCompileError as exc:
        logger.warning("consent-download: render failed: %s", exc)

    stored = store.record_consent(req.name, req.email, headline)
    logger.info(
        "consent-download: stored=%s headline=%r ip=%s",
        stored,
        (headline or "")[:60],
        client_ip,
    )

    safe = (req.name or "resume").strip().replace(" ", "-") or "resume"
    background_tasks.add_task(
        notify_cv_consent,
        ip=client_ip,
        name=req.name,
        email=req.email,
        headline=headline,
        pdf_bytes=pdf_bytes,
        filename=f"{safe}.pdf",
    )
    return ConsentResponse(ok=True)
