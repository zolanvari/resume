# Resume Builder

AI-assisted resume builder with seven Typst-rendered themes, structured bullet polishing, and one-click PDF export.
Live demo: **[cv.zolanvari.com](https://cv.zolanvari.com)** · MIT licensed.

> Screenshots and the live demo link will be added here once `cv.zolanvari.com` is deployed. The flow: click **Try sample resume** → switch theme → polish a bullet (transparent diff, accept / reject) → download PDF.

## What it does

- **Start three ways**: upload a PDF (or paste text) and let the AI extract structured fields, click a sample résumé to see all seven themes instantly, or build from a blank form.
- **Edit any field** in the guided builder - collapsible section cards for Contact, Experience, Education, Skills.
- **Polish individual bullets** with AI. Each polished bullet comes back with a structured diff - the rewritten text, which weasel words were removed, whether a metric should be added, and a one-line rationale. Accept or reject per bullet.
- **Visual theme picker**: real miniatures of all 7 themes, click to swap. The preview re-renders server-side.
- **One-click PDF download** of the current resume + theme.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11 · FastAPI · uvicorn |
| Rendering | Typst v0.14.2 (pinned in Docker) |
| AI | Provider-agnostic `AIProvider` ABC; single concrete impl behind `services/ai/factory.py` |
| Frontend | React 18 · Vite · TypeScript · Tailwind |
| Infra | Docker · nginx · Cloudflare (TLS + Turnstile) |

## Architecture

```mermaid
graph LR
  U[Browser] -->|HTTPS + Turnstile| CF[Cloudflare]
  CF -->|origin TLS| N[nginx]
  N -->|static| D[frontend/dist]
  N -->|/api/*| B[FastAPI :8003]
  B -->|subprocess| T[typst compile]
  B -->|HTTPS| G[AI provider]
```

See [docs/architecture.md](docs/architecture.md) for the request-flow walkthrough, the boundary between modules, and the privacy and cost-control posture.

## Privacy

**By default, résumé content is not persisted.** Your résumé is processed transiently: form content is sent to the server when you upload/paste, click **Update preview**, or **Polish**, handled in memory and a per-request temporary directory, and discarded as soon as the response returns. Full résumé content is never written to our database.

What does leave your browser, and when:

- **AI processing.** On upload/paste, the full résumé *text* is sent to Google Gemini (on GCP) to extract structured fields. On **Polish**, the bullet text you select is sent to Gemini. No other third party receives résumé content.
- **Opt-in consent store.** There is a small SQLite store (`/data/cv.db`, enabled only when `STORE_ENCRYPTION_KEY` is set). If — and only if — you tick the optional consent box at the download step, it stores your **name, email, and résumé headline**, with name and email encrypted at rest (Fernet). It never stores the résumé body, phone, or address.
- **Owner copy on consent.** When you opt in at download, a copy of the generated PDF is also sent privately to the site owner (over Telegram) for follow-up. Your own download happens client-side and never depends on this.
- **Operational logs.** The optional **Subscribe** form and client-side error reports record name/email/IP in server logs (not the database) for abuse-prevention and debugging.

You can request access or deletion of any consented data anytime — email **info@zolanvari.com**. See the in-app [privacy policy](https://cv.zolanvari.com/privacy) for the user-facing version.

## Cost and abuse posture

Three layered defenses on a public AI endpoint:
1. **Cloudflare Turnstile** with server-side Siteverify on `/api/polish`.
2. **Per-IP rate limit** via `slowapi` (10 polish / 60 render per hour by default; tunable via env).
3. **Instant kill switch**: `AI_ENABLED=false` in env → `/api/polish` returns 503, render and download still work.

GCP / provider budgets are alerts, not ceilings. The above is what actually caps cost on a public demo.

## Local development

```bash
git clone https://github.com/zolanvari/resume.git
cd resume
cp .env.example .env       # add GEMINI_API_KEY + TURNSTILE_SECRET_KEY (optional for local)
docker compose up -d --build
cd frontend && npm ci && npm run dev
```

Backend listens on `127.0.0.1:8003`. Vite dev server proxies `/api/*` to it. To enable AI polish locally, fill `GEMINI_API_KEY`; without it the endpoint returns a clean 503 and the rest of the demo still works.

To enable Cloudflare Turnstile locally, set `VITE_TURNSTILE_SITE_KEY` in `frontend/.env` and `TURNSTILE_SECRET_KEY` in `.env`.

## API

<details>
<summary>Endpoints</summary>

| Method | Path | Body | Response |
|---|---|---|---|
| `GET`  | `/health`     | - | `{status, typst, ai_enabled}` |
| `GET`  | `/api/sample` | - | `ResumeData` |
| `POST` | `/api/render` | `{resume, theme}` | `application/pdf` |
| `POST` | `/api/polish` | `{resume, bullet_ids, tone, turnstile_token}` | `{polished: PolishedBullet[]}` |
| `POST` | `/api/parse`  | multipart `file` (PDF/txt) **or** `text`, plus `turnstile_token` | `ResumeData` |
| `POST` | `/api/subscribe` | `{name, email, consent, turnstile_token}` | `{ok: true}` |
| `POST` | `/api/consent-download` | `{resume, theme, name, email, turnstile_token}` | `{ok: true}` (opt-in: stores name/email/headline encrypted, sends owner a CV copy) |

`PolishedBullet`:
```
{
  bullet_id, original, rewritten,
  action_verb_changed: bool,
  quantification_needed: bool,
  weasel_words_removed: string[],
  explanation: string
}
```
</details>

## Project layout

```
backend/
  app/
    main.py                    FastAPI app, rate-limit middleware
    schemas.py                 Pydantic models (single source of truth)
    sample_data.py             Canonical sample served by /api/sample
    routers/                   One file per endpoint
    services/
      typst_emit.py            Pure: ResumeData → .typ source string
      typst_render.py          Subprocess: .typ → PDF bytes
      turnstile.py             Server-side Siteverify
      ai/
        provider.py            AIProvider ABC
        factory.py             One-line swap point
        gemini.py              Concrete implementation
    prompts/polish.md          Source of truth for polish behaviour
    templates/resume.typ       Forked from modern-cv, theme-extended
frontend/
  src/
    App.tsx                    Layout + state
    PolishContext.tsx          Pending polishes, in-flight, accept/reject
    components/                Form, theme picker, preview, bullet editor…
```

## Author

**Iman Zolanvari** · [LinkedIn](#)

## Attribution

The Typst template is forked from [ptsouchlos/modern-cv](https://github.com/ptsouchlos/modern-cv) under the MIT license. See [LICENSE](./LICENSE).
