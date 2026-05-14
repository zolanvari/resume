import asyncio
import logging

from fastapi import APIRouter, HTTPException, Request

from app.rate_limit import limiter
from app.schemas import SubscribeRequest, SubscribeResponse
from app.services.notify import notify_subscriber
from app.services.turnstile import verify_turnstile_token

router = APIRouter(prefix="/api", tags=["subscribe"])

logger = logging.getLogger(__name__)

_SUBSCRIBE_LIMIT = "5/hour"


@router.post("/subscribe", response_model=SubscribeResponse)
@limiter.limit(_SUBSCRIBE_LIMIT)
async def post_subscribe(req: SubscribeRequest, request: Request) -> SubscribeResponse:
    if not req.consent:
        raise HTTPException(
            status_code=400,
            detail="Subscription requires explicit consent.",
        )
    client_ip = request.client.host if request.client else None
    if not await verify_turnstile_token(req.turnstile_token, remote_ip=client_ip):
        raise HTTPException(status_code=403, detail="Turnstile verification failed.")
    logger.info("subscribe: name=%s email=%s ip=%s", req.name[:40], req.email[:80], client_ip)
    asyncio.create_task(notify_subscriber(ip=client_ip, name=req.name, email=req.email))
    return SubscribeResponse(ok=True)
