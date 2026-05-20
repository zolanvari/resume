#!/usr/bin/env python3
"""Export thewisebot's icon sets as standalone SVG files.

Two sources:
  • lucide/   - the lucide-react icons actually imported across the app,
                reconstructed from the package's icon data (ISC licence).
  • animated/ - the custom icons-animated/ components, with the Motion
                animation stripped, leaving the static icon shape.

All output is 24×24, stroke="currentColor" - recolour with CSS `color`.
"""

import pathlib
import re

FRONTEND = pathlib.Path("/home/iman/thewisebot/frontend")
SRC = FRONTEND / "src"
LUCIDE_DATA = FRONTEND / "node_modules/lucide-react/dist/esm/icons"
ANIM_SRC = SRC / "components/icons-animated"

ROOT = pathlib.Path("/home/iman/thewisebot/icon-pack")
OUT_LUCIDE = ROOT / "lucide"
OUT_ANIM = ROOT / "animated"
for d in (OUT_LUCIDE, OUT_ANIM):
    d.mkdir(parents=True, exist_ok=True)

SHELL = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="{vb}" fill="{fill}" stroke="currentColor" stroke-width="2" '
    'stroke-linecap="{cap}" stroke-linejoin="{join}">\n{kids}\n</svg>\n'
)
TABLER_BBOX = "M0 0h24v24H0z"  # invisible 24×24 box in Tabler-style icons


# ── 1. Lucide ────────────────────────────────────────────────────
def kebab(name: str) -> str:
    name = re.sub(r"(?<=[a-zA-Z])(?=[A-Z])", "-", name)
    name = re.sub(r"(?<=[a-zA-Z])(?=[0-9])", "-", name)
    return name.lower()


lucide_names = set()
for f in SRC.rglob("*.tsx"):
    txt = f.read_text(errors="ignore")
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*['\"]lucide-react['\"]", txt):
        for raw in m.group(1).split(","):
            n = raw.strip().split(" as ")[0].strip()
            if n and n[0].isupper():
                lucide_names.add(n)

def load_lucide_data(stem: str, depth: int = 0):
    """Return the icon's child-element array, following deprecated re-exports."""
    jf = LUCIDE_DATA / f"{stem}.js"
    if not jf.exists() or depth > 5:
        return None
    js = jf.read_text()
    m = re.search(r"createLucideIcon\(\s*\"[^\"]+\"\s*,\s*(\[.*\])\s*\)\s*;", js, re.S)
    if m:
        return m.group(1)
    redirect = re.search(r"from\s*['\"]\./([\w-]+)\.js['\"]", js)  # alias re-export
    return load_lucide_data(redirect.group(1), depth + 1) if redirect else None


lucide_written, lucide_missing = [], []
for name in sorted(lucide_names):
    arr = load_lucide_data(kebab(name))
    if arr is None:
        lucide_missing.append(name)
        continue
    kids = []
    for cm in re.finditer(r'\[\s*"(\w+)"\s*,\s*\{([^{}]*)\}\s*\]', arr):
        tag = cm.group(1)
        attrs = [
            f'{k}="{v}"'
            for k, v in re.findall(r'(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"', cm.group(2))
            if k != "key"
        ]
        kids.append(f"  <{tag} " + " ".join(attrs) + " />")
    svg = SHELL.format(vb="0 0 24 24", fill="none", cap="round", join="round",
                       kids="\n".join(kids))
    (OUT_LUCIDE / f"{kebab(name)}.svg").write_text(svg, encoding="utf-8")
    lucide_written.append(kebab(name))

print(f"lucide:   {len(lucide_written)} svg files")
if lucide_missing:
    print("  unresolved:", ", ".join(lucide_missing))


# ── 2. Animated collection ───────────────────────────────────────
def find_attr(blob: str, name: str, default: str) -> str:
    m = re.search(rf'{name}="([^"]*)"', blob)
    return m.group(1) if m else default


anim_written, anim_issues = [], []
for f in sorted(ANIM_SRC.glob("*.tsx")):
    txt = f.read_text(errors="ignore")
    sm = re.search(r"<motion\.svg\b(.*?)>", txt, re.S) or re.search(
        r"<svg\b(.*?)>", txt, re.S
    )
    if not sm:
        anim_issues.append(f"{f.name}: no <svg>")
        continue
    shell = sm.group(1)
    vb = find_attr(shell, "viewBox", "0 0 24 24")
    cap = find_attr(shell, "strokeLinecap", "round")
    join = find_attr(shell, "strokeLinejoin", "round")

    # Every path "d" - explicit (d="…" / d={"…"}) and bare strings in .map()s.
    ds = [a or b for a, b in re.findall(r'd=(?:"([^"]+)"|\{"([^"]+)"\})', txt)]
    ds += re.findall(r'"([Mm][\s\d.\-][^"]{5,})"', txt)
    seen, paths = set(), []
    for d in (x.strip() for x in ds):
        if d and d != TABLER_BBOX and d not in seen:
            seen.add(d)
            paths.append(d)

    # Non-path primitives with static attributes.
    prims = []
    for m in re.finditer(
        r"<(?:motion\.)?(circle|rect|line|ellipse|polyline|polygon)\b([^>]*?)/?>", txt
    ):
        attrs = [
            f'{k}="{v}"'
            for k, v in re.findall(r'([\w-]+)="([^"{}]*)"', m.group(2))
            if k not in ("className", "class")
        ]
        if attrs:
            prims.append(f"  <{m.group(1)} " + " ".join(attrs) + " />")

    if not paths and not prims:
        anim_issues.append(f"{f.name}: no shapes found")
        continue
    kids = "\n".join(f'  <path d="{d}" />' for d in paths)
    if prims:
        kids = (kids + "\n" if kids else "") + "\n".join(prims)
    svg = SHELL.format(vb=vb, fill="none", cap=cap, join=join, kids=kids)
    out = f.name[:-4] + ".svg"
    (OUT_ANIM / out).write_text(svg, encoding="utf-8")
    anim_written.append(out)

print(f"animated: {len(anim_written)} svg files")
if anim_issues:
    print("  issues:", "; ".join(anim_issues))


# ── 3. Contact-sheet preview ─────────────────────────────────────
def grid(folder: pathlib.Path, sub: str) -> str:
    cells = []
    for svg in sorted(folder.glob("*.svg")):
        cells.append(
            f'<figure><img src="{sub}/{svg.name}" alt="{svg.stem}" />'
            f"<figcaption>{svg.stem}</figcaption></figure>"
        )
    return "\n".join(cells)


html = f"""<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>thewisebot icon pack</title>
<style>
  body {{ font-family: ui-sans-serif, system-ui, sans-serif; margin: 40px;
         background: #fafafa; color: #1a1a1a; }}
  h1 {{ font-size: 22px; }} h2 {{ margin-top: 40px; font-size: 16px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
          gap: 10px; }}
  figure {{ margin: 0; background: #fff; border: 1px solid #e5e5e5;
           border-radius: 8px; padding: 12px 6px; text-align: center; }}
  img {{ width: 28px; height: 28px; color: #312e81; }}
  figcaption {{ margin-top: 8px; font-size: 9px; color: #777; word-break: break-all; }}
</style></head>
<body>
  <h1>thewisebot icon pack - {len(lucide_written) + len(anim_written)} icons</h1>
  <h2>Lucide ({len(lucide_written)})</h2>
  <div class="grid">
{grid(OUT_LUCIDE, "lucide")}
  </div>
  <h2>Animated collection ({len(anim_written)})</h2>
  <div class="grid">
{grid(OUT_ANIM, "animated")}
  </div>
</body></html>
"""
(ROOT / "index.html").write_text(html, encoding="utf-8")
print(f"index.html: {len(lucide_written) + len(anim_written)} icons total")
