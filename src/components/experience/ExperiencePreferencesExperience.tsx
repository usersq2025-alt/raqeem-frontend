"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  applyExperiencePrefs,
  readExperiencePrefs,
  writeExperiencePrefs,
  type ExperiencePrefs,
  type TextSizePref,
  type ContrastPref,
} from "@/lib/experiencePrefs";
import { playUiTone } from "@/lib/play/uiSounds";

type Props = { childId: number };

export function ExperiencePreferencesExperience({ childId }: Props) {
  const t = useTranslations("experiencePrefs");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [prefs, setPrefs] = useState<ExperiencePrefs>(() => readExperiencePrefs());
  const [savedFlash, setSavedFlash] = useState(false);
  void childId;

  useEffect(() => {
    applyExperiencePrefs(prefs);
  }, [prefs]);

  function update(patch: Partial<ExperiencePrefs>) {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      writeExperiencePrefs(next);
      applyExperiencePrefs(next);
      return next;
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  }

  function setLocale(next: "ar" | "en") {
    const query = searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { locale: next });
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 md:mx-auto md:max-w-2xl">
      <header className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.35)] sm:p-6">
        <h1 className="text-2xl font-extrabold text-text-navy">{t("title")}</h1>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-text-gray sm:text-base">{t("subtitle")}</p>
        {savedFlash ? (
          <p className="mt-3 rounded-2xl bg-[#E8F8F3] px-3 py-2 text-sm font-extrabold text-[#1A7A5C]" role="status">
            {t("saved")}
          </p>
        ) : null}
      </header>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.28)]">
        <h2 className="text-lg font-extrabold text-text-navy">{t("sound.title")}</h2>
        <p className="mt-1 text-sm font-medium text-text-gray">{t("sound.lead")}</p>
        <ul className="mt-4 space-y-3">
          <ToggleRow
            label={t("sound.sfx")}
            checked={prefs.sfx}
            onChange={(sfx) => {
              update({ sfx });
              if (sfx) playUiTone("click");
            }}
          />
          <ToggleRow
            label={t("sound.celebration")}
            checked={prefs.celebration}
            onChange={(celebration) => {
              update({ celebration });
              if (celebration) playUiTone("success");
            }}
          />
        </ul>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.28)]">
        <h2 className="text-lg font-extrabold text-text-navy">{t("display.title")}</h2>
        <fieldset className="mt-4">
          <legend className="text-sm font-extrabold text-text-navy">{t("display.textSize")}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("display.textSize")}>
            {(["default", "large", "xlarge"] as TextSizePref[]).map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                className={`min-h-11 rounded-2xl px-2 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                  prefs.textSize === size
                    ? "bg-[#FFF1E4] text-primary-orange ring-2 ring-brand-gold"
                    : "bg-neutral-50 text-text-navy hover:bg-neutral-100"
                }`}
                aria-checked={prefs.textSize === size}
                aria-pressed={prefs.textSize === size}
                onClick={() => update({ textSize: size })}
              >
                {t(`display.textSize_${size}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="text-sm font-extrabold text-text-navy">{t("display.contrast")}</legend>
          <p className="mt-1 text-xs font-medium text-text-gray">{t("display.contrastHint")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("display.contrast")}>
            {(["default", "high"] as ContrastPref[]).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                className={`min-h-11 rounded-2xl text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                  prefs.contrast === c
                    ? "bg-[#FFF1E4] text-primary-orange ring-2 ring-brand-gold"
                    : "bg-neutral-50 hover:bg-neutral-100"
                }`}
                aria-checked={prefs.contrast === c}
                aria-pressed={prefs.contrast === c}
                onClick={() => update({ contrast: c })}
              >
                {t(`display.contrast_${c}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <ul className="mt-4 space-y-3">
          <ToggleRow
            label={t("display.reduceMotion")}
            checked={prefs.reduceMotion}
            onChange={(reduceMotion) => update({ reduceMotion })}
          />
        </ul>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.28)]">
        <h2 className="text-lg font-extrabold text-text-navy">{t("language.title")}</h2>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t("language.title")}>
          <button
            type="button"
            role="radio"
            aria-checked={locale.startsWith("ar")}
            className={`min-h-11 rounded-2xl px-4 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
              locale.startsWith("ar") ? "bg-[#FFF1E4] text-primary-orange" : "bg-neutral-50 hover:bg-neutral-100"
            }`}
            onClick={() => setLocale("ar")}
          >
            العربية
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={locale.startsWith("en")}
            className={`min-h-11 rounded-2xl px-4 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
              locale.startsWith("en") ? "bg-[#FFF1E4] text-primary-orange" : "bg-neutral-50 hover:bg-neutral-100"
            }`}
            onClick={() => setLocale("en")}
          >
            English
          </button>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-3 py-2">
      <span className="text-sm font-extrabold text-text-navy">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
          checked ? "bg-primary-orange" : "bg-neutral-300"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow ${checked ? "start-7" : "start-1"}`} />
      </button>
    </li>
  );
}
