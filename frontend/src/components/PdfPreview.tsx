import { useEffect, useState } from "react";

interface Props {
  url: string | null;
  rendering?: boolean;
  error?: string | null;
  /**
   * Optional title to show above the preview. The fullscreen toolbar shows it
   * too. Defaults to "Preview".
   */
  title?: string;
  /**
   * Hide the toolbar that holds the "Expand" button. The toolbar appears by
   * default; pass `false` to render just the iframe (legacy call-sites).
   */
  toolbar?: boolean;
}

/**
 * PDF preview with an optional toolbar and a fullscreen mode.
 *
 * The preview iframe shows the rendered résumé. Clicking "Expand" lifts the
 * iframe into a full-viewport overlay where the user can read it at native
 * size; Esc and the × button close the overlay (history-back-friendly via
 * pointer/keyboard, not the URL). When no PDF is available the empty state
 * shows the same dashed placeholder as before so existing screens look
 * unchanged.
 */
export default function PdfPreview({
  url,
  rendering,
  error,
  title = "Preview",
  toolbar = true,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  // Esc closes fullscreen and we lock body scroll while the overlay is open
  // - same pattern as the theme preview modal.
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  // If the underlying URL goes away (e.g. user re-renders and the old object
  // URL is revoked), don't leave the fullscreen overlay open on a broken src.
  useEffect(() => {
    if (!url && fullscreen) setFullscreen(false);
  }, [url, fullscreen]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-medium">Render failed</p>
        <p className="mt-1 text-red-600">{error}</p>
      </div>
    );
  }

  const expandButton = (
    <button
      type="button"
      onClick={() => setFullscreen(true)}
      disabled={!url}
      title="Expand preview (full screen)"
      aria-label="Expand preview"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      <ExpandIcon />
      <span className="hidden sm:inline">Expand</span>
    </button>
  );

  const toolbarBar = toolbar ? (
    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white rounded-t-xl">
      <span className="text-xs font-medium text-slate-500">{title}</span>
      {expandButton}
    </div>
  ) : null;

  const previewBody = !url ? (
    <div className="flex-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 flex items-center justify-center min-h-[400px]">
      {rendering ? "Rendering…" : "Click Update preview to generate the PDF."}
    </div>
  ) : (
    <div className="flex-1 relative bg-white">
      {rendering && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-slate-900/80 text-white rounded">
          Rendering…
        </div>
      )}
      <iframe
        title="Resume PDF preview"
        src={url}
        className="w-full h-[calc(100vh-12rem)] rounded-b-lg bg-white"
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
        {toolbarBar}
        {previewBody}
      </div>

      {fullscreen && url && (
        <FullscreenOverlay url={url} title={title} onClose={() => setFullscreen(false)} />
      )}
    </>
  );
}

function FullscreenOverlay({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} - full screen`}
      className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col animate-[fadeIn_120ms_ease-out]"
    >
      <div className="flex items-center justify-between px-5 py-3 text-white/85 text-sm font-medium border-b border-white/10">
        <span className="truncate">{title} · full screen</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close fullscreen preview"
          title="Close (Esc)"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl ring-1 ring-black/10 hover:bg-slate-100 transition text-lg font-semibold"
        >
          ×
        </button>
      </div>
      <iframe
        title="Resume PDF - full screen"
        src={url}
        className="flex-1 w-full bg-white"
      />
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5">
      <path
        fill="currentColor"
        d="M2 2.5A.5.5 0 0 1 2.5 2H6a.5.5 0 0 1 0 1H3v3a.5.5 0 0 1-1 0V2.5zm12 0V6a.5.5 0 0 1-1 0V3h-3a.5.5 0 0 1 0-1h3.5a.5.5 0 0 1 .5.5zM2.5 10a.5.5 0 0 1 .5.5V13h3a.5.5 0 0 1 0 1H2.5a.5.5 0 0 1-.5-.5V10.5a.5.5 0 0 1 .5-.5zm10.5.5a.5.5 0 0 1 1 0V14a.5.5 0 0 1-.5.5H10a.5.5 0 0 1 0-1h3v-3z"
      />
    </svg>
  );
}
