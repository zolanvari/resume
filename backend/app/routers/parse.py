import asyncio

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.config import settings
from app.rate_limit import limiter
from app.schemas import ResumeData
from app.services.ai.factory import get_ai_provider
from app.services.file_extract import UnsupportedFileType, extract_resume_text
from app.services.notify import notify_upload
from app.services.turnstile import verify_turnstile_token

router = APIRouter(prefix="/api", tags=["parse"])

_PARSE_LIMIT = "5/hour"


@router.post("/parse", response_model=ResumeData)
@limiter.limit(_PARSE_LIMIT)
async def post_parse(
    request: Request,
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    turnstile_token: str | None = Form(default=None),
) -> ResumeData:
    if not settings.ai_enabled:
        raise HTTPException(
            status_code=503,
            detail="Parsing is temporarily unavailable. Try the sample or start blank.",
        )

    client_ip = request.client.host if request.client else None
    if not await verify_turnstile_token(turnstile_token, remote_ip=client_ip):
        raise HTTPException(status_code=403, detail="Turnstile verification failed.")

    raw_text = ""
    if file is not None and file.filename:
        contents = await file.read()
        if len(contents) > settings.max_pdf_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_pdf_mb} MB.")
        try:
            raw_text = extract_resume_text(
                file.filename, file.content_type or "", contents
            )
        except UnsupportedFileType as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Could not read the file: {exc}",
            ) from exc
    elif text:
        raw_text = text

    if not raw_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract any text. Try pasting it directly.",
        )

    if len(raw_text) > settings.max_resume_chars:
        raw_text = raw_text[: settings.max_resume_chars]

    try:
        provider = get_ai_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        parsed = await provider.parse_resume(raw_text)
    except TimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail="Parsing timed out. Try again, or start blank and paste your details.",
        ) from exc
    asyncio.create_task(
        notify_upload(
            ip=client_ip,
            file_kb=max(1, len(raw_text) // 1024),
            experiences=len(parsed.experience),
            education=len(parsed.education),
        )
    )
    return parsed
