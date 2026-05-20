import { useCallback, useEffect, useRef } from "react";

interface Props {
  /** Width of the right pane as a percentage (0-100) of the container. */
  rightPct: number;
  /** Called with the new percentage on every drag step (already clamped). */
  onChange: (pct: number) => void;
  /** RefObject pointing at the flex container that holds both panes. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Min/max bounds for the right pane percentage. Defaults: 25% – 75%. */
  min?: number;
  max?: number;
  className?: string;
}

/**
 * A vertical, draggable splitter that sits between two flex children.
 *
 * The splitter itself doesn't store width - it reports the new percentage to
 * its parent on every pointer-move so the parent owns the split state (and
 * can persist it). Uses Pointer Events for unified mouse/touch and captures
 * the pointer so dragging keeps working when the cursor exits the bar.
 *
 * Double-click resets the split to 50% - a tiny affordance that's standard in
 * tools like VS Code's pane splitter.
 */
export default function Splitter({
  rightPct,
  onChange,
  containerRef,
  min = 25,
  max = 75,
  className,
}: Props) {
  // Latest values are stashed in refs so the pointermove handler - bound once
  // for the lifetime of a drag - always sees fresh callbacks/bounds without
  // re-binding on every render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const minRef = useRef(min);
  const maxRef = useRef(max);
  minRef.current = min;
  maxRef.current = max;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const bar = e.currentTarget;
      bar.setPointerCapture(e.pointerId);
      bar.dataset.dragging = "1";
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0) return;
        // Convert cursor x into a right-pane percentage. The splitter sits at
        // the boundary, so right% = (rect.right - cursor) / rect.width.
        const raw = ((rect.right - ev.clientX) / rect.width) * 100;
        const clamped = Math.min(maxRef.current, Math.max(minRef.current, raw));
        onChangeRef.current(clamped);
      };

      const onUp = () => {
        bar.removeEventListener("pointermove", onMove);
        bar.removeEventListener("pointerup", onUp);
        bar.removeEventListener("pointercancel", onUp);
        delete bar.dataset.dragging;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      bar.addEventListener("pointermove", onMove);
      bar.addEventListener("pointerup", onUp);
      bar.addEventListener("pointercancel", onUp);
    },
    [containerRef],
  );

  // Reset to 50% on double-click.
  const handleDoubleClick = useCallback(() => onChangeRef.current(50), []);

  // Make the splitter keyboard-accessible (arrows nudge in 2% steps, Home/End jump).
  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 8 : 2;
      if (e.key === "ArrowLeft")  { e.preventDefault(); onChangeRef.current(Math.min(maxRef.current, rightPct + step)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); onChangeRef.current(Math.max(minRef.current, rightPct - step)); }
      else if (e.key === "Home")  { e.preventDefault(); onChangeRef.current(minRef.current); }
      else if (e.key === "End")   { e.preventDefault(); onChangeRef.current(maxRef.current); }
    },
    [rightPct],
  );

  // Clean up cursor/userSelect overrides if the component unmounts mid-drag.
  useEffect(() => () => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={Math.round(rightPct)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKey}
      title="Drag to resize · double-click to reset · ← → to nudge"
      className={[
        "group relative shrink-0 self-stretch cursor-col-resize select-none",
        // 8px wide hit area, 1px visible line in the middle.
        "w-2 mx-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-full",
        className ?? "",
      ].join(" ")}
    >
      {/* Visible 1px line, becomes a 2px violet bar on hover/drag */}
      <span
        aria-hidden
        className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-px bg-slate-300 group-hover:w-[3px] group-hover:bg-violet-500 group-[[data-dragging='1']]:w-[3px] group-[[data-dragging='1']]:bg-violet-500 rounded-full transition-all"
      />
      {/* Three-dot grip, only visible on hover */}
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-[[data-dragging='1']]:opacity-100 transition-opacity flex flex-col gap-1"
      >
        <span className="block h-1 w-1 rounded-full bg-violet-500" />
        <span className="block h-1 w-1 rounded-full bg-violet-500" />
        <span className="block h-1 w-1 rounded-full bg-violet-500" />
      </span>
    </div>
  );
}
