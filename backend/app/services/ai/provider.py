"""Abstract AI provider interface.

The rest of the app talks to AI through this interface only. Swapping providers
means writing one new file and changing the import in `routers/polish.py`.
"""

from abc import ABC, abstractmethod

from app.schemas import Bullet, PolishedBullet, ResumeData


class AIProvider(ABC):
    @abstractmethod
    async def polish_bullets(
        self,
        bullets: list[Bullet],
        tone: str,
        role_context: str = "",
    ) -> list[PolishedBullet]:
        """Polish the given bullets. Output order matches input order.

        Implementations MUST preserve `bullet_id` round-trip and MUST NOT
        invent facts. See `app/prompts/polish.md` for the system prompt.
        """

    @abstractmethod
    async def parse_resume(self, raw_text: str) -> ResumeData:
        """Convert raw resume text into structured `ResumeData`.

        Best-effort extraction; missing fields are left empty rather than
        invented. Implementations MUST NOT fabricate employers, dates, or
        outcomes that are not in `raw_text`.
        """
