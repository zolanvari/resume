"""Single swap point for the AI provider implementation.

`get_ai_provider()` is the only function `routers/polish.py` calls. To swap
LLMs, write a new `AIProvider` subclass in `services/ai/` and change the
import here.
"""

from app.services.ai.provider import AIProvider


def get_ai_provider() -> AIProvider:
    from app.services.ai.gemini import GeminiProvider

    return GeminiProvider()
