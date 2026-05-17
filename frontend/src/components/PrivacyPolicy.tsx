import { clearStoredConsent, getStoredConsent } from "../analytics";

/**
 * Static privacy policy, served at /privacy. The app has no router — nginx's
 * SPA fallback serves index.html for the path and App renders this when
 * window.location.pathname is "/privacy". Links use plain <a> (full reloads),
 * so no router dependency is needed.
 */
export default function PrivacyPolicy() {
  const consent = getStoredConsent();

  function manageCookies() {
    clearStoredConsent();
    window.location.reload();
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #FFFBEB 0%, #FFE4E6 33%, #FAE8FF 66%, #DBEAFE 100%)",
      }}
    >
      <article className="max-w-2xl mx-auto px-6 py-12">
        <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to Resume Builder
        </a>

        <div className="mt-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-7 sm:p-9 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-500">
              cv.zolanvari.com · last updated May 2026
            </p>
          </header>

          <p className="text-sm text-slate-700 leading-relaxed">
            cv.zolanvari.com is a résumé-building demo. It is built to keep your data on
            your device, not ours.
          </p>

          <Section title="1. What we store">
            By default we store nothing. Your résumé — every field, including phone,
            email and address — lives only in your browser while you use the page. The
            one exception is the download step: if you tick the optional consent box
            there, we store your name, email and résumé headline (job title) so we can
            send you occasional project news. Nothing else is stored, ever.
          </Section>

          <Section title="2. How your résumé is processed">
            When you upload or preview a résumé, its contents are sent to our server
            only to extract structured fields and to render the PDF. Processing is
            transient: data is held in memory for the request and discarded when the
            response is returned. It is never written to disk or a database.
          </Section>

          <Section title="3. AI processing">
            To organise your résumé into structured fields and to polish bullet points,
            text is sent to Google Gemini running on Google Cloud Platform. No other
            third party receives your résumé content.
          </Section>

          <Section title="4. The download consent step">
            Downloading your PDF never requires consent. If you choose to opt in, the
            stored name, email and headline are encrypted at rest, and a copy of your
            generated CV is sent privately to the site owner so they can follow up. You
            can withdraw at any time — see section 6.
          </Section>

          <Section title="5. Analytics & cookies">
            We use Google Analytics to understand how the site is used — but only if you
            accept analytics cookies in the consent banner. Until you accept, no
            analytics script, cookie or request to Google is loaded. If you decline, the
            site works exactly the same. Google Analytics never receives your résumé
            content; it only sees standard usage data (pages, approximate region,
            device). You can change your choice at any time:
            <span className="mt-2 block">
              <span className="text-xs text-slate-500">
                Current choice:{" "}
                <strong className="text-slate-700">
                  {consent === "granted"
                    ? "analytics accepted"
                    : consent === "denied"
                      ? "analytics declined"
                      : "not set"}
                </strong>
              </span>
              <button
                onClick={manageCookies}
                className="mt-1.5 inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Change my cookie choice
              </button>
            </span>
          </Section>

          <Section title="6. Bot protection">
            We use Cloudflare Turnstile to block automated abuse. Turnstile may set its
            own cookies or tokens; see Cloudflare's privacy policy for details.
          </Section>

          <Section title="7. Your rights & removing your data">
            To access, correct or delete any data you consented to store, email{" "}
            <a
              href="mailto:iman@zolanvari.com"
              className="font-medium text-indigo-700 hover:underline"
            >
              iman@zolanvari.com
            </a>
            . We will remove it promptly. You can unsubscribe from project news the same
            way.
          </Section>

          <p className="text-sm text-slate-700 pt-2 border-t border-slate-100">
            Questions? Contact{" "}
            <a
              href="mailto:iman@zolanvari.com"
              className="font-medium text-indigo-700 hover:underline"
            >
              iman@zolanvari.com
            </a>
            .
          </p>
        </div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </section>
  );
}
