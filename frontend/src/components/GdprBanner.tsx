import { useState } from "react";

const ACK_KEY = "cv-gdpr-ack";

/**
 * Dismissible privacy banner pinned to the bottom of every page. Dismissal is
 * remembered in localStorage (a functional preference, not tracking).
 */
export default function GdprBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(ACK_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  function ack() {
    try {
      localStorage.setItem(ACK_KEY, "1");
    } catch {
      /* private mode — just hide for this session */
    }
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg px-4 py-3 sm:flex sm:items-center sm:gap-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          We don't store your résumé. Optional data (your name &amp; email) is kept only
          if you consent at the download step, and you can remove it anytime.{" "}
          <a href="/privacy" className="font-medium text-indigo-700 hover:underline">
            Privacy policy
          </a>
          .
        </p>
        <button
          onClick={ack}
          className="mt-2 sm:mt-0 shrink-0 px-4 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
