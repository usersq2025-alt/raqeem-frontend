"use client";

import { useTranslations } from "next-intl";
import {
  applyExperiencePrefsToDocument,
  readExperiencePrefs,
  writeExperiencePrefs,
  type ContrastPref,
  type ExperiencePrefs,
  type TextSizePref,
} from "@/lib/experience/experiencePrefs";

type Props = {
  prefs: ExperiencePrefs;
  onChange: (next: ExperiencePrefs) => void;
};

export function readAndApplyExperiencePrefs(): ExperiencePrefs {
  const prefs = readExperiencePrefs();
  applyExperiencePrefsToDocument(prefs);
  return prefs;
}

export function persistExperiencePrefs(next: ExperiencePrefs) {
  writeExperiencePrefs(next);
  applyExperiencePrefsToDocument(next);
}

export function ExperienceDisplayPrefsFields({ prefs, onChange }: Props) {
  const t = useTranslations("experiencePrefs.display");

  function patch(partial: Partial<ExperiencePrefs>) {
    const next = { ...prefs, ...partial };
    onChange(next);
    persistExperiencePrefs(next);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-text-gray">{t("deviceNote")}</p>
      <div>
        <p className="mb-2 text-sm font-extrabold text-text-navy">{t("textSize")}</p>
        <div className="flex flex-wrap gap-2">
          {(["default", "large", "xlarge"] as TextSizePref[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => patch({ textSize: size })}
              className={`rounded-2xl px-3 py-2 text-sm font-extrabold ${
                prefs.textSize === size ? "bg-primary-orange text-white" : "bg-neutral-100 text-text-navy"
              }`}
            >
              {t(`textSize_${size}`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-extrabold text-text-navy">{t("contrast")}</p>
        <div className="flex flex-wrap gap-2">
          {(["default", "high"] as ContrastPref[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => patch({ contrast: level })}
              className={`rounded-2xl px-3 py-2 text-sm font-extrabold ${
                prefs.contrast === level ? "bg-primary-orange text-white" : "bg-neutral-100 text-text-navy"
              }`}
            >
              {t(`contrast_${level}`)}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between rounded-2xl bg-neutral-50 px-3 py-3 text-sm font-semibold text-text-navy">
        <span>{t("reduceMotion")}</span>
        <input
          type="checkbox"
          checked={prefs.reduceMotion}
          onChange={(event) => patch({ reduceMotion: event.target.checked })}
          className="h-5 w-5 accent-primary-orange"
        />
      </label>
    </div>
  );
}
