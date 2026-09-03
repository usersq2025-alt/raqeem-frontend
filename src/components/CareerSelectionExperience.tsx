"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { FieldInput } from "@/components/ui/FieldInput";
import {
  CUSTOM_CAREER_ENABLED,
  CUSTOM_CAREER_MAX_ATTEMPTS,
  chooseProfession,
  generateCareerAvatar,
  moderateCareerText,
} from "@/lib/api/career";
import { type ChildGender } from "@/lib/api/children";
import type { ProfessionCode } from "@/lib/config/professions";
import { professionAvatarSrc } from "@/lib/config/professions";

const PRESETS: Array<{ id: number; code: ProfessionCode; tint: string }> = [
  { id: 1, code: "doctor", tint: "from-sky-100 to-sky-50" },
  { id: 2, code: "engineer", tint: "from-orange-100 to-amber-50" },
  { id: 3, code: "teacher", tint: "from-emerald-100 to-green-50" },
  { id: 4, code: "chef", tint: "from-yellow-100 to-amber-50" },
  { id: 5, code: "astronaut", tint: "from-violet-100 to-purple-50" },
  { id: 6, code: "soldier", tint: "from-lime-100 to-stone-100" },
];

type Step = "grid" | "custom" | "generating" | "preview";

type Props = {
  childId: number;
  gender: ChildGender;
};

function attemptsKey(childId: number) {
  return `raqeem:career-attempts:${childId}`;
}

function readAttempts(childId: number) {
  try {
    return Math.max(0, Number(sessionStorage.getItem(attemptsKey(childId)) ?? 0) || 0);
  } catch {
    return 0;
  }
}

function writeAttempts(childId: number, value: number) {
  try {
    sessionStorage.setItem(attemptsKey(childId), String(value));
  } catch {
    /* ignore */
  }
}

export function CareerSelectionExperience({ childId, gender }: Props) {
  const t = useTranslations("career");
  const router = useRouter();
  const [step, setStep] = useState<Step>("grid");
  const [customText, setCustomText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyPreset, setBusyPreset] = useState<number | null>(null);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    setAttempts(readAttempts(childId));
  }, [childId]);

  const remaining = Math.max(0, CUSTOM_CAREER_MAX_ATTEMPTS - attempts);
  const picked = PRESETS.find((preset) => preset.id === pickedId) ?? null;

  function goToWelcomeHq() {
    const navigate = () => router.replace(`/headquarters?childId=${childId}&welcome=1`);
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (doc.startViewTransition) {
      doc.startViewTransition(navigate);
    } else {
      navigate();
    }
  }

  async function confirmPreset() {
    if (pickedId == null || busyPreset != null) return;
    setBusyPreset(pickedId);
    setError(null);
    try {
      await chooseProfession(childId, pickedId);
      goToWelcomeHq();
    } catch {
      setError(t("errors.choose"));
      setBusyPreset(null);
    }
  }

  const generatingLines = useMemo(
    () => [t("generating.title"), t("generating.hint")],
    [t]
  );

  async function submitCustom() {
    const text = customText.trim();
    if (text.length < 2) {
      setError(t("errors.tooShort"));
      return;
    }
    if (remaining <= 0) {
      setError(t("errors.noAttempts"));
      return;
    }
    setError(null);
    const moderation = await moderateCareerText(text);
    if (!moderation.approved) {
      setError(t("errors.rejected"));
      return;
    }
    await runGenerate(text);
  }

  async function runGenerate(text: string) {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    writeAttempts(childId, nextAttempts);
    setStep("generating");
    setError(null);
    try {
      const result = await generateCareerAvatar(text, gender);
      setPreviewUrl(result.avatar_url);
      setPreviewLabel(text);
      setStep("preview");
    } catch {
      setError(t("errors.generate"));
      setStep("custom");
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background-white">
      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
        <div className="absolute -start-16 top-10 h-72 w-72 rounded-full bg-violet-200/45 blur-3xl" />
        <div className="absolute -end-10 top-24 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute bottom-8 start-1/3 h-64 w-64 rounded-full bg-amber-100/50 blur-3xl" />
      </div>

      {step === "generating" ? <GeneratingOverlay lines={generatingLines} /> : null}

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-5 md:max-w-6xl md:px-8 md:py-8">
        <header className="relative mb-6 flex items-center justify-center">
          <Link
            href="/children"
            className="absolute start-0 flex h-10 w-10 items-center justify-center rounded-full text-text-navy hover:bg-neutral-100"
            aria-label={t("back")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:rotate-180" fill="none" aria-hidden="true">
              <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </Link>
          <BrandLogo size="sm" />
          <div className="absolute end-0">
            <LanguageSwitcher />
          </div>
        </header>

        {step !== "preview" ? (
          <div className="md:grid md:grid-cols-[minmax(0,1fr)_18.5rem] md:items-start md:gap-8">
            <div>
            <h1 className="text-center text-2xl font-extrabold text-text-navy md:text-start md:text-[1.85rem]">
              {t("title")}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-center text-sm text-text-gray md:mx-0 md:text-start">{t("subtitle")}</p>
            <p className="mx-auto mt-1 max-w-md text-center text-xs font-bold text-primary-orange md:mx-0 md:text-start">{t("chooseHint")}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={busyPreset != null}
                  onClick={() => setPickedId(preset.id)}
                  className={`flex flex-col items-center rounded-[24px] bg-gradient-to-b px-3 pb-4 pt-4 shadow-[0_12px_28px_-20px_rgba(26,43,71,0.5)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:scale-[0.96] disabled:opacity-60 ${preset.tint} ${
                    pickedId === preset.id ? "career-preset-selected" : ""
                  }`}
                >
                  <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white/80">
                    <Image
                      src={professionAvatarSrc(preset.code, gender) ?? "/images/brand/logo.png"}
                      alt=""
                      width={200}
                      height={200}
                      unoptimized
                      className="h-[88%] w-[88%] object-contain"
                    />
                  </span>
                  <span className="mt-3 text-sm font-extrabold text-text-navy">
                    {t(`presets.${preset.code}.${gender}`)}
                  </span>
                </button>
              ))}
            </div>

            {picked ? (
              <div className="mt-5">
                <Button type="button" onClick={confirmPreset} disabled={busyPreset != null} fullWidth>
                  {t("confirmChoice")}
                </Button>
              </div>
            ) : null}

            {CUSTOM_CAREER_ENABLED ? (
              <button
                type="button"
                onClick={() => {
                  setStep("custom");
                  setError(null);
                }}
                className="career-other-card group relative mt-4 flex w-full items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-primary-orange/60 bg-white px-4 py-4 transition-[transform,background-color,border-color] hover:border-primary-orange hover:bg-orange-50/70 active:scale-[0.98]"
              >
                <span className="career-sparkles" aria-hidden="true" />
                <span className="text-xl">✨</span>
                <span className="text-base font-extrabold text-text-navy">{t("other.title")}</span>
              </button>
            ) : null}

            {step === "custom" && CUSTOM_CAREER_ENABLED ? (
              <div className="mt-5 rounded-[24px] border border-violet-100 bg-violet-50/60 p-4 md:p-5">
                <p className="text-center text-base font-extrabold text-text-navy">{t("other.prompt")}</p>
                <div className="mt-3">
                  <FieldInput
                    icon={<span className="text-sm">✨</span>}
                    value={customText}
                    onChange={(event) => setCustomText(event.target.value)}
                    placeholder={t("other.placeholder")}
                    maxLength={80}
                  />
                </div>
                <div className="mt-4">
                  <Button type="button" onClick={submitCustom} disabled={remaining <= 0}>
                    {t("other.confirm")}
                  </Button>
                </div>
              </div>
            ) : null}
            </div>
            <aside className="sticky top-8 mt-8 hidden rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.35)] md:mt-0 md:block">
              <p className="text-sm font-extrabold text-text-navy">{t("desktopTitle")}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-text-gray">{t("desktopHint")}</p>
              {picked ? (
                <div className="mt-5 flex flex-col items-center rounded-[22px] bg-[#FFF8F1] p-4">
                  <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white">
                    <Image
                      src={professionAvatarSrc(picked.code, gender) ?? "/images/brand/logo.png"}
                      alt=""
                      width={160}
                      height={160}
                      unoptimized
                      className="h-[88%] w-[88%] object-contain"
                    />
                  </span>
                  <p className="mt-3 text-sm font-extrabold text-text-navy">{t(`presets.${picked.code}.${gender}`)}</p>
                </div>
              ) : null}
            </aside>
          </div>
        ) : (
          <div className="md:mx-auto md:max-w-lg">
            <PreviewPanel
              url={previewUrl}
              label={previewLabel}
              remaining={Math.max(0, CUSTOM_CAREER_MAX_ATTEMPTS - attempts)}
              onConfirm={goToWelcomeHq}
              onRetry={() => {
                if (CUSTOM_CAREER_MAX_ATTEMPTS - attempts <= 0) {
                  setError(t("errors.noAttempts"));
                  return;
                }
                setStep("custom");
              }}
            />
          </div>
        )}

        {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}

function PreviewPanel({
  url,
  label,
  remaining,
  onConfirm,
  onRetry,
}: {
  url: string;
  label: string;
  remaining: number;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations("career");
  return (
    <div className="flex flex-1 flex-col items-center pt-4">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-text-navy">
        <span aria-hidden="true">★</span>
        {t("preview.title")}
      </h1>
      <div className="career-preview-ring mt-8 h-64 w-64 overflow-hidden rounded-full bg-white p-2 md:h-72 md:w-72">
        {/* generated URLs may be on the Laravel host — native img avoids Next image config */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="h-full w-full rounded-full object-cover" />
      </div>
      <p className="mt-4 text-lg font-extrabold text-text-navy">{label}</p>
      <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row-reverse">
        <Button type="button" onClick={onConfirm} className="sm:flex-1">
          {t("preview.confirm")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onRetry}
          disabled={remaining <= 0}
          className="sm:flex-1"
        >
          {t("preview.retry")}
        </Button>
      </div>
      <p className="mt-4 text-sm text-text-gray">{t("preview.remaining", { count: remaining })}</p>
    </div>
  );
}

function GeneratingOverlay({ lines }: { lines: string[] }) {
  return (
    <div className="career-generate-overlay fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center">
      <div className="career-silhouette" aria-hidden="true" />
      <div className="career-brush" aria-hidden="true" />
      <p className="relative mt-10 text-xl font-extrabold text-white">{lines[0]}</p>
      <p className="relative mt-2 text-sm text-white/80">{lines[1]}</p>
    </div>
  );
}
