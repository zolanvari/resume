"""Shared SlowAPI Limiter instance, importable from any router."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

limiter = Limiter(key_func=get_remote_address)

POLISH_LIMIT = f"{settings.rate_limit_polish_per_ip_per_hour}/hour"
RENDER_LIMIT = f"{settings.rate_limit_render_per_ip_per_hour}/hour"
