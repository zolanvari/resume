"""Pure data → Typst-source builder.

Takes a `ResumeData` and a theme slug and returns the full text of a `.typ`
file that, when compiled by `typst compile`, produces the rendered PDF.

The template's public API (`resume`, `resume-entry`, `resume-item`,
`resume-skill-item`) is the only contract this module relies on. No theme
internals are referenced from Python.
"""

import re

from app.schemas import (
    Bullet,
    CustomSection,
    EducationEntry,
    ExperienceEntry,
    LayoutSettings,
    ResumeData,
    SkillGroup,
    Theme,
)

# Markdown-style link `[label](https://…)` in body text. Only http(s) URLs
# are linkified; anything else is left as literal text.
_MD_LINK_RE = re.compile(r"\[([^\]\n]+)\]\((https?://[^)\s]+)\)")


def _ts(s: str) -> str:
    """Escape a value for a Typst double-quoted string literal."""
    return s.replace("\\", "\\\\").replace('"', '\\"')


def _tm_escape(s: str) -> str:
    """Escape plain text for Typst markup context (bullet/summary body)."""
    s = s.replace("\\", "\\\\")
    for c in ("#", "@", "*", "_", "$", "<", ">", "/"):
        s = s.replace(c, "\\" + c)
    return s


def _tm(s: str) -> str:
    """Escape body text for Typst markup, turning `[label](https://…)` into
    clickable links via the template's `cv-link` helper."""
    out: list[str] = []
    pos = 0
    for m in _MD_LINK_RE.finditer(s):
        out.append(_tm_escape(s[pos : m.start()]))
        label = _tm_escape(m.group(1)).replace("[", "\\[")
        out.append(f'#cv-link("{_ts(m.group(2))}")[{label}]')
        pos = m.end()
    out.append(_tm_escape(s[pos:]))
    return "".join(out)


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
    if c.portfolio:
        parts.append(f'website: "{_ts(c.portfolio)}"')
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


def _custom_sections(sections: list[CustomSection]) -> str:
    """User-defined sections - emitted with the same `=` heading + bullet block
    shape as the built-in sections so theme styles apply consistently. Empty
    cards (no title and no bullets) are skipped."""
    out: list[str] = []
    for s in sections:
        title = s.title.strip()
        if not title and not s.bullets:
            continue
        out.append(f"= {_tm(title or 'Section')}\n")
        out.append(_bullets_block(s.bullets))
    return "".join(out)


# Typst length unit per numeric layout field. text_align / text_direction are
# emitted separately as quoted strings.
_LAYOUT_UNITS: dict[str, str] = {
    "font_size": "pt",
    "line_spacing": "em",
    "body_line_spacing": "em",
    "section_spacing": "pt",
    "margin_x": "cm",
    "header_space": "cm",
    "footer_space": "cm",
    "bottom_margin": "cm",
    "title_item_spacing": "pt",
    "item_spacing": "pt",
}


def _build_layout_args(layout: LayoutSettings) -> list[str]:
    """`name: value` Typst arg strings for knobs the user changed from default.

    Unchanged knobs are omitted so the template's per-theme `layout-overrides`
    still apply; an emitted knob is the user's explicit choice and wins.
    """
    defaults = LayoutSettings()
    args: list[str] = []
    for field, unit in _LAYOUT_UNITS.items():
        value = getattr(layout, field)
        if value != getattr(defaults, field):
            # `%g` drops a trailing `.0` (e.g. 2.0 -> "2") for clean source.
            args.append(f"{field.replace('_', '-')}: {value:g}{unit}")
    if layout.text_align != defaults.text_align:
        args.append(f'text-align: "{layout.text_align}"')
    if layout.text_direction != defaults.text_direction:
        args.append(f'text-direction: "{layout.text_direction}"')
    return args


def emit_typst(
    resume: ResumeData, theme: Theme, layout: LayoutSettings | None = None
) -> str:
    layout_args = _build_layout_args(layout) if layout is not None else []
    layout_lines = "".join(f"  {arg},\n" for arg in layout_args)
    parts: list[str] = [
        '#import "resume.typ": *\n',
        "#show: resume.with(\n",
        f"  author: {_author_dict(resume)},\n",
        f'  theme: "{theme.value}",\n',
        layout_lines,
        ")\n\n",
        _summary_section(resume.summary),
        _experience_section(resume.experience),
        _education_section(resume.education),
        _skills_section(resume.skills),
        _custom_sections(resume.sections),
    ]
    return "".join(parts)
