from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Theme(str, Enum):
    aurora_violet = "aurora-violet"
    graphite_mist = "graphite-mist"
    ember_glow = "ember-glow"
    midnight_prism = "midnight-prism"
    ivory_classique = "ivory-classique"
    mint_meridian = "mint-meridian"
    sunset_haze = "sunset-haze"


class Contact(BaseModel):
    firstname: str
    lastname: str
    headline: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin: str | None = None  # username only (no URL prefix)
    github: str | None = None  # username only
    website: str | None = None  # full URL
    portfolio: str | None = None  # full URL — portfolio / personal project site
    address: str | None = None


class Bullet(BaseModel):
    id: str  # stable id, used by /api/polish to address individual bullets
    text: str


class ExperienceEntry(BaseModel):
    title: str  # job title
    company: str
    location: str = ""
    date: str = ""  # free-form: "Jun 2023 — Present"
    bullets: list[Bullet] = Field(default_factory=list)


class EducationEntry(BaseModel):
    degree: str
    institution: str
    location: str = ""
    date: str = ""
    bullets: list[Bullet] = Field(default_factory=list)


class SkillGroup(BaseModel):
    category: str
    items: list[str]


class ResumeData(BaseModel):
    contact: Contact
    summary: str | None = None
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    skills: list[SkillGroup] = Field(default_factory=list)


class RenderRequest(BaseModel):
    resume: ResumeData
    theme: Theme = Theme.aurora_violet


class PolishedBullet(BaseModel):
    bullet_id: str
    original: str
    rewritten: str
    action_verb_changed: bool
    quantification_needed: bool
    weasel_words_removed: list[str]
    explanation: str


class PolishRequest(BaseModel):
    resume: ResumeData
    bullet_ids: list[str]
    tone: Literal["concise", "impact", "leadership"] = "impact"
    turnstile_token: str | None = None


class PolishResponse(BaseModel):
    polished: list[PolishedBullet]


class SubscribeRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    consent: bool
    turnstile_token: str | None = None


class SubscribeResponse(BaseModel):
    ok: bool


class ClientLogRequest(BaseModel):
    """A single error report sent by the frontend (error boundary or global handler)."""

    message: str = Field(max_length=2000)
    stack: str | None = Field(default=None, max_length=8000)
    url: str | None = Field(default=None, max_length=500)
    user_agent: str | None = Field(default=None, max_length=500)
    kind: Literal["boundary", "error", "unhandledrejection"] = "error"


class ConsentDownloadRequest(BaseModel):
    """Sent when a user opts in to storage/news at the download step."""

    resume: ResumeData
    theme: Theme = Theme.aurora_violet
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    turnstile_token: str | None = None


class ConsentResponse(BaseModel):
    ok: bool
