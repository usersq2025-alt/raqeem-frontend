import type { SubjectKey } from "@/lib/config/subjects";
import { SUBJECT_ACCENTS, SUBJECT_KEYS } from "@/lib/config/subjects";

export type JourneyVisualStage = "starting" | "progressing" | "near_completion" | "completed";

export type LessonPathDecoration = {
  src: string;
  x: number;
  y: number;
  width: number;
  parallax?: number;
};

export type LessonPathTheme = {
  subjectCode: SubjectKey;
  /** Temporary / short scene — production should use backgroundLongImage */
  backgroundImage?: string;
  backgroundMobileImage?: string;
  backgroundLongImage?: string;
  foregroundImage?: string;
  backgroundSize?: { width: number; height: number };
  backgroundPosition?: string;
  accentColor: string;
  pathColor: string;
  completedColor: string;
  currentColor: string;
  lockedColor: string;
  softGradient: string;
  decorations: LessonPathDecoration[];
};

const SHARED = {
  completedColor: "#34C759",
  currentColor: "#F48232",
  lockedColor: "#9AA8BC",
  pathColor: "#E8F0F8",
} as const;

function folderFor(key: SubjectKey): string {
  if (key === "math") return "mathematics";
  if (key === "social") return "social-studies";
  if (key === "religion") return "religious-education";
  return key;
}

function theme(
  subjectCode: SubjectKey,
  softGradient: string,
  extras: Partial<LessonPathTheme> = {}
): LessonPathTheme {
  return {
    subjectCode,
    accentColor: SUBJECT_ACCENTS[subjectCode],
    softGradient,
    decorations: [],
    ...SHARED,
    ...extras,
  };
}

/** Central theme registry — swap art without touching JSX. Gate WebPs are unused on-screen. */
export const LESSON_PATH_THEMES: Record<SubjectKey, LessonPathTheme> = {
  science: theme("science", "linear-gradient(180deg,#8ECFF2 0%,#B5DFF5 28%,#C8E8C0 62%,#B5D99A 100%)", {
    // Temporary 576×1024 until background-long.webp ships
    backgroundImage: "/images/lesson-path/science/background.webp",
    backgroundLongImage: "/images/lesson-path/science/background-long.webp",
    backgroundMobileImage: "/images/lesson-path/science/background-mobile.webp",
    backgroundSize: { width: 576, height: 1024 },
    backgroundPosition: "center center",
  }),
  math: theme("math", "linear-gradient(180deg,#D9F5E8 0%,#E8F8EE 40%,#F3FFF8 100%)"),
  arabic: theme("arabic", "linear-gradient(180deg,#D6E8FF 0%,#E8F3FF 42%,#F5F9FF 100%)"),
  english: theme("english", "linear-gradient(180deg,#FFE4EC 0%,#FFE8F0 45%,#FFF7FA 100%)"),
  french: theme("french", "linear-gradient(180deg,#E4DCFF 0%,#EDE7FF 45%,#F8F5FF 100%)"),
  social: theme("social", "linear-gradient(180deg,#FFE4D4 0%,#FFE9DC 45%,#FFF6F0 100%)"),
  religion: theme("religion", "linear-gradient(180deg,#FFE9B8 0%,#FFF4D6 45%,#FFFBF0 100%)"),
};

export function subjectKeyFromId(subjectId: number): SubjectKey {
  if (!Number.isFinite(subjectId) || subjectId <= 0) return "science";
  const index = (Math.trunc(subjectId) - 1) % SUBJECT_KEYS.length;
  return SUBJECT_KEYS[index < 0 ? 0 : index] ?? "science";
}

export function getLessonPathTheme(subjectId: number, accentFromApi?: string): LessonPathTheme {
  const key = subjectKeyFromId(subjectId);
  const base = LESSON_PATH_THEMES[key];
  const accent =
    typeof accentFromApi === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accentFromApi.trim())
      ? accentFromApi.trim()
      : base.accentColor;
  return { ...base, accentColor: accent };
}

/** Prefer long → mobile → short. Callers must handle missing files via onError. */
export function resolveThemeBackgroundSrc(
  theme: LessonPathTheme,
  opts: { isMobile: boolean; preferLong: boolean }
): string | undefined {
  // Only advertise long/mobile when explicitly preferred AND defined —
  // missing files must fall back in the decoration layer.
  if (opts.preferLong && theme.backgroundLongImage) return theme.backgroundLongImage;
  if (opts.isMobile && theme.backgroundMobileImage) return theme.backgroundMobileImage;
  return theme.backgroundImage;
}

/** Ordered candidates so the UI can walk down until one loads. */
export function themeBackgroundCandidates(
  theme: LessonPathTheme,
  opts: { isMobile: boolean }
): string[] {
  const list: string[] = [];
  if (theme.backgroundLongImage) list.push(theme.backgroundLongImage);
  if (opts.isMobile && theme.backgroundMobileImage) list.push(theme.backgroundMobileImage);
  if (theme.backgroundImage) list.push(theme.backgroundImage);
  return [...new Set(list)];
}

export function journeyVisualStage(completed: number, total: number): JourneyVisualStage {
  if (total <= 0) return "starting";
  if (completed >= total) return "completed";
  const ratio = completed / total;
  if (ratio <= 0.33) return "starting";
  if (ratio <= 0.66) return "progressing";
  return "near_completion";
}

export function lessonPathAssetFolders(): string[] {
  return [
    "shared",
    "science",
    "mathematics",
    "arabic",
    "english",
    "french",
    "social-studies",
    "religious-education",
  ];
}

export { folderFor };
