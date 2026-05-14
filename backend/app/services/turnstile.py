"""Cloudflare Turnstile server-side Siteverify wrapper.

The frontend widget alone is not protection — every privileged request
must round-trip the user's token through Cloudflare's verification endpoint
before being honored.
"""

import httpx

from app.config import settings

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile_token(token: str | None, remote_ip: str | None = None) -> bool:
    if not settings.turnstile_secret_key:
        # Turnstile not configured locally — fail closed in production by
        # raising at startup if AI is enabled. For local dev (no secret set),
        # we let it pass so the demo is usable offline.
        return True

    if not token:
        return False

    data = {"secret": settings.turnstile_secret_key, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(SITEVERIFY_URL, data=data)
            payload = resp.json()
    except (httpx.HTTPError, ValueError):
        return False

    return bool(payload.get("success"))
