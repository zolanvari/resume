"""Render `ResumeData` to PDF / SVG by invoking the pinned `typst` CLI.

Stateless: every request gets a fresh `TemporaryDirectory`, the template
and asset are copied in, the emitter writes a `main.typ`, `typst compile`
runs once, and the output bytes (PDF) or list of strings (SVG, one per
page) are returned. The temp dir is removed by the context manager before
the function returns.
"""

import logging
import shutil
import subprocess
import threading
import time
from collections import OrderedDict
from pathlib import Path
from tempfile import TemporaryDirectory

from app.config import settings
from app.schemas import LayoutSettings, ResumeData, Theme
from app.services.typst_emit import emit_typst

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
TEMPLATE_FILE = TEMPLATE_DIR / "resume.typ"
TEMPLATE_ASSET = TEMPLATE_DIR / "graphite-paper.jpg"

RENDER_TIMEOUT_SECONDS = 30


class TypstCompileError(RuntimeError):
    """Raised when the typst CLI fails to compile a resume."""


def render_pdf(
    resume: ResumeData, theme: Theme, layout: LayoutSettings | None = None
) -> bytes:
    start = time.perf_counter()
    with TemporaryDirectory(prefix="cv-render-") as td_str:
        td = Path(td_str)
        (td / "main.typ").write_text(
            emit_typst(resume, theme, layout), encoding="utf-8"
        )
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


def render_svg(resume: ResumeData, theme: Theme) -> list[str]:
    """Compile to one SVG per page. Vector output - sharp at any zoom."""
    start = time.perf_counter()
    with TemporaryDirectory(prefix="cv-render-svg-") as td_str:
        td = Path(td_str)
        (td / "main.typ").write_text(emit_typst(resume, theme), encoding="utf-8")
        shutil.copy(TEMPLATE_FILE, td / "resume.typ")
        shutil.copy(TEMPLATE_ASSET, td / "graphite-paper.jpg")

        result = subprocess.run(
            [
                settings.typst_bin,
                "compile",
                "main.typ",
                "page-{n}.svg",
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
            logger.error("typst svg compile failed (theme=%s, %.0fms): %s", theme.value, elapsed_ms, stderr)
            raise TypstCompileError(stderr)

        pages: list[str] = []
        i = 1
        while True:
            p = td / f"page-{i}.svg"
            if not p.exists():
                break
            pages.append(p.read_text(encoding="utf-8"))
            i += 1
        if not pages:
            raise TypstCompileError("typst reported success but produced no SVG pages")
        logger.info("render-svg theme=%s pages=%d in %.0fms", theme.value, len(pages), elapsed_ms)
        return pages


# ── Sample-preview cache: one render per theme, keyed by theme slug ──
# Used by /api/preview/{theme} to ship a vector thumbnail to the template
# picker. The sample resume is fixed, the template is read-only, so a single
# render per theme is the upper bound. Lock guards the dict; the actual
# compile happens outside the lock so themes render in parallel under load.

_sample_svg_cache: OrderedDict[str, list[str]] = OrderedDict()
_sample_svg_cache_lock = threading.Lock()


def get_sample_preview_svg(theme: Theme, sample_resume: ResumeData) -> list[str]:
    key = theme.value
    with _sample_svg_cache_lock:
        cached = _sample_svg_cache.get(key)
        if cached is not None:
            _sample_svg_cache.move_to_end(key)
            return list(cached)
    pages = render_svg(sample_resume, theme)
    with _sample_svg_cache_lock:
        _sample_svg_cache[key] = list(pages)
        _sample_svg_cache.move_to_end(key)
    return pages
