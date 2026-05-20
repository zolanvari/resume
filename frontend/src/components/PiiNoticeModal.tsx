import { useState } from "react";

import type { ResumeData } from "../types";

type PiiField = "phone" | "email" | "address";

const FIELD_META: Record<PiiField, { label: string; why: string }> = {
  phone: {
    label: "Phone number",
    why: "Recruiters and ATS systems retain phone numbers; they enable unwanted contact long after an application closes.",
  },
  email: {
    label: "Email address",
    why: "Personal emails are often retained and shared between recruiter databases.",
  },
  address: {
    label: "Home address",
    why: "A home address reveals where you live and is rarely needed on a modern résumé.",
  },
};

/** Which sensitive structured contact fields the parsed résumé actually contains. */
export function detectPii(resume: ResumeData): PiiField[] {
  const c = resume.contact;
  const out: PiiField[] = [];
  if (c.phone?.trim()) out.push("phone");
  if (c.email?.trim()) out.push("email");
  if (c.address?.trim()) out.push("address");
  return out;
}

interface Props {
  resume: ResumeData;
  onConfirm: (resume: ResumeData) => void;
}

/**
 * Shown after parsing an uploaded résumé when it contains structured PII.
 * Lets the user redact each field before it ever reaches the editor / PDF.
 */
export default function PiiNoticeModal({ resume, onConfirm }: Props) {
  const fields = detectPii(resume);
  const [redact, setRedact] = useState<Record<PiiField, boolean>>({
    phone: false,
    email: false,
    address: false,
  });

  function confirm() {
    const contact = { ...resume.contact };
    if (redact.phone) contact.phone = null;
    if (redact.email) contact.email = null;
    if (redact.address) contact.address = null;
    onConfirm({ ...resume, contact });
  }

  const redactCount = fields.filter((f) => redact[f]).length;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-indigo-50">
      <section className="max-w-xl w-full rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <h2 className="text-lg font-semibold text-slate-900">
              Personal information detected
            </h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your résumé contains personal details. Once a résumé enters a recruiter's ATS
            or database, this data can persist and be shared - and may put you at risk
            later. Choose what to keep. Redacted fields are removed from your résumé now,
            before the editor and the PDF.
          </p>
        </header>

        <ul className="space-y-3">
          {fields.map((f) => {
            const value = (resume.contact[f] ?? "").toString();
            return (
              <li
                key={f}
                className="rounded-xl border border-slate-200 p-3.5 space-y-2.5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">
                    {FIELD_META[f].label}
                  </span>
                  <span className="text-xs text-slate-500 truncate max-w-[55%] text-right">
                    {value}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {FIELD_META[f].why}
                </p>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  <Choice
                    active={!redact[f]}
                    onClick={() => setRedact((r) => ({ ...r, [f]: false }))}
                  >
                    Keep it
                  </Choice>
                  <Choice
                    active={redact[f]}
                    danger
                    onClick={() => setRedact((r) => ({ ...r, [f]: true }))}
                  >
                    Redact it
                  </Choice>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-500">
            {redactCount > 0
              ? `${redactCount} field${redactCount > 1 ? "s" : ""} will be removed.`
              : "Nothing will be removed."}
          </p>
          <button
            onClick={confirm}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            Continue to editor
          </button>
        </div>
      </section>
    </main>
  );
}

function Choice({
  active,
  danger,
  onClick,
  children,
}: {
  active: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeCls = danger
    ? "bg-white text-red-700 shadow-sm"
    : "bg-white text-slate-900 shadow-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition",
        active ? activeCls : "text-slate-500 hover:text-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
