import { useState } from "react";

import {
  analyticsConfigured,
  getStoredConsent,
  loadAnalytics,
  setStoredConsent,
} from "../analytics";
import { Link } from "../router";

/**
 * Cookie-consent banner pinned to the bottom of every page. Google Analytics
 * is loaded only if the visitor clicks Accept; Decline loads nothing at all.
 * The choice is stored in localStorage so the banner is shown only once (it
 * can be reopened from the privacy policy page).
 */
export default function GdprBanner() {
  const [decided, setDecided] = useState(() => getStoredConsent() !== null);

  if (decided) return null;

  function accept() {
    setStoredConsent("granted");
    loadAnalytics();
    setDecided(true);
  }

  function decline() {
    setStoredConsent("denied");
    setDecided(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg px-4 py-3 sm:flex sm:items-center sm:gap-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          We use {analyticsConfigured ? "Google Analytics cookies" : "cookies"} to see
          how the site is used - only if you accept. Your résumé itself is never tracked
          or stored, and declining keeps the site fully working.{" "}
          <Link to="/privacy" className="font-medium text-indigo-700 hover:underline">
            Privacy policy
          </Link>
          .
        </p>
        <div className="mt-2 sm:mt-0 shrink-0 flex items-center gap-2">
          <button
            onClick={decline}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
