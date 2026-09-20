"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  applyExperiencePrefs,
  readExperiencePrefs,
  writeExperiencePrefs,
  type ExperiencePrefs,
  type TextSizePref,
  type ContrastPref,
} from "@/lib/experiencePrefs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
    <div className="mx-auto max-w-2xl space-y-4">
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
        <ul className="mt-4 space-y-3">
          <ToggleRow label={t("sound.sfx")} checked={prefs.sfx} onChange={(sfx) => update({ sfx })} />
          <ToggleRow label={t("sound.music")} checked={prefs.music} onChange={(music) => update({ music })} />
          <ToggleRow
            label={t("sound.celebration")}
            checked={prefs.celebration}
            onChange={(celebration) => update({ celebration })}
          />
        </ul>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.28)]">
        <h2 className="text-lg font-extrabold text-text-navy">{t("display.title")}</h2>
        <p className="mt-1 text-sm text-text-gray">{t("display.deviceNote")}</p>
        <fieldset className="mt-4">
          <legend className="text-sm font-extrabold text-text-navy">{t("display.textSize")}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["default", "large", "xlarge"] as TextSizePref[]).map((size) => (
              <button
                key={size}
                type="button"
                className={`min-h-11 rounded-2xl px-2 text-sm font-extrabold ${
                  prefs.textSize === size
                    ? "bg-[#FFF1E4] text-primary-orange ring-2 ring-brand-gold"
                    : "bg-neutral-50 text-text-navy"
                }`}
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
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["default", "high"] as ContrastPref[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`min-h-11 rounded-2xl text-sm font-extrabold ${
                  prefs.contrast === c ? "bg-[#FFF1E4] text-primary-orange" : "bg-neutral-50"
                }`}
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
        <p className="mt-1 text-sm text-text-gray">{t("language.hint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={`min-h-11 rounded-2xl px-4 text-sm font-extrabold ${
              locale.startsWith("ar") ? "bg-[#FFF1E4] text-primary-orange" : "bg-neutral-50"
            }`}
            onClick={() => setLocale("ar")}
          >
            العربية
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-2xl px-4 text-sm font-extrabold ${
              locale.startsWith("en") ? "bg-[#FFF1E4] text-primary-orange" : "bg-neutral-50"
            }`}
            onClick={() => setLocale("en")}
          >
            English
          </button>
        </div>
        <div className="mt-3">
          <LanguageSwitcher />
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.28)]">
        <h2 className="text-lg font-extrabold text-text-navy">{t("help.title")}</h2>
        <ul className="mt-3 space-y-2">
          <li>
            <Link href="/contact" className="flex min-h-11 items-center rounded-2xl bg-neutral-50 px-4 text-sm font-extrabold text-text-navy">
              {t("help.howTo")}
            </Link>
          </li>
          <li>
            <Link href="/contact" className="flex min-h-11 items-center rounded-2xl bg-neutral-50 px-4 text-sm font-extrabold text-text-navy">
              {t("help.report")}
            </Link>
            <p className="mt-1 px-1 text-xs font-medium text-text-gray">{t("help.reportHint")}</p>
          </li>
        </ul>
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
