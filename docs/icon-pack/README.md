# thewisebot icon pack

The icon sets used in **thewisebot.com**, exported as standalone SVG files.

| Folder | Count | What it is |
|--------|-------|------------|
| `lucide/` | 123 | The [Lucide](https://lucide.dev) icons (`lucide-react`) actually imported across thewisebot - including `sparkles.svg`, the ✦ used in the "AI may be wrong" disclaimer. |
| `animated/` | 264 | thewisebot's custom `icons-animated/` collection, exported as **static** SVGs - the Motion hover-animation removed, leaving the icon shape. |

**387 icons total.** Open [`index.html`](index.html) to browse them all on one page.

## Format

Every icon is the same, so they drop in interchangeably:

- `24 × 24`, `viewBox="0 0 24 24"`
- `stroke="currentColor"` - recolour with CSS `color` (e.g. `color: #8b5cf6` for the violet in the screenshot), or change the attribute
- `stroke-width="2"`, round caps/joins
- Editable text-free vector paths - open directly in Figma, Illustrator, or inline in HTML

```html
<!-- inline, inherits text colour -->
<span style="color:#8b5cf6">…load sparkles.svg here…</span>
```

## Notes

- A few `*-filled-*` variants in `animated/` are exported as outlines (their fill
  was animation-driven); adjust in a vector editor if you need the solid form.
- Regenerate any time with `python3 build_icon_pack.py`.

## Licences

- **Lucide** - ISC licence. Free for commercial use.
- **Animated set** - Tabler-style icons (MIT). Free for commercial use.
