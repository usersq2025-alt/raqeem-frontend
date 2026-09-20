/**
 * Compatibility surface for family/student prefs.
 * Canonical storage lives in `@/lib/experience/experiencePrefs`.
 */
export {
  EXPERIENCE_PREFS_STORAGE_KEY as EXPERIENCE_PREFS_KEY,
  DEFAULT_EXPERIENCE_PREFS,
  readExperiencePrefs,
  writeExperiencePrefs,
  applyExperiencePrefsToDocument,
  isExperienceSfxEnabled,
  isExperienceCelebrationEnabled,
  type ExperiencePrefs,
  type TextSizePref,
  type ContrastPref,
} from "@/lib/experience/experiencePrefs";

import {
  applyExperiencePrefsToDocument,
  readExperiencePrefs,
  type ExperiencePrefs,
  type TextSizePref,
} from "@/lib/experience/experiencePrefs";

/** Alias used by older call sites. */
export function applyExperiencePrefs(prefs: ExperiencePrefs): void {
  applyExperiencePrefsToDocument(prefs);
}

export function effectiveReduceMotion(prefs?: ExperiencePrefs): boolean {
  const p = prefs ?? (typeof window !== "undefined" ? readExperiencePrefs() : undefined);
  if (p?.reduceMotion) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Map UI “normal” label to stored “default”. */
export function toStoredTextSize(size: "normal" | "large" | "xlarge" | TextSizePref): TextSizePref {
  if (size === "normal") return "default";
  return size;
}
