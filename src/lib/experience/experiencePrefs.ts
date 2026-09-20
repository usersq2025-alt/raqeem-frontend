export const EXPERIENCE_PREFS_STORAGE_KEY = "raqeem:experience-prefs";

export type TextSizePref = "default" | "large" | "xlarge";
export type ContrastPref = "default" | "high";

export type ExperiencePrefs = {
  sfx: boolean;
  music: boolean;
  celebration: boolean;
  textSize: TextSizePref;
  contrast: ContrastPref;
  reduceMotion: boolean;
};

export const DEFAULT_EXPERIENCE_PREFS: ExperiencePrefs = {
  sfx: true,
  music: true,
  celebration: true,
  textSize: "default",
  contrast: "default",
  reduceMotion: false,
};

function normalize(raw: unknown): ExperiencePrefs {
  const base = { ...DEFAULT_EXPERIENCE_PREFS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  if (typeof o.sfx === "boolean") base.sfx = o.sfx;
  if (typeof o.music === "boolean") base.music = o.music;
  if (typeof o.celebration === "boolean") base.celebration = o.celebration;
  if (o.textSize === "default" || o.textSize === "large" || o.textSize === "xlarge") {
    base.textSize = o.textSize;
  }
  if (o.contrast === "default" || o.contrast === "high") base.contrast = o.contrast;
  if (typeof o.reduceMotion === "boolean") base.reduceMotion = o.reduceMotion;
  return base;
}

export function readExperiencePrefs(): ExperiencePrefs {
  if (typeof globalThis === "undefined") return { ...DEFAULT_EXPERIENCE_PREFS };
  try {
    const storage =
      typeof window !== "undefined"
        ? window.localStorage
        : (globalThis as { localStorage?: Storage }).localStorage;
    if (!storage) return { ...DEFAULT_EXPERIENCE_PREFS };
    const raw = storage.getItem(EXPERIENCE_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_EXPERIENCE_PREFS };
    return normalize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_EXPERIENCE_PREFS };
  }
}

export function writeExperiencePrefs(prefs: ExperiencePrefs): void {
  try {
    const storage =
      typeof window !== "undefined"
        ? window.localStorage
        : (globalThis as { localStorage?: Storage }).localStorage;
    if (!storage) return;
    storage.setItem(EXPERIENCE_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function applyExperiencePrefsToDocument(prefs: ExperiencePrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.raqeemTextSize = prefs.textSize;
  root.dataset.raqeemContrast = prefs.contrast;
  root.dataset.raqeemReduceMotion = prefs.reduceMotion ? "true" : "false";
}

export function isExperienceSfxEnabled(): boolean {
  return readExperiencePrefs().sfx;
}

export function isExperienceCelebrationEnabled(): boolean {
  return readExperiencePrefs().celebration;
}
