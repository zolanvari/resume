import { useEffect, useState } from "react";

import { THEMES, type Theme } from "../types";

interface Props {
  value: Theme;
  onChange: (t: Theme) => void;
}

export default function ThemePicker({ value, onChange }: Props) {
  const selectedIdx = Math.max(
    0,
    THEMES.findIndex((t) => t.slug === value),
  );
  const selected = THEMES[selectedIdx];
  const [previewSlug, setPreviewSlug] = useState<Theme | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3 mb-2 md:mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Template</h3>
          <p className="text-xs text-slate-500">
            Pick a look — double-click any template to preview full size.
          </p>
        </div>
        <span className="text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full px-3 py-1.5 whitespace-nowrap">
          {selected.label}
        </span>
      </header>

      <div className="relative">
        <div className="flex justify-center items-end gap-1 sm:gap-1.5 py-4 px-1 sm:px-2">
          {THEMES.map((t, i) => {
            const isSelected = t.slug === value;
            const offset = i - selectedIdx;
            const rotation = isSelected ? 0 : offset * 2.5;
            const translateY = isSelected ? -10 : Math.abs(offset) * 3;
            const scale = isSelected ? 1.08 : 1;
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => onChange(t.slug)}
                onDoubleClick={() => setPreviewSlug(t.slug)}
                title={`${t.label} — double-click to preview`}
                style={{
                  transform: `translateY(${translateY}px) rotate(${rotation}deg) scale(${scale})`,
                  zIndex: isSelected ? 20 : 10 - Math.abs(offset),
                }}
                className={[
                  "relative flex-1 min-w-0 max-w-[112px] aspect-[1/1.414] rounded-lg overflow-hidden border-2 shadow-md transition-transform duration-200 ease-out bg-white cursor-zoom-in select-none",
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-200"
                    : "border-slate-200 hover:border-slate-400",
                ].join(" ")}
              >
                <img
                  src={`/themes/${t.slug}.png`}
                  alt={t.label}
                  loading="lazy"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-bold shadow">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-600 text-center leading-relaxed">
        <span
          className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${selected.swatch}`}
        />
        <span className="font-medium text-slate-900">{selected.label}</span>
        {" — "}
        {selected.description}
      </p>

      {previewSlug && (
        <ThemePreviewModal
          slug={previewSlug}
          onClose={() => setPreviewSlug(null)}
          onNavigate={(slug) => setPreviewSlug(slug)}
        />
      )}
    </div>
  );
}

interface PreviewProps {
  slug: Theme;
  onClose: () => void;
  onNavigate: (slug: Theme) => void;
}

function ThemePreviewModal({ slug, onClose, onNavigate }: PreviewProps) {
  const idx = THEMES.findIndex((t) => t.slug === slug);
  const theme = THEMES[idx];
  const prevTheme = THEMES[(idx - 1 + THEMES.length) % THEMES.length];
  const nextTheme = THEMES[(idx + 1) % THEMES.length];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onNavigate(prevTheme.slug);
      else if (e.key === "ArrowRight") onNavigate(nextTheme.slug);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onNavigate, prevTheme.slug, nextTheme.slug]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${theme.label} full preview`}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col animate-[fadeIn_120ms_ease-out]"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close preview"
        title="Close (Esc)"
        className="fixed top-4 right-4 z-[110] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl ring-1 ring-black/10 hover:bg-slate-100 transition text-xl font-semibold"
      >
        ×
      </button>

      <div className="px-5 py-3 pr-20 text-white/85 text-sm font-medium border-b border-white/10 truncate">
        <span
          className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${theme.swatch}`}
        />
        {theme.label} preview
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(prevTheme.slug);
          }}
          aria-label={`Previous template (${prevTheme.label})`}
          className="hidden sm:flex fixed left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 shadow-lg items-center justify-center text-xl transition z-[105]"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(nextTheme.slug);
          }}
          aria-label={`Next template (${nextTheme.label})`}
          className="hidden sm:flex fixed right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 shadow-lg items-center justify-center text-xl transition z-[105]"
        >
          ›
        </button>

        <div className="flex flex-col items-center gap-6">
          <img
            src={`/themes/${theme.slug}.png`}
            alt={theme.label}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full w-auto h-auto rounded-lg shadow-2xl bg-white ring-1 ring-black/10 select-none"
          />
        </div>
      </div>
    </div>
  );
}
