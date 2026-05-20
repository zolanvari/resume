export type Theme =
  | "aurora-violet"
  | "graphite-mist"
  | "ember-glow"
  | "midnight-prism"
  | "ivory-classique"
  | "mint-meridian"
  | "sunset-haze";

export interface ThemeInfo {
  slug: Theme;
  label: string;
  swatch: string;
  description: string;
}

export const THEMES: ThemeInfo[] = [
  {
    slug: "aurora-violet",
    label: "Aurora Violet",
    swatch: "bg-indigo-500",
    description: "Modern. Indigo accent, lilac → lavender page wash, Source Sans 3.",
  },
  {
    slug: "graphite-mist",
    label: "Graphite Mist",
    swatch: "bg-slate-500",
    description: "Editorial. Grayscale palette, subtle paper texture, italic headings.",
  },
  {
    slug: "ember-glow",
    label: "Ember Glow",
    swatch: "bg-red-600",
    description: "Bold. Red accent, warm hairlines, extra-bold section headings.",
  },
  {
    slug: "midnight-prism",
    label: "Midnight Prism",
    swatch: "bg-slate-900",
    description: "Dark mode. Slate background with bright accent text.",
  },
  {
    slug: "ivory-classique",
    label: "Ivory Classique",
    swatch: "bg-amber-700",
    description: "Traditional. Serif feel, generous spacing, ivory background.",
  },
  {
    slug: "mint-meridian",
    label: "Mint Meridian",
    swatch: "bg-emerald-500",
    description: "Fresh. Mint accent, clean rules, quiet typography.",
  },
  {
    slug: "sunset-haze",
    label: "Sunset Haze",
    swatch: "bg-orange-500",
    description: "Warm. Sunset gradient, orange accent, friendly tone.",
  },
];

export interface Contact {
  firstname: string;
  lastname: string;
  headline?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
  portfolio?: string | null;
  address?: string | null;
}

export interface Bullet {
  id: string;
  text: string;
}

export interface ExperienceEntry {
  title: string;
  company: string;
  location: string;
  date: string;
  bullets: Bullet[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  location: string;
  date: string;
  bullets: Bullet[];
}

export interface SkillGroup {
  category: string;
  items: string[];
}

/** User-defined section appended after Experience/Education/Skills. */
export interface CustomSection {
  title: string;
  bullets: Bullet[];
}

export interface ResumeData {
  contact: Contact;
  summary?: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillGroup[];
  sections: CustomSection[];
}

export interface PolishedBullet {
  bullet_id: string;
  original: string;
  rewritten: string;
  action_verb_changed: boolean;
  quantification_needed: boolean;
  weasel_words_removed: string[];
  explanation: string;
}

export type Tone = "concise" | "impact" | "leadership";

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyResume(): ResumeData {
  return {
    contact: { firstname: "", lastname: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    sections: [],
  };
}

export interface LayoutSettings {
  font_size: number;
  line_spacing: number;
  body_line_spacing: number;
  section_spacing: number;
  margin_x: number;
  header_space: number;
  footer_space: number;
  bottom_margin: number;
  title_item_spacing: number;
  item_spacing: number;
  text_align: "left" | "justify" | "right";
  text_direction: "auto" | "ltr" | "rtl";
}

/** Defaults - must match LayoutSettings in backend/app/schemas.py. */
export const DEFAULT_LAYOUT: LayoutSettings = {
  font_size: 10,
  line_spacing: 0.8,
  body_line_spacing: 0.55,
  section_spacing: 23,
  margin_x: 1.5,
  header_space: 1.7,
  footer_space: 1.5,
  bottom_margin: 0,
  title_item_spacing: 9,
  item_spacing: 9,
  text_align: "left",
  text_direction: "auto",
};
