import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { renderPdf } from "../api";
import { Link } from "../router";
import {
  DEFAULT_LAYOUT,
  emptyResume,
  THEMES,
  type LayoutSettings,
  type ResumeData,
  type Theme,
  type Tone,
} from "../types";
import PdfPreview from "./PdfPreview";

/**
 * /edit_temp - design exploration sandbox.
 *
 * Renders the resume editor in five distinct visual treatments so the operator
 * can compare modern, minimal directions side-by-side and pick one to roll out.
 * The actual data wiring (rendering PDFs, layout settings) is real; only the
 * visual chrome differs between variants.
 */

type VariantId = "aurora" | "editorial" | "geist" | "workspace" | "nocturne";

interface VariantMeta {
  id: VariantId;
  name: string;
  blurb: string;
  swatch: string;
}

const VARIANTS: VariantMeta[] = [
  { id: "aurora",    name: "Aurora",    blurb: "Soft pastel · generous space",   swatch: "linear-gradient(135deg,#fde68a,#fbcfe8,#c4b5fd)" },
  { id: "editorial", name: "Editorial", blurb: "Stripe-clean · 1px borders",      swatch: "#ffffff" },
  { id: "geist",     name: "Geist",     blurb: "High contrast · mono labels",     swatch: "#0a0a0a" },
  { id: "workspace", name: "Workspace", blurb: "Linear sidebar · focused pane",   swatch: "#f8fafc" },
  { id: "nocturne",  name: "Nocturne",  blurb: "Dark · refined · violet accent",  swatch: "#0b0b10" },
];

export default function EditTempScreen() {
  const [resume, setResume] = useState<ResumeData>(() => emptyResume());
  const [theme, setTheme] = useState<Theme>("aurora-violet");
  const [layout, setLayout] = useState<LayoutSettings>(DEFAULT_LAYOUT);
  const [tone, setTone] = useState<Tone>("impact");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [variant, setVariant] = useState<VariantId>(() => {
    if (typeof window === "undefined") return "aurora";
    const stored = window.localStorage.getItem("edit_temp_variant") as VariantId | null;
    return stored && VARIANTS.some((v) => v.id === stored) ? stored : "aurora";
  });

  useEffect(() => {
    window.localStorage.setItem("edit_temp_variant", variant);
  }, [variant]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const updatePreview = useCallback(async () => {
    setRendering(true);
    setRenderError(null);
    try {
      const blob = await renderPdf(resume, theme, layout);
      const url = URL.createObjectURL(blob);
      setPdfUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : String(e));
    } finally {
      setRendering(false);
    }
  }, [resume, theme, layout]);

  const ctx: EditorCtx = {
    resume, setResume,
    theme, setTheme,
    layout, setLayout,
    tone, setTone,
    pdfUrl, rendering, renderError,
    updatePreview,
    variant, setVariant,
  };

  switch (variant) {
    case "editorial": return <EditorialView ctx={ctx} />;
    case "geist":     return <GeistView ctx={ctx} />;
    case "workspace": return <WorkspaceView ctx={ctx} />;
    case "nocturne":  return <NocturneView ctx={ctx} />;
    case "aurora":
    default:          return <AuroraView ctx={ctx} />;
  }
}

interface EditorCtx {
  resume: ResumeData;
  setResume: (r: ResumeData) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  layout: LayoutSettings;
  setLayout: (l: LayoutSettings) => void;
  tone: Tone;
  setTone: (t: Tone) => void;
  pdfUrl: string | null;
  rendering: boolean;
  renderError: string | null;
  updatePreview: () => void;
  variant: VariantId;
  setVariant: (v: VariantId) => void;
}

// ───────────────────────────────────────────────────────────────────
// Shared style-switcher (rendered inside each variant so it can adopt
// the variant's chrome - same affordance, different skin).
// ───────────────────────────────────────────────────────────────────

function StyleSwitcher({
  active,
  onChange,
  tone = "light",
}: {
  active: VariantId;
  onChange: (v: VariantId) => void;
  tone?: "light" | "dark" | "ink";
}) {
  const baseTone =
    tone === "dark"
      ? { wrap: "bg-zinc-900/60 border-zinc-800", inactive: "text-zinc-400 hover:text-white hover:bg-zinc-800", activeCls: "bg-white text-zinc-900" }
      : tone === "ink"
      ? { wrap: "bg-white border-black",          inactive: "text-zinc-600 hover:text-black hover:bg-zinc-100", activeCls: "bg-black text-white" }
      : { wrap: "bg-white/80 border-slate-200 backdrop-blur", inactive: "text-slate-600 hover:text-slate-900 hover:bg-slate-50", activeCls: "bg-slate-900 text-white" };

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border p-1 shadow-sm ${baseTone.wrap}`}>
      {VARIANTS.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          title={v.blurb}
          className={[
            "px-3 py-1.5 text-xs font-medium rounded-full transition",
            active === v.id ? baseTone.activeCls : baseTone.inactive,
          ].join(" ")}
        >
          {v.name}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Tokenised form atoms - each variant supplies a `Tokens` object and
// the same form markup re-skins automatically.
// ───────────────────────────────────────────────────────────────────

interface Tokens {
  card: string;            // panel wrapper
  cardInner: string;       // inner padding wrapper
  sectionTitle: string;    // h3 in panel header
  sectionHelper: string;   // small explanatory text
  label: string;           // form label text
  input: string;           // <input>, <select>, <textarea>
  primaryBtn: string;      // CTA button
  secondaryBtn: string;    // ghost button
  divider: string;         // hairline between panel header & body
  helperLink: string;      // accent text
  pillAccent: string;      // small badge / chip
  fieldGrid: string;       // grid wrapping field rows
  subtleSurface: string;   // nested card / entry card
  font: string;            // font-family className applied at root
  bodyText: string;        // default text color override (rarely needed)
}

function SectionCard({
  tokens,
  title,
  badge,
  helper,
  children,
  initialOpen = true,
  rightSlot,
}: {
  tokens: Tokens;
  title: string;
  badge?: ReactNode;
  helper?: string;
  children: ReactNode;
  initialOpen?: boolean;
  rightSlot?: ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <section className={tokens.card}>
      <header className="flex items-center justify-between gap-3 px-5 md:px-6 py-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <h3 className={tokens.sectionTitle}>{title}</h3>
          {badge}
          <span className={`ml-auto text-sm ${tokens.label}`}>{open ? "▾" : "▸"}</span>
        </button>
        {rightSlot}
      </header>
      {open && (
        <div className={`px-5 md:px-6 pb-6 pt-1 space-y-5 ${tokens.divider}`}>
          {helper && <p className={tokens.sectionHelper}>{helper}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

function Field({
  tokens,
  label,
  value,
  onChange,
  placeholder,
  className,
  type = "text",
}: {
  tokens: Tokens;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className={`block mb-1 ${tokens.label}`}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={tokens.input}
      />
    </label>
  );
}

function TextField({
  tokens,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  tokens: Tokens;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={tokens.input + " resize-y"}
    />
  );
}

function ContactBlock({ tokens, ctx }: { tokens: Tokens; ctx: EditorCtx }) {
  const c = ctx.resume.contact;
  const set = <K extends keyof typeof c>(k: K, v: (typeof c)[K]) =>
    ctx.setResume({ ...ctx.resume, contact: { ...c, [k]: v } });
  return (
    <>
      <div className={tokens.fieldGrid}>
        <Field tokens={tokens} label="First name" value={c.firstname} onChange={(v) => set("firstname", v)} />
        <Field tokens={tokens} label="Last name"  value={c.lastname}  onChange={(v) => set("lastname",  v)} />
        <Field tokens={tokens} label="Headline / position" value={c.headline ?? ""} onChange={(v) => set("headline", v)} className="sm:col-span-2" placeholder="Senior Full-Stack Engineer" />
        <Field tokens={tokens} label="Email" value={c.email ?? ""} onChange={(v) => set("email", v)} />
        <Field tokens={tokens} label="Phone" value={c.phone ?? ""} onChange={(v) => set("phone", v)} />
        <Field tokens={tokens} label="LinkedIn (username)" value={c.linkedin ?? ""} onChange={(v) => set("linkedin", v)} placeholder="alex-rivera" />
        <Field tokens={tokens} label="GitHub (username)"   value={c.github ?? ""}   onChange={(v) => set("github", v)}   placeholder="alex-rivera" />
        <Field tokens={tokens} label="Website"   value={c.website ?? ""}   onChange={(v) => set("website", v)}   placeholder="https://…" />
        <Field tokens={tokens} label="Portfolio" value={c.portfolio ?? ""} onChange={(v) => set("portfolio", v)} placeholder="https://…" />
        <Field tokens={tokens} label="Address"   value={c.address ?? ""}   onChange={(v) => set("address", v)}   className="sm:col-span-2" />
      </div>
      <div className="space-y-1.5">
        <span className={`block ${tokens.label}`}>Profile summary</span>
        <TextField
          tokens={tokens}
          value={ctx.resume.summary ?? ""}
          onChange={(v) => ctx.setResume({ ...ctx.resume, summary: v })}
          placeholder="A few sentences positioning what you do and what you're best at."
        />
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────
// Template picker - minimal swatch row, works in every variant.
// ───────────────────────────────────────────────────────────────────

function TemplateRow({ tokens, ctx }: { tokens: Tokens; ctx: EditorCtx }) {
  return (
    <SectionCard
      tokens={tokens}
      title="Template"
      helper="Pick a look. The PDF preview updates when you hit Update preview."
      badge={
        <span className={tokens.pillAccent}>
          {THEMES.find((t) => t.slug === ctx.theme)?.label}
        </span>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {THEMES.map((t) => {
          const active = t.slug === ctx.theme;
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => ctx.setTheme(t.slug)}
              className={[
                "group flex flex-col items-start gap-2 p-3 rounded-lg border transition text-left",
                tokens.subtleSurface,
                active ? "ring-2" : "",
              ].join(" ")}
              style={active ? ({ boxShadow: "0 0 0 2px var(--accent-ring,#6366f1)" } as CSSProperties) : undefined}
            >
              <span className={`inline-block w-3 h-3 rounded-full ${t.swatch}`} />
              <span className="text-[11px] font-medium leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ───────────────────────────────────────────────────────────────────
// Layout panel - compact slider grid, themed via tokens.
// ───────────────────────────────────────────────────────────────────

const SLIDERS = [
  { field: "font_size",           label: "Font size",          min: 8,   max: 14,  step: 0.5,  unit: "pt" },
  { field: "line_spacing",        label: "Line spacing",       min: 0.4, max: 1.5, step: 0.05, unit: "em" },
  { field: "body_line_spacing",   label: "Bullet line spacing",min: 0.3, max: 1.5, step: 0.05, unit: "em" },
  { field: "section_spacing",     label: "Section spacing",    min: 4,   max: 24,  step: 1,    unit: "pt" },
  { field: "margin_x",            label: "Side margins",       min: 0.5, max: 3,   step: 0.1,  unit: "cm" },
  { field: "header_space",        label: "Top margin",         min: 0.5, max: 4,   step: 0.1,  unit: "cm" },
  { field: "footer_space",        label: "Bottom margin",      min: 0.5, max: 4,   step: 0.1,  unit: "cm" },
  { field: "title_item_spacing",  label: "Title-to-entry gap", min: 0,   max: 20,  step: 0.5,  unit: "pt" },
] as const;

function isLayoutModified(l: LayoutSettings) {
  return (Object.keys(DEFAULT_LAYOUT) as (keyof LayoutSettings)[]).some((k) => l[k] !== DEFAULT_LAYOUT[k]);
}

function LayoutCard({ tokens, ctx, rangeAccentVar }: { tokens: Tokens; ctx: EditorCtx; rangeAccentVar: string }) {
  const modified = isLayoutModified(ctx.layout);
  const set = <K extends keyof LayoutSettings>(k: K, v: LayoutSettings[K]) =>
    ctx.setLayout({ ...ctx.layout, [k]: v });

  return (
    <SectionCard
      tokens={tokens}
      title="Layout"
      initialOpen={false}
      helper="Fine-tune spacing and typography of the PDF."
      badge={modified ? <span className={tokens.pillAccent}>modified</span> : undefined}
      rightSlot={
        modified ? (
          <button
            type="button"
            onClick={() => ctx.setLayout({ ...DEFAULT_LAYOUT })}
            className={`text-xs underline underline-offset-2 ${tokens.label}`}
          >
            Reset
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {SLIDERS.map((s) => (
          <div key={s.field} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label className={tokens.label}>{s.label}</label>
              <span className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={ctx.layout[s.field] as number}
                  min={s.min} max={s.max} step={s.step}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    if (!Number.isNaN(n)) set(s.field, Math.min(s.max, Math.max(s.min, n)) as never);
                  }}
                  className={tokens.input + " w-16 text-right text-xs"}
                />
                <span className={`w-5 text-xs ${tokens.label}`}>{s.unit}</span>
              </span>
            </div>
            <input
              type="range"
              value={ctx.layout[s.field] as number}
              min={s.min} max={s.max} step={s.step}
              onChange={(e) => set(s.field, parseFloat(e.target.value) as never)}
              className="w-full"
              style={{ accentColor: `var(${rangeAccentVar})` } as CSSProperties}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ───────────────────────────────────────────────────────────────────
// Shared header bar (renders identical controls; variants pass their
// own classNames for the wrapper).
// ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  ctx: EditorCtx;
  wrapperClass: string;
  titleClass: string;
  subTitleClass: string;
  selectClass: string;
  primaryBtn: string;
  secondaryBtn: string;
  switcherTone: "light" | "dark" | "ink";
  brandClass?: string;
}

function HeaderBar({ ctx, wrapperClass, titleClass, subTitleClass, selectClass, primaryBtn, secondaryBtn, switcherTone, brandClass }: HeaderProps) {
  return (
    <header className={wrapperClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <h1 className={titleClass}>
          <Link to="/" title="Back" className={brandClass ?? "transition hover:opacity-80"}>Resume Builder</Link>
          <span className={subTitleClass}>cv.zolanvari.com · /edit_temp</span>
        </h1>
        <div className="hidden md:block">
          <StyleSwitcher active={ctx.variant} onChange={ctx.setVariant} tone={switcherTone} />
        </div>
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-1.5 text-xs ${subTitleClass}`}>
            Tone
            <select
              value={ctx.tone}
              onChange={(e) => ctx.setTone(e.target.value as Tone)}
              className={selectClass}
              title="AI polish tone"
            >
              <option value="impact">Impact</option>
              <option value="concise">Concise</option>
              <option value="leadership">Leadership</option>
            </select>
          </label>
          <button onClick={ctx.updatePreview} disabled={ctx.rendering} className={secondaryBtn}>
            {ctx.rendering ? "Rendering…" : "Update preview"}
          </button>
          <button disabled={!ctx.pdfUrl || ctx.rendering} className={primaryBtn}>
            Download PDF
          </button>
        </div>
        <div className="md:hidden basis-full">
          <StyleSwitcher active={ctx.variant} onChange={ctx.setVariant} tone={switcherTone} />
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VARIANT 1 · AURORA
//   Soft pastel canvas, generous whitespace, lifted white cards.
// ═══════════════════════════════════════════════════════════════════

function AuroraView({ ctx }: { ctx: EditorCtx }) {
  const tokens: Tokens = useMemo(() => ({
    card: "rounded-2xl border border-slate-200/80 bg-white/85 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_-12px_rgba(15,23,42,0.15)]",
    cardInner: "p-6",
    sectionTitle: "text-[15px] font-semibold tracking-[-0.01em] text-slate-900",
    sectionHelper: "text-xs text-slate-500",
    label: "text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500",
    input: "w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition",
    primaryBtn: "px-3.5 py-1.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition",
    secondaryBtn: "px-3.5 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition",
    divider: "border-t border-slate-100",
    helperLink: "text-indigo-600",
    pillAccent: "text-[11px] font-medium text-indigo-700 bg-indigo-100 rounded-full px-2.5 py-0.5",
    fieldGrid: "grid grid-cols-1 sm:grid-cols-2 gap-3.5",
    subtleSurface: "bg-slate-50/70 border-slate-200 hover:border-slate-300",
    font: "font-sans",
    bodyText: "text-slate-900",
  }), []);

  return (
    <div
      className={`min-h-screen ${tokens.font} ${tokens.bodyText}`}
      style={{
        background: "linear-gradient(135deg, #FFFBEB 0%, #FFE4E6 33%, #FAE8FF 66%, #DBEAFE 100%)",
        ["--accent-ring" as string]: "#6366f1",
      } as CSSProperties}
    >
      <HeaderBar
        ctx={ctx}
        wrapperClass="sticky top-0 z-30 bg-white/75 backdrop-blur border-b border-slate-200/80"
        titleClass="text-base font-semibold text-slate-900 flex items-baseline gap-2"
        subTitleClass="text-xs font-normal text-slate-500"
        selectClass="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
        primaryBtn={tokens.primaryBtn}
        secondaryBtn={tokens.secondaryBtn}
        switcherTone="light"
        brandClass="text-gradient-brand transition hover:opacity-80"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        <section className="space-y-5">
          <TemplateRow tokens={tokens} ctx={ctx} />
          <LayoutCard tokens={tokens} ctx={ctx} rangeAccentVar="--accent-ring" />
          <SectionCard tokens={tokens} title="Contact details">
            <ContactBlock tokens={tokens} ctx={ctx} />
          </SectionCard>
          <SectionCard tokens={tokens} title="Experience" badge={<span className={tokens.pillAccent}>0</span>} initialOpen={false}>
            <p className={tokens.sectionHelper}>No entries yet. The real editor adds full CRUD here.</p>
          </SectionCard>
        </section>

        <section className="lg:sticky lg:top-20 lg:self-start">
          <PdfPreview url={ctx.pdfUrl} rendering={ctx.rendering} error={ctx.renderError} />
        </section>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VARIANT 2 · EDITORIAL
//   Stripe/shadcn - pure white, 1px hairlines, no shadows, tight grid.
// ═══════════════════════════════════════════════════════════════════

function EditorialView({ ctx }: { ctx: EditorCtx }) {
  const tokens: Tokens = useMemo(() => ({
    card: "rounded-xl border border-slate-200 bg-white",
    cardInner: "p-6",
    sectionTitle: "text-[15px] font-semibold tracking-[-0.01em] text-slate-900",
    sectionHelper: "text-[13px] text-slate-500 leading-relaxed",
    label: "text-xs font-medium text-slate-700",
    input: "w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-md focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition",
    primaryBtn: "px-3.5 py-2 rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition",
    secondaryBtn: "px-3.5 py-2 rounded-md text-sm font-medium bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition",
    divider: "border-t border-slate-100",
    helperLink: "text-slate-900 underline underline-offset-2",
    pillAccent: "text-[11px] font-medium text-slate-700 bg-slate-100 rounded-md px-2 py-0.5",
    fieldGrid: "grid grid-cols-1 sm:grid-cols-2 gap-3",
    subtleSurface: "bg-white border-slate-200 hover:border-slate-300",
    font: "font-sans",
    bodyText: "text-slate-900",
  }), []);

  return (
    <div
      className={`min-h-screen bg-white ${tokens.font} ${tokens.bodyText}`}
      style={{ ["--accent-ring" as string]: "#0f172a" } as CSSProperties}
    >
      <HeaderBar
        ctx={ctx}
        wrapperClass="sticky top-0 z-30 bg-white border-b border-slate-200"
        titleClass="text-[15px] font-semibold text-slate-900 flex items-baseline gap-2"
        subTitleClass="text-xs font-normal text-slate-500"
        selectClass="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
        primaryBtn={tokens.primaryBtn}
        secondaryBtn={tokens.secondaryBtn}
        switcherTone="light"
      />

      <div className="border-b border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">Editor</span>
            <span className="mx-2 text-slate-300">/</span>
            <span>Contact</span>
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        <section className="space-y-4">
          <TemplateRow tokens={tokens} ctx={ctx} />
          <LayoutCard tokens={tokens} ctx={ctx} rangeAccentVar="--accent-ring" />
          <SectionCard tokens={tokens} title="Contact details">
            <ContactBlock tokens={tokens} ctx={ctx} />
          </SectionCard>
          <SectionCard tokens={tokens} title="Experience" badge={<span className={tokens.pillAccent}>0</span>} initialOpen={false}>
            <p className={tokens.sectionHelper}>No entries yet.</p>
          </SectionCard>
        </section>
        <section className="lg:sticky lg:top-20 lg:self-start">
          <PdfPreview url={ctx.pdfUrl} rendering={ctx.rendering} error={ctx.renderError} />
        </section>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VARIANT 3 · GEIST
//   Vercel-style - sharp B/W, monospace labels, single accent, brutalist clean.
// ═══════════════════════════════════════════════════════════════════

function GeistView({ ctx }: { ctx: EditorCtx }) {
  const tokens: Tokens = useMemo(() => ({
    card: "rounded-md border border-black bg-white",
    cardInner: "p-6",
    sectionTitle: "text-[15px] font-semibold tracking-[-0.02em] text-black",
    sectionHelper: "text-xs text-zinc-500 font-mono",
    label: "text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500",
    input: "w-full px-3 py-2 text-sm font-mono bg-white text-black border border-black rounded-md focus:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-black/10 transition",
    primaryBtn: "px-3.5 py-1.5 rounded-md text-sm font-medium bg-black text-white border border-black hover:bg-zinc-800 disabled:opacity-40 transition",
    secondaryBtn: "px-3.5 py-1.5 rounded-md text-sm font-medium bg-white text-black border border-black hover:bg-zinc-50 disabled:opacity-50 transition",
    divider: "border-t border-black/10",
    helperLink: "text-black underline underline-offset-4",
    pillAccent: "text-[10px] font-mono uppercase tracking-wider text-white bg-black rounded-sm px-2 py-0.5",
    fieldGrid: "grid grid-cols-1 sm:grid-cols-2 gap-3",
    subtleSurface: "bg-white border-zinc-300 hover:border-black",
    font: "font-sans",
    bodyText: "text-black",
  }), []);

  return (
    <div
      className={`min-h-screen bg-white ${tokens.font} ${tokens.bodyText}`}
      style={{ ["--accent-ring" as string]: "#000000" } as CSSProperties}
    >
      <HeaderBar
        ctx={ctx}
        wrapperClass="sticky top-0 z-30 bg-white border-b border-black"
        titleClass="text-[15px] font-semibold text-black flex items-baseline gap-2"
        subTitleClass="text-[11px] font-mono uppercase tracking-wider text-zinc-500"
        selectClass="text-xs font-mono border border-black rounded-md px-2 py-1.5 bg-white text-black"
        primaryBtn={tokens.primaryBtn}
        secondaryBtn={tokens.secondaryBtn}
        switcherTone="ink"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        <section className="space-y-4">
          <TemplateRow tokens={tokens} ctx={ctx} />
          <LayoutCard tokens={tokens} ctx={ctx} rangeAccentVar="--accent-ring" />
          <SectionCard tokens={tokens} title="Contact details">
            <ContactBlock tokens={tokens} ctx={ctx} />
          </SectionCard>
          <SectionCard tokens={tokens} title="Experience" badge={<span className={tokens.pillAccent}>0</span>} initialOpen={false}>
            <p className={tokens.sectionHelper}>No entries yet.</p>
          </SectionCard>
        </section>
        <section className="lg:sticky lg:top-20 lg:self-start">
          <PdfPreview url={ctx.pdfUrl} rendering={ctx.rendering} error={ctx.renderError} />
        </section>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VARIANT 4 · WORKSPACE
//   Linear/Notion sidebar - left nav for sections, focused single pane.
// ═══════════════════════════════════════════════════════════════════

type WsTab = "contact" | "template" | "layout" | "experience" | "education" | "skills";

function WorkspaceView({ ctx }: { ctx: EditorCtx }) {
  const [tab, setTab] = useState<WsTab>("contact");
  const tokens: Tokens = useMemo(() => ({
    card: "rounded-xl border border-slate-200 bg-white",
    cardInner: "p-6",
    sectionTitle: "text-base font-semibold tracking-[-0.01em] text-slate-900",
    sectionHelper: "text-sm text-slate-500",
    label: "text-xs font-medium text-slate-600",
    input: "w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-md focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition",
    primaryBtn: "px-3.5 py-1.5 rounded-md text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition",
    secondaryBtn: "px-3.5 py-1.5 rounded-md text-sm font-medium bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition",
    divider: "border-t border-slate-100",
    helperLink: "text-violet-600",
    pillAccent: "text-[11px] font-medium text-violet-700 bg-violet-100 rounded-md px-2 py-0.5",
    fieldGrid: "grid grid-cols-1 sm:grid-cols-2 gap-3",
    subtleSurface: "bg-slate-50 border-slate-200 hover:border-slate-300",
    font: "font-sans",
    bodyText: "text-slate-900",
  }), []);

  const TABS: { id: WsTab; label: string; hint: string; icon: string }[] = [
    { id: "contact",    label: "Contact",    hint: "Name, links, summary",    icon: "◉" },
    { id: "template",   label: "Template",   hint: "Visual style of the PDF", icon: "▦" },
    { id: "layout",     label: "Layout",     hint: "Spacing & typography",    icon: "⇆" },
    { id: "experience", label: "Experience", hint: "0 entries",               icon: "▤" },
    { id: "education",  label: "Education",  hint: "0 entries",               icon: "◇" },
    { id: "skills",     label: "Skills",     hint: "0 groups",                icon: "★" },
  ];

  return (
    <div
      className={`min-h-screen bg-slate-50 ${tokens.font} ${tokens.bodyText}`}
      style={{ ["--accent-ring" as string]: "#7c3aed" } as CSSProperties}
    >
      <HeaderBar
        ctx={ctx}
        wrapperClass="sticky top-0 z-30 bg-white border-b border-slate-200"
        titleClass="text-[15px] font-semibold text-slate-900 flex items-baseline gap-2"
        subTitleClass="text-xs font-normal text-slate-500"
        selectClass="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
        primaryBtn={tokens.primaryBtn}
        secondaryBtn={tokens.secondaryBtn}
        switcherTone="light"
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)] gap-5">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="rounded-xl border border-slate-200 bg-white p-2">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sections</p>
            <ul className="space-y-0.5">
              {TABS.map((t) => {
                const active = t.id === tab;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={[
                        "w-full text-left px-3 py-2 rounded-md flex items-start gap-2 transition",
                        active ? "bg-violet-50 text-violet-900" : "text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span className={active ? "text-violet-600" : "text-slate-400"} aria-hidden>{t.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium leading-tight">{t.label}</span>
                        <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{t.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <section className="space-y-4">
          {tab === "contact" && (
            <SectionCard tokens={tokens} title="Contact details" helper="The basics that appear at the top of your résumé.">
              <ContactBlock tokens={tokens} ctx={ctx} />
            </SectionCard>
          )}
          {tab === "template" && <TemplateRow tokens={tokens} ctx={ctx} />}
          {tab === "layout"   && <LayoutCard tokens={tokens} ctx={ctx} rangeAccentVar="--accent-ring" />}
          {tab === "experience" && (
            <SectionCard tokens={tokens} title="Experience" helper="Add roles, projects, and bullet impact.">
              <p className={tokens.sectionHelper}>No entries yet.</p>
            </SectionCard>
          )}
          {tab === "education" && (
            <SectionCard tokens={tokens} title="Education" helper="Degrees, institutions, certifications.">
              <p className={tokens.sectionHelper}>No entries yet.</p>
            </SectionCard>
          )}
          {tab === "skills" && (
            <SectionCard tokens={tokens} title="Skills" helper="Group skills by category.">
              <p className={tokens.sectionHelper}>No groups yet.</p>
            </SectionCard>
          )}
        </section>

        <section className="lg:sticky lg:top-20 lg:self-start">
          <PdfPreview url={ctx.pdfUrl} rendering={ctx.rendering} error={ctx.renderError} />
        </section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VARIANT 5 · NOCTURNE
//   Refined dark mode (zinc-950), off-white text, restrained violet accent.
// ═══════════════════════════════════════════════════════════════════

function NocturneView({ ctx }: { ctx: EditorCtx }) {
  const tokens: Tokens = useMemo(() => ({
    card: "rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur",
    cardInner: "p-6",
    sectionTitle: "text-[15px] font-semibold tracking-[-0.01em] text-zinc-100",
    sectionHelper: "text-xs text-zinc-400",
    label: "text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400",
    input: "w-full px-3 py-2 text-sm bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 border border-zinc-800 rounded-md focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition",
    primaryBtn: "px-3.5 py-1.5 rounded-md text-sm font-medium bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-40 transition",
    secondaryBtn: "px-3.5 py-1.5 rounded-md text-sm font-medium bg-zinc-900 text-zinc-100 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-50 transition",
    divider: "border-t border-zinc-800",
    helperLink: "text-violet-400",
    pillAccent: "text-[11px] font-medium text-violet-200 bg-violet-500/15 border border-violet-500/30 rounded-full px-2.5 py-0.5",
    fieldGrid: "grid grid-cols-1 sm:grid-cols-2 gap-3.5",
    subtleSurface: "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200",
    font: "font-sans",
    bodyText: "text-zinc-200",
  }), []);

  return (
    <div
      className={`min-h-screen ${tokens.font} ${tokens.bodyText}`}
      style={{
        background: "radial-gradient(1200px 600px at 20% -10%, rgba(124,58,237,0.12), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(99,102,241,0.10), transparent 60%), #09090b",
        ["--accent-ring" as string]: "#8b5cf6",
      } as CSSProperties}
    >
      <HeaderBar
        ctx={ctx}
        wrapperClass="sticky top-0 z-30 bg-zinc-950/70 backdrop-blur border-b border-zinc-800"
        titleClass="text-[15px] font-semibold text-zinc-100 flex items-baseline gap-2"
        subTitleClass="text-xs font-normal text-zinc-500"
        selectClass="text-xs border border-zinc-700 rounded-md px-2 py-1.5 bg-zinc-900 text-zinc-200"
        primaryBtn={tokens.primaryBtn}
        secondaryBtn={tokens.secondaryBtn}
        switcherTone="dark"
        brandClass="text-zinc-100 hover:text-white transition"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        <section className="space-y-5">
          <TemplateRow tokens={tokens} ctx={ctx} />
          <LayoutCard tokens={tokens} ctx={ctx} rangeAccentVar="--accent-ring" />
          <SectionCard tokens={tokens} title="Contact details">
            <ContactBlock tokens={tokens} ctx={ctx} />
          </SectionCard>
          <SectionCard tokens={tokens} title="Experience" badge={<span className={tokens.pillAccent}>0</span>} initialOpen={false}>
            <p className={tokens.sectionHelper}>No entries yet.</p>
          </SectionCard>
        </section>
        <section className="lg:sticky lg:top-20 lg:self-start">
          <PdfPreview url={ctx.pdfUrl} rendering={ctx.rendering} error={ctx.renderError} />
        </section>
      </main>
    </div>
  );
}
