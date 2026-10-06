/** Professions whose headquarters is the 3D game (static bundle in /public/hq-lab, data per profession). */
export const HQ3D_PROFESSIONS = ["doctor", "pilot"] as const;
export type Hq3dProfession = (typeof HQ3D_PROFESSIONS)[number];

export function isHq3dProfession(code: string | null | undefined): code is Hq3dProfession {
  return typeof code === "string" && (HQ3D_PROFESSIONS as readonly string[]).includes(code);
}

/** Folder (inside /public/hq-lab) holding the profession's catalog.json, models and guide art. */
export function hq3dBase(code: Hq3dProfession): string {
  return code === "doctor" ? "/hq-lab/" : `/hq-lab/${code}/`;
}

/** The game bundle is shared by all professions. */
export const HQ3D_BUNDLE = "/hq-lab/app.bundle.js";