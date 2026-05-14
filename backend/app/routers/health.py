import subprocess

from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    try:
        result = subprocess.run(
            [settings.typst_bin, "--version"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
        typst_version = result.stdout.strip() or result.stderr.strip() or "unknown"
    except (FileNotFoundError, subprocess.TimeoutExpired):
        typst_version = "unavailable"

    return {
        "status": "ok",
        "typst": typst_version,
        "ai_enabled": settings.ai_enabled,
    }
