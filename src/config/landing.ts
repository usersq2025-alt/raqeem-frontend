import type { SubjectKey } from "@/lib/config/subjects";

export const LANDING_MAX_WIDTH = "max-w-[1200px]" as const;

export const LANDING_NAV = [
  { id: "features", href: "#features" },
  { id: "how", href: "#how" },
  { id: "ai", href: "#ai" },
  { id: "subjects", href: "#subjects" },
  { id: "faq", href: "#faq" },
  { id: "contact", href: "/contact" },
] as const;

export const LANDING_VALUE_CARDS = [
  { key: "curriculum", tint: "teal" },
  { key: "rewards", tint: "coral" },
  { key: "parent", tint: "purple" },
] as const;

export const LANDING_STEPS = [
  { key: "create", icon: "child", accent: "navy" },
  { key: "career", icon: "career", accent: "coral" },
  { key: "review", icon: "review", accent: "teal" },
  { key: "build", icon: "build", accent: "purple" },
] as const;

export const LANDING_PARENT_POINTS = [
  { key: "oneAccount" },
  { key: "childProfile" },
  { key: "progress" },
  { key: "aiReports", badge: "soon" as const },
] as const;

export const LANDING_SAFETY_POINTS = [
  { key: "linked" },
  { key: "ageFit" },
  { key: "protection" },
] as const;

export type SubjectAvailability = "available" | "comingSoon" | "inPrep";

/** All seven subjects are available in the current product phase. */
export const LANDING_SUBJECTS: ReadonlyArray<{
  key: SubjectKey;
  status: SubjectAvailability;
}> = [
  { key: "arabic", status: "available" },
  { key: "english", status: "available" },
  { key: "french", status: "available" },
  { key: "math", status: "available" },
  { key: "religion", status: "available" },
  { key: "social", status: "available" },
  { key: "science", status: "available" },
];

/** Drop PNGs into `public/images/landing/` — see README there. */
export const LANDING_SHOTS = {
  studentPath: "/images/landing/student-lesson-path.png",
  parentHub: "/images/landing/raqeem-parent-multiple-children-showcase-v2.png",
  hqBefore: "/images/headquarters/doctor/stages/stage-00-empty.png",
  hqAfter: "/images/headquarters/doctor/stages/stage-12-achievement-shelf.png",
} as const;

export const LANDING_SHOWCASE_TABS = [
  { key: "progress" as const },
  { key: "build" as const },
  { key: "parent" as const },
] as const;

export const RAQEEM_CONTACT_EMAIL = "raqeem2026@gmail.com" as const;

export const LANDING_FAQ_KEYS = [
  "what",
  "who",
  "curriculum",
  "points",
  "hq",
  "ai",
  "aiReplace",
  "childAccount",
  "free",
  "availability",
] as const;

export const LANDING_FAQ_PRIMARY_COUNT = 5;

export const LANDING_AI_REPORT_BULLETS = [
  "patterns",
  "strengths",
  "gaps",
  "tips",
] as const;

export const LANDING_AI_REPORT_PRIMARY = ["patterns", "tips"] as const;

export const LANDING_AI_REVIEW_BULLETS = [
  "focus",
  "rephrase",
  "practice",
  "curriculumTerms",
] as const;

export const LANDING_AI_REVIEW_PRIMARY = ["focus", "curriculumTerms"] as const;
