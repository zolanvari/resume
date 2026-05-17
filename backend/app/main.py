import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.logging_config import setup_logging
from app.rate_limit import limiter
from app.routers import health, parse, polish, preview, render, sample, subscribe

setup_logging(settings.log_level)
logger = logging.getLogger("resume-builder")

app = FastAPI(title="Resume Builder API", version="0.1.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def request_logger(request: Request, call_next):
    request_id = uuid.uuid4().hex[:8]
    start = time.perf_counter()
    request.state.request_id = request_id
    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            "req=%s %s %s -> 500 in %.0fms",
            request_id,
            request.method,
            request.url.path,
            elapsed_ms,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
        )
    elapsed_ms = (time.perf_counter() - start) * 1000
    if request.url.path != "/health":
        logger.info(
            "req=%s %s %s -> %d in %.0fms",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = getattr(request.state, "request_id", None)
    if exc.status_code >= 500:
        logger.error(
            "req=%s HTTP %d on %s: %s",
            request_id,
            exc.status_code,
            request.url.path,
            exc.detail,
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request_id},
        headers=exc.headers or {},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    logger.warning(
        "req=%s validation error on %s: %s",
        request_id,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "request_id": request_id},
    )


app.include_router(health.router)
app.include_router(sample.router)
app.include_router(render.router)
app.include_router(preview.router)
app.include_router(polish.router)
app.include_router(parse.router)
app.include_router(subscribe.router)


logger.info("resume-builder API ready (log_level=%s, ai_enabled=%s)",
            settings.log_level, settings.ai_enabled)
