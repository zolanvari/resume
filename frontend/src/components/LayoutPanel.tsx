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
