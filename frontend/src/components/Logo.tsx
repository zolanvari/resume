import { useState, type ReactNode } from "react";

import { Link } from "../router";

/**
 * /logo - the brand & identity page for cv.zolanvari.com.
 *
 * A branded showcase: it documents the visual system by *using* it. Every
 * gradient and the shimmer wordmark below are the real production CSS, not
 * screenshots. Hex codes and code blocks are click-to-copy.
 */

const BACKDROP =
  "linear-gradient(135deg, #FFFBEB 0%, #FFE4E6 33%, #FAE8FF 66%, #DBEAFE 100%)";

const BACKDROP_STOPS = [
  { name: "Cream", token: "amber-50", hex: "#FFFBEB", at: "0%" },
  { name: "Rose", token: "rose-100", hex: "#FFE4E6", at: "33%" },
  { name: "Fuchsia", token: "fuchsia-100", hex: "#FAE8FF", at: "66%" },
  { name: "Sky", token: "blue-100", hex: "#DBEAFE", at: "100%" },
];

const WORDMARK_STOPS = [
  { name: "Amber", token: "amber-500", hex: "#f59e0b", at: "0%" },
  { name: "Pink", token: "pink-500", hex: "#ec4899", at: "38%" },
  { name: "Violet", token: "violet-500", hex: "#8b5cf6", at: "70%" },
  { name: "Indigo", token: "indigo-500", hex: "#6366f1", at: "100%" },
];

const NEUTRALS = [
  { name: "Ink", token: "slate-900", hex: "#0F172A" },
  { name: "Body", token: "slate-600", hex: "#475569" },
  { name: "Muted", token: "slate-500", hex: "#64748B" },
  { name: "Border", token: "slate-200", hex: "#E2E8F0" },
  { name: "Surface", token: "slate-50", hex: "#F8FAFC" },
  { name: "Accent", token: "indigo-600", hex: "#4F46E5" },
];

const WEIGHTS = [
  { label: "Regular", value: 400, cls: "font-normal", use: "Body copy" },
  { label: "Medium", value: 500, cls: "font-medium", use: "Links, labels" },
  { label: "Semibold", value: 600, cls: "font-semibold", use: "Headings, buttons" },
  { label: "Bold", value: 700, cls: "font-bold", use: "Section titles" },
  { label: "Extrabold", value: 800, cls: "font-extrabold", use: "The wordmark" },
];

const BACKDROP_CSS = `background: linear-gradient(
  135deg,
  #FFFBEB 0%,   /* amber-50  */
  #FFE4E6 33%,  /* rose-100  */
  #FAE8FF 66%,  /* fuchsia-100 */
  #DBEAFE 100%  /* blue-100  */
);`;

const WORDMARK_CSS = `/* Shiny gradient wordmark with a slow shimmer. */
.text-gradient-brand {
  background-image: linear-gradient(
    100deg,
    #f59e0b 0%,
    #ec4899 38%,
    #8b5cf6 70%,
    #6366f1 100%
  );
  background-size: 200% auto;
  background-position: 0% center;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

/* Motion only for users who haven't asked to reduce it. */
@media (prefers-reduced-motion: no-preference) {
  .text-gradient-brand {
    animation: brandShimmer 7s ease-in-out infinite;
  }
}

@keyframes brandShimmer {
  0%, 100% { background-position: 0% center; }
  50%      { background-position: 100% center; }
}`;

const FONT_LINK = `<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
  rel="stylesheet"
/>`;

const MODAL_GRADIENT = "bg-gradient-to-br from-slate-50 to-indigo-50";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function useCopy(text: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* clipboard unavailable - no-op */
      });
  }
  return [copied, copy];
}

function CopyButton({ text }: { text: string }) {
  const [copied, copy] = useCopy(text);
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function Swatch({
  name,
  token,
  hex,
  at,
}: {
  name: string;
  token: string;
  hex: string;
  at?: string;
}) {
  const [copied, copy] = useCopy(hex);
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${hex}`}
      className="group text-left"
    >
      <div
        className="h-20 rounded-xl border border-slate-200 shadow-sm transition group-hover:scale-[1.02]"
        style={{ background: hex }}
      />
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {name}
        {at && <span className="font-normal text-slate-400"> · {at}</span>}
      </p>
      <p className="text-xs text-slate-500">{token}</p>
      <p className="font-mono text-xs text-slate-700">
        {copied ? "Copied ✓" : hex}
      </p>
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 pr-16 text-xs leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
      <div className="absolute right-2 top-2">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function Logo() {
  return (
    <main className="min-h-screen" style={{ background: BACKDROP }}>
      <div className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        {/* Hero */}
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Brand &amp; Identity
          </p>
          <h1 className="text-gradient-brand mt-3 pb-1 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Resume Builder
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            The visual system behind cv.zolanvari.com - colours, the shimmer
            wordmark, type, and how to rebuild it. Tap any swatch or code block
            to copy.
          </p>
          <Link
            to="/"
            className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Back to the builder
          </Link>
        </header>

        <div className="mt-12 space-y-6">
          {/* Colour palette */}
          <Section id="palette" eyebrow="01" title="Colour palette">
            <p className="mb-5 text-sm text-slate-600">
              Two gradients carry the brand; a slate neutral scale carries the
              UI. Token names map to Tailwind&apos;s default palette.
            </p>

            <h3 className="text-sm font-semibold text-slate-900">
              Wordmark gradient
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {WORDMARK_STOPS.map((c) => (
                <Swatch key={c.hex} {...c} />
              ))}
            </div>

            <h3 className="mt-7 text-sm font-semibold text-slate-900">
              Background gradient
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {BACKDROP_STOPS.map((c) => (
                <Swatch key={c.hex} {...c} />
              ))}
            </div>

            <h3 className="mt-7 text-sm font-semibold text-slate-900">
              Neutral UI scale
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-6">
              {NEUTRALS.map((c) => (
                <Swatch key={c.hex} {...c} />
              ))}
            </div>
          </Section>

          {/* Background gradient */}
          <Section id="background" eyebrow="02" title="Background gradient">
            <p className="mb-4 text-sm text-slate-600">
              A 135° diagonal wash across four pale stops. Used full-bleed on
              every page - this one included.
            </p>
            <div
              className="flex h-40 items-end rounded-xl border border-slate-200 p-4 shadow-inner"
              style={{ background: BACKDROP }}
            >
              <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium text-slate-600">
                135° · 0% → 33% → 66% → 100%
              </span>
            </div>
            <div className="mt-4">
              <CodeBlock code={BACKDROP_CSS} />
            </div>
          </Section>

          {/* Wordmark & motion */}
          <Section id="wordmark" eyebrow="03" title="Wordmark &amp; motion">
            <p className="mb-4 text-sm text-slate-600">
              The wordmark is text clipped to a 100° gradient. The fill is twice
              as wide as the text (<code className="font-mono">200%</code>), and
              a 7-second <code className="font-mono">ease-in-out</code> loop
              slides it side to side for a slow shimmer.
            </p>
            <div className="flex h-32 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-inner">
              <span className="text-gradient-brand text-4xl font-extrabold tracking-tight sm:text-5xl">
                Resume Builder
              </span>
            </div>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Accessibility: the animation sits inside a{" "}
              <code className="font-mono">prefers-reduced-motion: no-preference</code>{" "}
              query, so it pauses for visitors who ask for less motion. The
              gradient fill stays.
            </div>
            <div className="mt-4">
              <CodeBlock code={WORDMARK_CSS} />
            </div>
          </Section>

          {/* Typography */}
          <Section id="type" eyebrow="04" title="Typography">
            <p className="mb-4 text-sm text-slate-600">
              One typeface: <strong>Inter</strong>, loaded from Google Fonts.
              Five weights cover the whole product.
            </p>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {WEIGHTS.map((w) => (
                <div
                  key={w.value}
                  className="flex items-baseline justify-between gap-4 px-4 py-3"
                >
                  <span className={`text-xl text-slate-900 ${w.cls}`}>
                    Resume Builder
                  </span>
                  <span className="shrink-0 text-right text-xs text-slate-500">
                    <span className="font-mono text-slate-700">{w.value}</span>{" "}
                    {w.label} · {w.use}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <CodeBlock code={FONT_LINK} />
            </div>
          </Section>

          {/* Secondary gradient */}
          <Section id="secondary" eyebrow="05" title="Secondary surfaces">
            <p className="mb-4 text-sm text-slate-600">
              Modals and dropzones use a quieter gradient - a soft slate-to-indigo
              wash that recedes behind content.
            </p>
            <div
              className={`flex h-28 items-center justify-center rounded-xl border border-slate-200 shadow-inner ${MODAL_GRADIENT}`}
            >
              <span className="text-sm font-medium text-slate-500">
                bg-gradient-to-br from-slate-50 to-indigo-50
              </span>
            </div>
          </Section>

          {/* Replication guide */}
          <Section id="replicate" eyebrow="06" title="Replicate it">
            <ol className="space-y-4 text-sm text-slate-700">
              <li>
                <strong className="text-slate-900">1. Load Inter.</strong> Add
                the font link to your <code className="font-mono">&lt;head&gt;</code>{" "}
                (see section 04) and set it as the base{" "}
                <code className="font-mono">font-family</code>.
              </li>
              <li>
                <strong className="text-slate-900">2. Add the wordmark CSS.</strong>{" "}
                Paste the <code className="font-mono">.text-gradient-brand</code>{" "}
                block (section 03) into your global stylesheet - class, media
                query, and keyframes together.
              </li>
              <li>
                <strong className="text-slate-900">3. Use the wordmark.</strong>{" "}
                Apply the class to any heading:
                <div className="mt-2">
                  <CodeBlock code={`<span className="text-gradient-brand">Resume Builder</span>`} />
                </div>
              </li>
              <li>
                <strong className="text-slate-900">4. Set the background.</strong>{" "}
                Apply the 135° gradient (section 02) to a{" "}
                <code className="font-mono">min-h-screen</code> container.
              </li>
              <li>
                <strong className="text-slate-900">5. Keep the motion guard.</strong>{" "}
                Always leave the shimmer inside the{" "}
                <code className="font-mono">prefers-reduced-motion</code> query -
                never animate it unconditionally.
              </li>
            </ol>
          </Section>
        </div>

        <footer className="mt-12 text-center text-xs text-slate-500">
          <Link to="/" className="font-medium text-indigo-600 hover:underline">
            cv.zolanvari.com
          </Link>{" "}
          · Brand &amp; Identity
        </footer>
      </div>
    </main>
  );
}
