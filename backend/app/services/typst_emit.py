"""Pure data → Typst-source builder.

Takes a `ResumeData` and a theme slug and returns the full text of a `.typ`
file that, when compiled by `typst compile`, produces the rendered PDF.

The template's public API (`resume`, `resume-entry`, `resume-item`,
`resume-skill-item`) is the only contract this module relies on. No theme
internals are referenced from Python.
"""

from app.schemas import (
    Bullet,
    EducationEntry,
    ExperienceEntry,
    ResumeData,
    SkillGroup,
    Theme,
)


def _ts(s: str) -> str:
    """Escape a value for a Typst double-quoted string literal."""
    return s.replace("\\", "\\\\").replace('"', '\\"')


def _tm(s: str) -> str:
    """Escape a value for Typst markup context (bullet body text)."""
    s = s.replace("\\", "\\\\")
    for c in ("#", "@", "*", "_", "$", "<", ">", "/"):
        s = s.replace(c, "\\" + c)
    return s


def _author_dict(resume: ResumeData) -> str:
    c = resume.contact
    parts: list[str] = [
        f'firstname: "{_ts(c.firstname)}"',
        f'lastname: "{_ts(c.lastname)}"',
    ]
    if c.email:
        parts.append(f'email: "{_ts(c.email)}"')
    if c.phone:
        parts.append(f'phone: "{_ts(c.phone)}"')
    if c.linkedin:
        parts.append(f'linkedin: "{_ts(c.linkedin)}"')
    if c.github:
        parts.append(f'github: "{_ts(c.github)}"')
    if c.website:
        parts.append(f'homepage: "{_ts(c.website)}"')
    if c.address:
        parts.append(f'address: "{_ts(c.address)}"')
    if c.headline:
        parts.append(f'positions: ("{_ts(c.headline)}",)')
    return "(\n    " + ",\n    ".join(parts) + ",\n  )"


def _bullets_block(bullets: list[Bullet]) -> str:
    if not bullets:
        return ""
    items = "\n".join(f"  - {_tm(b.text)}" for b in bullets)
    return f"#resume-item[\n{items}\n]\n"


def _experience_section(experience: list[ExperienceEntry]) -> str:
    if not experience:
        return ""
    out: list[str] = ["= Experience\n"]
    for e in experience:
        out.append(
            "#resume-entry(\n"
            f'  title: "{_ts(e.title)}",\n'
            f'  description: "{_ts(e.company)}",\n'
            f'  location: "{_ts(e.location)}",\n'
            f'  date: "{_ts(e.date)}",\n'
            ")\n"
        )
        out.append(_bullets_block(e.bullets))
    return "".join(out)


def _education_section(education: list[EducationEntry]) -> str:
    if not education:
        return ""
    out: list[str] = ["= Education\n"]
    for e in education:
        out.append(
            "#resume-entry(\n"
            f'  title: "{_ts(e.degree)}",\n'
            f'  description: "{_ts(e.institution)}",\n'
            f'  location: "{_ts(e.location)}",\n'
            f'  date: "{_ts(e.date)}",\n'
            ")\n"
        )
        out.append(_bullets_block(e.bullets))
    return "".join(out)


def _skills_section(skills: list[SkillGroup]) -> str:
    if not skills:
        return ""
    out: list[str] = ["= Skills\n"]
    for g in skills:
        items_lit = ", ".join(f'"{_ts(i)}"' for i in g.items)
        out.append(f'#resume-skill-item("{_ts(g.category)}", ({items_lit},))\n')
    return "".join(out)


def _summary_section(summary: str | None) -> str:
    if not summary:
        return ""
    return f"= Summary\n\n{_tm(summary)}\n\n"


def emit_typst(resume: ResumeData, theme: Theme) -> str:
    parts: list[str] = [
        '#import "resume.typ": *\n',
        "#show: resume.with(\n",
        f"  author: {_author_dict(resume)},\n",
        f'  theme: "{theme.value}",\n',
        ")\n\n",
        _summary_section(resume.summary),
        _experience_section(resume.experience),
        _education_section(resume.education),
        _skills_section(resume.skills),
    ]
    return "".join(parts)
