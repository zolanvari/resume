from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.rate_limit import POLISH_LIMIT, limiter
from app.schemas import Bullet, PolishRequest, PolishResponse
from app.services.ai.factory import get_ai_provider
from app.services.ai.provider import AIProvider
from app.services.turnstile import verify_turnstile_token

router = APIRouter(prefix="/api", tags=["polish"])

_provider: AIProvider | None = None


def _get_provider() -> AIProvider:
    global _provider
    if _provider is None:
        _provider = get_ai_provider()
    return _provider


def _collect_bullets(req: PolishRequest) -> list[Bullet]:
    wanted = set(req.bullet_ids)
    out: list[Bullet] = []
    for entry in req.resume.experience:
        for b in entry.bullets:
            if b.id in wanted:
                out.append(b)
    for entry in req.resume.education:
        for b in entry.bullets:
            if b.id in wanted:
                out.append(b)
    return out


@router.post("/polish", response_model=PolishResponse)
@limiter.limit(POLISH_LIMIT)
async def post_polish(req: PolishRequest, request: Request) -> PolishResponse:
    if not settings.ai_enabled:
        raise HTTPException(
            status_code=503,
            detail="AI polishing is temporarily unavailable. Editing and PDF export still work.",
        )

    client_ip = request.client.host if request.client else None
    if not await verify_turnstile_token(req.turnstile_token, remote_ip=client_ip):
        raise HTTPException(status_code=403, detail="Turnstile verification failed.")

    bullets = _collect_bullets(req)
    if not bullets:
        raise HTTPException(status_code=400, detail="No matching bullets to polish.")
    if len(bullets) > 25:
        raise HTTPException(status_code=400, detail="Too many bullets in one request (max 25).")

    try:
        provider = _get_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    polished = await provider.polish_bullets(bullets, tone=req.tone)
    return PolishResponse(polished=polished)
