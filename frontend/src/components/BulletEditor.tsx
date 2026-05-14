import { useState } from "react";

import { usePolish } from "../PolishContext";
import type { Bullet } from "../types";

interface Props {
  bullet: Bullet;
  onChange: (text: string) => void;
  onDelete: () => void;
}

export default function BulletEditor({ bullet, onChange, onDelete }: Props) {
  const { pending, inFlight, polish } = usePolish();
  const polished = pending[bullet.id];
  const busy = !!inFlight[bullet.id];

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 space-y-2">
        <div className="flex items-start gap-2">
          <textarea
            value={bullet.text}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="Led the migration of …"
          />
          <button
            onClick={() => polish(bullet.id)}
            disabled={busy || !bullet.text.trim()}
            title="Polish this bullet with AI"
            className="px-2.5 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition self-start whitespace-nowrap"
          >
            {busy ? "…" : "Polish"}
          </button>
        </div>

        {polished && <PolishDiff bulletId={bullet.id} />}
      </div>

      <button
        onClick={onDelete}
        title="Delete bullet"
        className="px-2 py-1 text-slate-400 hover:text-red-600 transition"
      >
        ×
      </button>
    </div>
  );
}

function PolishDiff({ bulletId }: { bulletId: string }) {
  const { pending, accept, reject } = usePolish();
  const p = pending[bulletId];
  const [showDetail, setShowDetail] = useState(false);
  if (!p) return null;

  const tags: string[] = [];
  if (p.action_verb_changed) tags.push("Stronger verb");
  if (p.quantification_needed) tags.push("Add metric if true");
  if (p.weasel_words_removed.length > 0)
    tags.push(`Removed: ${p.weasel_words_removed.join(", ")}`);

  return (
    <div className="rounded-md border border-indigo-200 bg-indigo-50/50 p-3 text-sm">
      <div className="space-y-1">
        <p className="text-slate-500 line-through">{p.original}</p>
        <p className="text-slate-900 font-medium">{p.rewritten}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {tags.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-700"
          >
            {t}
          </span>
        ))}
        <button
          onClick={() => setShowDetail((s) => !s)}
          className="text-indigo-700 hover:underline"
        >
          {showDetail ? "Hide why" : "Why?"}
        </button>
      </div>

      {showDetail && (
        <p className="mt-2 text-xs text-slate-700 italic">{p.explanation}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => accept(bulletId)}
          className="px-3 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
        >
          Accept
        </button>
        <button
          onClick={() => reject(bulletId)}
          className="px-3 py-1 text-xs rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        >
          Keep original
        </button>
      </div>
    </div>
  );
}
