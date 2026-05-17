import type { PolishedBullet, ResumeData, Theme, Tone } from "./types";

export interface ClientErrorReport {
  kind: "boundary" | "error" | "unhandledrejection";
  message: string;
  stack?: string;
}

/** Ship a frontend error to the backend log. Fire-and-forget; never throws. */
export function reportClientError(report: ClientErrorReport): void {
  try {
    void fetch("/api/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        kind: report.kind,
        message: (report.message || "unknown").slice(0, 2000),
        stack: report.stack ? report.stack.slice(0, 8000) : null,
        url: window.location.href.slice(0, 500),
        user_agent: navigator.userAgent.slice(0, 500),
      }),
    }).catch(() => {
      /* logging must never break the app */
    });
  } catch {
    /* ignore */
  }
}

export interface ParseOptions {
  file?: File;
  text?: string;
  turnstileToken?: string;
}

export async function parseResume(opts: ParseOptions): Promise<ResumeData> {
  const fd = new FormData();
  if (opts.file) fd.append("file", opts.file);
  if (opts.text) fd.append("text", opts.text);
  if (opts.turnstileToken) fd.append("turnstile_token", opts.turnstileToken);
  const r = await fetch("/api/parse", { method: "POST", body: fd });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    let detail = txt;
    try {
      detail = (JSON.parse(txt) as { detail?: string }).detail || txt;
    } catch {
      /* fall through */
    }
    throw new Error(detail || `Parse failed: ${r.status}`);
  }
  return r.json();
}

export async function fetchSample(): Promise<ResumeData> {
  const r = await fetch("/api/sample");
  if (!r.ok) throw new Error(`Sample fetch failed: ${r.status}`);
  return r.json();
}

export async function fetchPreviewSvg(theme: Theme): Promise<string[]> {
  const r = await fetch(`/api/preview/${theme}`);
  if (!r.ok) throw new Error(`Preview fetch failed: ${r.status}`);
  const data = (await r.json()) as { pages: string[] };
  return data.pages;
}

export async function renderPdf(resume: ResumeData, theme: Theme): Promise<Blob> {
  const r = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, theme }),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(`Render failed (${r.status}): ${msg.slice(0, 200)}`);
  }
  return r.blob();
}

export async function subscribe(opts: {
  name: string;
  email: string;
  consent: boolean;
  turnstileToken?: string;
}): Promise<void> {
  const r = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: opts.name,
      email: opts.email,
      consent: opts.consent,
      turnstile_token: opts.turnstileToken,
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    let detail = txt;
    try {
      detail = (JSON.parse(txt) as { detail?: string }).detail || txt;
    } catch {
      /* fall through */
    }
    throw new Error(detail || `Subscribe failed: ${r.status}`);
  }
}

export async function consentDownload(opts: {
  resume: ResumeData;
  theme: Theme;
  name: string;
  email: string;
  turnstileToken?: string;
}): Promise<void> {
  const r = await fetch("/api/consent-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume: opts.resume,
      theme: opts.theme,
      name: opts.name,
      email: opts.email,
      turnstile_token: opts.turnstileToken,
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    let detail = txt;
    try {
      detail = (JSON.parse(txt) as { detail?: string }).detail || txt;
    } catch {
      /* fall through */
    }
    throw new Error(detail || `Consent request failed: ${r.status}`);
  }
}

export async function polishBullets(
  resume: ResumeData,
  bulletIds: string[],
  tone: Tone,
  turnstileToken?: string,
): Promise<PolishedBullet[]> {
  const r = await fetch("/api/polish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume,
      bullet_ids: bulletIds,
      tone,
      turnstile_token: turnstileToken,
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    let detail = txt;
    try {
      detail = (JSON.parse(txt) as { detail?: string }).detail || txt;
    } catch {
      /* fall through */
    }
    throw new Error(detail || `Polish failed: ${r.status}`);
  }
  const data = (await r.json()) as { polished: PolishedBullet[] };
  return data.polished;
}
