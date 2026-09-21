"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  applyExperiencePrefs,
  writeExperiencePrefs,
  type ContrastPref,
  type ExperiencePrefs,
  type TextSizePref,
} from "@/lib/experiencePrefs";
import { CardShell, SectionIntro } from "./SettingsUi";

type Props = {
  prefs: ExperiencePrefs;
  onPrefs: (prefs: ExperiencePrefs) => void;
  onSaved: (message?: string) => void;
};

export function AppearanceSection({ prefs, onPrefs, onSaved }: Props) {
  const t = useTranslations("familySettings");

  function update(patch: Partial<ExperiencePrefs>) {
    const next = { ...prefs, ...patch };
    writeExperiencePrefs(next);
    applyExperiencePrefs(next);
    onPrefs(next);
    onSaved(t("appearance.applied"));
  }

  return (
    <div className="space-y-4">
      <SectionIntro title={t("appearance.panelTitle")} description={t("appearance.panelLead")} />
      <p className="text-xs font-semibold text-text-gray">{t("appearance.deviceNote")}</p>

      <CardShell>
        <p className="mb-2 text-sm font-extrabold text-text-navy">{t("appearance.locale")}</p>
        <LanguageSwitcher />
      </CardShell>

      <CardShell>
        <fieldset>
          <legend className="text-sm font-extrabold text-text-navy">{t("appearance.textSize")}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("appearance.textSize")}>
            {(["default", "large", "xlarge"] as TextSizePref[]).map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={prefs.textSize === size}
                className={`min-h-11 rounded-2xl text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                  prefs.textSize === size
                    ? "bg-[#FFF1E4] text-primary-orange ring-2 ring-brand-gold"
                    : "bg-white ring-1 ring-brand-navy/10 hover:bg-neutral-50"
                }`}
                onClick={() => update({ textSize: size })}
              >
                {t(`appearance.sizes.${size}`)}
              </button>
            ))}
          </div>
        </fieldset>
      </CardShell>

      <CardShell>
        <fieldset>
          <legend className="text-sm font-extrabold text-text-navy">{t("appearance.contrast")}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("appearance.contrast")}>
            {(["default", "high"] as ContrastPref[]).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={prefs.contrast === c}
                className={`min-h-11 rounded-2xl text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                  prefs.contrast === c
                    ? "bg-[#FFF1E4] text-primary-orange ring-2 ring-brand-gold"
                    : "bg-white ring-1 ring-brand-navy/10 hover:bg-neutral-50"
                }`}
                onClick={() => update({ contrast: c })}
              >
                {t(`appearance.contrastOptions.${c}`)}
              </button>
            ))}
          </div>
        </fieldset>
      </CardShell>

      <CardShell>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-text-navy">{t("appearance.reduceMotion")}</p>
            <p className="mt-1 text-xs font-medium text-text-gray">{t("appearance.reduceMotionHint")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.reduceMotion}
            aria-label={t("appearance.reduceMotion")}
            className={`relative h-8 w-14 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
              prefs.reduceMotion ? "bg-primary-orange" : "bg-neutral-300"
            }`}
            onClick={() => update({ reduceMotion: !prefs.reduceMotion })}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow ${
                prefs.reduceMotion ? "start-7" : "start-1"
              }`}
            />
          </button>
        </div>
      </CardShell>
    </div>
  );
}
