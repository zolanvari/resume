import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Link } from "../router";
import {
  type LayoutSettings,
  type ResumeData,
  type Theme,
} from "../types";
import BackToHome from "./BackToHome";
import DownloadButton from "./DownloadButton";
import LayoutPanel from "./LayoutPanel";
import PdfPreview from "./PdfPreview";
import PrivacyNote from "./PrivacyNote";
import ResumeForm, { type ResumeFormSection } from "./ResumeForm";
import Splitter from "./Splitter";
import ThemePicker from "./ThemePicker";
import TurnstileWidget from "./TurnstileWidget";

interface Props {
  resume: ResumeData;
  setResume: (r: ResumeData) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  layout: LayoutSettings;
  onLayoutChange: (l: LayoutSettings) => void;
  pdfUrl: string | null;
  rendering: boolean;
  renderError: string | null;
  turnstileToken: string | null;
  setTurnstileToken: (t: string | null) => void;
  turnstileSiteKey: string | undefined;
  onUpdatePreview: () => void;
  onDownloadClick: () => void;
}

type Tab = "contact" | "template" | "layout" | "experience" | "education" | "skills" | "sections";

const LG_QUERY = "(min-width: 1024px)";
const STORAGE_TAB = "edit_workspace_tab";
const STORAGE_SPLIT = "edit_workspace_split";

function initialIsLg(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(LG_QUERY).matches;
}

function readStoredTab(): Tab {
  if (typeof window === "undefined") return "contact";
  const v = window.localStorage.getItem(STORAGE_TAB);
  const allowed: Tab[] = ["contact", "template", "layout", "experience", "education", "skills", "sections"];
  return (allowed as string[]).includes(v ?? "") ? (v as Tab) : "contact";
}

function readStoredSplit(): number {
  if (typeof window === "undefined") return 50;
  const n = parseFloat(window.localStorage.getItem(STORAGE_SPLIT) ?? "");
  return Number.isFinite(n) && n >= 25 && n <= 75 ? n : 50;
}

/**
 * Workspace shell for the résumé editor.
 *
 * Layout: sticky header → left sidebar (section nav) → middle pane (active
 * section) → draggable splitter → right pane (sticky PDF preview with
 * fullscreen). Persists active tab and split ratio to localStorage so the
 * user's chosen workspace returns on reload.
 */
export default function WorkspaceShell(props: Props) {
  const [tab, setTab] = useState<Tab>(readStoredTab);
  const [rightPct, setRightPct] = useState<number>(readStoredSplit);
  const [isLg, setIsLg] = useState<boolean>(initialIsLg);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { window.localStorage.setItem(STORAGE_TAB, tab); }, [tab]);
  useEffect(() => { window.localStorage.setItem(STORAGE_SPLIT, String(rightPct)); }, [rightPct]);

  useEffect(() => {
    const mq = window.matchMedia(LG_QUERY);
    const update = () => setIsLg(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const tabs: TabSpec[] = [
    { id: "contact",    label: "Contact",    hint: "Name, links, summary",                                   icon: <IconUser /> },
    { id: "template",   label: "Template",   hint: "Visual style of the PDF",                                icon: <IconLayers /> },
    { id: "layout",     label: "Layout",     hint: "Spacing & typography",                                   icon: <IconLayout /> },
    { id: "experience", label: "Experience", hint: countHint(props.resume.experience.length, "entries"),     icon: <IconBriefcase /> },
    { id: "education",  label: "Education",  hint: countHint(props.resume.education.length, "entries"),      icon: <IconCap /> },
    { id: "skills",     label: "Skills",     hint: countHint(props.resume.skills.length, "groups"),          icon: <IconSpark /> },
    { id: "sections",   label: "Custom",     hint: countHint(props.resume.sections?.length ?? 0, "sections"), icon: <IconPlus /> },
  ];

  const leftStyle: CSSProperties | undefined = isLg ? { width: `${100 - rightPct}%` } : undefined;
  const rightStyle: CSSProperties | undefined = isLg ? { width: `${rightPct}%` } : undefined;

  return (
    <div
      className="min-h-screen font-sans text-slate-900"
      style={{
        background:
          "linear-gradient(135deg, #FFFBEB 0%, #FFE4E6 33%, #FAE8FF 66%, #DBEAFE 100%)",
      }}
    >
      <Header {...props} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)] gap-5 lg:items-stretch">
        {/* Sidebar column - section nav at top, privacy/turnstile pushed to
            the bottom on lg+ so they sit flush with the bottom of the right
            column (the rendered CV preview). Mobile keeps a horizontal tab
            pill row and renders the privacy block at the end of the page. */}
        <aside className="lg:flex lg:flex-col lg:min-h-full lg:gap-5">
          <div className="lg:sticky lg:top-[68px]">
            <DesktopSidebar tabs={tabs} active={tab} onChange={setTab} />
          </div>
          <MobileTabBar tabs={tabs} active={tab} onChange={setTab} />
          <div className="hidden lg:block lg:mt-auto">
            <AuxiliaryFooter
              siteKey={props.turnstileSiteKey}
              setTurnstileToken={props.setTurnstileToken}
            />
          </div>
        </aside>

        {/* Form ↔ Preview split */}
        <div
          ref={containerRef}
          className="flex flex-col lg:flex-row min-w-0 items-stretch gap-5 lg:gap-0"
        >
          <section className="min-w-0 flex flex-col gap-5" style={leftStyle}>
            <ActivePane tab={tab} props={props} />
          </section>

          {isLg && (
            <Splitter
              containerRef={containerRef}
              rightPct={rightPct}
              onChange={setRightPct}
            />
          )}

          <section className="min-w-0 lg:self-start lg:sticky lg:top-[68px]" style={rightStyle}>
            <PdfPreview
              url={props.pdfUrl}
              rendering={props.rendering}
              error={props.renderError}
              title="Live preview"
            />
          </section>
        </div>

        {/* Mobile-only auxiliary footer (below the preview on small screens). */}
        <div className="lg:hidden">
          <AuxiliaryFooter
            siteKey={props.turnstileSiteKey}
            setTurnstileToken={props.setTurnstileToken}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────

function Header(props: Props) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BackToHome className="hidden sm:inline-flex" />
          <h1 className="text-base font-semibold truncate">
            <Link to="/" title="Back to start" className="text-gradient-brand transition hover:opacity-80">
              Resume Builder
            </Link>
            <span className="ml-2 text-xs font-normal text-slate-500">cv.zolanvari.com</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={props.onUpdatePreview}
            disabled={props.rendering}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            {props.rendering ? "Rendering…" : "Update preview"}
          </button>
          <DownloadButton url={props.pdfUrl} disabled={props.rendering} onClick={props.onDownloadClick} />
        </div>
      </div>
    </header>
  );
}

// ─── Sidebar (desktop) ───────────────────────────────────────────

interface TabSpec {
  id: Tab;
  label: string;
  hint: string;
  icon: ReactNode;
}

function DesktopSidebar({
  tabs,
  active,
  onChange,
}: {
  tabs: TabSpec[];
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="hidden lg:block rounded-xl border border-slate-200 bg-white p-2">
      <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sections</p>
      <ul className="space-y-0.5">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onChange(t.id)}
                className={[
                  "w-full text-left px-3 py-2 rounded-md flex items-start gap-2.5 transition",
                  isActive ? "bg-violet-50 text-violet-900" : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <span className={`mt-0.5 ${isActive ? "text-violet-600" : "text-slate-400"}`} aria-hidden>
                  {t.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium leading-tight">{t.label}</span>
                  <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{t.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─── Tab pills (mobile) ──────────────────────────────────────────

function MobileTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: TabSpec[];
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="lg:hidden -mx-4 px-4 overflow-x-auto">
      <div className="flex gap-1.5 py-1">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={[
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1.5",
                isActive
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className={isActive ? "text-white" : "text-slate-400"} aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Active section content ──────────────────────────────────────

function ActivePane({ tab, props }: { tab: Tab; props: Props }) {
  if (tab === "template") {
    return <ThemePicker value={props.theme} onChange={props.onThemeChange} selectOnly />;
  }
  if (tab === "layout") {
    return <LayoutPanel value={props.layout} onChange={props.onLayoutChange} />;
  }
  // contact | experience | education | skills | sections - all backed by ResumeForm.
  return (
    <ResumeForm
      value={props.resume}
      onChange={props.setResume}
      section={tab as ResumeFormSection}
    />
  );
}

function AuxiliaryFooter({
  siteKey,
  setTurnstileToken,
}: {
  siteKey: string | undefined;
  setTurnstileToken: (t: string | null) => void;
}) {
  return (
    <div className="space-y-4 pt-2">
      {siteKey && (
        <TurnstileWidget
          siteKey={siteKey}
          onToken={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
        />
      )}
      <PrivacyNote />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function countHint(n: number, noun: string): string {
  return `${n} ${n === 1 ? noun.replace(/s$/, "") : noun}`;
}

// ─── Inline icons (no external dep) ──────────────────────────────

function svgProps(className = "h-4 w-4") {
  return { viewBox: "0 0 16 16", "aria-hidden": true as const, className };
}

function IconUser() {
  return (
    <svg {...svgProps()}>
      <path fill="currentColor" d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1.5c-2.5 0-5.5 1.25-5.5 3.75V14h11v-.75c0-2.5-3-3.75-5.5-3.75z" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg {...svgProps()}>
      <path fill="currentColor" d="M8 1.5 1.5 4.75 8 8l6.5-3.25L8 1.5zm-6.5 6L8 10.75l6.5-3.25v1.5L8 12.25 1.5 9v-1.5zm0 3L8 13.75 14.5 10.5V12L8 15.25 1.5 12v-1.5z" />
    </svg>
  );
}
function IconLayout() {
  return (
    <svg {...svgProps()}>
      <path fill="currentColor" d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm1 0v3h10V3H3zm0 4v6h4V7H3zm5 0v6h5V7H8z" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg {...svgProps()}>
      <path fill="currentColor" d="M6 2.5A1.5 1.5 0 0 1 7.5 1h1A1.5 1.5 0 0 1 10 2.5V3h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3v-.5zM7 3h2v-.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5V3z" />
    </svg>
  );
}
function IconCap() {
  return (
    <svg {...svgProps()}>
      <path fill="currentColor" d="M8 2 1 5l7 3 5.5-2.357V9.5a.5.5 0 0 0 1 0V5L8 2zM3.5 7.21V10c0 .57.32 1.09.82 1.35a8.7 8.7 0 0 0 7.36 0 1.5 1.5 0 0 0 .82-1.35V7.21L8 9 3.5 7.21z" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg {...svgProps()}>
      <path fill="currentColor" d="M8 1.5 9.4 5l3.6 1.4-3.6 1.4L8 11.5 6.6 7.8 3 6.4 6.6 5 8 1.5zM12.5 11l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4L10.5 13l1.4-.6.6-1.4z" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg {...svgProps()}>
      <path fill="currentColor" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z" />
    </svg>
  );
}
