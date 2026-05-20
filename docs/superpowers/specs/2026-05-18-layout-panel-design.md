# Layout panel for the CV editor - design

**Date:** 2026-05-18
**Status:** Approved (design); pending implementation plan

## Goal

Let users of cv.zolanvari.com manipulate the layout of their rendered résumé -
font size, spacing, margins, text alignment - directly in the editor, with the
PDF preview updating as they adjust controls. Ported from the "Layout" feature
of the `thewisebot` project (`LayoutSettingsPanel`).

## Background

- cv.zolanvari.com renders résumés with Typst. The backend (`POST /api/render`)
  takes `{ resume, theme }`, emits a `main.typ` via `emit_typst()`, and runs
  `typst compile`.
- The Typst template `backend/app/templates/resume.typ` **already declares all
  12 layout knobs** as parameters of `resume()` (`font-size`, `line-spacing`,
  `body-line-spacing`, `section-spacing`, `margin-x`, `header-space`,
  `footer-space`, `bottom-margin`, `title-item-spacing`, `item-spacing`,
  `text-align`, `text-direction`) with defaults identical to thewisebot's.
- `emit_typst()` currently passes only `author` and `theme` - the layout knobs
  are never threaded through from the API or UI.
- The app is **stateless**: résumés are never persisted, so layout settings
  will not be persisted either (in-memory React state only).

## Decisions (from brainstorming)

1. **Control set:** all 12 knobs - full parity with thewisebot.
2. **Apply timing:** auto-apply, debounced (~600 ms after the last change).
3. **Placement:** a full-width collapsible card directly under `ThemePicker`,
   collapsed by default.

## Data model - `LayoutSettings`

Twelve fields. Shared verbatim between the frontend interface and the backend
Pydantic model (snake_case; the JSON crosses the wire unchanged).

| Field | Range / options | Step | Default | Typst unit |
|---|---|---|---|---|
| `font_size` | 8 – 14 | 0.5 | 10 | pt |
| `line_spacing` | 0.4 – 1.5 | 0.05 | 0.8 | em |
| `body_line_spacing` | 0.3 – 1.5 | 0.05 | 0.55 | em |
| `section_spacing` | 4 – 24 | 1 | 23 | pt |
| `margin_x` | 0.5 – 3 | 0.1 | 1.5 | cm |
| `header_space` | 0.5 – 4 | 0.1 | 1.7 | cm |
| `footer_space` | 0.5 – 4 | 0.1 | 1.5 | cm |
| `bottom_margin` | 0 – 4 | 0.1 | 0 | cm |
| `title_item_spacing` | 0 – 20 | 0.5 | 9 | pt |
| `item_spacing` | 0 – 20 | 0.5 | 9 | pt |
| `text_align` | `left` / `justify` / `right` | - | `left` | - |
| `text_direction` | `auto` / `ltr` / `rtl` | - | `auto` | - |

## Architecture

Five layers change. The renderer (Typst CLI) is unchanged; the template gets a
small precedence fix (see "Theme-override precedence" below).

### Backend

**`backend/app/schemas.py`**
- New `LayoutSettings` Pydantic model: the 12 fields above. Numeric fields use
  `Field(default, ge=…, le=…)` bounds matching the table, so an out-of-range
  value is rejected before it can reach Typst. `text_align` / `text_direction`
  use `Literal[…]`.
- `RenderRequest` gains `layout: LayoutSettings = LayoutSettings()`. Defaulted,
  so any client that omits it (and the SVG preview path) is unaffected.

**`backend/app/services/typst_emit.py`**
- `emit_typst(resume, theme, layout=None)` - new optional `layout` argument.
- New helper `_build_layout_args(layout) -> dict[str, str]` that compares each
  field to the `LayoutSettings()` default and emits a Typst arg **only for
  fields the user changed**. Returns kebab-case Typst arg names → literal:
  `font_size` → `font-size: 10.5pt`, `line_spacing` → `line-spacing: 0.9em`,
  `margin_x` → `margin-x: 1.6cm`, `text_align` → `text-align: "justify"`, etc.
  (pt for font/section/item/title-item spacing; em for line/body-line spacing;
  cm for the four margin knobs; quoted string for the two enums.)
- The changed args are injected into the emitted `#show: resume.with(...)`
  block alongside `author` and `theme`.
- **Why emit only changed knobs:** an un-emitted knob lets the Typst template
  fall back to the theme's `layout-overrides` (see below); an emitted knob is
  the user's explicit choice and must win.

**`backend/app/routers/render.py`**
- Pass `req.layout` into `emit_typst` / `render_pdf`. (`render_pdf` gains a
  `layout` parameter forwarded to `emit_typst`.) ~2 lines.

**`backend/app/templates/resume.typ` - theme-override precedence fix**
- Today, lines 781-786 let a theme's `layout-overrides` dict *unconditionally*
  overwrite the caller's args for 5 knobs (`line-spacing`, `body-line-spacing`,
  `item-spacing`, `title-item-spacing`, `section-spacing`). Only the
  `ivory-classique` theme has `layout-overrides`, but on that theme those 5
  sliders would silently do nothing.
- Fix: change the 12 layout parameters' defaults in the `resume()` signature
  from concrete values to `none`, and replace the lines 781-786 block with a
  uniform resolution: for each knob,
  `effective = caller-value (if not none) else theme-override else hard-default`.
  Hard defaults are held in one `_layout-defaults` dict.
- Result precedence: **explicit user value → theme `layout-overrides` →
  template default.** A caller that passes nothing (the SVG preview path,
  legacy callers) behaves exactly as today.

### Frontend

**`frontend/src/types.ts`**
- `LayoutSettings` interface (12 snake_case fields) and `DEFAULT_LAYOUT`
  constant holding the default values from the table.

**`frontend/src/api.ts`**
- `renderPdf(resume, theme, layout)` - third argument; request body becomes
  `{ resume, theme, layout }`.

**`frontend/src/components/LayoutPanel.tsx` (new)**
- A full-width collapsible card, header "Layout" with a chevron; collapsed by
  default. Props: `{ value: LayoutSettings; onChange: (next: LayoutSettings) => void }`.
- Body: two segmented button-groups (`text_align`, `text_direction`) and ten
  slider rows. Each slider row = label + `<input type="range">` + a small
  `<input type="number">` showing/accepting the exact value + unit suffix.
  Range/step/bounds come from a per-field config table mirroring the data-model
  table.
- A **Reset** button restores `DEFAULT_LAYOUT`. The header shows a subtle
  "modified" marker (dot/amber tint) when `value` differs from `DEFAULT_LAYOUT`.
- The panel is presentational: every change calls `onChange` with the next
  settings object. It does not render or debounce.

**`frontend/src/App.tsx`**
- `ResumeApp` gains `const [layout, setLayout] = useState<LayoutSettings>(DEFAULT_LAYOUT)`.
- `<LayoutPanel value={layout} onChange={handleLayoutChange} />` renders
  directly below `<ThemePicker>` (inside the existing `max-w-7xl` wrapper).
- `updatePreview` signature gains `layout`; `renderPdf` is called with it. The
  manual "Update preview" button and `handleThemeChange` pass the current
  `layout`.
- `handleLayoutChange(next)`: updates state immediately (UI stays responsive),
  then debounces - a `useRef` timer, ~600 ms - before calling
  `updatePreview(resume, theme, next)`. The timer is cleared on unmount.
- **Tone-dropdown fix:** the header's unlabeled tone `<select>` gets a visible
  "Tone" label so it is no longer cryptic.

## Behavior

- Default layout = today's output. A user who never opens the panel sees no
  change; old API clients are unaffected.
- Opening/closing the panel does not render. Only a value change schedules a
  debounced render. Adjusting several controls within the debounce window
  produces a single render.
- "Reset" sets all knobs to defaults and schedules one render.

## Edge cases

- **Out-of-range values:** the number input is clamped client-side to the
  field bounds; the backend `Field(ge/le)` bounds reject anything that slips
  through, returning 422 rather than corrupting the Typst compile.
- **Theme + layout interaction:** covered by the precedence fix above - a moved
  slider always wins; an untouched knob still respects the theme's nudges.
- **`text_direction`:** `auto` follows the document language (the backend's
  existing Arabic/Farsi detection still applies); `ltr`/`rtl` force direction.
  No new font work - the template already swaps to Arabic fonts for RTL.

## Testing

- **Backend unit:** `_build_layout_args` emits exactly the changed knobs in the
  right units and omits unchanged ones; `emit_typst` injects them into the
  `resume.with(...)` block. (Use pytest if the backend already has it; else a
  small standalone script.)
- **Template integration:** after `docker compose build`, render via `/api/render`
  with (a) default layout and (b) a changed knob on `ivory-classique`; confirm
  the PDF bytes differ - proving the precedence fix works.
- **Frontend:** `tsc` type-check + `vite build`; a headless-Chromium check -
  the panel expands, changing a slider triggers exactly one debounced
  `/api/render`, and Reset restores defaults.
- **End-to-end:** exercise the live editor after the container rebuild.

## Out of scope (YAGNI)

- Persistence of layout settings (no résumé store to attach them to; in-memory
  only, consistent with the app).
- Applying layout to the theme-picker SVG preview tiles (they are fixed sample
  previews).
- Per-theme layout presets, or saving/sharing layout profiles.

## Files touched

| File | Change |
|---|---|
| `backend/app/schemas.py` | + `LayoutSettings`; `RenderRequest.layout` |
| `backend/app/services/typst_emit.py` | `emit_typst` layout arg; `_build_layout_args` |
| `backend/app/services/typst_render.py` | thread `layout` through `render_pdf` |
| `backend/app/routers/render.py` | pass `req.layout` |
| `backend/app/templates/resume.typ` | layout params default `none`; precedence resolution |
| `frontend/src/types.ts` | + `LayoutSettings`, `DEFAULT_LAYOUT` |
| `frontend/src/api.ts` | `renderPdf` layout arg |
| `frontend/src/components/LayoutPanel.tsx` | **new** - the panel |
| `frontend/src/App.tsx` | layout state, debounce, panel mount, tone label |
