/**
 * Consent-gated Google Analytics (GA4).
 *
 * gtag.js is never injected until the visitor explicitly accepts analytics
 * cookies in the consent banner - no script, no cookies, no requests to Google
 * before that. The measurement ID comes from VITE_GA_MEASUREMENT_ID at build
 * time; if it is unset, analytics is simply disabled.
 */

const GA_ID: string = import.meta.env.VITE_GA_MEASUREMENT_ID ?? "";
const CONSENT_KEY = "cv-analytics-consent";

export type Consent = "granted" | "denied" | null;

/** True when a measurement ID is configured (controls banner wording). */
export const analyticsConfigured = GA_ID !== "";

export function getStoredConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setStoredConsent(c: "granted" | "denied"): void {
  try {
    localStorage.setItem(CONSENT_KEY, c);
  } catch {
    /* private mode - the choice holds for this session only */
  }
}

/** Forget the stored choice so the consent banner is shown again. */
export function clearStoredConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* ignore */
  }
}

let loaded = false;

/** Inject gtag.js and start GA4. Idempotent; a no-op if no ID is configured. */
export function loadAnalytics(): void {
  if (loaded || !GA_ID) return;
  loaded = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  const w = window as unknown as {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer || [];
  function gtag() {
    // GA's official snippet pushes the `arguments` object verbatim.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  }
  w.gtag = gtag as unknown as (...args: unknown[]) => void;
  w.gtag("js", new Date());
  w.gtag("config", GA_ID, { anonymize_ip: true });
}

/** On app start, resume analytics only if the visitor previously accepted. */
export function initAnalyticsFromStoredConsent(): void {
  if (getStoredConsent() === "granted") loadAnalytics();
}
