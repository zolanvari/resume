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

interface Props {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
}

export default function TurnstileWidget({ siteKey, onToken, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;

    function injectScriptOnce() {
      if (document.querySelector('script[src*="turnstile/v0/api.js"]')) return;
      const s = document.createElement("script");
      s.src = SCRIPT_URL;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    injectScriptOnce();

    const interval = window.setInterval(() => {
      if (cancelled) {
        window.clearInterval(interval);
        return;
      }
      if (!window.turnstile || !containerRef.current) return;
      window.clearInterval(interval);
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": onExpire ?? (() => {}),
        theme: "light",
      });
    }, 100);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget gone */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken, onExpire]);

  if (!siteKey) return null;
  return <div ref={containerRef} />;
}
