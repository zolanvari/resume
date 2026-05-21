import { useCallback, useEffect, useRef, useState } from "react";

import { renderPdf } from "./api";
import { PolishProvider, usePolish } from "./PolishContext";
import { back, navigate, useRoutePath } from "./router";
import {
  DEFAULT_LAYOUT,
  emptyResume,
  type LayoutSettings,
  type ResumeData,
  type Theme,
  type Tone,
} from "./types";

import EditTempScreen from "./components/EditTempScreen";
import LandingCTA from "./components/LandingCTA";
import ThemePicker from "./components/ThemePicker";
import UploadDropzone from "./components/UploadDropzone";
import PrivacyPolicy from "./components/PrivacyPolicy";
import Logo from "./components/Logo";
import GdprBanner from "./components/GdprBanner";
import PiiNoticeModal, { detectPii } from "./components/PiiNoticeModal";
import ConsentModal from "./components/ConsentModal";
import WorkspaceShell from "./components/WorkspaceShell";

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

/**
 * Route table - every screen has a URL, so the browser's Back/Forward buttons
 * step through the app naturally. `/privacy` and `/logo` are standalone pages;
 * the rest are screens of the builder, which stays mounted underneath them so
 * a detour to the privacy page never discards in-progress résumé work.
 */
export default function App() {
  const path = useRoutePath();
  const onPrivacy = path === "/privacy";
  const onLogo = path === "/logo";
  const onEditTemp = path === "/edit_temp";

  return (
    <>
      <div hidden={onPrivacy || onLogo || onEditTemp}>
        <ResumeApp path={path} />
      </div>
      {onPrivacy && <PrivacyPolicy />}
      {onLogo && <Logo />}
      {onEditTemp && <EditTempScreen />}
      <GdprBanner />
    </>
  );
}

function ResumeApp({ path }: { path: string }) {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [theme, setTheme] = useState<Theme>("aurora-violet");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // AI-polish tone. No longer user-adjustable from the editor chrome; the
  // polish feature uses the default "impact" voice.
  const tone: Tone = "impact";
  const [piiPending, setPiiPending] = useState<ResumeData | null>(null);
  const [layout, setLayout] = useState<LayoutSettings>(DEFAULT_LAYOUT);
  const layoutTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (layoutTimer.current) clearTimeout(layoutTimer.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Route guards: a screen whose backing state is missing - a deep link, a
  // refresh, or Back into a consumed step - redirects somewhere coherent
  // instead of rendering a blank page.
  useEffect(() => {
    if ((path === "/edit" || path === "/download") && !resume) {
      navigate("/", { replace: true });
    } else if (path === "/review" && !piiPending) {
      navigate("/", { replace: true });
    } else if (path === "/download" && !pdfUrl) {
      navigate("/edit", { replace: true });
    }
  }, [path, resume, piiPending, pdfUrl]);

  const updatePreview = useCallback(
    async (next: ResumeData, t: Theme, l: LayoutSettings) => {
      setRendering(true);
      setRenderError(null);
      try {
        const blob = await renderPdf(next, t, l);
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
    },
    [],
  );

  function handleStartBlank() {
    setResume(emptyResume());
    setPdfUrl(null);
    navigate("/edit");
  }

  function handleUploadParsed(parsed: ResumeData) {
    // If the parsed résumé carries structured PII, warn before the editor.
    if (detectPii(parsed).length > 0) {
      setPiiPending(parsed);
      navigate("/review");
    } else {
      setResume(parsed);
      updatePreview(parsed, theme, layout);
      navigate("/edit");
    }
  }

  function handlePiiConfirmed(redacted: ResumeData) {
    setPiiPending(null);
    setResume(redacted);
    updatePreview(redacted, theme, layout);
    // Replace the /review gate so Back from the editor returns to /upload.
    navigate("/edit", { replace: true });
  }

  function handleThemeChange(t: Theme) {
    setTheme(t);
    if (resume) updatePreview(resume, t, layout);
  }

  function handleLayoutChange(next: LayoutSettings) {
    setLayout(next);
    if (layoutTimer.current) clearTimeout(layoutTimer.current);
    // Debounce: one render ~600ms after the user stops adjusting controls.
    layoutTimer.current = window.setTimeout(() => {
      if (resume) updatePreview(resume, theme, next);
    }, 600);
  }

  const handleAcceptBullet = useCallback((bulletId: string, rewritten: string) => {
    setResume((r) => (r ? updateBulletText(r, bulletId, rewritten) : r));
  }, []);

  if (path === "/upload") {
    return (
      <UploadDropzone
        onParsed={handleUploadParsed}
        turnstileSiteKey={TURNSTILE_SITE_KEY}
      />
    );
  }

  if (path === "/review") {
    // Guard effect redirects when piiPending is absent; render nothing meanwhile.
    return piiPending ? (
      <PiiNoticeModal resume={piiPending} onConfirm={handlePiiConfirmed} />
    ) : null;
  }

  if (path === "/edit" || path === "/download") {
    if (!resume) return null; // guard effect redirects to "/"

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

        <WorkspaceShell
          resume={resume}
          setResume={setResume}
          theme={theme}
          onThemeChange={handleThemeChange}
          layout={layout}
          onLayoutChange={handleLayoutChange}
          pdfUrl={pdfUrl}
          rendering={rendering}
          renderError={renderError}
          turnstileToken={turnstileToken}
          setTurnstileToken={setTurnstileToken}
          turnstileSiteKey={TURNSTILE_SITE_KEY}
          onUpdatePreview={() => updatePreview(resume, theme, layout)}
          onDownloadClick={() => navigate("/download")}
        />

        {path === "/download" && pdfUrl && (
          <ConsentModal
            url={pdfUrl}
            filename={filename}
            resume={resume}
            theme={theme}
            turnstileToken={turnstileToken}
            onClose={back}
          />
        )}
      </PolishProvider>
    );
  }

  // "/" (and any unrecognised path) - the landing screen.
  return (
    <LandingCTA
      onUpload={() => navigate("/upload")}
      onStartBlank={handleStartBlank}
      themePicker={<ThemePicker value={theme} onChange={setTheme} />}
    />
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
