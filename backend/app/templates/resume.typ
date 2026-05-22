// resume.typ - multi-theme Typst résumé template
//
// Forked from ptsouchlos/modern-cv@0.10.0 (MIT) - see LICENSE.
// Original layout primitives and helpers (__justify_align,
// __format_contact_items, justified-header, resume-entry, resume-item,
// resume-skill-item) are preserved where possible, then extended with a
// 7-theme color system (Inter / Source Sans 3 fonts, accent + page-wash
// + hairline divider variations) and additional layout knobs that flow
// through `resume.with(...)` instead of via post-hoc `#set` injection.
//
// Public API: `resume`, `resume-entry`, `resume-item`, `resume-skill-item`,
// `justified-header`. Themes: aurora-violet, graphite-mist, ember-glow,
// midnight-prism, ivory-classique, mint-meridian, sunset-haze.

#import "@preview/fontawesome:0.6.0": *
#fa-version("6")  // host has FA 6 only, package defaults to 7

// ─── Default color tokens ────────────────────────────────────────

#let cv-ink-deep        = rgb("#2B2D42")
#let cv-ink-muted       = rgb("#475569")
#let cv-slate-500       = rgb("#64748B")
#let cv-hairline        = rgb("#E2E8F0")
#let cv-indigo-500      = rgb("#4F46E5")  // primary accent
#let cv-indigo-700      = rgb("#3730A3")
#let cv-rose-500        = rgb("#FF6B6B")  // signature beak / dot
#let cv-lilac-100       = rgb("#E2E8F0")
#let cv-mauve-50        = rgb("#F5EEF5")
#let cv-paper-50        = rgb("#FFFBFB")
#let cv-lavender-50     = rgb("#F0EAF6")

#let default-accent-color   = cv-indigo-500
#let default-location-color = cv-ink-deep
#let color-darkgray         = cv-ink-deep
#let color-darknight        = cv-ink-deep
#let color-gray             = cv-slate-500

// ─── Document state (theme-driven fills) ─────────────────────────
//
// These are declared up-front so every helper below (icons, contact-row
// links, h2/h3 colours, cv-link, secondary/tertiary headers, footer,
// resume-item bullets, skill-block accent text) can read whatever the
// active theme set. `resume()` writes to each state once at the top of
// the document; `context { ... }` blocks downstream re-evaluate per
// render and pick up the right colour without re-threading args.
#let cv-accent       = state("cv-accent", default-accent-color)
#let cv-body-leading = state("cv-body-leading", 0.55em)
#let cv-body-fill    = state("cv-body-fill", cv-ink-deep)
#let cv-muted-fill   = state("cv-muted-fill", cv-ink-muted)
#let cv-link-fill    = state("cv-link-fill", cv-indigo-500)
#let cv-icon-fill    = state("cv-icon-fill", color-darknight)

// ─── FA icon set (used in contact row) ───────────────────────────

// `context { ... }` re-evaluates per render so the same `linkedin-icon`
// etc. picks up whichever fill `resume()` set last on `cv-icon-fill`.

#let _icon(name) = context box(fa-icon(name, fill: cv-icon-fill.get()))

#let linkedin-icon = _icon("linkedin")
#let github-icon   = _icon("github")
#let gitlab-icon   = _icon("gitlab")
#let twitter-icon  = _icon("twitter")
#let phone-icon    = _icon("square-phone")
#let email-icon    = _icon("envelope")
#let homepage-icon = _icon("house")
#let website-icon  = _icon("globe")
#let address-icon  = _icon("location-crosshairs")
#let scholar-icon  = _icon("google-scholar")
#let orcid-icon    = _icon("orcid")

// ─── Layout primitives (from modern-cv) ──────────────────────────

// Logical `start`/`end` alignments respect the current text direction, so
// the same template renders mirrored under `set text(dir: rtl)` for
// Arabic / Farsi resumes without re-writing the helpers.
#let __justify_align(left_body, right_body) = block[
  #left_body
  #box(width: 1fr)[#align(end)[#right_body]]
]

#let __justify_align_3(left_body, mid_body, right_body) = block[
  #box(width: 1fr)[#align(start)[#left_body]]
  #box(width: 1fr)[#align(center)[#mid_body]]
  #box(width: 1fr)[#align(end)[#right_body]]
]

#let __apply_smallcaps(content, use-smallcaps) = if use-smallcaps {
  smallcaps(content)
} else {
  content
}

#let __format_author_name(author) = {
  str(author.at("firstname", default: "")) + " " + str(author.at("lastname", default: ""))
}

// Footer: date - Name · Résumé - page n. Fill pulls from `cv-muted-fill`
// state so dark themes (midnight-prism) get a legible muted tone instead
// of the hardcoded slate.
#let __resume_footer(author, date, use-smallcaps: true) = context {
  set text(fill: cv-muted-fill.get(), size: 8pt)
  __justify_align_3[
    #__apply_smallcaps(date, use-smallcaps)
  ][
    #__apply_smallcaps(__format_author_name(author) + " · Résumé", use-smallcaps)
  ][
    #context counter(page).display()
  ]
}

// Contact item: small icon + label, optional link.
#let __contact_item(item, link-prefix: "", inset: (left: 4pt)) = box[
  #set align(bottom)
  #if "icon" in item [#item.icon]
  #box(inset: inset)[
    #if "link" in item {
      link(link-prefix + item.link)[#item.text]
    } else {
      item.text
    }
  ]
]

// Build the contact-row items list from the author dict.
#let __format_contact_items(author, item-inset: (left: 4pt)) = {
  let mk(item, link-prefix: "") = __contact_item(item, link-prefix: link-prefix, inset: item-inset)
  let items = ()
  if "phone" in author {
    items.push(mk((text: author.phone, icon: phone-icon, link: author.phone), link-prefix: "tel:"))
  }
  if "email" in author {
    items.push(mk((text: author.email, icon: email-icon, link: author.email), link-prefix: "mailto:"))
  }
  if "homepage" in author {
    let url = author.homepage
    let display = url.replace("https://", "").replace("http://", "")
    items.push(mk((text: display, icon: homepage-icon, link: url)))
  }
  if "github" in author {
    items.push(mk((text: author.github, icon: github-icon, link: author.github), link-prefix: "https://github.com/"))
  }
  if "gitlab" in author {
    items.push(mk((text: author.gitlab, icon: gitlab-icon, link: author.gitlab), link-prefix: "https://gitlab.com/"))
  }
  if "linkedin" in author {
    items.push(mk(
      (text: __format_author_name(author), icon: linkedin-icon, link: author.linkedin),
      link-prefix: "https://www.linkedin.com/in/",
    ))
  }
  if "twitter" in author {
    items.push(mk((text: "@" + author.twitter, icon: twitter-icon, link: author.twitter), link-prefix: "https://twitter.com/"))
  }
  if "scholar" in author {
    items.push(mk((text: __format_author_name(author), icon: scholar-icon, link: author.scholar), link-prefix: "https://scholar.google.com/citations?user="))
  }
  if "orcid" in author {
    items.push(mk((text: author.orcid, icon: orcid-icon, link: author.orcid), link-prefix: "https://orcid.org/"))
  }
  if "website" in author {
    items.push(mk((text: author.website, icon: website-icon, link: author.website)))
  }
  items
}

// ─── Header sub-blocks (right side of justified-header) ──────────

#let secondary-right-header(body) = context {
  set text(size: 9.5pt, weight: "regular", fill: cv-muted-fill.get(), tracking: 0.04em)
  body
}

#let tertiary-right-header(body) = context {
  set text(size: 9pt, weight: "regular", fill: cv-muted-fill.get(), tracking: 0.04em)
  body
}

#let justified-header(primary, secondary) = {
  set block(above: 0.7em, below: 0.55em)
  pad[
    #__justify_align[
      == #primary
    ][
      #secondary-right-header[#secondary]
    ]
  ]
}

#let secondary-justified-header(primary, secondary) = __justify_align[
  === #primary
][
  #tertiary-right-header[#secondary]
]

// ─── Public helpers (Extra helpers) ──────────────────────────

// cv-link: clickable body link with accent styling and an external-arrow
// icon baked in. We deliberately bake styling here (rather than via a
// `show link:` rule) so:
//   1. The PDF /Annot /Link click target is always preserved.
//   2. Header contact links (which use raw `link()` and already have an FA
//      brand glyph) stay icon-free without needing a local show override.
// Colour pulls from `cv-link-fill` state so each theme drives link colour
// without re-defining the helper.
#let cv-link(url, label) = link(url)[#context {
  let c = cv-link-fill.get()
  text(fill: c, weight: "medium")[#label]
  h(0.12em)
  fa-icon("arrow-up-right-from-square", size: 0.7em, fill: c)
}]

#let skill-block(category, skills) = context {
  let accent = cv-accent.get()
  block(below: 0.55em, width: 100%)[
    #text(weight: "semibold", fill: accent)[#category]
    #h(0.5em)
    #text(skills.join(" · "))
  ]
}

// gradient-bg: Default page-wash (135deg lilac → mauve → paper → lavender).
#let gradient-bg() = place(top + left, dx: 0pt, dy: 0pt,
  rect(width: 100%, height: 100%,
    fill: gradient.linear(
      cv-lilac-100, cv-mauve-50, cv-paper-50, cv-lavender-50,
      angle: 135deg,
    ),
  )
)

// ─── Theme bundles ───────
//
// Each theme is a dict of presentation tokens. Switching a resume to a
// different look is `resume.with(theme: "<slug>")` - no template fork. The
// theme overrides accent-color, background, fonts, and heading/name show
// rules. Layout knobs (margins, spacings, font-size) are still independent
// and apply on top of any theme.

#let cv-themes = (
  "aurora-violet": (
    accent: rgb("#4F46E5"),
    ink: rgb("#2B2D42"),
    muted: rgb("#475569"),
    hairline: rgb("#E2E8F0"),
    is-dark: false,
    bg: "aurora",
    body-font: ("Source Sans 3", "Source Sans Pro", "Inter", "DejaVu Sans"),
    header-font: ("Roboto", "Inter Display", "Inter"),
    name-style: "split-accent",
    heading-style: "hairline",
    heading-color: "accent",
    heading-weight: "bold",
    heading-tracking: 0em,
    heading-uppercase: false,
    rule-color: rgb("#2B2D42"),
    rule-weight: 0.8pt,
  ),
  "graphite-mist": (
    // Fully grayscale: accent + links + icons all neutral gray so the
    // theme reads as a single-tone vintage editorial doc.
    accent: rgb("#4B5563"),
    ink: rgb("#111827"),
    muted: rgb("#4B5563"),
    hairline: rgb("#9CA3AF"),
    is-dark: false,
    bg: "graphite-noise",
    body-font: ("Inter", "DejaVu Sans"),
    header-font: ("Inter Display", "Inter", "DejaVu Sans"),
    name-style: "gillette-bold",
    heading-style: "hairline",
    heading-color: "ink",
    heading-weight: "black",
    heading-tracking: -0.01em,
    heading-uppercase: false,
    heading-italic: true,
    rule-color: rgb("#374151"),
    rule-weight: 1.2pt,
    icon-color: "ink",
  ),
  "ember-glow": (
    accent: rgb("#DC2626"),
    ink: rgb("#0F172A"),
    muted: rgb("#475569"),
    hairline: rgb("#FECACA"),
    is-dark: false,
    bg: "ember",
    body-font: ("Inter", "DejaVu Sans"),
    header-font: ("Inter Display", "Inter", "DejaVu Sans"),
    name-style: "last-accent-bold",
    // Hairline (was left-bar): clean rule in the accent red.
    heading-style: "hairline",
    heading-color: "accent",
    heading-weight: "extrabold",
    heading-tracking: -0.005em,
    heading-uppercase: false,
    rule-color: rgb("#DC2626"),
    rule-weight: 1.2pt,
    // Header FA glyphs render in the accent red, matching the link colour.
    icon-color: "accent",
  ),
  "midnight-prism": (
    // CRT-phosphor / Matrix-movie terminal. Whole document is mono - body
    // and headers both pull Liberation Mono so it reads as a DOS / shell
    // session. Accent = bright phosphor green; ink is a dimmer green so
    // body text reads comfortably against the near-black void.
    accent: rgb("#00FF41"),
    ink: rgb("#86EFAC"),
    muted: rgb("#4ADE80"),
    hairline: rgb("#15803D"),
    is-dark: true,
    bg: "matrix",
    body-font: ("Liberation Mono", "Noto Mono", "DejaVu Sans Mono"),
    header-font: ("Liberation Mono", "Noto Mono", "DejaVu Sans Mono"),
    name-style: "matrix-cursor",
    heading-style: "prompt",
    heading-color: "accent",
    heading-weight: "bold",
    heading-tracking: 0em,
    heading-uppercase: false,
    rule-color: rgb("#15803D"),
    rule-weight: 1.0pt,
    icon-color: "accent",
  ),
  "ivory-classique": (
    accent: rgb("#7C5E3E"),
    ink: rgb("#2A2520"),
    muted: rgb("#6B5A4C"),
    hairline: rgb("#E0D7C6"),
    is-dark: false,
    bg: "ivory",
    body-font: ("Noto Serif", "Liberation Serif", "DejaVu Serif"),
    header-font: ("Noto Serif", "Liberation Serif", "DejaVu Serif"),
    name-style: "tracked-caps-serif",
    heading-style: "diamond",
    heading-color: "accent",
    heading-weight: "regular",
    heading-tracking: 0.22em,
    heading-uppercase: false,
    heading-italic: true,
    rule-color: rgb("#C9B98E"),
    rule-weight: 0.4pt,
    // Layout overrides for an elegant, breathable feel: looser leading,
    // wider inter-item gaps, subtle body letter-spacing. Applied on top of
    // the layout knobs supplied by the caller.
    body-tracking: 0.03em,
    layout-overrides: (
      line-spacing: 1.05em,
      body-line-spacing: 0.78em,
      item-spacing: 12pt,
      title-item-spacing: 12pt,
    ),
  ),
  "mint-meridian": (
    accent: rgb("#047857"),
    ink: rgb("#064E3B"),
    muted: rgb("#0F766E"),
    hairline: rgb("#A7F3D0"),
    is-dark: false,
    bg: "mint",
    body-font: ("Inter", "DejaVu Sans"),
    header-font: ("Inter", "DejaVu Sans"),
    name-style: "wide-caps",
    heading-style: "all-caps-underline",
    heading-color: "accent",
    heading-weight: "semibold",
    heading-tracking: 0.28em,
    heading-uppercase: true,
    rule-color: rgb("#047857"),
    rule-weight: 0.6pt,
    // Drop smallcaps + cut type variety: positions row + h3 subtitles
    // render as plain text. Whole doc uses two weights (regular + semibold)
    // for a tighter minimal feel.
    smallcaps: false,
    // Mint runs on a 2-weight palette (regular + semibold). Without this
    // override h2 falls back to "bold" - a third weight that breaks the
    // restrained, minimal rhythm.
    entry-title-weight: "semibold",
  ),
  "sunset-haze": (
    accent: rgb("#EA580C"),
    ink: rgb("#292524"),
    muted: rgb("#78716C"),
    hairline: rgb("#FED7AA"),
    is-dark: false,
    bg: "sunset",
    body-font: ("Noto Serif", "Liberation Serif", "DejaVu Serif"),
    header-font: ("Noto Serif", "Liberation Serif", "DejaVu Serif"),
    name-style: "italic-roman",
    // Hairline (was bracket): cleaner heading with a warm orange rule.
    heading-style: "hairline",
    heading-color: "accent",
    heading-weight: "bold",
    heading-tracking: 0.04em,
    heading-uppercase: false,
    rule-color: rgb("#EA580C"),
    rule-weight: 1.0pt,
  ),
)

// Resolve a heading-color token ("accent" | "ink" | "muted") against the
// theme dict - used in the h1 show rule.
#let __theme-color(theme, key) = {
  let v = theme.at(key, default: "accent")
  if v == "accent" { theme.accent }
  else if v == "ink" { theme.ink }
  else if v == "muted" { theme.muted }
  else { theme.accent }
}

// __bg-for(theme): returns the page background content (gradient + any
// noise overlay), or none if no background. Called once per page from the
// `set page(background: ...)` slot.
#let __bg-for(theme) = {
  let mode = theme.at("bg", default: "none")
  if mode == "aurora" {
    place(top + left, rect(width: 100%, height: 100%,
      fill: gradient.linear(
        rgb("#E2E8F0"), rgb("#F5EEF5"), rgb("#FFFBFB"), rgb("#F0EAF6"),
        angle: 135deg)))
  } else if mode == "graphite-noise" {
    // Vintage old-photo paper grain: rasterised JPEG (789x1400 grayscale,
    // ~256 KB) shipped alongside the .typ file in
    // backend/app/typst_templates/. The file is `image()`-loaded full-page;
    // a desaturated overlay rect knocks back the texture so body text on
    // top still reads cleanly. The procedural noise fallback below is kept
    // as a safety net in case the image is missing in some build.
    place(top + left, image(
      "graphite-paper.jpg",
      width: 100%,
      height: 100%,
      fit: "cover",
    ))
    // Veil: ~70% white overlay knocks the scanned grain way back so body
    // text contrast stays AA-readable while the texture still reads as
    // "vintage paper" rather than uniform background. Tune the alpha (last
    // two hex digits) up for lighter / down for grittier.
    place(top + left, rect(width: 100%, height: 100%, fill: rgb("#FFFFFFB3")))
  } else if mode == "graphite-noise-proc" {
    // Procedural fallback (was the live noise before the image asset). Kept
    // intact in case anyone wants a vector-only render with no JPEG embed.
    let dots = tiling(size: (30pt, 30pt))[
      #place(dx: 0.6pt,  dy: 1.2pt,  circle(radius: 0.32pt, fill: rgb("#374151")))
      #place(dx: 3.4pt,  dy: 0.4pt,  circle(radius: 0.18pt, fill: rgb("#6B7280")))
      #place(dx: 7.1pt,  dy: 2.3pt,  circle(radius: 0.42pt, fill: rgb("#1F2937")))
      #place(dx: 11.5pt, dy: 0.8pt,  circle(radius: 0.22pt, fill: rgb("#9CA3AF")))
      #place(dx: 14.8pt, dy: 3.1pt,  circle(radius: 0.30pt, fill: rgb("#374151")))
      #place(dx: 18.6pt, dy: 0.9pt,  circle(radius: 0.16pt, fill: rgb("#6B7280")))
      #place(dx: 22.0pt, dy: 2.5pt,  circle(radius: 0.38pt, fill: rgb("#1F2937")))
      #place(dx: 25.4pt, dy: 1.4pt,  circle(radius: 0.24pt, fill: rgb("#9CA3AF")))
      #place(dx: 28.7pt, dy: 3.0pt,  circle(radius: 0.20pt, fill: rgb("#374151")))
      #place(dx: 1.7pt,  dy: 5.4pt,  circle(radius: 0.28pt, fill: rgb("#4B5563")))
      #place(dx: 5.0pt,  dy: 6.7pt,  circle(radius: 0.46pt, fill: rgb("#1F2937")))
      #place(dx: 8.8pt,  dy: 5.2pt,  circle(radius: 0.20pt, fill: rgb("#9CA3AF")))
      #place(dx: 12.4pt, dy: 6.9pt,  circle(radius: 0.34pt, fill: rgb("#374151")))
      #place(dx: 16.3pt, dy: 5.5pt,  circle(radius: 0.18pt, fill: rgb("#6B7280")))
      #place(dx: 20.0pt, dy: 7.3pt,  circle(radius: 0.40pt, fill: rgb("#1F2937")))
      #place(dx: 23.8pt, dy: 6.1pt,  circle(radius: 0.22pt, fill: rgb("#9CA3AF")))
      #place(dx: 27.5pt, dy: 7.6pt,  circle(radius: 0.30pt, fill: rgb("#374151")))
      #place(dx: 0.9pt,  dy: 9.8pt,  circle(radius: 0.38pt, fill: rgb("#1F2937")))
      #place(dx: 4.5pt,  dy: 11.0pt, circle(radius: 0.18pt, fill: rgb("#9CA3AF")))
      #place(dx: 8.2pt,  dy: 9.5pt,  circle(radius: 0.30pt, fill: rgb("#4B5563")))
      #place(dx: 12.0pt, dy: 11.4pt, circle(radius: 0.42pt, fill: rgb("#1F2937")))
      #place(dx: 15.6pt, dy: 10.2pt, circle(radius: 0.20pt, fill: rgb("#6B7280")))
      #place(dx: 19.3pt, dy: 11.8pt, circle(radius: 0.34pt, fill: rgb("#374151")))
      #place(dx: 23.0pt, dy: 10.4pt, circle(radius: 0.16pt, fill: rgb("#9CA3AF")))
      #place(dx: 26.7pt, dy: 12.0pt, circle(radius: 0.38pt, fill: rgb("#1F2937")))
      #place(dx: 1.4pt,  dy: 14.1pt, circle(radius: 0.22pt, fill: rgb("#6B7280")))
      #place(dx: 5.3pt,  dy: 15.4pt, circle(radius: 0.40pt, fill: rgb("#374151")))
      #place(dx: 9.0pt,  dy: 14.0pt, circle(radius: 0.18pt, fill: rgb("#9CA3AF")))
      #place(dx: 13.2pt, dy: 15.7pt, circle(radius: 0.32pt, fill: rgb("#4B5563")))
      #place(dx: 17.0pt, dy: 14.5pt, circle(radius: 0.46pt, fill: rgb("#1F2937")))
      #place(dx: 20.7pt, dy: 16.0pt, circle(radius: 0.22pt, fill: rgb("#6B7280")))
      #place(dx: 24.5pt, dy: 14.8pt, circle(radius: 0.30pt, fill: rgb("#374151")))
      #place(dx: 28.2pt, dy: 16.2pt, circle(radius: 0.18pt, fill: rgb("#9CA3AF")))
      #place(dx: 0.5pt,  dy: 18.3pt, circle(radius: 0.36pt, fill: rgb("#1F2937")))
      #place(dx: 4.1pt,  dy: 19.6pt, circle(radius: 0.20pt, fill: rgb("#6B7280")))
      #place(dx: 7.9pt,  dy: 18.5pt, circle(radius: 0.42pt, fill: rgb("#374151")))
      #place(dx: 11.7pt, dy: 19.9pt, circle(radius: 0.18pt, fill: rgb("#9CA3AF")))
      #place(dx: 15.4pt, dy: 18.7pt, circle(radius: 0.30pt, fill: rgb("#4B5563")))
      #place(dx: 19.1pt, dy: 20.3pt, circle(radius: 0.40pt, fill: rgb("#1F2937")))
      #place(dx: 22.9pt, dy: 18.9pt, circle(radius: 0.22pt, fill: rgb("#6B7280")))
      #place(dx: 26.6pt, dy: 20.5pt, circle(radius: 0.34pt, fill: rgb("#374151")))
      #place(dx: 2.0pt,  dy: 22.7pt, circle(radius: 0.18pt, fill: rgb("#9CA3AF")))
      #place(dx: 5.8pt,  dy: 24.0pt, circle(radius: 0.38pt, fill: rgb("#1F2937")))
      #place(dx: 9.5pt,  dy: 22.6pt, circle(radius: 0.26pt, fill: rgb("#4B5563")))
      #place(dx: 13.4pt, dy: 24.3pt, circle(radius: 0.20pt, fill: rgb("#6B7280")))
      #place(dx: 17.2pt, dy: 22.8pt, circle(radius: 0.44pt, fill: rgb("#1F2937")))
      #place(dx: 20.9pt, dy: 24.5pt, circle(radius: 0.30pt, fill: rgb("#374151")))
      #place(dx: 24.6pt, dy: 23.1pt, circle(radius: 0.18pt, fill: rgb("#9CA3AF")))
      #place(dx: 28.3pt, dy: 24.7pt, circle(radius: 0.32pt, fill: rgb("#4B5563")))
      #place(dx: 1.0pt,  dy: 27.0pt, circle(radius: 0.40pt, fill: rgb("#1F2937")))
      #place(dx: 4.7pt,  dy: 28.4pt, circle(radius: 0.22pt, fill: rgb("#6B7280")))
      #place(dx: 8.4pt,  dy: 27.1pt, circle(radius: 0.34pt, fill: rgb("#374151")))
      #place(dx: 12.2pt, dy: 28.7pt, circle(radius: 0.18pt, fill: rgb("#9CA3AF")))
      #place(dx: 16.0pt, dy: 27.3pt, circle(radius: 0.42pt, fill: rgb("#1F2937")))
      #place(dx: 19.7pt, dy: 28.9pt, circle(radius: 0.26pt, fill: rgb("#4B5563")))
      #place(dx: 23.4pt, dy: 27.5pt, circle(radius: 0.36pt, fill: rgb("#374151")))
      #place(dx: 27.1pt, dy: 29.1pt, circle(radius: 0.20pt, fill: rgb("#6B7280")))
    ]
    // Base wash slightly darker on top-left, lighter centre, mild vignette
    // feel - Typst's gradient.radial gives the old-paper bow without
    // touching readability of the body text.
    place(top + left, rect(width: 100%, height: 100%,
      fill: gradient.radial(
        rgb("#F3F4F6"), rgb("#D1D5DB"),
        center: (45%, 40%), radius: 75%)))
    place(top + left, rect(width: 100%, height: 100%, fill: dots))
  } else if mode == "ember" {
    place(top + left, rect(width: 100%, height: 100%,
      fill: gradient.linear(
        rgb("#FFE4E6"), rgb("#FFF1F2"), rgb("#FFFBEB"), rgb("#FFFFFF"),
        angle: 135deg)))
  } else if mode == "midnight" {
    place(top + left, rect(width: 100%, height: 100%,
      fill: gradient.linear(
        rgb("#1E1B4B"), rgb("#0F172A"), rgb("#020617"),
        angle: 135deg)))
  } else if mode == "matrix" {
    // Matrix / DOS-CRT phosphor. Pure-near-black base, faint horizontal
    // scanlines (one ~0.3pt green pinstripe every 3pt), and a soft radial
    // phosphor glow off-center so the screen feels "hot" near the name.
    let scanlines = tiling(size: (3pt, 3pt))[
      #place(top + left, rect(width: 3pt, height: 0.35pt, fill: rgb("#00FF411F")))
    ]
    place(top + left, rect(width: 100%, height: 100%, fill: rgb("#020403")))
    // Subtle vertical gradient bottom→top to ease the pure-black void.
    place(top + left, rect(width: 100%, height: 100%,
      fill: gradient.linear(rgb("#03080500"), rgb("#0A1F0F40"), angle: 0deg)))
    // Phosphor hot-spot - sits behind the header so the name reads like a
    // glowing CRT element.
    place(top + left, rect(width: 100%, height: 100%,
      fill: gradient.radial(
        rgb("#00FF4112"), rgb("#00000000"),
        center: (50%, 22%), radius: 45%)))
    place(top + left, rect(width: 100%, height: 100%, fill: scanlines))
  } else if mode == "ivory" {
    place(top + left, rect(width: 100%, height: 100%,
      fill: gradient.linear(
        rgb("#FBF7EE"), rgb("#FFFBF5"), rgb("#FFFFFF"),
        angle: 145deg)))
  } else if mode == "mint" {
    place(top + left, rect(width: 100%, height: 100%,
      fill: gradient.linear(
        rgb("#D1FAE5"), rgb("#ECFDF5"), rgb("#FFFFFF"),
        angle: 135deg)))
  } else if mode == "sunset" {
    place(top + left, rect(width: 100%, height: 100%,
      fill: gradient.linear(
        rgb("#FFEDD5"), rgb("#FFE4E6"), rgb("#FEF3C7"), rgb("#FFFFFF"),
        angle: 135deg)))
  } else { none }
}

// ─── Theme-aware name and heading builders ──────────────────────

// __name-block(author, theme, header-font): renders the centered name in
// the style dictated by the theme. Each variant exists because the way a
// name is set is a primary signature of the design - splitting it out
// keeps the variants legible vs. branching inline.
#let __name-block(author, theme, header-font) = {
  let first = author.at("firstname", default: "")
  let last  = author.at("lastname",  default: "")
  let style = theme.at("name-style", default: "split-accent")
  align(center)[
    #pad(bottom: 5pt)[
      #block[
        #if style == "split-accent" {
          set text(size: 32pt, font: header-font, tracking: -0.02em, weight: "bold")
          text(fill: theme.accent)[#first]
          h(0.08em)
          text(fill: theme.ink)[#last]
        } else if style == "all-ink-condensed" {
          set text(size: 28pt, font: header-font, tracking: -0.01em, weight: "medium", fill: theme.ink)
          smallcaps(upper(first + " " + last))
        } else if style == "gillette-bold" {
          // Heavy italic display weight, very tight tracking. The point of
          // reference is the Gillette logotype - bold, italic, no-frills
          // impact. Reads loud on the vintage-grain background.
          set text(size: 38pt, font: header-font, tracking: -0.03em, weight: "black", style: "italic", fill: theme.ink)
          first + " " + last
        } else if style == "last-accent-bold" {
          set text(size: 34pt, font: header-font, tracking: -0.025em, weight: "extrabold")
          text(fill: theme.ink)[#first]
          h(0.15em)
          text(fill: theme.accent)[#last]
        } else if style == "gradient-text" {
          set text(size: 34pt, font: header-font, tracking: -0.02em, weight: "bold")
          let g = gradient.linear(theme.accent, theme.at("accent-2", default: theme.accent), angle: 90deg)
          text(fill: g)[#first #last]
        } else if style == "matrix-cursor" {
          // CRT terminal greeting: phosphor-green monospace, with a trailing
          // underscore cursor. Reads as `alex morgan_` on a black void.
          // The `[\_]` escape is needed - bare `[_]` is parsed as the start
          // of Typst emphasis syntax and errors with "unclosed delimiter".
          set text(size: 30pt, font: header-font, weight: "bold", fill: theme.accent, tracking: 0.02em)
          first
          " "
          last
          text(fill: theme.accent)[\_]
        } else if style == "tracked-caps-serif" {
          set text(size: 26pt, font: header-font, tracking: 0.15em, weight: "regular", fill: theme.ink)
          smallcaps(first + " " + last)
        } else if style == "wide-caps" {
          set text(size: 22pt, font: header-font, tracking: 0.32em, weight: "regular", fill: theme.ink)
          upper(first + " " + last)
        } else if style == "italic-roman" {
          set text(size: 30pt, font: header-font, tracking: -0.01em, weight: "regular")
          text(fill: theme.accent, style: "italic")[#first]
          h(0.18em)
          text(fill: theme.ink, weight: "bold")[#last]
        } else {
          set text(size: 32pt, font: header-font, weight: "bold", fill: theme.ink)
          first + " " + last
        }
      ]
    ]
  ]
}

// __heading-block(it, theme, header-font, section-spacing, title-item-spacing):
// returns the section heading (h1) block. The visual signature of each
// theme lives here - hairline, left accent bar, diamond ornament, bracket
// frame, underline, etc. Show rules elsewhere call this.
#let __heading-block(it, theme, header-font, section-spacing, title-item-spacing) = {
  let style    = theme.at("heading-style", default: "hairline")
  let c        = if theme.at("heading-color", default: "accent") == "accent" { theme.accent }
                 else if theme.at("heading-color", default: "accent") == "ink" { theme.ink }
                 else if theme.at("heading-color", default: "accent") == "muted" { theme.muted }
                 else { theme.accent }
  let weight   = theme.at("heading-weight", default: "bold")
  let tracking = theme.at("heading-tracking", default: 0em)
  let upper-on = theme.at("heading-uppercase", default: false)
  let italic   = theme.at("heading-italic", default: false)
  let rule-c   = theme.at("rule-color", default: theme.ink)
  let rule-w   = theme.at("rule-weight", default: 0.8pt)

  // Inline label content (the heading text itself, styled). Note: combine
  // every style decision into one `set text` call. A separate `if italic
  // { set text(style: "italic") }` only applies inside the `if` block scope
  // and won't reach the body-content placed after it.
  let label = {
    set text(
      size: 16pt,
      weight: weight,
      font: header-font,
      tracking: tracking,
      fill: c,
      style: if italic { "italic" } else { "normal" },
    )
    let body-content = if upper-on { upper(it.body) } else { it.body }
    body-content
  }

  block(sticky: true, above: section-spacing, below: title-item-spacing)[
    #set align(start)
    #if style == "hairline" [
      #label#h(8pt)#box(width: 1fr, line(length: 100%, stroke: rule-w + rule-c))
    ] else if style == "prompt" [
      // `> heading_text` terminal-prompt look - chevron prefix in accent,
      // rule running to the edge. Reads as a shell command line.
      #text(fill: theme.accent, font: header-font, weight: weight, size: 16pt)[> ]#label#h(8pt)#box(width: 1fr, line(length: 100%, stroke: rule-w + rule-c))
    ] else if style == "left-bar" [
      #box(baseline: 25%, rect(width: 4pt, height: 14pt, fill: theme.accent))#h(8pt)#label
    ] else if style == "accent-block" [
      #box(baseline: 25%, rect(width: 4pt, height: 14pt, fill: theme.accent))#h(8pt)#label#h(8pt)#box(width: 1fr, line(length: 100%, stroke: rule-w + rule-c))
    ] else if style == "bracket" [
      #text(fill: theme.accent, size: 16pt, weight: weight)[\[ ]#label#text(fill: theme.accent, size: 16pt, weight: weight)[ \]]
    ] else if style == "all-caps-underline" [
      #label
      #v(0.25em, weak: true)
      #line(length: 100%, stroke: rule-w + rule-c)
    ] else if style == "diamond" [
      #label
      #v(0.25em, weak: true)
      #stack(dir: ltr, spacing: 0.5em,
        box(width: 1fr, line(length: 100%, stroke: rule-w + rule-c)),
        text(fill: theme.accent, size: 10pt)[◆],
        box(width: 1fr, line(length: 100%, stroke: rule-w + rule-c)))
    ] else [
      #label
    ]
  ]
}

// ─── Main resume() show rule ─────────────────────────────────────

#let resume(
  // Author + meta (modern-cv shape)
  author: (:),
  profile-picture: none,
  contact-items-separator: box[#h(3pt)#text(fill: cv-hairline.darken(15%))[|]#h(3pt)],
  contact-items-inset: (left: 4pt),
  date: datetime.today().display("[year]-[month]-[day]"),
  accent-color: default-accent-color,
  colored-headers: true,
  show-footer: true,
  language: "en",
  // Match modern-cv reference: Source Sans 3 body, Roboto header.
  font: ("Source Sans 3", "Source Sans Pro", "Inter", "DejaVu Sans"),
  header-font: ("Roboto", "Inter Display", "Inter"),
  paper-size: "a4",
  use-smallcaps: true,
  show-address-icon: true,

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

  gradient-background: true,

  // Visual preset - picks a complete look (palette + background + fonts +
  // name/heading styles) from `cv-themes`. Pass `none` to keep the legacy
  // behavior driven by `accent-color` / `font` / `header-font` /
  // `gradient-background` args alone (back-compat for existing call sites
  // emitted by the typst emitter).
  theme: "aurora-violet",

  body,
) = {
  if type(accent-color) == str {
    accent-color = rgb(accent-color)
  }
  // Resolve theme: a string slug looks up `cv-themes`; a dict is used as-is;
  // `none` falls back to a synthetic theme built from the legacy args so the
  // unified rendering path can run regardless of how the caller configured it.
  let resolved-theme = if type(theme) == dictionary {
    theme
  } else if type(theme) == str and theme in cv-themes {
    cv-themes.at(theme)
  } else {
    (
      accent: accent-color,
      ink: cv-ink-deep,
      muted: cv-ink-muted,
      hairline: cv-hairline,
      is-dark: false,
      bg: if gradient-background { "aurora" } else { "none" },
      body-font: font,
      header-font: header-font,
      name-style: "split-accent",
      heading-style: "hairline",
      heading-color: if colored-headers { "accent" } else { "ink" },
      heading-weight: "bold",
      heading-tracking: 0em,
      heading-uppercase: false,
      rule-color: cv-ink-deep,
      rule-weight: 0.8pt,
    )
  }
  // Theme tokens win for visual decisions; layout knobs stay independent.
  accent-color = resolved-theme.accent
  font = resolved-theme.at("body-font", default: font)
  header-font = resolved-theme.at("header-font", default: header-font)

  // Themes can override the explicit `use-smallcaps` arg - used by mint
  // when the design calls for plain text everywhere (no smallcaps in
  // positions row / h3 subtitle / footer) for a quieter feel.
  if "smallcaps" in resolved-theme {
    use-smallcaps = resolved-theme.smallcaps
  }

  // Resolve each layout knob: an explicit caller value wins; otherwise a
  // per-theme `layout-overrides` nudge applies; otherwise the hard default.
  // (ivory uses overrides for a looser, more elegant rhythm.)
  let lo = resolved-theme.at("layout-overrides", default: (:))
  let _ld = (
    font-size: 10pt, line-spacing: 0.8em, body-line-spacing: 0.55em,
    section-spacing: 23pt, margin-x: 1.5cm, header-space: 1.7cm,
    footer-space: 1.5cm, bottom-margin: 0cm, title-item-spacing: 9pt,
    item-spacing: 9pt, text-align: "justify", text-direction: "auto",
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

  // Backend compile pipeline auto-detects Arabic/Farsi content and passes
  // `--input language=ar|fa`. When present it overrides the call-site
  // `language` arg and switches the template into RTL mode (font stack,
  // text direction). For LTR resumes this is a no-op.
  let _injected_lang = sys.inputs.at("language", default: none)
  if _injected_lang != none { language = _injected_lang }
  let lang_is_rtl = language in ("ar", "fa", "he", "ur")
  // text-direction overrides auto-detection when explicitly "ltr" / "rtl".
  let is_rtl = if text-direction == "rtl" {
    true
  } else if text-direction == "ltr" {
    false
  } else {
    lang_is_rtl
  }
  if is_rtl {
    font = ("Noto Sans Arabic", "Noto Naskh Arabic", "Vazirmatn", "DejaVu Sans")
    header-font = ("Noto Sans Arabic", "Vazirmatn", "DejaVu Sans")
  }
  cv-accent.update(accent-color)
  cv-body-leading.update(body-line-spacing)
  cv-body-fill.update(resolved-theme.ink)
  cv-muted-fill.update(resolved-theme.muted)
  // Drive FA icon glyph color from the theme. Default: ink (neutral). Ember
  // sets icon-color: "accent" so the header FA brand glyphs render red.
  let icon-c = resolved-theme.at("icon-color", default: "ink")
  let icon-fill = if icon-c == "accent" { resolved-theme.accent }
                  else if icon-c == "muted"  { resolved-theme.muted }
                  else { resolved-theme.ink }
  cv-icon-fill.update(icon-fill)
  // cv-link colour follows accent unless the theme overrides. Graphite
  // wants grayscale links → accent already a gray, so the same path works.
  cv-link-fill.update(resolved-theme.accent)

  set text(
    font: font,
    lang: language,
    dir: if is_rtl { rtl } else { ltr },
    size: font-size,
    fill: resolved-theme.ink,
    tracking: resolved-theme.at("body-tracking", default: 0em),
    fallback: true,
  )

  set par(leading: line-spacing, justify: text-align == "justify", spacing: item-spacing)
  // Body alignment: "justify" stays at start-edge (par.justify spreads the
  // line); "left" / "right" force an explicit side.

  set page(
    paper: paper-size,
    margin: (
      left: margin-x,
      right: margin-x,
      top: header-space,
      bottom: footer-space + bottom-margin,
    ),
    footer-descent: bottom-margin,
    background: __bg-for(resolved-theme),
    footer: if show-footer {
      __resume_footer(author, date, use-smallcaps: use-smallcaps)
    } else { none },
  )

  set heading(numbering: none, outlined: false)

  // Section heading (h1): delegated to theme-aware __heading-block so each
  // theme's signature (hairline / left bar / diamond / bracket / etc.) is
  // declarative inside `cv-themes` rather than hardcoded here.
  show heading.where(level: 1): it => __heading-block(
    it, resolved-theme, header-font, section-spacing, title-item-spacing,
  )

  // Entry title (h2): defaults to bold ink. Themes can override the weight
  // (mint runs only regular + semibold for a quieter rhythm).
  show heading.where(level: 2): it => {
    set text(
      fill: resolved-theme.ink,
      size: 11pt,
      weight: resolved-theme.at("entry-title-weight", default: "bold"),
    )
    it.body
  }

  // Entry subtitle (h3): smallcaps regular, smaller, muted theme tone.
  show heading.where(level: 3): it => {
    set text(size: 9.5pt, weight: "regular", fill: resolved-theme.muted)
    __apply_smallcaps(it.body, use-smallcaps)
  }

  // NOTE: link styling lives on `cv-link` (above), not in a `show link:` rule.
  // A show rule that wraps the link element strips the PDF /Annot /Link click
  // target, and a global rule also leaks the external-arrow icon into the
  // contact row (which has its own FA brand glyphs). Keeping the styling on
  // the helper is single-source and avoids both bugs.

  // ─── Header (name + positions + address + contacts) ─────────────

  let name-block = __name-block(author, resolved-theme, header-font)

  let positions-block = if "positions" in author and author.positions.len() > 0 {
    set text(fill: accent-color, size: 9pt, weight: "regular")
    align(center)[
      #__apply_smallcaps(
        author.positions.join(text[#"  "#sym.dot.c#"  "]),
        use-smallcaps,
      )
    ]
  }

  let address-block = if "address" in author {
    set text(size: 9pt, weight: "regular", fill: resolved-theme.ink)
    align(center)[
      #if show-address-icon {
        __contact_item(
          (icon: address-icon, text: text(author.address)),
          inset: contact-items-inset,
        )
      } else {
        text(author.address)
      }
    ]
  }

  let contacts-block = {
    set box(height: 9pt)
    set text(size: 9pt, weight: "regular", fill: resolved-theme.ink)
    let items = __format_contact_items(author, item-inset: contact-items-inset)
    if items.len() > 0 {
      align(center, items.join(contact-items-separator))
    }
  }

  // Header contact links use raw `link()` (see __contact_item). With link
  // styling baked into cv-link only, the contact row stays icon-free and
  // clickable without a local show override.
  let header-block = [
    #name-block
    #positions-block
    #address-block
    #contacts-block
  ]

  if profile-picture != none {
    grid(
      columns: (100% - 4cm, 4cm),
      rows: 100pt,
      gutter: 10pt,
      header-block,
      align(left + horizon)[
        #block(
          clip: true, stroke: 0pt, radius: 2cm,
          width: 4cm, height: 4cm,
          profile-picture,
        )
      ],
    )
  } else {
    header-block
  }

  // Apply explicit side alignment when requested; otherwise keep default
  // (start-edge), which composes correctly with par.justify for "justify".
  // NOTE: `set align(left)` does NOT visibly move RTL paragraphs - they fill
  // the column width and text follows `dir`. The `align(side, body)` wrapper
  // is what actually shifts RTL content to the left/right edge.
  if text-align == "left" {
    align(left, body)
  } else if text-align == "right" {
    align(right, body)
  } else {
    body
  }
}

// ─── resume-entry / resume-item ──────────────────────────────────

#let resume-entry(
  title: none,
  location: "",
  date: "",
  description: "",
  title-link: none,
  accent-color: none,
  location-color: none,
) = {
  let title-content = if type(title-link) == str {
    link(title-link)[#title]
  } else { title }
  block(above: 1em, below: 0.5em, sticky: true)[
    #pad[
      #justified-header(title-content, location)
      #if description != "" or date != "" [
        #secondary-justified-header(description, date)
      ]
    ]
  ]
}

#let resume-item(body) = context {
  let leading = cv-body-leading.get()
  let fill = cv-body-fill.get()
  set text(size: 10pt, weight: "regular", fill: fill)
  set block(above: 0.55em, below: 0.85em)
  set par(leading: leading)
  block(above: 0.4em, inset: (left: 0.3em))[
    #set list(indent: 0.4em, body-indent: 0.4em, marker: ([•], [◦]))
    #body
  ]
}

// Theme-aware: the category label tracks the theme accent and the values the
// theme body ink, so skills stay legible on dark themes (e.g. midnight-prism)
// instead of rendering near-black on a dark background.
#let resume-skill-category(category) = context {
  set text(size: 10pt, weight: "bold", hyphenate: false, fill: cv-accent.get())
  category
}

#let resume-skill-values(values) = context {
  set text(size: 10pt, weight: "regular", fill: cv-body-fill.get())
  values.join(" · ")
}

// Inline category + values, wrapping naturally across full content width.
// Avoids the empty right-hand whitespace the old 3fr / 9fr grid produced when
// a category only had one or two items, while still working for résumés that
// list many groups (each item is a self-contained block on its own line). An
// empty category (e.g. a lone group that just repeats the "Skills" heading)
// renders the values alone, with no dangling label or indent.
#let resume-skill-item(category, items) = context {
  let label = if type(category) == str { category.trim() } else { category }
  let has-label = if type(label) == str { label != "" } else { label != none }
  let body = par(
    justify: false,
    hanging-indent: 0pt,
    {
      if has-label {
        resume-skill-category(label)
        h(0.45em)
      }
      resume-skill-values(items)
    },
  )
  set block(above: 0.2em, below: 0.55em)
  pad[#body]
}
