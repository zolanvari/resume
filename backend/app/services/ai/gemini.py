"""Gemini implementation of `AIProvider`.

This is the only file that imports the Gemini SDK. The rest of the app
talks to the abstract `AIProvider`.
"""

import asyncio
import json
import logging
import uuid
from pathlib import Path

from google import genai
from google.genai import types

from app.config import settings
from app.schemas import Bullet, Contact, PolishedBullet, ResumeData
from app.services.ai.provider import AIProvider

logger = logging.getLogger("resume-builder")

PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "polish.md"

_POLISHED_BULLET_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "bullet_id": {"type": "STRING"},
        "original": {"type": "STRING"},
        "rewritten": {"type": "STRING"},
        "action_verb_changed": {"type": "BOOLEAN"},
        "quantification_needed": {"type": "BOOLEAN"},
        "weasel_words_removed": {"type": "ARRAY", "items": {"type": "STRING"}},
        "explanation": {"type": "STRING"},
    },
    "required": [
        "bullet_id",
        "original",
        "rewritten",
        "action_verb_changed",
        "quantification_needed",
        "weasel_words_removed",
        "explanation",
    ],
}

_POLISH_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {"polished": {"type": "ARRAY", "items": _POLISHED_BULLET_SCHEMA}},
    "required": ["polished"],
}


def _string_array() -> dict:
    return {"type": "ARRAY", "items": {"type": "STRING"}}


_RESUME_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "contact": {
            "type": "OBJECT",
            "properties": {
                "firstname": {"type": "STRING"},
                "lastname": {"type": "STRING"},
                "headline": {"type": "STRING"},
                "email": {"type": "STRING"},
                "phone": {"type": "STRING"},
                "linkedin": {"type": "STRING"},
                "github": {"type": "STRING"},
                "website": {"type": "STRING"},
                "portfolio": {"type": "STRING"},
                "address": {"type": "STRING"},
            },
            "required": ["firstname", "lastname"],
        },
        "summary": {"type": "STRING"},
        "experience": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "title": {"type": "STRING"},
                    "company": {"type": "STRING"},
                    "location": {"type": "STRING"},
                    "date": {"type": "STRING"},
                    "bullets": _string_array(),
                },
                "required": ["title", "company"],
            },
        },
        "education": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "degree": {"type": "STRING"},
                    "institution": {"type": "STRING"},
                    "location": {"type": "STRING"},
                    "date": {"type": "STRING"},
                    "bullets": _string_array(),
                },
                "required": ["degree", "institution"],
            },
        },
        "skills": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "category": {"type": "STRING"},
                    "items": _string_array(),
                },
                "required": ["category", "items"],
            },
        },
        "sections": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "title": {"type": "STRING"},
                    "bullets": _string_array(),
                },
                "required": ["title", "bullets"],
            },
        },
    },
    "required": ["contact"],
}

_PARSE_SYSTEM_INSTRUCTION = (
    "You extract résumé data into structured fields. Rules:\n"
    "- Only use information that is present in the input text. Do not invent employers, "
    "dates, metrics, or outcomes.\n"
    "- If a field is missing, leave it empty (empty string or empty array).\n"
    "- For experience and education, preserve chronological order (most recent first).\n"
    "- Skills: build the skills list from the concrete technical skills, tools, "
    "programming languages, frameworks, libraries, platforms, methods, and domains that "
    "are explicitly named ANYWHERE in the résumé - including the summary and the "
    "experience bullets - even when there is no dedicated 'Skills' section. These are "
    "present in the text (e.g. 'Python', 'PyTorch', 'LangGraph', 'FastAPI', 'RAG', "
    "'fine-tuning'), so extracting them is not inventing. Group them by category when the "
    "résumé labels categories; otherwise put everything under a single 'Skills' category. "
    "Use concise skill names, not whole sentences, and do not repeat the same skill.\n"
    "- For linkedin/github fields, capture only the username, not the full URL.\n"
    "- For website, capture the main personal site URL; if a separate portfolio / project "
    "site URL is present, put it in portfolio.\n"
    "- Bullets should be the existing bullet/sentence as written; do not paraphrase.\n"
    "- Capture EVERY remaining résumé section that does not fit contact / summary / "
    "experience / education / skills as an entry in the 'sections' array. This includes "
    "(but is not limited to): Awards, Honors, Certifications, Licenses, Languages "
    "(spoken/written, e.g. English, Persian), Projects, Publications, Patents, "
    "Presentations, Talks, Conferences, Volunteering, Community, Leadership, Interests, "
    "Hobbies, Memberships, Affiliations, Professional Development, Courses, Trainings, "
    "References. Use the section's heading from the résumé as 'title' (keep the original "
    "wording and casing) and put each line/entry under it as a string in 'bullets' "
    "verbatim. Never drop a section just because it is short or unusual; if in doubt, "
    "include it as a custom section rather than discarding it.\n"
    "- Do NOT duplicate content: items already captured under experience, education, or "
    "skills should not also appear in sections."
)


def _new_bullet_id() -> str:
    return uuid.uuid4().hex[:8]


def _load_polish_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


# Résumé parsing and bullet polishing are deterministic structured-output
# tasks that don't benefit from extended reasoning. Gemini 3 models enable
# "thinking" by default, which tripled parse latency (~3s -> ~10-20s) and risked
# the request timeout. Disabling it keeps calls fast without hurting quality.
_NO_THINKING = types.ThinkingConfig(thinking_budget=0)


def _model_chain() -> list[str]:
    """Primary model first, then the fallback, de-duplicated and non-empty."""
    chain: list[str] = []
    for name in (settings.model_name, settings.model_fallback):
        name = (name or "").strip()
        if name and name not in chain:
            chain.append(name)
    return chain


class GeminiProvider(AIProvider):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise RuntimeError("AI provider is not configured")
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._polish_instruction = _load_polish_prompt()

    async def _generate(
        self, *, contents: object, config: types.GenerateContentConfig
    ) -> object:
        """Call generate_content on the primary model, falling back to the next
        model in the chain when an attempt exceeds `ai_timeout_seconds`.

        The budget is enforced with asyncio.wait_for (wall-clock, including
        connection setup); a timed-out attempt is cancelled before the next
        model is tried. Non-timeout errors are not retried - they propagate so
        the caller surfaces the real failure.
        """
        chain = _model_chain()
        last_timeout: asyncio.TimeoutError | None = None
        for index, model in enumerate(chain):
            try:
                return await asyncio.wait_for(
                    self._client.aio.models.generate_content(
                        model=model, contents=contents, config=config
                    ),
                    timeout=settings.ai_timeout_seconds,
                )
            except asyncio.TimeoutError as exc:
                last_timeout = exc
                has_fallback = index + 1 < len(chain)
                logger.warning(
                    "Gemini model %r timed out after %.0fs%s",
                    model,
                    settings.ai_timeout_seconds,
                    f"; falling back to {chain[index + 1]!r}" if has_fallback else "",
                )
        raise TimeoutError(
            f"All Gemini models timed out after {settings.ai_timeout_seconds:.0f}s "
            f"each: {chain}"
        ) from last_timeout

    async def polish_bullets(
        self,
        bullets: list[Bullet],
        tone: str,
        role_context: str = "",
    ) -> list[PolishedBullet]:
        user_payload = {
            "tone": tone,
            "role_context": role_context,
            "bullets": [{"bullet_id": b.id, "text": b.text} for b in bullets],
        }
        response = await self._generate(
            contents=json.dumps(user_payload),
            config=types.GenerateContentConfig(
                system_instruction=self._polish_instruction,
                response_mime_type="application/json",
                response_schema=_POLISH_RESPONSE_SCHEMA,
                temperature=0.4,
                thinking_config=_NO_THINKING,
            ),
        )
        data = json.loads(response.text or "{}")
        return [PolishedBullet(**item) for item in data.get("polished", [])]

    async def parse_resume(self, raw_text: str) -> ResumeData:
        response = await self._generate(
            contents=raw_text,
            config=types.GenerateContentConfig(
                system_instruction=_PARSE_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=_RESUME_SCHEMA,
                temperature=0.1,
                thinking_config=_NO_THINKING,
            ),
        )
        data = json.loads(response.text or "{}")

        # Attach stable bullet IDs.
        for entry in data.get("experience", []) or []:
            entry["bullets"] = [
                {"id": _new_bullet_id(), "text": b}
                for b in (entry.get("bullets") or [])
                if isinstance(b, str) and b.strip()
            ]
        for entry in data.get("education", []) or []:
            entry["bullets"] = [
                {"id": _new_bullet_id(), "text": b}
                for b in (entry.get("bullets") or [])
                if isinstance(b, str) and b.strip()
            ]
        # Custom sections (awards, languages, certifications, projects, …):
        # drop empty ones and attach bullet IDs so the editor and /api/polish
        # can address individual bullets.
        cleaned_sections = []
        for entry in data.get("sections", []) or []:
            title = (entry.get("title") or "").strip()
            bullets = [
                {"id": _new_bullet_id(), "text": b}
                for b in (entry.get("bullets") or [])
                if isinstance(b, str) and b.strip()
            ]
            if not title and not bullets:
                continue
            cleaned_sections.append({"title": title, "bullets": bullets})
        data["sections"] = cleaned_sections
        if "contact" not in data:
            data["contact"] = Contact(firstname="", lastname="").model_dump()
        return ResumeData(**data)
