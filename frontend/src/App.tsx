import { useCallback, useEffect, useState } from "react";

import { renderPdf } from "./api";
import { PolishProvider, usePolish } from "./PolishContext";
import { emptyResume, type ResumeData, type Theme, type Tone } from "./types";

import LandingCTA from "./components/LandingCTA";
import ResumeForm from "./components/ResumeForm";
import ThemePicker from "./components/ThemePicker";
import PdfPreview from "./components/PdfPreview";
import DownloadButton from "./components/DownloadButton";
import PrivacyNote from "./components/PrivacyNote";
import SubscribeCard from "./components/SubscribeCard";
import TurnstileWidget from "./components/TurnstileWidget";
import UploadDropzone from "./components/UploadDropzone";
import PrivacyPolicy from "./components/PrivacyPolicy";
import Logo from "./components/Logo";
import GdprBanner from "./components/GdprBanner";
import PiiNoticeModal, { detectPii } from "./components/PiiNoticeModal";
import ConsentModal from "./components/ConsentModal";

const TURNSTILE_SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY;

function updateBulletText(resume: ResumeData, bulletId: string, text: string): ResumeData {
  return {
    ...resume,
    experience: resume.experience.map((e) => ({
      ...e,
      bullets: e.bullets.map((b) => (b.id === bulletId ? { ...b, text } : b)),
    })),
    education: resume.education.map((e) => ({
      ...e,
      bullets: e.bullets.map((b) => (b.id === bulletId ? { ...b, text } : b)),
    })),
  };
}

export default function App() {
  // Plain pathname routing — nginx's SPA fallback serves index.html for any
  // path, so /privacy needs no router dependency.
  if (typeof window !== "undefined" && window.location.pathname === "/privacy") {
    return (
      <>
        <PrivacyPolicy />
        <GdprBanner />
      </>
    );
  }
  if (typeof window !== "undefined" && window.location.pathname === "/logo") {
    return <Logo />;
  }
  return (
    <>
      <ResumeApp />
      <GdprBanner />
    </>
  );
}

function ResumeApp() {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [theme, setTheme] = useState<Theme>("aurora-violet");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [tone, setToneState] = useState<Tone>("impact");
  const [showUpload, setShowUpload] = useState(false);
  const [piiPending, setPiiPending] = useState<ResumeData | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const updatePreview = useCallback(async (next: ResumeData, t: Theme) => {
    setRendering(true);
    setRenderError(null);
    try {
      const blob = await renderPdf(next, t);
      const url = URL.createObjectURL(blob);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : String(e));
    } finally {
      setRendering(false);
    }
  }, []);

  function handleStartBlank() {
    setResume(emptyResume());
    setPdfUrl(null);
  }

  function handleUploadParsed(parsed: ResumeData) {
    setShowUpload(false);
    // If the parsed résumé carries structured PII, warn before the editor.
    if (detectPii(parsed).length > 0) {
      setPiiPending(parsed);
    } else {
      setResume(parsed);
      updatePreview(parsed, theme);
    }
  }

  function handlePiiConfirmed(redacted: ResumeData) {
    setPiiPending(null);
    setResume(redacted);
    updatePreview(redacted, theme);
  }

  function handleThemeChange(t: Theme) {
    setTheme(t);
    if (resume) updatePreview(resume, t);
  }

  const handleAcceptBullet = useCallback((bulletId: string, rewritten: string) => {
    setResume((r) => (r ? updateBulletText(r, bulletId, rewritten) : r));
  }, []);

  if (showUpload) {
    return (
      <UploadDropzone
        onParsed={handleUploadParsed}
        onCancel={() => setShowUpload(false)}
        turnstileSiteKey={TURNSTILE_SITE_KEY}
      />
    );
  }

  if (piiPending) {
    return <PiiNoticeModal resume={piiPending} onConfirm={handlePiiConfirmed} />;
  }

  if (!resume) {
    return (
      <LandingCTA
        onUpload={() => setShowUpload(true)}
        onStartBlank={handleStartBlank}
        themePicker={<ThemePicker value={theme} onChange={setTheme} />}
      />
    );
  }

  const filename =
    `${resume.contact.firstname || "resume"}-${resume.contact.lastname || ""}`
      .replace(/[^A-Za-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") + ".pdf";

  return (
    <PolishProvider
      resume={resume}
      onAcceptBullet={handleAcceptBullet}
      turnstileToken={turnstileToken}
    >
      <ToneSync tone={tone} />

      <div
        className="min-h-screen"
        style={{
          background:
            "linear-gradient(135deg, #FFFBEB 0%, #FFE4E6 33%, #FAE8FF 66%, #DBEAFE 100%)",
        }}
      >
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <h1 className="text-base font-semibold">
              <span className="text-gradient-brand">Resume Builder</span>
              <span className="ml-2 text-xs font-normal text-slate-500">
                cv.zolanvari.com
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <select
                value={tone}
                onChange={(e) => setToneState(e.target.value as Tone)}
                className="text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white"
                title="Polish tone"
              >
                <option value="impact">Impact</option>
                <option value="concise">Concise</option>
                <option value="leadership">Leadership</option>
              </select>
              <button
                onClick={() => updatePreview(resume, theme)}
                disabled={rendering}
                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {rendering ? "Rendering…" : "Update preview"}
              </button>
              <DownloadButton
                url={pdfUrl}
                disabled={rendering}
                onClick={() => setShowConsent(true)}
              />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 pt-5">
          <ThemePicker value={theme} onChange={handleThemeChange} />
        </div>

        <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="space-y-6">
            <ResumeForm value={resume} onChange={setResume} />
            {TURNSTILE_SITE_KEY && (
              <div className="pt-2">
                <TurnstileWidget
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>
            )}
            <PrivacyNote />
            <SubscribeCard turnstileToken={turnstileToken} />
          </section>

          <section className="lg:sticky lg:top-20 lg:self-start">
            <PdfPreview url={pdfUrl} rendering={rendering} error={renderError} />
          </section>
        </main>
      </div>

      {showConsent && pdfUrl && (
        <ConsentModal
          url={pdfUrl}
          filename={filename}
          resume={resume}
          theme={theme}
          turnstileToken={turnstileToken}
          onClose={() => setShowConsent(false)}
        />
      )}
    </PolishProvider>
  );
}

// Bridge the App-level tone state into the PolishProvider's internal tone.
function ToneSync({ tone }: { tone: Tone }) {
  const { setTone } = usePolish();
  useEffect(() => {
    setTone(tone);
  }, [tone, setTone]);
  return null;
}
