#!/usr/bin/env python3
"""Generate version_2 of the cv.zolanvari.com launch carousel - 5 editable SVGs.

Applies the review feedback to version_1:
  • slide numbers fixed 01/05 … 05/05
  • varied eyebrows (How it works → … → Open source)
  • a real problem-first hook + a personal "why I built this" beat (slide 1)
  • slide 3 reworked into an AI before→after (raw text → Gemini → typeset)
  • tightened privacy + open-source slides

Text stays as real <text> in Inter (Figma-native) so it is fully editable.
"""

import base64
import pathlib
import re
import struct

HERE = pathlib.Path(__file__).parent
A = HERE / "assets"

INK = "#1A1A1A"
MUTED = "#5F5B54"
ACCENT = "#E0785C"
MONO_FG = "#8C877E"
W, H = 1080, 1350
MX = 88  # left/right margin
FONT = "Inter, 'Helvetica Neue', Arial, sans-serif"
MONO = "'DejaVu Sans Mono', ui-monospace, 'SF Mono', Menlo, monospace"

GRAD = (
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
    '<stop offset="0" stop-color="#FFFBEB"/>'
    '<stop offset="0.33" stop-color="#FFE4E6"/>'
    '<stop offset="0.66" stop-color="#FAE8FF"/>'
    '<stop offset="1" stop-color="#DBEAFE"/></linearGradient>'
)
SHADOW = (
    '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%">'
    '<feDropShadow dx="0" dy="12" stdDeviation="18" '
    'flood-color="#1A1A1A" flood-opacity="0.12"/></filter>'
)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def T(x, y, size, weight, fill, runs, anchor="start", ls=None, font=FONT):
    a = [f'x="{x}"', f'y="{y}"', f'font-family="{font}"', f'font-size="{size}"',
         f'font-weight="{weight}"', f'fill="{fill}"']
    if anchor != "start":
        a.append(f'text-anchor="{anchor}"')
    if ls is not None:
        a.append(f'letter-spacing="{ls}"')
    inner = ""
    for r in runs:
        t = esc(r[0])
        rf = r[1] if len(r) > 1 else None
        rw = r[2] if len(r) > 2 else None
        sp = []
        if rf:
            sp.append(f'fill="{rf}"')
        if rw:
            sp.append(f'font-weight="{rw}"')
        inner += f'<tspan {" ".join(sp)}>{t}</tspan>' if sp else t
    return f'<text {" ".join(a)}>{inner}</text>'


def png_size(path):
    d = path.read_bytes()[:33]
    return struct.unpack(">II", d[16:24])


def image(path, x, y, w, h, rx=14):
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    cid = "img" + str(abs(hash((str(path), x, y))) % 99999)
    return (
        f'<clipPath id="{cid}"><rect x="{x}" y="{y}" width="{w}" height="{h}" '
        f'rx="{rx}"/></clipPath>'
        f'<image x="{x}" y="{y}" width="{w}" height="{h}" '
        f'href="data:image/png;base64,{data}" preserveAspectRatio="xMidYMin slice" '
        f'clip-path="url(#{cid})"/>'
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="none" '
        f'stroke="#1A1A1A" stroke-opacity="0.12"/>'
    )


def embed(path, x, y, w, h):
    """Nest a provided asset SVG, scaled into an x/y/w/h box."""
    s = path.read_text(encoding="utf-8", errors="ignore")
    s = re.sub(r"<\?xml.*?\?>", "", s, flags=re.S)
    s = re.sub(r"<!DOCTYPE.*?>", "", s, flags=re.S)
    open_m = re.search(r"<svg\b[^>]*>", s, re.S)
    vb = re.search(r'viewBox="([^"]+)"', open_m.group(0))
    if vb:
        view = vb.group(1)
    else:  # derive from width/height
        wm = re.search(r'width="([\d.]+)"', open_m.group(0))
        hm = re.search(r'height="([\d.]+)"', open_m.group(0))
        view = f"0 0 {wm.group(1)} {hm.group(1)}"
    inner = s[open_m.end(): s.rfind("</svg>")]
    return (
        f'<svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="{view}" '
        f'overflow="visible">{inner}</svg>'
    )


def card(x, y, w, h, rx=22, fill="#FFFFFF"):
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" '
        f'filter="url(#soft)"/>'
    )


def eyebrow(text, sparkle=False):
    t = ("✦   " if sparkle else "") + text
    return T(MX, 150, 21, 700, ACCENT, [(t,)], ls=0.5)


def footer(page):
    # footer_iman.svg has its text outlined to paths, so the only way to
    # enlarge the website/LinkedIn links is to scale the whole asset up.
    # 760 wide ≈ +39% vs the original 548. Page number enlarged to match.
    fw = 760
    fh = fw * 168 / 669
    fy = H - fh - 16
    hairline = fy - 18
    out = f'<line x1="{MX}" y1="{hairline:.0f}" x2="{W-MX}" y2="{hairline:.0f}" ' \
          'stroke="#1A1A1A" stroke-opacity="0.10" stroke-width="2"/>'
    out += embed(A / "footer_iman.svg", MX - 10, fy, fw, fh)
    out += T(W - MX, fy + fh / 2 + 9, 26, 700, MUTED, [(page,)],
             anchor="end", ls=1.5)
    return out


def headline(lines, y0, size, lh):
    """lines: list of run-lists. Returns <text> per line from baseline y0."""
    return "".join(
        T(MX, y0 + i * lh, size, 800, INK, runs) for i, runs in enumerate(lines)
    )


def body(lines, y0, size=24, lh=39, fill=MUTED, weight=400):
    return "".join(
        T(MX, y0 + i * lh, size, weight, fill, [(t,)] if isinstance(t, str) else t)
        for i, t in enumerate(lines)
    )


def svg(parts):
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}">\n<defs>{GRAD}{SHADOW}</defs>\n'
        f'<rect width="{W}" height="{H}" fill="url(#bg)"/>\n'
        + "".join(parts)
        + "\n</svg>\n"
    )


# ── Slide 1 - hook ───────────────────────────────────────────────
av_w, av_h = png_size(A / "aurora-violet.png")
img_h = 400  # leaves clear space above the (now larger) footer
img_w = round(img_h * av_w / av_h)
s1 = svg([
    eyebrow("Free  ·  Open-source  ·  No sign-up", sparkle=True),
    headline([
        [("I got tired of $20-a-month",)],
        [("résumé builders.",)],
        [("So I built a free one -",)],
        [("and ", ), ("open-sourced it", ACCENT), (".",)],
    ], 252, 62, 78),
    body([
        "Layoffs are everywhere, and every résumé tool worth using",
        "sits behind a paywall. So I shipped the one I wished existed",
        "- AI-assisted, beautifully typeset, and yours to keep.",
    ], 600, 24, 39),
    image(A / "aurora-violet.png", (W - img_w) // 2, 712, img_w, img_h),
    footer("01 / 05"),
])

# ── Slide 2 - how it works (input) ───────────────────────────────
entry = [
    ("1", "Upload", "A PDF or Word file,", "up to 5 MB."),
    ("2", "Paste", "Drop in raw résumé", "text - any format."),
    ("3", "Blank", "Build from scratch", "in a guided form."),
]
cw = (W - 2 * MX - 2 * 28) // 3
s2_parts = [
    eyebrow("How it works"),
    headline([[("Start with whatever",)], [("you've already got.",)]], 252, 60, 76),
    body([
        "A PDF, a Word doc, plain pasted text, or nothing at all.",
        "No account, no sign-up - you reach the editor in one click.",
    ], 430, 24, 39),
]
for i, (n, title, l1, l2) in enumerate(entry):
    cx = MX + i * (cw + 28)
    cy = 560
    s2_parts += [
        card(cx, cy, cw, 348),
        T(cx + 34, cy + 96, 46, 800, ACCENT, [(n,)]),
        T(cx + 34, cy + 162, 28, 700, INK, [(title,)]),
        T(cx + 34, cy + 212, 19, 400, MUTED, [(l1,)]),
        T(cx + 34, cy + 240, 19, 400, MUTED, [(l2,)]),
    ]
s2_parts += [
    T(MX, 992, 22, 400, MUTED, [
        ("Then: ",),
        ("seven typeset themes", INK, 600),
        (", ",),
        ("AI bullet-polish", ACCENT, 600),
        (", one-click PDF.",),
    ]),
    footer("02 / 05"),
]
s2 = svg(s2_parts)

# ── Slide 3 - how it works (cont.): the AI before→after ──────────
mono_lines = [
    "alex rivera",
    "senior software engineer - remote",
    "alex.rivera@example.com · 555 0142",
    "",
    "EXPERIENCE",
    "globex - senior software engineer",
    "jun 2023-now. led billing pipeline",
    "migration, cut incidents ~80%.",
    "acme data 2020-23, software eng.",
    "skills: python, go, typescript, sql",
]
cardY, cardH = 556, 432
lcx, rcx, cardW = MX, 606, 386
iv_w, iv_h = png_size(A / "ivory-classique.png")
rimg_w = cardW - 48
rimg_h = cardH - 104
s3_parts = [
    eyebrow("How it works (cont.)"),
    headline([[("Paste the mess.",)],
              [("AI hands back ", ), ("structure", ACCENT), (".",)]], 252, 60, 76),
    body([
        "Gemini reads any résumé - however rough - pulls out clean",
        "structured fields, and typesets them into a polished PDF.",
    ], 430, 23, 38),
    # left card - raw text
    card(lcx, cardY, cardW, cardH),
    T(lcx + 30, cardY + 50, 15, 700, MUTED, [("RAW PASTED TEXT",)], ls=1.6),
]
for i, ln in enumerate(mono_lines):
    s3_parts.append(T(lcx + 30, cardY + 92 + i * 30, 15, 400, MONO_FG,
                      [(ln,)], font=MONO))
s3_parts += [
    # right card - typeset résumé
    card(rcx, cardY, cardW, cardH),
    T(rcx + 30, cardY + 50, 15, 700, MUTED, [("TYPESET RÉSUMÉ",)], ls=1.6),
    image(A / "ivory-classique.png", rcx + 24, cardY + 74, rimg_w, rimg_h, rx=8),
    # connector arrow + Gemini pill
    f'<line x1="{lcx+cardW-6}" y1="{cardY+cardH/2}" x2="{rcx+6}" '
    f'y2="{cardY+cardH/2}" stroke="{ACCENT}" stroke-width="3"/>',
    f'<path d="M{rcx+2} {cardY+cardH/2} l-16 -9 v18 z" fill="{ACCENT}"/>',
    f'<rect x="{W/2-104}" y="{cardY+cardH/2-26}" width="208" height="52" rx="26" '
    f'fill="{INK}"/>',
    T(W / 2, cardY + cardH / 2 + 6, 18, 700, "#FFFBEB",
      [("Gemini 2.5 · GCP",)], anchor="middle"),
    # stack one-liner
    T(W / 2, 1058, 18, 500, MUTED, [
        ("Gemini 2.5 on GCP  ·  processed transiently  ·  "
         "nothing stored  ·  bullet-polish built in",)], anchor="middle"),
    footer("03 / 05"),
]
s3 = svg(s3_parts)

# ── Slide 4 - private & free ─────────────────────────────────────
checks = [
    ("Free forever", "- no paywall, no “upgrade to download”."),
    ("No sign-up", "- no account, no email to get started."),
    ("Transient by default", "- résumés are never written to a database."),
    ("GDPR-friendly", "- data is kept only if you explicitly opt in."),
]
s4_parts = [
    eyebrow("Private & free"),
    headline([[("No accounts. No fees.",)],
              [("Your résumé isn't ", ), ("stored", ACCENT), (".",)]], 252, 58, 74),
    body([
        "It's a tool built to keep your data on your device, not mine.",
    ], 426, 24, 39),
]
for i, (h1, h2) in enumerate(checks):
    cy = 540 + i * 116
    s4_parts += [
        f'<circle cx="{MX+24}" cy="{cy-9}" r="24" fill="{ACCENT}"/>',
        f'<path d="M{MX+13} {cy-9} l8 8 l14 -16" fill="none" stroke="#FFFBEB" '
        'stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
        T(MX + 70, cy, 25, 700, INK, [(h1 + " ", INK, 700), (h2, MUTED, 400)]),
    ]
s4_parts.append(footer("04 / 05"))
s4 = svg(s4_parts)

# ── Slide 5 - open source + CTA + closing ────────────────────────
s5_parts = [
    eyebrow("Open source"),
    headline([[("Shipped, hosted, free -",)],
              [("and the ", ), ("code is yours", ACCENT), (".",)]], 252, 58, 74),
    body([
        "Building this taught me a lot about typesetting and LLM",
        "extraction. It's a real, running product - not a screenshot.",
        "Fork it, file an issue, make it better.",
    ], 430, 24, 39),
    # live link
    card(MX, 588, 560, 230),
    T(MX + 40, 648, 17, 700, MUTED, [("TRY IT LIVE",)], ls=1.8),
    T(MX + 40, 706, 36, 800, INK, [("cv.zolanvari.com",)]),
    embed(A / "GitHub_Lockup_Black.svg", MX + 38, 736, 232, 232 * 95 / 416),
    T(MX + 40, 802, 18, 500, MUTED, [("github.com/zolanvari/resume",)]),
    # QR
    card(700, 588, 292, 230),
    embed(A / "qr_code_cv_zolanvari_com.svg", 740, 612, 150, 150),
    T(846, 690, 16, 600, MUTED, [("Scan to",)], anchor="middle"),
    T(846, 712, 16, 600, MUTED, [("open it",)], anchor="middle"),
    # comment-seeding question
    T(MX, 952, 27, 700, INK, [
        ("↳  ", ACCENT, 800),
        ("What theme or feature should I add next?", INK, 700)]),
    T(MX, 992, 22, 400, MUTED, [("Tell me in the comments - issues and PRs welcome too.",)]),
    footer("05 / 05"),
]
s5 = svg(s5_parts)

for i, s in enumerate([s1, s2, s3, s4, s5], 1):
    out = HERE / f"slide-{i}.svg"
    out.write_text(s, encoding="utf-8")
    print(f"wrote {out.name}  ({out.stat().st_size // 1024} KB)")
