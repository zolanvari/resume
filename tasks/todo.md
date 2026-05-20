# Fix: page navigation on cv.zolanvari.com

## Problem
The frontend had no router. `App.tsx` read `window.location.pathname` once at
render and never reacted to history changes; every inter-page link was a plain
`<a href>` doing a full page reload. Consequences:
- Full-page reload (white flash, app re-boot) on every page change.
- Editor work destroyed: the `/privacy` link rendered *inside the live editor*
  reloaded the app, losing all résumé data.
- Browser Back/Forward broken - the in-app flow had no history entries, so Back
  left the site entirely.

## Plan
- [x] Add a dependency-free History-API router (`router.tsx`): `useRoutePath`,
      `navigate`, `back`, `<Link>`.
- [x] Make every screen a real URL: `/`, `/upload`, `/review`, `/edit`,
      `/download`, `/privacy`, `/logo`.
- [x] Keep `ResumeApp` permanently mounted so navigating to `/privacy` or
      `/logo` (and Back) never discards in-progress résumé work.
- [x] Add route guards that redirect invalid deep links to a coherent screen.
- [x] Swap internal `<a href>` links to `<Link>` in 5 components.
- [x] `npm run build` (tsc type-check + vite).
- [x] Browser test of Back/Forward across all routes.

## Review
- New file `frontend/src/router.tsx` (~90 lines, no new dependency). `<Link>`
  renders a real `<a href>` and only intercepts plain left-clicks, so
  Ctrl/Cmd-click "open in new tab" and accessibility still work.
- `App.tsx` rewritten: routes reactively; `ResumeApp` stays mounted under
  `/privacy` and `/logo` overlays. Editor screens (`/upload`, `/review`,
  `/edit`, `/download`) are route-driven instead of boolean state. Editor
  wordmark links home. Cancel/close buttons use `back()` to keep history clean.
- Links converted: LandingCTA, PrivacyPolicy, Logo, GdprBanner, PrivacyNote.
  ConsentModal's privacy link kept as `target="_blank"` (opens a new tab so the
  half-filled consent form is preserved).
- Verification: `npm run build` clean. Headless-Chromium test
  (`/tmp/nav-test.mjs`) - 15/15 checks pass: client-side nav (no reload),
  Back/Forward across `/ ↔ /privacy ↔ /logo ↔ /upload ↔ /edit`, editor state
  preserved across a `/privacy` detour, deep-link guards, SPA fallback.

## Follow-up: route the last overlay
The full-size theme preview modal (`ThemePicker`) was the only screen still
opened by local state with no URL. Routed it as `?preview=<slug>` (a query
param, since the modal overlays whichever page is underneath - `/` or `/edit`):
- `router.tsx` gained `useSearchParam` and `withParam`; `navigate` now dedupes
  and scroll-resets on the full path+query, treating `?preview=` as an overlay.
- Opening the preview pushes a history entry; Back / Esc / × all dismiss it.
  Stepping through templates inside the modal uses `replace` (no history spam).
- Verified: 18/18 browser checks pass, including open-adds-`?preview=` and
  Back-closes-the-modal.

## Deployment note
`npm run build` rewrote `frontend/dist/`, which nginx serves statically - the
change is already live; no container restart needed.
