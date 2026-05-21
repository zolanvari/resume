import { Link } from "../router";

export default function PrivacyNote() {
  return (
    <p className="text-xs text-slate-500 leading-relaxed">
      <span className="font-medium text-slate-600">Privacy:</span> your résumé content is
      processed transiently and is never stored in our database. We send your résumé text
      to Google Gemini on GCP to organise it. Only if you opt in at the download step do we
      keep your name, email and headline (encrypted) and send the owner a copy of your CV.
      Read our{" "}
      <Link to="/privacy" className="font-medium text-indigo-600 hover:underline">
        privacy policy
      </Link>
      ; email{" "}
      <a
        href="mailto:info@zolanvari.com"
        className="font-medium text-indigo-600 hover:underline"
      >
        info@zolanvari.com
      </a>{" "}
      to remove your data anytime.
    </p>
  );
}
