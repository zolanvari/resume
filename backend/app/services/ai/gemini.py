"""Gemini implementation of `AIProvider`.

This is the only file that imports the Gemini SDK. The rest of the app
talks to the abstract `AIProvider`.
"""

import json
import uuid
from pathlib import Path

from google import genai
from google.genai import types

from app.config import settings
from app.schemas import Bullet, Contact, PolishedBullet, ResumeData
from app.services.ai.provider import AIProvider

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
    },
    "required": ["contact"],
}

_PARSE_SYSTEM_INSTRUCTION = (
    "You extract résumé data into structured fields. Rules:\n"
    "- Only use information that is present in the input text. Do not invent employers, "
    "dates, metrics, or outcomes.\n"
    "- If a field is missing, leave it empty (empty string or empty array).\n"
    "- For experience and education, preserve chronological order (most recent first).\n"
    "- Split skill mentions into groups by category when the input does. Otherwise put "
    "everything under a single 'Skills' category.\n"
    "- For linkedin/github fields, capture only the username, not the full URL.\n"
    "- For website, capture the full URL.\n"
    "- Bullets should be the existing bullet/sentence as written; do not paraphrase."
)


def _new_bullet_id() -> str:
    return uuid.uuid4().hex[:8]


def _load_polish_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


class GeminiProvider(AIProvider):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise RuntimeError("AI provider is not configured")
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._polish_instruction = _load_polish_prompt()

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
        response = await self._client.aio.models.generate_content(
            model=settings.model_name,
            contents=json.dumps(user_payload),
            config=types.GenerateContentConfig(
                system_instruction=self._polish_instruction,
                response_mime_type="application/json",
                response_schema=_POLISH_RESPONSE_SCHEMA,
                temperature=0.4,
            ),
        )
        data = json.loads(response.text or "{}")
        return [PolishedBullet(**item) for item in data.get("polished", [])]

    async def parse_resume(self, raw_text: str) -> ResumeData:
        response = await self._client.aio.models.generate_content(
            model=settings.model_name,
            contents=raw_text,
            config=types.GenerateContentConfig(
                system_instruction=_PARSE_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=_RESUME_SCHEMA,
                temperature=0.1,
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
        if "contact" not in data:
            data["contact"] = Contact(firstname="", lastname="").model_dump()
        return ResumeData(**data)
