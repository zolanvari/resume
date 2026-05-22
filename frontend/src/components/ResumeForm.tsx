import { useState, type ChangeEvent, type ReactNode } from "react";

import {
  type Bullet,
  type CustomSection,
  type EducationEntry,
  type ExperienceEntry,
  type ResumeData,
  type SkillGroup,
  newId,
} from "../types";
import BulletEditor from "./BulletEditor";

export type ResumeFormSection = "contact" | "experience" | "education" | "skills" | "sections";

interface Props {
  value: ResumeData;
  onChange: (next: ResumeData) => void;
  /**
   * Render only this one subsection. Omit to render the full stacked form
   * (the original behaviour). The workspace shell uses this to give each
   * sidebar tab its own focused pane.
   */
  section?: ResumeFormSection;
}

export default function ResumeForm({ value, onChange, section }: Props) {
  function patch(next: Partial<ResumeData>) {
    onChange({ ...value, ...next });
  }
  const show = (s: ResumeFormSection) => !section || section === s;
  return (
    <div className="space-y-4">
      {show("contact") && (
        <ContactSection
          value={value}
          onChange={(contact, summary) => patch({ contact, summary })}
        />
      )}
      {show("experience") && (
        <ExperienceSection
          items={value.experience}
          onChange={(experience) => patch({ experience })}
        />
      )}
      {show("education") && (
        <EducationSection
          items={value.education}
          onChange={(education) => patch({ education })}
        />
      )}
      {show("skills") && (
        <SkillsSection
          items={value.skills}
          onChange={(skills) => patch({ skills })}
        />
      )}
      {show("sections") && (
        <CustomSectionsSection
          items={value.sections}
          onChange={(sections) => patch({ sections })}
        />
      )}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────

function Section({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition group"
      >
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {typeof count === "number" && (
            <span className="text-xs text-slate-500 font-medium">{count}</span>
          )}
        </div>
        <span
          aria-hidden
          className={`text-slate-400 transition-transform group-hover:text-slate-600 ${
            open ? "" : "rotate-180"
          }`}
        >
          ⌃
        </span>
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </section>
  );
}

// ─── Contact + Summary ───────────────────────────────────────────

function ContactSection({
  value,
  onChange,
}: {
  value: ResumeData;
  onChange: (contact: ResumeData["contact"], summary: string) => void;
}) {
  const c = value.contact;
  function set<K extends keyof ResumeData["contact"]>(
    key: K,
    v: ResumeData["contact"][K],
  ) {
    onChange({ ...c, [key]: v }, value.summary ?? "");
  }
  return (
    <Section title="Contact details">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="First name" value={c.firstname} onChange={(v) => set("firstname", v)} />
        <Input label="Last name" value={c.lastname} onChange={(v) => set("lastname", v)} />
        <Input
          label="Headline / position"
          value={c.headline ?? ""}
          onChange={(v) => set("headline", v)}
          className="sm:col-span-2"
          placeholder="Senior Full-Stack Engineer"
        />
        <Input label="Email" value={c.email ?? ""} onChange={(v) => set("email", v)} />
        <Input label="Phone" value={c.phone ?? ""} onChange={(v) => set("phone", v)} />
        <Input
          label="LinkedIn (username)"
          value={c.linkedin ?? ""}
          onChange={(v) => set("linkedin", v)}
          placeholder="alex-rivera"
        />
        <Input
          label="GitHub (username)"
          value={c.github ?? ""}
          onChange={(v) => set("github", v)}
          placeholder="alex-rivera"
        />
        <Input
          label="Website"
          value={c.website ?? ""}
          onChange={(v) => set("website", v)}
          placeholder="https://…"
        />
        <Input
          label="Portfolio"
          value={c.portfolio ?? ""}
          onChange={(v) => set("portfolio", v)}
          placeholder="https://…"
        />
        <Input
          label="Address"
          value={c.address ?? ""}
          onChange={(v) => set("address", v)}
          className="sm:col-span-2"
        />
      </div>

      <FieldLabel className="mt-5">Profile summary</FieldLabel>
      <Textarea
        value={value.summary ?? ""}
        onChange={(v) => onChange(c, v)}
        rows={4}
        placeholder="A few sentences positioning what you do and what you're best at."
      />
      <p className="mt-1.5 text-xs text-slate-400">
        Tip: add a clickable link with{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-600">
          [label](https://…)
        </code>{" "}
        - works here and in any bullet.
      </p>
    </Section>
  );
}

// ─── Experience ──────────────────────────────────────────────────

function ExperienceSection({
  items,
  onChange,
}: {
  items: ExperienceEntry[];
  onChange: (next: ExperienceEntry[]) => void;
}) {
  function updateAt(i: number, patch: Partial<ExperienceEntry>) {
    onChange(items.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([
      ...items,
      { title: "", company: "", location: "", date: "", bullets: [] },
    ]);
  }
  return (
    <Section title="Experience" count={items.length}>
      <div className="space-y-4">
        {items.map((e, i) => (
          <EntryCard key={i} onDelete={() => remove(i)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Title" value={e.title} onChange={(v) => updateAt(i, { title: v })} />
              <Input
                label="Company"
                value={e.company}
                onChange={(v) => updateAt(i, { company: v })}
              />
              <Input
                label="Location"
                value={e.location}
                onChange={(v) => updateAt(i, { location: v })}
              />
              <Input
                label="Date"
                value={e.date}
                onChange={(v) => updateAt(i, { date: v })}
                placeholder="Jun 2023 - Present"
              />
            </div>
            <BulletList
              bullets={e.bullets}
              onChange={(bullets) => updateAt(i, { bullets })}
            />
          </EntryCard>
        ))}
      </div>
      <AddButton onClick={add} label="+ Add experience" />
    </Section>
  );
}

// ─── Education ───────────────────────────────────────────────────

function EducationSection({
  items,
  onChange,
}: {
  items: EducationEntry[];
  onChange: (next: EducationEntry[]) => void;
}) {
  function updateAt(i: number, patch: Partial<EducationEntry>) {
    onChange(items.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([
      ...items,
      { degree: "", institution: "", location: "", date: "", bullets: [] },
    ]);
  }
  return (
    <Section title="Education" count={items.length}>
      <div className="space-y-4">
        {items.map((e, i) => (
          <EntryCard key={i} onDelete={() => remove(i)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Degree" value={e.degree} onChange={(v) => updateAt(i, { degree: v })} />
              <Input
                label="Institution"
                value={e.institution}
                onChange={(v) => updateAt(i, { institution: v })}
              />
              <Input
                label="Location"
                value={e.location}
                onChange={(v) => updateAt(i, { location: v })}
              />
              <Input
                label="Date"
                value={e.date}
                onChange={(v) => updateAt(i, { date: v })}
                placeholder="2016 - 2018"
              />
            </div>
            <BulletList
              bullets={e.bullets}
              onChange={(bullets) => updateAt(i, { bullets })}
            />
          </EntryCard>
        ))}
      </div>
      <AddButton onClick={add} label="+ Add education" />
    </Section>
  );
}

// ─── Skills ──────────────────────────────────────────────────────

function SkillsSection({
  items,
  onChange,
}: {
  items: SkillGroup[];
  onChange: (next: SkillGroup[]) => void;
}) {
  function updateAt(i: number, patch: Partial<SkillGroup>) {
    onChange(items.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { category: "", items: [] }]);
  }
  return (
    <Section title="Skills" count={items.length}>
      <div className="space-y-3">
        {items.map((g, i) => (
          <EntryCard key={i} onDelete={() => remove(i)}>
            <Input
              label="Category (optional)"
              value={g.category}
              onChange={(v) => updateAt(i, { category: v })}
              placeholder="e.g. Languages, Frameworks, Tools"
            />
            <FieldLabel className="mt-3">Items (comma-separated)</FieldLabel>
            <Textarea
              value={g.items.join(", ")}
              onChange={(v) =>
                updateAt(i, {
                  items: v.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              rows={2}
              placeholder="Python, TypeScript, Go"
            />
          </EntryCard>
        ))}
      </div>
      <AddButton onClick={add} label="+ Add skill group" />
    </Section>
  );
}

// ─── Custom sections ────────────────────────────────────────────

function CustomSectionsSection({
  items,
  onChange,
}: {
  items: CustomSection[];
  onChange: (next: CustomSection[]) => void;
}) {
  function updateAt(i: number, patch: Partial<CustomSection>) {
    onChange(items.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { title: "", bullets: [] }]);
  }
  return (
    <Section title="Custom sections" count={items.length} defaultOpen={items.length > 0}>
      <p className="mb-3 text-xs text-slate-500">
        Add sections like Certifications, Projects, Languages, or Awards. Each one
        appears in the PDF with its own heading.
      </p>
      <div className="space-y-4">
        {items.map((s, i) => (
          <EntryCard key={i} onDelete={() => remove(i)}>
            <Input
              label="Section title"
              value={s.title}
              onChange={(v) => updateAt(i, { title: v })}
              placeholder="Certifications"
            />
            <BulletList
              bullets={s.bullets}
              onChange={(bullets) => updateAt(i, { bullets })}
            />
          </EntryCard>
        ))}
      </div>
      <AddButton onClick={add} label="+ Add section" />
    </Section>
  );
}

// ─── Bullets ─────────────────────────────────────────────────────

function BulletList({
  bullets,
  onChange,
}: {
  bullets: Bullet[];
  onChange: (next: Bullet[]) => void;
}) {
  function updateAt(i: number, text: string) {
    onChange(bullets.map((b, idx) => (idx === i ? { ...b, text } : b)));
  }
  function remove(i: number) {
    onChange(bullets.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...bullets, { id: newId(), text: "" }]);
  }
  return (
    <div className="mt-3 space-y-3">
      <FieldLabel>Bullets</FieldLabel>
      {bullets.map((b, i) => (
        <BulletEditor
          key={b.id}
          bullet={b}
          onChange={(text) => updateAt(i, text)}
          onDelete={() => remove(i)}
        />
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        + Add bullet
      </button>
    </div>
  );
}

// ─── Generic UI atoms ────────────────────────────────────────────

function FieldLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-xs font-medium uppercase tracking-wide text-slate-500 mb-1 ${
        className ?? ""
      }`}
    >
      {children}
    </p>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
      />
    </label>
  );
}

function Textarea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
    />
  );
}

function EntryCard({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) {
  return (
    <div className="relative rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <button
        type="button"
        onClick={onDelete}
        title="Delete entry"
        className="absolute top-2 right-2 text-slate-300 hover:text-red-600 transition text-lg leading-none w-6 h-6 flex items-center justify-center"
      >
        ×
      </button>
      {children}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 w-full px-3 py-2.5 text-sm rounded-lg border-2 border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition"
    >
      {label}
    </button>
  );
}
