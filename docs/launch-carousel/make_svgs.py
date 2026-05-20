#!/usr/bin/env python3
"""Generate the launch carousel as 5 editable SVG files (slide-1..5.svg).

Text stays as real <text> elements in Inter (a font Figma ships with), so the
copy is fully editable after import. Slide 4's template screenshots are
embedded as base64 data URIs, so each SVG is self-contained and portable.
Background is the cv.zolanvari.com page-wash gradient.
"""

import base64
import pathlib

HERE = pathlib.Path(__file__).parent
TPL = HERE / "templates"

INK = "#1A1A1A"
MUTED = "#6E6A66"
ACCENT = "#E0785C"
STRONG = "#454341"
FONT = "Inter, 'Helvetica Neue', Arial, sans-serif"

# cv.zolanvari.com background - linear-gradient(135deg, …) → top-left→bottom-right.
GRAD = (
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
    '<stop offset="0" stop-color="#FFFBEB"/>'
    '<stop offset="0.33" stop-color="#FFE4E6"/>'
    '<stop offset="0.66" stop-color="#FAE8FF"/>'
    '<stop offset="1" stop-color="#DBEAFE"/>'
    "</linearGradient>"
)


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def b64(name: str) -> str:
    data = (TPL / name).read_bytes()
    return "data:image/png;base64," + base64.b64encode(data).decode("ascii")


def T(x, y, size, weight, fill, runs, anchor="start", ls=None):
    """A <text> line. `runs` = list of (text,) | (text, fill) | (text, fill, weight)."""
    a = [
        f'x="{x}"',
        f'y="{y}"',
        f'font-family="{FONT}"',
        f'font-size="{size}"',
        f'font-weight="{weight}"',
        f'fill="{fill}"',
    ]
    if anchor != "start":
        a.append(f'text-anchor="{anchor}"')
    if ls is not None:
        a.append(f'letter-spacing="{ls}"')
    inner = ""
    for run in runs:
        t = esc(run[0])
        sp = []
        if len(run) > 1 and run[1]:
            sp.append(f'fill="{run[1]}"')
        if len(run) > 2 and run[2]:
            sp.append(f'font-weight="{run[2]}"')
        inner += f'<tspan {" ".join(sp)}>{t}</tspan>' if sp else t
    return f'<text {" ".join(a)}>{inner}</text>'


def label(txt):
    return T(92, 150, 16, 600, ACCENT, [(txt,)], ls=3.6)


def footer(page):
    return (
        '<rect x="92" y="1206" width="896" height="2" fill="#1A1A1A" opacity="0.12"/>'
        + T(92, 1252, 14, 600, MUTED, [("@ZOLANVARI · CV.ZOLANVARI.COM",)], ls=2)
        + T(988, 1252, 14, 600, MUTED, [(page,)], anchor="end", ls=2)
    )


def thumb(x, y, w, h, name, cid):
    """An embedded template screenshot, top-cropped, rounded corners."""
    return (
        f'<clipPath id="{cid}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10"/></clipPath>'
        f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="{b64(name)}" '
        f'preserveAspectRatio="xMidYMin slice" clip-path="url(#{cid})"/>'
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="none" '
        f'stroke="#1A1A1A" stroke-opacity="0.16"/>'
    )


def caption(x, y, name, desc):
    return T(x, y, 14, 600, INK, [(name,), (f"  ·  {desc}", MUTED, 500)])


def pill(x, y, w, h, fill, stroke, text, text_fill):
    rx = h / 2
    rect = (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'
        + (f' stroke="{stroke}" stroke-width="1.5"' if stroke else "")
        + "/>"
    )
    label_el = T(
        x + w / 2, y + h / 2 + 7, 20, 600, text_fill, [(text,)], anchor="middle"
    )
    return rect + label_el


def svg(body):
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" '
        'viewBox="0 0 1080 1350">\n'
        f"  <defs>{GRAD}</defs>\n"
        '  <rect width="1080" height="1350" fill="url(#bg)"/>\n  '
        + body
        + "\n</svg>\n"
    )


# ── Slide 1 ──────────────────────────────────────────────────────
s1 = "".join(
    [
        label("WHY WE BUILT IT"),
        T(92, 256, 66, 800, INK, [("Layoffs are everywhere.",)]),
        T(92, 330, 66, 800, INK, [("Your résumé shouldn't",)]),
        T(92, 404, 66, 800, INK, [("cost you ",), ("anything", ACCENT), (".",)]),
        T(92, 1084, 25, 400, MUTED, [("So we built a résumé builder that's free, open source,",)]),
        T(92, 1125, 25, 400, MUTED, [("and private - and put it online for anyone who needs",)]),
        T(92, 1166, 25, 400, MUTED, [("it right now. Here's the why.",)]),
        footer("01 / 05"),
    ]
)

# ── Slide 2 ──────────────────────────────────────────────────────
s2 = "".join(
    [
        label("THE PROBLEM"),
        T(92, 256, 58, 800, INK, [("Most résumé tools want",)]),
        T(92, 322, 58, 800, INK, [
            ("your ",), ("money", ACCENT), (", your ",), ("email", ACCENT), (",",)]),
        T(92, 388, 58, 800, INK, [("and your ",), ("data", ACCENT), (".",)]),
        T(92, 1043, 25, 400, MUTED, [("“Sign up to continue.” “Upgrade to download.”",)]),
        T(92, 1084, 25, 400, MUTED, [("Meanwhile your résumé - full of personal details -",)]),
        T(92, 1125, 25, 400, MUTED, [("sits on someone else's servers. When you're job-",)]),
        T(92, 1166, 25, 400, MUTED, [("hunting under pressure, that's the last thing you need.",)]),
        footer("02 / 05"),
    ]
)

# ── Slide 3 ──────────────────────────────────────────────────────
s3 = "".join(
    [
        label("THE PROJECT · CV.ZOLANVARI.COM"),
        T(92, 256, 58, 800, INK, [("A résumé builder that's",)]),
        T(92, 322, 58, 800, INK, [
            ("free", ACCENT), (", ",), ("open source", ACCENT), (",",)]),
        T(92, 388, 58, 800, INK, [("and stores ",), ("nothing", ACCENT), (".",)]),
        T(92, 1043, 25, 400, MUTED, [
            ("Upload your old résumé as a ",), ("PDF or Word", INK, 600), (" file. AI",)]),
        T(92, 1084, 25, 400, MUTED, [("reads it and organises it into clean, structured fields",)]),
        T(92, 1125, 25, 400, MUTED, [("- no account, no fee. It's processed in the moment",)]),
        T(92, 1166, 25, 400, MUTED, [("and discarded; nothing is kept unless you opt in.",)]),
        footer("03 / 05"),
    ]
)

# ── Slide 4 - templates ──────────────────────────────────────────
row1 = [
    ("aurora-violet.png", "Aurora Violet", "modern"),
    ("graphite-mist.png", "Graphite Mist", "editorial"),
    ("midnight-prism.png", "Midnight Prism", "dark"),
    ("ember-glow.png", "Ember Glow", "bold"),
]
row2 = [
    ("ivory-classique.png", "Ivory Classique", "traditional"),
    ("mint-meridian.png", "Mint Meridian", "fresh"),
    ("sunset-haze.png", "Sunset Haze", "warm"),
]
s4_parts = [
    label("SEVEN TYPESET TEMPLATES"),
    T(92, 250, 56, 800, INK, [("Pick a look that",)]),
    T(92, 314, 56, 800, INK, [("gets you ",), ("read", ACCENT), (".",)]),
]
for i, (img, name, desc) in enumerate(row1):
    x = 92 + i * 229
    s4_parts.append(thumb(x, 372, 209, 232, img, f"c1{i}"))
    s4_parts.append(caption(x, 654, name, desc))
for i, (img, name, desc) in enumerate(row2):
    x = 92 + i * 305
    s4_parts.append(thumb(x, 700, 285, 232, img, f"c2{i}"))
    s4_parts.append(caption(x, 982, name, desc))
s4_parts += [
    T(92, 1070, 23, 400, MUTED, [("Switch themes with one click and preview the result live",)]),
    T(92, 1108, 23, 400, MUTED, [("before you download - every template is recruiter-ready.",)]),
    footer("04 / 05"),
]
s4 = "".join(s4_parts)

# ── Slide 5 - how it works + CTA ─────────────────────────────────
steps = [
    ("Upload", " your résumé (PDF or Word), or start from blank."),
    ("Edit", " your details and let AI polish your bullet points."),
    ("Download", " a clean, recruiter-ready PDF - ready to send."),
]
s5_parts = [
    label("HOW IT WORKS"),
    T(92, 256, 66, 800, INK, [("Three steps. ",), ("Free", ACCENT), (".",)]),
    T(92, 330, 66, 800, INK, [("Forever.",)]),
]
for i, (head, rest) in enumerate(steps):
    y = 486 + i * 96
    s5_parts.append(T(92, y, 40, 800, ACCENT, [(str(i + 1),)]))
    s5_parts.append(T(176, y, 25, 400, STRONG, [(head, INK, 700), (rest,)]))
s5_parts += [
    pill(92, 812, 384, 66, INK, None, "Try it  →  cv.zolanvari.com", "#FFFBEB"),
    pill(492, 812, 300, 66, "none", "#1A1A1A", "Star it on GitHub", INK),
    footer("05 / 05"),
]
s5 = "".join(s5_parts)

for i, body in enumerate([s1, s2, s3, s4, s5], start=1):
    out = HERE / f"slide-{i}.svg"
    out.write_text(svg(body), encoding="utf-8")
    print(f"wrote {out.name}  ({out.stat().st_size // 1024} KB)")
