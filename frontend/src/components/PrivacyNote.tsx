export default function PrivacyNote() {
  return (
    <p className="text-xs text-slate-500 leading-relaxed">
      <span className="font-medium text-slate-600">Privacy:</span> no private data is
      stored on our side unless you consent at the download step. Résumés are processed
      transiently — we only use Google Gemini on GCP to organise your CV. Read our{" "}
      <a href="/privacy" className="font-medium text-indigo-600 hover:underline">
        privacy policy
      </a>
      ; email{" "}
      <a
        href="mailto:iman@zolanvari.com"
        className="font-medium text-indigo-600 hover:underline"
      >
        iman@zolanvari.com
      </a>{" "}
      to remove your data anytime.
    </p>
  );
}
