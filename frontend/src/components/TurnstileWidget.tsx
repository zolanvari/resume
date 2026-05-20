import { useEffect, useRef } from "react";

interface TurnstileGlobal {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
  }
}

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Load the Turnstile script exactly once per page and resolve when the global
// is actually usable. Shared by every widget instance so we never inject the
// script twice or poll in parallel.
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    // The script's `load` event can fire just before `window.turnstile` is
    // assigned, so confirm the global with a short bounded poll.
    const waitForGlobal = () => {
      let tries = 0;
      const t = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(t);
          resolve();
        } else if (++tries > 100) {
          window.clearInterval(t);
          reject(new Error("turnstile failed to initialise"));
        }
      }, 50);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="turnstile/v0/api.js"]',
    );
    if (existing) {
      if (window.turnstile) resolve();
      else {
        existing.addEventListener("load", waitForGlobal);
        existing.addEventListener("error", () =>
          reject(new Error("turnstile script failed to load")),
        );
      }
      return;
    }

    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.addEventListener("load", waitForGlobal);
    s.addEventListener("error", () =>
      reject(new Error("turnstile script failed to load")),
    );
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
}

export default function TurnstileWidget({ siteKey, onToken, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Callbacks are held in refs so a parent re-render (e.g. every keystroke in
  // the résumé form) never re-runs the render effect. Re-rendering the widget
  // on every keystroke was the cause of the visible "flashing".
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  onTokenRef.current = onToken;
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || widgetIdRef.current) return;
        if (!containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onExpireRef.current?.(),
          theme: "light",
        });
      })
      .catch(() => {
        /* network/script failure - the form simply stays unverified */
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} />;
}
