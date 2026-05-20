import type { ReactNode } from "react";

import { Link } from "../router";

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

        <div className="flex justify-center">
          <a
            href="https://github.com/zolanvari/resume"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:shadow-md"
          >
            <span className="gh-bob inline-flex">
              <svg
                viewBox="0 0 16 16"
                aria-hidden
                className="h-[18px] w-[18px] fill-slate-900 transition-transform duration-500 ease-out group-hover:rotate-[360deg]"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </span>
            Open source on GitHub
            <span
              aria-hidden
              className="text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </a>
        </div>

        {themePicker && <div className="max-w-3xl mx-auto">{themePicker}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <Card
            onClick={onUpload}
            disabled={loading}
            tone="indigo"
            icon={<UploadCloudIcon />}
            iconMotion="lift"
            title="Upload résumé"
            description="PDF, Word or paste. We extract structured fields with AI."
            cta="Choose file or paste"
          />
          <Card
            onClick={onStartBlank}
            disabled={loading}
            tone="slate"
            icon={<SparkleDocIcon />}
            iconMotion="tilt"
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
          <Link to="/privacy" className="font-medium text-indigo-600 hover:underline">
            Privacy policy
          </Link>
          {" · "}
          <Link to="/logo" className="font-medium text-indigo-600 hover:underline">
            Brand &amp; identity
          </Link>
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
  iconMotion,
  title,
  description,
  cta,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: "indigo" | "slate";
  icon: ReactNode;
  iconMotion: "lift" | "tilt";
  title: string;
  description: string;
  cta: string;
}) {
  const toneCls =
    tone === "indigo"
      ? "border-indigo-300 hover:border-indigo-500 bg-white"
      : "border-slate-300 hover:border-slate-500 bg-white";

  const badgeCls =
    tone === "indigo"
      ? "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200"
      : "bg-violet-100 text-violet-600 group-hover:bg-violet-200";

  const motionCls =
    iconMotion === "lift"
      ? "group-hover:-translate-y-1 group-hover:scale-110"
      : "group-hover:rotate-6 group-hover:scale-110";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative flex flex-col rounded-2xl border-2 border-dashed p-6 text-left transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
        toneCls,
      ].join(" ")}
    >
      <div
        className={[
          "mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 ease-out",
          badgeCls,
          motionCls,
        ].join(" ")}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 mb-4">{description}</p>
      <span className="mt-auto text-sm font-medium text-indigo-700 underline-offset-2 group-hover:underline">
        {cta} →
      </span>
    </button>
  );
}

/**
 * Cloud + an arrow that springs upward on hover - a literal "upload" gesture.
 * The arrow is a separate <g> so it can move independently of the cloud body.
 */
function UploadCloudIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5 overflow-visible"
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <g className="transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
        <path d="M12 12v9" />
        <path d="m16 16-4-4-4 4" />
      </g>
    </svg>
  );
}

/**
 * A blank document with a sparkle in the middle that pinwheels and grows on
 * hover - suggesting a fresh, AI-assisted start without using a plus sign.
 */
function SparkleDocIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5 overflow-visible"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
      <polyline points="14 2 14 8 20 8" />
      <path
        d="M12 12 L13 14 L15 15 L13 16 L12 18 L11 16 L9 15 L11 14 Z"
        fill="currentColor"
        stroke="none"
        className="origin-[12px_15px] transition-transform duration-500 ease-out group-hover:rotate-[135deg] group-hover:scale-125"
      />
    </svg>
  );
}
