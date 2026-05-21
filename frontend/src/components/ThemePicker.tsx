import { useEffect, useState, type CSSProperties } from "react";

import { fetchPreviewSvg } from "../api";
import { back, navigate, useSearchParam, withParam } from "../router";
import { THEMES, type Theme } from "../types";

interface Props {
  value: Theme;
  onChange: (t: Theme) => void;
  /**
   * When true, clicking a tile only selects the theme - no fullscreen preview
   * modal opens. Used inside the editor where the live preview already shows
   * the full result, so the modal would be redundant. Default `false`
   * preserves the landing-page browsing behaviour.
   */
  selectOnly?: boolean;
}

// Module-level cache: one entry per theme slug. SVG pages are returned by
// /api/preview/{theme} and are stable for the life of the deployment (the
// sample resume and template are read-only), so memoising in the module is
// safe and avoids re-fetching every time the picker mounts.
const previewCache: Partial<Record<Theme, string[]>> = {};
const inflight: Partial<Record<Theme, Promise<string[]>>> = {};

function loadPreview(slug: Theme): Promise<string[]> {
  const cached = previewCache[slug];
  if (cached) return Promise.resolve(cached);
  const existing = inflight[slug];
  if (existing) return existing;
  const p = fetchPreviewSvg(slug)
    .then((pages) => {
      previewCache[slug] = pages;
      return pages;
    })
    .finally(() => {
      delete inflight[slug];
    });
  inflight[slug] = p;
  return p;
}

// Each preview page is a ~0.5-0.8 MB typst SVG with ~250 id-bearing nodes.
// Injecting them inline (dangerouslySetInnerHTML) kept thousands of live vector
// nodes in the DOM with cross-theme id collisions - heavy enough to crash the
// renderer when the full-size modal stacked more on top. Instead we wrap each
// SVG in a Blob and render it through <img>: the browser rasterises it once,
// the markup is sandboxed (no id leakage, no script), and the DOM holds a
// single image node. URLs are cached per theme for the page lifetime (7 themes
// max), so there is nothing to revoke.
const blobCache: Partial<Record<Theme, string[]>> = {};

function toBlobUrls(slug: Theme, pages: string[]): string[] {
  const cached = blobCache[slug];
  if (cached) return cached;
  const urls = pages.map((svg) =>
    URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })),
  );
  blobCache[slug] = urls;
  return urls;
}

/** Returns blob-URL previews for a theme, or null until they are available. */
function useThemePreview(slug: Theme): string[] | null {
  const initial = previewCache[slug];
  const [urls, setUrls] = useState<string[] | null>(
    initial ? toBlobUrls(slug, initial) : null,
  );
  useEffect(() => {
    let cancelled = false;
    const ready = previewCache[slug];
    setUrls(ready ? toBlobUrls(slug, ready) : null);
    loadPreview(slug)
      .then((p) => {
        if (!cancelled) setUrls(toBlobUrls(slug, p));
      })
      .catch(() => {
        /* render-failed previews stay null; the tile shows its label */
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return urls;
}

function ThumbnailImage({ urls, label }: { urls: string[] | null; label: string }) {
  if (!urls || urls.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 bg-white">
        {label}
      </div>
    );
  }
  // First page only for the tile thumbnail. The SVG and the tile share the A4
  // aspect ratio, so object-cover fills without cropping.
  return (
    <img
      aria-hidden
      src={urls[0]}
      alt=""
      className="absolute inset-0 w-full h-full object-cover bg-white"
    />
  );
}

export default function ThemePicker({ value, onChange, selectOnly = false }: Props) {
  const selectedIdx = Math.max(
    0,
    THEMES.findIndex((t) => t.slug === value),
  );
  const selected = THEMES[selectedIdx];

  // The full-size preview is addressable as ?preview=<slug>, so the browser's
  // Back button - like Esc and the × button - dismisses it. In select-only
  // mode (e.g. inside the editor where the live preview is already shown),
  // we ignore the param so the modal never opens.
  const previewParam = useSearchParam("preview");
  const previewSlug: Theme | null =
    !selectOnly && previewParam && THEMES.some((t) => t.slug === previewParam)
      ? (previewParam as Theme)
      : null;

  // Warm the cache for every theme on first paint so swapping tiles is
  // instant. Errors are swallowed; the tile will just show its label.
  useEffect(() => {
    THEMES.forEach((t) => {
      loadPreview(t.slug).catch(() => {});
    });
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3 mb-2 md:mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Template</h3>
          <p className="text-xs text-slate-500">
            {selectOnly
              ? "Pick a look. Click a tile to apply it - the live preview updates."
              : "Pick a look. Click any tile to preview full size."}
          </p>
        </div>
        <span className="text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full px-3 py-1.5 whitespace-nowrap">
          {selected.label}
        </span>
      </header>

      <div className="relative">
        <div className="flex justify-center items-end py-6 px-1 sm:px-2">
          {THEMES.map((t, i) => {
            const isSelected = t.slug === value;
            const offset = i - selectedIdx;
            const rotation = isSelected ? 0 : offset * 3;
            const translateY = isSelected ? -14 : Math.abs(offset) * 4;
            const scale = isSelected ? 1.12 : 1;
            return (
              <ThumbnailTile
                key={t.slug}
                slug={t.slug}
                label={t.label}
                isSelected={isSelected}
                style={{
                  transform: `translateY(${translateY}px) rotate(${rotation}deg) scale(${scale})`,
                  zIndex: isSelected ? 20 : 10 - Math.abs(offset),
                  // Overlap each tile onto its left neighbour so the row reads as
                  // a fanned stack rather than separated cards. ~18% of tile width.
                  marginLeft: i === 0 ? 0 : "-20px",
                }}
                onClick={() => {
                  if (!isSelected) onChange(t.slug);
                  if (!selectOnly) navigate(withParam("preview", t.slug));
                }}
                title={selectOnly ? `Apply ${t.label}` : `${t.label}. Click to preview`}
              />
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-600 text-center leading-relaxed">
        <span
          className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${selected.swatch}`}
        />
        <span className="font-medium text-slate-900">{selected.label}</span>
        {". "}
        {selected.description}
      </p>

      {previewSlug && (
        <ThemePreviewModal
          slug={previewSlug}
          onClose={back}
          onNavigate={(slug) =>
            navigate(withParam("preview", slug), { replace: true })
          }
        />
      )}
    </div>
  );
}

interface TileProps {
  slug: Theme;
  label: string;
  isSelected: boolean;
  style: CSSProperties;
  onClick: () => void;
  title?: string;
}

function ThumbnailTile({ slug, label, isSelected, style, onClick, title }: TileProps) {
  const urls = useThemePreview(slug);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? `${label}. Click to preview`}
      style={style}
      className={[
        "relative flex-1 min-w-0 max-w-[112px] aspect-[1/1.414] rounded-lg overflow-hidden border-2 shadow-md transition-transform duration-200 ease-out bg-white cursor-pointer select-none",
        isSelected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200 hover:border-slate-400",
      ].join(" ")}
    >
      <ThumbnailImage urls={urls} label={label} />
      {isSelected && (
        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-bold shadow z-10">
          ✓
        </span>
      )}
    </button>
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
  const urls = useThemePreview(slug);

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
        {urls ? ` · ${urls.length} ${urls.length === 1 ? "page" : "pages"}` : ""}
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
          {urls ? (
            urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${theme.label} page ${i + 1}`}
                onClick={(e) => e.stopPropagation()}
                className="block max-w-full h-auto rounded-lg shadow-2xl bg-white ring-1 ring-black/10 select-none"
              />
            ))
          ) : (
            <div className="text-white/70 text-sm py-12">Rendering preview…</div>
          )}
        </div>
      </div>
    </div>
  );
}
