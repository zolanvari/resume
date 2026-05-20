# Layout Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let CV-editor users adjust 12 layout knobs (font size, spacing, margins, alignment) and see the PDF preview update, ported from thewisebot's Layout panel.

**Architecture:** The Typst template `resume.typ` already declares all 12 knobs. Thread a new `LayoutSettings` object from a collapsible `LayoutPanel` UI → `App` state → `renderPdf` → `POST /api/render` → `emit_typst` → the `resume.with(...)` call. The emitter sends only knobs the user changed from default; the template resolves each knob as *explicit value → per-theme override → hard default*.

**Tech Stack:** FastAPI + Pydantic v2, Typst CLI, React 18 + TypeScript + Vite, Tailwind.

**Note on commits:** Each task ends with a commit step in the standard plan format. The user has **not** requested commits - skip the commit steps unless the user asks for them. The repo already has uncommitted work from earlier tasks.

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `backend/app/schemas.py` | `LayoutSettings` model; `RenderRequest.layout` | Modify |
| `backend/app/services/typst_emit.py` | Emit changed knobs into `resume.with(...)` | Modify |
| `backend/app/services/typst_render.py` | Forward `layout` to the emitter | Modify |
| `backend/app/routers/render.py` | Pass `req.layout` through | Modify |
| `backend/app/templates/resume.typ` | Knob defaults → `none`; precedence resolution | Modify |
| `backend/tests/test_layout_emit.py` | Unit test for the emitter (standalone script) | Create |
| `frontend/src/types.ts` | `LayoutSettings` interface + `DEFAULT_LAYOUT` | Modify |
| `frontend/src/api.ts` | `renderPdf` gains a `layout` argument | Modify |
| `frontend/src/components/LayoutPanel.tsx` | The collapsible panel UI | Create |
| `frontend/src/App.tsx` | Layout state, debounce, panel mount, tone label | Modify |

---

## Task 1: Backend - `LayoutSettings` schema

**Files:**
- Create: `backend/.venv/` (test-only virtualenv), `backend/tests/test_layout_emit.py`
- Modify: `backend/app/schemas.py`

- [ ] **Step 1: Create a test virtualenv**

The backend has no test runner. Layout emission is pure Python needing only `pydantic`. Create a lightweight venv so the unit test runs fast on the host:

```bash
cd /home/iman/cv_zolanvari_com/backend
python3 -m venv .venv
.venv/bin/pip install --quiet pydantic==2.9.2
```

- [ ] **Step 2: Write the failing test**

Create `backend/tests/test_layout_emit.py`:

```python
"""Standalone unit test for LayoutSettings + Typst layout emission.

Run from the backend directory:
    PYTHONPATH=. .venv/bin/python tests/test_layout_emit.py
Exits 0 on success, 1 on the first failed assertion.
"""

from app.schemas import LayoutSettings, RenderRequest
from app.services.typst_emit import _build_layout_args, emit_typst
from app.schemas import Contact, ResumeData, Theme


def test_defaults():
    d = LayoutSettings()
    assert d.font_size == 10.0
    assert d.line_spacing == 0.8
    assert d.text_align == "left"
    assert d.text_direction == "auto"


def test_request_default_layout():
    req = RenderRequest(resume=ResumeData(contact=Contact(firstname="A", lastname="B")))
    assert req.layout == LayoutSettings()


def test_bounds_reject_out_of_range():
    try:
        LayoutSettings(font_size=99.0)
    except Exception:
        pass
    else:
        raise AssertionError("font_size=99 should be rejected by Field bounds")


def test_build_layout_args_emits_only_changed():
    args = _build_layout_args(LayoutSettings())
    assert args == [], f"unchanged layout must emit nothing, got {args}"

    args = _build_layout_args(LayoutSettings(font_size=11.5, text_align="justify"))
    assert "font-size: 11.5pt" in args
    assert 'text-align: "justify"' in args
    assert len(args) == 2, f"only changed knobs should emit, got {args}"


def test_emit_typst_injects_layout():
    resume = ResumeData(contact=Contact(firstname="A", lastname="B"))
    src = emit_typst(resume, Theme.aurora_violet, LayoutSettings(margin_x=2.0))
    assert "margin-x: 2cm" in src
    assert "#show: resume.with(" in src

    src_default = emit_typst(resume, Theme.aurora_violet, LayoutSettings())
    assert "margin-x" not in src_default, "default layout must not emit knobs"


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"{len(tests)} passed")
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `cd /home/iman/cv_zolanvari_com/backend && PYTHONPATH=. .venv/bin/python tests/test_layout_emit.py`
Expected: FAIL - `ImportError: cannot import name 'LayoutSettings' from 'app.schemas'`.

- [ ] **Step 4: Add `LayoutSettings` and extend `RenderRequest`**

In `backend/app/schemas.py`, insert `LayoutSettings` immediately before `class RenderRequest` (after `ResumeData`, around line 62), and add the `layout` field to `RenderRequest`:

```python
class LayoutSettings(BaseModel):
    """User-tunable Typst layout knobs. Defaults match the resume.typ template."""

    font_size: float = Field(default=10.0, ge=8.0, le=14.0)
    line_spacing: float = Field(default=0.8, ge=0.4, le=1.5)
    body_line_spacing: float = Field(default=0.55, ge=0.3, le=1.5)
    section_spacing: float = Field(default=23.0, ge=4.0, le=24.0)
    margin_x: float = Field(default=1.5, ge=0.5, le=3.0)
    header_space: float = Field(default=1.7, ge=0.5, le=4.0)
    footer_space: float = Field(default=1.5, ge=0.5, le=4.0)
    bottom_margin: float = Field(default=0.0, ge=0.0, le=4.0)
    title_item_spacing: float = Field(default=9.0, ge=0.0, le=20.0)
    item_spacing: float = Field(default=9.0, ge=0.0, le=20.0)
    text_align: Literal["left", "justify", "right"] = "left"
    text_direction: Literal["auto", "ltr", "rtl"] = "auto"


class RenderRequest(BaseModel):
    resume: ResumeData
    theme: Theme = Theme.aurora_violet
    layout: LayoutSettings = Field(default_factory=LayoutSettings)
```

(`Field` and `Literal` are already imported at the top of the file. Delete the old 3-line `RenderRequest` class - it is replaced above.)

- [ ] **Step 5: Run the test again**

Run: `cd /home/iman/cv_zolanvari_com/backend && PYTHONPATH=. .venv/bin/python tests/test_layout_emit.py`
Expected: still FAIL - now `ImportError: cannot import name '_build_layout_args'`. The schema tests (`test_defaults`, `test_request_default_layout`, `test_bounds_reject_out_of_range`) are covered; Task 2 finishes the emitter.

- [ ] **Step 6: Commit** *(skip unless the user asked for commits)*

```bash
git add backend/app/schemas.py backend/tests/test_layout_emit.py
git commit -m "feat(backend): add LayoutSettings schema"
```

---

## Task 2: Backend - emit layout knobs into Typst source

**Files:**
- Modify: `backend/app/services/typst_emit.py`
- Test: `backend/tests/test_layout_emit.py` (written in Task 1)

- [ ] **Step 1: Add the emitter helpers and thread `layout` into `emit_typst`**

In `backend/app/services/typst_emit.py`, add `LayoutSettings` to the import from `app.schemas`:

```python
from app.schemas import (
    Bullet,
    EducationEntry,
    ExperienceEntry,
    LayoutSettings,
    ResumeData,
    SkillGroup,
    Theme,
)
```

Add these two helpers just above `def emit_typst` (after `_summary_section`):

```python
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
```

Replace the `emit_typst` function with:

```python
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
    ]
    return "".join(parts)
```

- [ ] **Step 2: Run the test, verify it passes**

Run: `cd /home/iman/cv_zolanvari_com/backend && PYTHONPATH=. .venv/bin/python tests/test_layout_emit.py`
Expected: PASS - `5 passed`.

- [ ] **Step 3: Commit** *(skip unless the user asked for commits)*

```bash
git add backend/app/services/typst_emit.py
git commit -m "feat(backend): emit layout knobs into Typst source"
```

---

## Task 3: Backend - thread `layout` through the render service and route

**Files:**
- Modify: `backend/app/services/typst_render.py`, `backend/app/routers/render.py`

- [ ] **Step 1: Add `layout` to `render_pdf`**

In `backend/app/services/typst_render.py`, extend the import:

```python
from app.schemas import LayoutSettings, ResumeData, Theme
```

Change the `render_pdf` signature and the `main.typ` write (the `render_svg` and `get_sample_preview_svg` functions are **unchanged** - previews stay layout-free):

```python
def render_pdf(
    resume: ResumeData, theme: Theme, layout: LayoutSettings | None = None
) -> bytes:
    start = time.perf_counter()
    with TemporaryDirectory(prefix="cv-render-") as td_str:
        td = Path(td_str)
        (td / "main.typ").write_text(
            emit_typst(resume, theme, layout), encoding="utf-8"
        )
        shutil.copy(TEMPLATE_FILE, td / "resume.typ")
        shutil.copy(TEMPLATE_ASSET, td / "graphite-paper.jpg")
```

(The rest of `render_pdf` is unchanged.)

- [ ] **Step 2: Pass `req.layout` in the route**

In `backend/app/routers/render.py`, change line 15:

```python
        pdf_bytes = render_pdf(req.resume, req.theme, req.layout)
```

- [ ] **Step 3: Verify Python imports cleanly**

Run: `cd /home/iman/cv_zolanvari_com/backend && PYTHONPATH=. .venv/bin/python -c "import ast; [ast.parse(open(f).read()) for f in ('app/services/typst_render.py','app/routers/render.py')]; print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 4: Commit** *(skip unless the user asked for commits)*

```bash
git add backend/app/services/typst_render.py backend/app/routers/render.py
git commit -m "feat(backend): pass layout settings to the renderer"
```

---

## Task 4: Typst template - explicit-knob precedence over theme overrides

**Files:**
- Modify: `backend/app/templates/resume.typ`

**Why:** Today a theme's `layout-overrides` dict unconditionally overwrites the caller's args for 5 knobs (`ivory-classique` is the only theme that uses it). After this change a user-set knob always wins.

- [ ] **Step 1: Change the 12 layout-knob defaults to `none`**

In `resume.typ`, in the `#let resume(` signature, replace the layout-knob block (currently lines ~707-723) with - keeping the surrounding comments:

```typst
  // Layout knobs (caller can override per render). `none` means "not set by
  // the caller" - resolved below to a per-theme override or the hard default.
  font-size: none,
  line-spacing: none,
  body-line-spacing: none,
  section-spacing: none,
  margin-x: none,
  header-space: none,
  footer-space: none,
  bottom-margin: none,
  title-item-spacing: none,
  item-spacing: none,
  text-align: none,
  text-direction: none,
```

- [ ] **Step 2: Replace the theme-override block with a resolution block**

In `resume.typ`, replace the per-theme layout block (currently lines ~778-786, starting at the `// Per-theme layout nudges` comment and ending at the `if "section-spacing" in lo { ... }` line) with:

```typst
  // Resolve each layout knob: an explicit caller value wins; otherwise a
  // per-theme `layout-overrides` nudge applies; otherwise the hard default.
  // (ivory uses overrides for a looser, more elegant rhythm.)
  let lo = resolved-theme.at("layout-overrides", default: (:))
  let _ld = (
    font-size: 10pt, line-spacing: 0.8em, body-line-spacing: 0.55em,
    section-spacing: 23pt, margin-x: 1.5cm, header-space: 1.7cm,
    footer-space: 1.5cm, bottom-margin: 0cm, title-item-spacing: 9pt,
    item-spacing: 9pt, text-align: "left", text-direction: "auto",
  )
  font-size = if font-size != none { font-size } else { lo.at("font-size", default: _ld.font-size) }
  line-spacing = if line-spacing != none { line-spacing } else { lo.at("line-spacing", default: _ld.line-spacing) }
  body-line-spacing = if body-line-spacing != none { body-line-spacing } else { lo.at("body-line-spacing", default: _ld.body-line-spacing) }
  section-spacing = if section-spacing != none { section-spacing } else { lo.at("section-spacing", default: _ld.section-spacing) }
  margin-x = if margin-x != none { margin-x } else { lo.at("margin-x", default: _ld.margin-x) }
  header-space = if header-space != none { header-space } else { lo.at("header-space", default: _ld.header-space) }
  footer-space = if footer-space != none { footer-space } else { lo.at("footer-space", default: _ld.footer-space) }
  bottom-margin = if bottom-margin != none { bottom-margin } else { lo.at("bottom-margin", default: _ld.bottom-margin) }
  title-item-spacing = if title-item-spacing != none { title-item-spacing } else { lo.at("title-item-spacing", default: _ld.title-item-spacing) }
  item-spacing = if item-spacing != none { item-spacing } else { lo.at("item-spacing", default: _ld.item-spacing) }
  text-align = if text-align != none { text-align } else { lo.at("text-align", default: _ld.text-align) }
  text-direction = if text-direction != none { text-direction } else { lo.at("text-direction", default: _ld.text-direction) }
```

This block sits before line ~808 (`cv-body-leading.update(body-line-spacing)`), so every knob is resolved before first use. Callers that pass nothing (the SVG preview path) get `none` for every knob and behave exactly as before.

- [ ] **Step 3: Verify with a standalone Typst compile**

Run:

```bash
cd /tmp && rm -rf typ-check && mkdir typ-check && cd typ-check
cp /home/iman/cv_zolanvari_com/backend/app/templates/resume.typ .
cp /home/iman/cv_zolanvari_com/backend/app/templates/graphite-paper.jpg .
printf '#import "resume.typ": *\n#show: resume.with(author: (firstname: "A", lastname: "B"), theme: "ivory-classique", line-spacing: 1.4em)\n= Experience\n#resume-entry(title: "X", description: "Y", location: "", date: "")\n#resume-item[\n  - did things\n]\n' > main.typ
typst compile main.typ out.pdf --font-path /usr/share/fonts && echo "TEMPLATE COMPILES OK"
```

Expected: `TEMPLATE COMPILES OK` and `out.pdf` exists. (If `typst` is not on the host PATH, run this inside the container after Task 9's rebuild instead.)

- [ ] **Step 4: Commit** *(skip unless the user asked for commits)*

```bash
git add backend/app/templates/resume.typ
git commit -m "fix(template): explicit layout knobs win over theme overrides"
```

---

## Task 5: Frontend - `LayoutSettings` type and defaults

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: Add the interface and default constant**

Append to `frontend/src/types.ts` (after `emptyResume`, end of file):

```typescript
export interface LayoutSettings {
  font_size: number;
  line_spacing: number;
  body_line_spacing: number;
  section_spacing: number;
  margin_x: number;
  header_space: number;
  footer_space: number;
  bottom_margin: number;
  title_item_spacing: number;
  item_spacing: number;
  text_align: "left" | "justify" | "right";
  text_direction: "auto" | "ltr" | "rtl";
}

/** Defaults - must match LayoutSettings in backend/app/schemas.py. */
export const DEFAULT_LAYOUT: LayoutSettings = {
  font_size: 10,
  line_spacing: 0.8,
  body_line_spacing: 0.55,
  section_spacing: 23,
  margin_x: 1.5,
  header_space: 1.7,
  footer_space: 1.5,
  bottom_margin: 0,
  title_item_spacing: 9,
  item_spacing: 9,
  text_align: "left",
  text_direction: "auto",
};
```

- [ ] **Step 2: Type-check**

Run: `cd /home/iman/cv_zolanvari_com/frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit** *(skip unless the user asked for commits)*

```bash
git add frontend/src/types.ts
git commit -m "feat(frontend): add LayoutSettings type"
```

---

## Task 6: Frontend - `renderPdf` accepts layout

**Files:**
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: Update the import and `renderPdf`**

In `frontend/src/api.ts`, change line 1 to include `LayoutSettings`:

```typescript
import type {
  LayoutSettings,
  PolishedBullet,
  ResumeData,
  Theme,
  Tone,
} from "./types";
```

Replace the `renderPdf` function (lines 69-80) with:

```typescript
export async function renderPdf(
  resume: ResumeData,
  theme: Theme,
  layout: LayoutSettings,
): Promise<Blob> {
  const r = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, theme, layout }),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(`Render failed (${r.status}): ${msg.slice(0, 200)}`);
  }
  return r.blob();
}
```

- [ ] **Step 2: Type-check (expected to fail at the App call site)**

Run: `cd /home/iman/cv_zolanvari_com/frontend && npx tsc -b`
Expected: errors in `App.tsx` - `renderPdf` now needs 3 args. Task 8 fixes the call sites; this is expected mid-plan.

- [ ] **Step 3: Commit** *(skip unless the user asked for commits)*

```bash
git add frontend/src/api.ts
git commit -m "feat(frontend): renderPdf accepts layout settings"
```

---

## Task 7: Frontend - the `LayoutPanel` component

**Files:**
- Create: `frontend/src/components/LayoutPanel.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/LayoutPanel.tsx` with the full contents:

```tsx
import { useState } from "react";

import { DEFAULT_LAYOUT, type LayoutSettings } from "../types";

interface Props {
  value: LayoutSettings;
  onChange: (next: LayoutSettings) => void;
}

interface SliderConfig {
  field: keyof LayoutSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

// Ranges/steps mirror thewisebot's LayoutSettingsPanel and the backend bounds.
const SLIDERS: SliderConfig[] = [
  { field: "font_size", label: "Font size", min: 8, max: 14, step: 0.5, unit: "pt" },
  { field: "line_spacing", label: "Line spacing", min: 0.4, max: 1.5, step: 0.05, unit: "em" },
  { field: "body_line_spacing", label: "Bullet line spacing", min: 0.3, max: 1.5, step: 0.05, unit: "em" },
  { field: "section_spacing", label: "Section spacing", min: 4, max: 24, step: 1, unit: "pt" },
  { field: "margin_x", label: "Side margins", min: 0.5, max: 3, step: 0.1, unit: "cm" },
  { field: "header_space", label: "Top margin", min: 0.5, max: 4, step: 0.1, unit: "cm" },
  { field: "footer_space", label: "Bottom margin", min: 0.5, max: 4, step: 0.1, unit: "cm" },
  { field: "bottom_margin", label: "Extra bottom gap", min: 0, max: 4, step: 0.1, unit: "cm" },
  { field: "title_item_spacing", label: "Title-to-entry gap", min: 0, max: 20, step: 0.5, unit: "pt" },
  { field: "item_spacing", label: "Entry spacing", min: 0, max: 20, step: 0.5, unit: "pt" },
];

const ALIGNMENTS = ["left", "justify", "right"] as const;
const DIRECTIONS = ["auto", "ltr", "rtl"] as const;

function isModified(value: LayoutSettings): boolean {
  return (Object.keys(DEFAULT_LAYOUT) as (keyof LayoutSettings)[]).some(
    (k) => value[k] !== DEFAULT_LAYOUT[k],
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export default function LayoutPanel({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const modified = isModified(value);

  function setField<K extends keyof LayoutSettings>(key: K, v: LayoutSettings[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 md:px-6 py-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <h3 className="text-base font-semibold text-slate-900">Layout</h3>
          {modified && (
            <span className="text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full px-2 py-0.5">
              modified
            </span>
          )}
          <span className="ml-auto text-sm text-slate-400">{open ? "▲" : "▼"}</span>
        </button>
        {modified && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_LAYOUT })}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 underline underline-offset-2"
          >
            Reset
          </button>
        )}
      </div>

      {open && (
        <div className="px-5 md:px-6 pb-6 pt-5 space-y-5 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Fine-tune the spacing and typography of your PDF - the preview updates
            automatically.
          </p>

          <SegmentRow
            label="Text alignment"
            options={ALIGNMENTS}
            value={value.text_align}
            onChange={(v) => setField("text_align", v)}
          />
          <SegmentRow
            label="Text direction"
            options={DIRECTIONS}
            value={value.text_direction}
            onChange={(v) => setField("text_direction", v)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {SLIDERS.map((s) => (
              <SliderRow
                key={s.field}
                config={s}
                value={value[s.field] as number}
                onChange={(v) => setField(s.field, v as never)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={[
              "px-3 py-1.5 text-xs font-medium capitalize transition",
              opt === value
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderRow({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number;
  onChange: (v: number) => void;
}) {
  const { label, min, max, step, unit } = config;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm text-slate-700">{label}</label>
        <span className="flex items-baseline gap-1">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!Number.isNaN(n)) onChange(clamp(n, min, max));
            }}
            className="w-16 text-right text-xs border border-slate-300 rounded px-1.5 py-1 tabular-nums"
          />
          <span className="w-5 text-xs text-slate-400">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/iman/cv_zolanvari_com/frontend && npx tsc -b`
Expected: still only the pre-existing `App.tsx` errors from Task 6 - no new errors in `LayoutPanel.tsx`.

- [ ] **Step 3: Commit** *(skip unless the user asked for commits)*

```bash
git add frontend/src/components/LayoutPanel.tsx
git commit -m "feat(frontend): add LayoutPanel component"
```

---

## Task 8: Frontend - wire layout into `App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Imports and the `LayoutPanel` import**

In `App.tsx` line 1, add `useRef`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
```

Add to the types import (currently `import { emptyResume, type ResumeData, type Theme, type Tone } from "./types";`):

```typescript
import {
  DEFAULT_LAYOUT,
  emptyResume,
  type LayoutSettings,
  type ResumeData,
  type Theme,
  type Tone,
} from "./types";
```

Add a component import alongside the others (e.g. after the `ThemePicker` import):

```typescript
import LayoutPanel from "./components/LayoutPanel";
```

- [ ] **Step 2: Add layout state and a debounce ref**

In `ResumeApp`, after the existing `useState` hooks (after `piiPending`), add:

```typescript
  const [layout, setLayout] = useState<LayoutSettings>(DEFAULT_LAYOUT);
  const layoutTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (layoutTimer.current) clearTimeout(layoutTimer.current);
    };
  }, []);
```

- [ ] **Step 3: Thread `layout` through `updatePreview`**

Replace the `updatePreview` callback with the version that takes a `layout` argument:

```typescript
  const updatePreview = useCallback(
    async (next: ResumeData, t: Theme, l: LayoutSettings) => {
      setRendering(true);
      setRenderError(null);
      try {
        const blob = await renderPdf(next, t, l);
        const url = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        setRenderError(e instanceof Error ? e.message : String(e));
      } finally {
        setRendering(false);
      }
    },
    [],
  );
```

- [ ] **Step 4: Update the existing `updatePreview` call sites**

In `handleUploadParsed`, change `updatePreview(parsed, theme)` → `updatePreview(parsed, theme, layout)`.
In `handlePiiConfirmed`, change `updatePreview(redacted, theme)` → `updatePreview(redacted, theme, layout)`.
In `handleThemeChange`, change `if (resume) updatePreview(resume, t)` → `if (resume) updatePreview(resume, t, layout)`.

- [ ] **Step 5: Add the debounced layout-change handler**

Add this function inside `ResumeApp`, after `handleThemeChange`:

```typescript
  function handleLayoutChange(next: LayoutSettings) {
    setLayout(next);
    if (layoutTimer.current) clearTimeout(layoutTimer.current);
    // Debounce: one render ~600ms after the user stops adjusting controls.
    layoutTimer.current = window.setTimeout(() => {
      if (resume) updatePreview(resume, theme, next);
    }, 600);
  }
```

- [ ] **Step 6: Update the manual "Update preview" button**

In the editor header, change the button's handler from `onClick={() => updatePreview(resume, theme)}` to:

```tsx
                <button
                  onClick={() => updatePreview(resume, theme, layout)}
                  disabled={rendering}
                  className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  {rendering ? "Rendering…" : "Update preview"}
                </button>
```

- [ ] **Step 7: Give the tone `<select>` a visible label**

Replace the bare tone `<select>` in the header with a labelled version:

```tsx
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  Tone
                  <select
                    value={tone}
                    onChange={(e) => setToneState(e.target.value as Tone)}
                    className="text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white"
                    title="AI polish tone"
                  >
                    <option value="impact">Impact</option>
                    <option value="concise">Concise</option>
                    <option value="leadership">Leadership</option>
                  </select>
                </label>
```

- [ ] **Step 8: Mount `LayoutPanel` under `ThemePicker`**

Replace the ThemePicker wrapper block:

```tsx
          <div className="max-w-7xl mx-auto px-4 pt-5 space-y-4">
            <ThemePicker value={theme} onChange={handleThemeChange} />
            <LayoutPanel value={layout} onChange={handleLayoutChange} />
          </div>
```

- [ ] **Step 9: Type-check and build**

Run: `cd /home/iman/cv_zolanvari_com/frontend && npm run build`
Expected: PASS - `tsc -b` clean, `vite build` writes `dist/`.

- [ ] **Step 10: Commit** *(skip unless the user asked for commits)*

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): wire LayoutPanel into the editor with debounced preview"
```

---

## Task 9: Build, integration & end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Backend unit test still green**

Run: `cd /home/iman/cv_zolanvari_com/backend && PYTHONPATH=. .venv/bin/python tests/test_layout_emit.py`
Expected: `5 passed`.

- [ ] **Step 2: Rebuild and restart the backend container**

Run:

```bash
cd /home/iman/cv_zolanvari_com && docker compose build backend && docker compose up -d
```

Expected: build succeeds, container `cv_zolanvari_com-backend-1` healthy.

- [ ] **Step 3: Integration test - layout changes the PDF, and beats a theme override**

Run (hits the backend directly on `127.0.0.1:8003`):

```bash
cd /tmp && cat > render-check.sh <<'EOF'
set -e
body() { echo "{\"resume\":{\"contact\":{\"firstname\":\"A\",\"lastname\":\"B\"},\"experience\":[],\"education\":[],\"skills\":[]},\"theme\":\"$1\",\"layout\":$2}"; }
DEF='{}'
BIG='{"font_size":13,"margin_x":2.6,"line_spacing":1.4}'
curl -s -o def.pdf  -X POST 127.0.0.1:8003/api/render -H 'Content-Type: application/json' -d "$(body aurora-violet "$DEF")"
curl -s -o big.pdf  -X POST 127.0.0.1:8003/api/render -H 'Content-Type: application/json' -d "$(body aurora-violet "$BIG")"
curl -s -o ivory_def.pdf -X POST 127.0.0.1:8003/api/render -H 'Content-Type: application/json' -d "$(body ivory-classique "$DEF")"
curl -s -o ivory_ls.pdf  -X POST 127.0.0.1:8003/api/render -H 'Content-Type: application/json' -d "$(body ivory-classique '{"line_spacing":1.45}')"
cmp -s def.pdf big.pdf       && { echo "FAIL: layout did not change the PDF"; exit 1; }
cmp -s ivory_def.pdf ivory_ls.pdf && { echo "FAIL: line_spacing ignored on ivory (theme override won)"; exit 1; }
echo "INTEGRATION OK: layout applied; explicit knob beats ivory's theme override"
EOF
bash render-check.sh
```

Expected: `INTEGRATION OK: ...`. (A 422 response means a bounds bug in Task 1; a 500 means a Typst error from Task 2/4.)

- [ ] **Step 4: Frontend headless test - panel, debounce, reset**

Create `/tmp/layout-test.mjs`:

```javascript
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";

const CHROME = "/home/iman/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const DIST = "/home/iman/cv_zolanvari_com/frontend/dist";
let passed = 0, failed = 0;
const check = (n, c) => { c ? (passed++, console.log("  ✓ " + n)) : (failed++, console.log("  ✗ FAIL: " + n)); };

const server = spawn("node", ["/tmp/serve.js", DIST, "8099"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

let renderCalls = 0;
let lastBody = null;
await page.route("**/api/render", async (route) => {
  renderCalls++;
  lastBody = JSON.parse(route.request().postData() || "{}");
  await route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4 fake" });
});

try {
  await page.goto("http://localhost:8099/");
  await page.getByRole("button", { name: "Decline" }).click();
  await page.getByText("Start blank").click();
  await page.waitForFunction(() => location.pathname === "/edit");

  check("Layout panel header is present", await page.getByRole("heading", { name: "Layout" }).isVisible());
  await page.getByRole("heading", { name: "Layout" }).click();
  check("panel expands to show sliders", await page.getByText("Section spacing").isVisible());

  renderCalls = 0;
  const slider = page.locator('input[type="range"]').first();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1200); // > 600ms debounce
  check("one debounced /api/render after slider change", renderCalls === 1);
  check("render body carries layout settings", lastBody && typeof lastBody.layout?.font_size === "number");

  check("'modified' marker shown", await page.getByText("modified").isVisible());
  await page.getByRole("button", { name: "Reset" }).click();
  check("Reset clears the modified marker", !(await page.getByText("modified").isVisible()));
} catch (e) {
  failed++;
  console.log("  ✗ EXCEPTION: " + e.message);
} finally {
  await browser.close();
  server.kill();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
```

Run: `cd /tmp && node layout-test.mjs`
Expected: `6 passed, 0 failed`. (`/tmp/serve.js` already exists from earlier work.)

- [ ] **Step 5: End-to-end smoke on the live editor**

Open `https://cv.zolanvari.com/edit` (after a hard refresh), expand **Layout**, drag a slider, and confirm the PDF preview re-renders ~0.6s later. Switch to the `ivory-classique` theme and confirm a line-spacing change still visibly takes effect.

- [ ] **Step 6: Commit verification artifacts** *(skip unless the user asked for commits)*

```bash
git add docs/superpowers/
git commit -m "docs: layout panel spec and plan"
```

---

## Self-review notes

- **Spec coverage:** all 9 spec "Files touched" rows map to Tasks 1-8; testing section maps to Task 9. ✓
- **Type consistency:** `LayoutSettings` field names are identical in `schemas.py` (Task 1), `_LAYOUT_UNITS` (Task 2), `resume.typ` `_ld` keys (Task 4, kebab-cased), `types.ts` (Task 5), and `LayoutPanel` `SLIDERS` (Task 7). `updatePreview(next, t, l)` 3-arg signature is consistent across Task 8 call sites. ✓
- **No placeholders:** every code step shows complete code; every run step shows the command and expected output. ✓
