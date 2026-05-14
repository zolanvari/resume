"""Optional notification hooks.

The host app exposes three async notification points (upload, render,
subscribe). To keep operational concerns out of the app code, this module
optionally loads an external hook module via the CV_NOTIFY_HOOK env var
(a Python import path) and dispatches to matching callables on it.

If CV_NOTIFY_HOOK is unset or the module cannot be imported, every hook
is a no-op. This is the default in any environment that hasn't configured
one — local dev, CI, fresh deployments.
"""

import importlib
import logging
import os
import sys
from types import ModuleType
from typing import Optional

logger = logging.getLogger(__name__)

_loaded = False
_module: Optional[ModuleType] = None


def _load() -> Optional[ModuleType]:
    global _loaded, _module
    if _loaded:
        return _module
    _loaded = True
    extra_dir = os.environ.get("CV_NOTIFY_HOOK_DIR")
    if extra_dir and extra_dir not in sys.path:
        sys.path.insert(0, extra_dir)
    target = os.environ.get("CV_NOTIFY_HOOK")
    if not target:
        return None
    try:
        _module = importlib.import_module(target)
    except Exception:
        logger.debug("notification hook %r not importable", target, exc_info=True)
        _module = None
    return _module


async def _dispatch(name: str, **kwargs) -> None:
    mod = _load()
    if mod is None:
        return
    fn = getattr(mod, name, None)
    if fn is None:
        return
    try:
        await fn(**kwargs)
    except Exception:
        logger.warning("notification hook %s raised", name, exc_info=True)


async def notify_upload(**kwargs) -> None:
    await _dispatch("notify_upload", **kwargs)


async def notify_render(**kwargs) -> None:
    await _dispatch("notify_render", **kwargs)


async def notify_subscriber(**kwargs) -> None:
    await _dispatch("notify_subscriber", **kwargs)
