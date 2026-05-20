"""Frontend error sink.

The SPA has no other way to surface a crash: an uncaught render error white-screens
the page with nothing in any server log. The error boundary and the global
error/unhandledrejection handlers POST here so failures land in `docker logs`.
"""

import logging

from fastapi import APIRouter, Request

from app.rate_limit import limiter
from app.schemas import ClientLogRequest

router = APIRouter(prefix="/api", tags=["client-log"])

logger = logging.getLogger("resume-builder")

_CLIENT_LOG_LIMIT = "30/hour"


@router.post("/client-log", status_code=204)
@limiter.limit(_CLIENT_LOG_LIMIT)
async def post_client_log(req: ClientLogRequest, request: Request) -> None:
    client_ip = request.client.host if request.client else None
    # One line per report; stack is multi-line but kept - it is the whole point.
    logger.error(
        "client error [%s] from ip=%s url=%s ua=%s\n  message: %s\n  stack: %s",
        req.kind,
        client_ip,
        req.url,
        (req.user_agent or "")[:200],
        req.message,
        req.stack or "(none)",
    )
