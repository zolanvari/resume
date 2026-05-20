import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

/**
 * A minimal History-API router - no dependency, ~one screen of code.
 *
 * The app's screens are real URLs (`/`, `/upload`, `/edit`, `/privacy`, …).
 * `navigate()` swaps screens client-side (no full reload, no state loss),
 * `useRoutePath()` re-renders on every history change, and the browser's
 * Back/Forward buttons work everywhere because each screen is a history entry.
 */

/** Current pathname, normalised: no trailing slash, never empty. */
export function currentPath(): string {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

// pushState/replaceState don't emit `popstate`, so navigate() fires its own
// event; useRoutePath listens to both.
const NAV_EVENT = "router:navigate";

interface NavigateOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
}

/** Full address the router tracks: normalised pathname + query string. */
function currentLocation(): string {
  return currentPath() + window.location.search;
}

// Overlay URLs (the consent dialog, the theme preview) sit on top of the page
// beneath them - navigating to one must not reset that page's scroll position.
function isOverlay(url: string): boolean {
  return url === "/download" || url.includes("preview=");
}

export function navigate(to: string, opts: NavigateOptions = {}): void {
  if (to === currentLocation()) return;
  if (opts.replace) window.history.replaceState({}, "", to);
  else window.history.pushState({}, "", to);
  window.dispatchEvent(new Event(NAV_EVENT));
  if (!isOverlay(to)) window.scrollTo(0, 0);
}

/** Step back one history entry - the clean way to dismiss a screen/modal. */
export function back(): void {
  window.history.back();
}

/** Subscribe a component to the current route. */
export function useRoutePath(): string {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const update = () => setPath(currentPath());
    window.addEventListener("popstate", update);
    window.addEventListener(NAV_EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(NAV_EVENT, update);
    };
  }, []);
  return path;
}

function readParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

/** Subscribe a component to a single query-string parameter. */
export function useSearchParam(key: string): string | null {
  const [value, setValue] = useState(() => readParam(key));
  useEffect(() => {
    const update = () => setValue(readParam(key));
    window.addEventListener("popstate", update);
    window.addEventListener(NAV_EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(NAV_EVENT, update);
    };
  }, [key]);
  return value;
}

/**
 * Build a URL that keeps the current path but sets (or clears, with `null`) one
 * query parameter - used to make overlays addressable and Back-closable.
 */
export function withParam(key: string, value: string | null): string {
  const params = new URLSearchParams(window.location.search);
  if (value === null) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  return currentPath() + (query ? `?${query}` : "");
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

/**
 * A real `<a href>` that navigates client-side on a plain left-click.
 * Modifier-clicks (Cmd/Ctrl/Shift/Alt), middle-clicks and `target` links fall
 * through to the browser, so "open in new tab" and accessibility still work.
 */
export function Link({ to, target, onClick, children, ...rest }: LinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (target && target !== "_self")
    ) {
      return;
    }
    e.preventDefault();
    navigate(to);
  }
  return (
    <a href={to} target={target} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
