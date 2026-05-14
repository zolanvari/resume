"""Render `ResumeData` to PDF bytes by invoking the pinned `typst` CLI.

Stateless: every request gets a fresh `TemporaryDirectory`, the template
and asset are copied in, the emitter writes a `main.typ`, `typst compile`
runs once, and the PDF bytes are returned. The temp dir is removed by the
context manager before the function returns.
"""

import logging
import shutil
import subprocess
import time
from pathlib import Path
from tempfile import TemporaryDirectory

from app.config import settings
from app.schemas import ResumeData, Theme
from app.services.typst_emit import emit_typst

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
TEMPLATE_FILE = TEMPLATE_DIR / "resume.typ"
TEMPLATE_ASSET = TEMPLATE_DIR / "graphite-paper.jpg"

RENDER_TIMEOUT_SECONDS = 30


class TypstCompileError(RuntimeError):
    """Raised when the typst CLI fails to compile a resume."""


def render_pdf(resume: ResumeData, theme: Theme) -> bytes:
    start = time.perf_counter()
    with TemporaryDirectory(prefix="cv-render-") as td_str:
        td = Path(td_str)
        (td / "main.typ").write_text(emit_typst(resume, theme), encoding="utf-8")
        shutil.copy(TEMPLATE_FILE, td / "resume.typ")
        shutil.copy(TEMPLATE_ASSET, td / "graphite-paper.jpg")

        result = subprocess.run(
            [
                settings.typst_bin,
                "compile",
                "main.typ",
                "out.pdf",
                "--font-path",
                "/usr/share/fonts",
            ],
            cwd=td,
            capture_output=True,
            timeout=RENDER_TIMEOUT_SECONDS,
            check=False,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace") or "typst compile failed"
            logger.error("typst compile failed (theme=%s, %.0fms): %s", theme.value, elapsed_ms, stderr)
            raise TypstCompileError(stderr)

        out_pdf = td / "out.pdf"
        if not out_pdf.exists():
            logger.error("typst reported success but produced no PDF (theme=%s)", theme.value)
            raise TypstCompileError("typst reported success but produced no PDF")
        data = out_pdf.read_bytes()
        logger.info("render theme=%s size=%dB in %.0fms", theme.value, len(data), elapsed_ms)
        return data
