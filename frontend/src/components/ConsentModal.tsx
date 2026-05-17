import { useState } from "react";

import { consentDownload } from "../api";
import type { ResumeData, Theme } from "../types";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface Props {
  url: string;
  filename: string;
  resume: ResumeData;
  theme: Theme;
  turnstileToken?: string | null;
  onClose: () => void;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Download dialog with an opt-in (GDPR) consent step. The PDF download always
 * happens locally; ticking the box additionally stores name/email for project
 * news and sends the owner a copy. Consent is opt-in — the box starts unticked.
 */
export default function ConsentModal({
  url,
  filename,
  resume,
  theme,
  turnstileToken,
  onClose,
}: Props) {
  const c = resume.contact;
  const [name, setName] = useState(
    `${c.firstname ?? ""} ${c.lastname ?? ""}`.trim(),
  );
  const [email, setEmail] = useState(c.email ?? "");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const consentReady =
    !consent || (name.trim().length > 0 && EMAIL_RE.test(email.trim()));

  async function handleDownload() {
    if (busy || !consentReady) return;
    setBusy(true);
    setNote(null);
    if (consent) {
      try {
        await consentDownload({
          resume,
          theme,
          name: name.trim(),
          email: email.trim(),
          turnstileToken: turnstileToken ?? undefined,
        });
      } catch (e) {
        // Never block the user's own download on the sign-up failing.
        triggerDownload(url, filename);
        setNote(
          "Your download has started, but we couldn't complete the news sign-up. " +
            (e instanceof Error ? e.message : "Please try again later."),
        );
        setBusy(false);
        return;
      }
    }
    triggerDownload(url, filename);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Download résumé"
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_120ms_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-md w-full rounded-2xl bg-white shadow-xl border border-slate-200 p-6 space-y-4"
      >
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Download your résumé
          </h2>
          <p className="text-sm text-slate-600">
            Your PDF downloads straight to your device. We don't store your résumé.
          </p>
        </header>

        <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-xs text-slate-700 leading-relaxed">
            <span className="font-medium text-slate-900">Optional:</span> store my name
            &amp; email so cv.zolanvari.com can send occasional project news. I can
            unsubscribe anytime by emailing{" "}
            <a
              href="mailto:iman@zolanvari.com"
              className="font-medium text-indigo-600 hover:underline"
            >
              iman@zolanvari.com
            </a>
            . See the{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener"
              className="font-medium text-indigo-600 hover:underline"
            >
              privacy policy
            </a>
            .
          </span>
        </label>

        {consent && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>
        )}

        {note && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {note}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={busy || !consentReady}
            className="px-5 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {busy ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
