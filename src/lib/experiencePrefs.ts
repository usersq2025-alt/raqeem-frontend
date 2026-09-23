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
  prefersReducedMotion,
  type ExperiencePrefs,
  type TextSizePref,
  type ContrastPref,
} from "@/lib/experience/experiencePrefs";

import { applyExperiencePrefsToDocument, type ExperiencePrefs } from "@/lib/experience/experiencePrefs";
import type { TextSizePref } from "@/lib/experience/experiencePrefs";

/** Alias used by older call sites. */
export function applyExperiencePrefs(prefs: ExperiencePrefs): void {
  applyExperiencePrefsToDocument(prefs);
}

/** Map UI “normal” label to stored “default”. */
export function toStoredTextSize(size: "normal" | "large" | "xlarge" | TextSizePref): TextSizePref {
  if (size === "normal") return "default";
  return size;
}
