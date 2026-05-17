import type { ReactNode } from "react";

interface Props {
  onUpload: () => void;
  onStartBlank: () => void;
  themePicker?: ReactNode;
  loading?: boolean;
  error?: string | null;
}

export default function LandingCTA({
  onUpload,
  onStartBlank,
  themePicker,
  loading,
  error,
}: Props) {
  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #FFFBEB 0%, #FFE4E6 33%, #FAE8FF 66%, #DBEAFE 100%)",
      }}
    >
      <section className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-gradient-brand text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] pb-1">
            Resume Builder
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Create a polished, typeset résumé in minutes. Seven themes, AI bullet polish,
            one-click PDF.
          </p>
        </header>

        {themePicker && <div className="max-w-3xl mx-auto">{themePicker}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <Card
            onClick={onUpload}
            disabled={loading}
            tone="indigo"
            icon="⬆"
            title="Upload résumé"
            description="PDF, Word or paste. We extract structured fields with AI."
            cta="Choose file or paste"
          />
          <Card
            onClick={onStartBlank}
            disabled={loading}
            tone="slate"
            icon="✎"
            title="Start blank"
            description="Build from scratch in the guided form."
            cta="Open builder"
          />
        </div>

        {error && (
          <p className="text-center text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 max-w-md mx-auto">
            {error}
          </p>
        )}

        <footer className="pt-2 text-center text-xs text-slate-500 max-w-lg mx-auto">
          No private data is stored on our side unless you consent at the download step.
          Résumés are processed transiently; we only use Google Gemini on GCP to organise
          your CV.{" "}
          <a href="/privacy" className="font-medium text-indigo-600 hover:underline">
            Privacy policy
          </a>
          .
        </footer>
      </section>
    </main>
  );
}

function Card({
  onClick,
  disabled,
  tone,
  icon,
  title,
  description,
  cta,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: "indigo" | "slate";
  icon: string;
  title: string;
  description: string;
  cta: string;
}) {
  const toneCls =
    tone === "indigo"
      ? "border-indigo-300 hover:border-indigo-500 bg-white text-indigo-700"
      : "border-slate-300 hover:border-slate-500 bg-white text-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative rounded-2xl border-2 border-dashed p-6 text-left transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
        toneCls,
      ].join(" ")}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 mb-4">{description}</p>
      <span className="text-sm font-medium underline-offset-2 group-hover:underline">
        {cta} →
      </span>
    </button>
  );
}
