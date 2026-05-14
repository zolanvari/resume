import { useRef, useState } from "react";

import { parseResume } from "../api";
import type { ResumeData } from "../types";
import TurnstileWidget from "./TurnstileWidget";

interface Props {
  onParsed: (resume: ResumeData) => void;
  onCancel: () => void;
  turnstileSiteKey?: string;
}

type Mode = "upload" | "paste";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function UploadDropzone({ onParsed, onCancel, turnstileSiteKey }: Props) {
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null | undefined) {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError(`File is over 5 MB.`);
      return;
    }
    if (!/\.(pdf|txt)$/i.test(f.name)) {
      setError("PDF or .txt only. Paste the text instead for other formats.");
      return;
    }
    setError(null);
    setFile(f);
  }

  const ready =
    !submitting &&
    (turnstileSiteKey ? !!token : true) &&
    (mode === "upload" ? !!file : text.trim().length > 50);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const data = await parseResume({
        file: mode === "upload" ? file ?? undefined : undefined,
        text: mode === "paste" ? text : undefined,
        turnstileToken: token ?? undefined,
      });
      onParsed(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-indigo-50">
      <section className="max-w-2xl w-full">
        <button
          onClick={onCancel}
          className="text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          ← Back
        </button>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Upload your résumé</h2>
            <p className="text-sm text-slate-600">
              PDF up to 5 MB, or paste the text. We extract structured fields with AI —
              you can correct anything afterward.
            </p>
          </header>

          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <ModeTab active={mode === "upload"} onClick={() => setMode("upload")}>
              Upload file
            </ModeTab>
            <ModeTab active={mode === "paste"} onClick={() => setMode("paste")}>
              Paste text
            </ModeTab>
          </div>

          {mode === "upload" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={[
                "rounded-xl border-2 border-dashed text-center py-10 px-6 cursor-pointer transition",
                dragOver
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white",
              ].join(" ")}
            >
              <div className="text-3xl mb-2">📄</div>
              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(0)} KB · click to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    Drop your résumé here, or click to choose
                  </p>
                  <p className="text-xs text-slate-500">PDF or .txt, up to 5 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste your résumé text here. Anything is fine — we'll normalize it."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          )}

          {turnstileSiteKey && (
            <div>
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onToken={setToken}
                onExpire={() => setToken(null)}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-between items-center pt-1">
            <p className="text-xs text-slate-500">
              Processed transiently. No résumé is stored.
            </p>
            <button
              onClick={submit}
              disabled={!ready}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              {submitting ? "Parsing…" : "Extract résumé"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
