"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

type Props = {
  compact?: boolean;
};

export function VerifyOtpVisualPanel({ compact = false }: Props) {
  const t = useTranslations("otp");

  return (
    <div className={`relative flex h-full flex-col overflow-hidden ${compact ? "min-h-[220px]" : "min-h-full"}`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="hero-blob hero-blob-a" />
        <span className="hero-blob hero-blob-b" />
        <span className="hero-blob hero-blob-d" />
        <span className="hero-blob hero-blob-e" />
      </div>

      <div
        className={`relative z-10 flex flex-1 flex-col items-center justify-center px-6 ${
          compact ? "py-4" : "py-10 md:px-10"
        }`}
      >
        <p className="register-speech max-w-[22rem] text-center text-sm font-bold leading-relaxed text-text-navy sm:text-[15px]">
          {t("coach")}
        </p>

        <div className={`relative w-full ${compact ? "mt-2 max-w-[220px]" : "mt-4 max-w-[420px]"}`}>
          <Image
            src="/images/welcome/otp-hero.png"
            alt={t("assistantAlt")}
            width={1200}
            height={900}
            priority
            className="relative z-[1] h-auto w-full object-contain object-bottom drop-shadow-[0_18px_28px_rgba(26,43,71,0.18)]"
            sizes={compact ? "220px" : "(max-width: 1024px) 50vw, 420px"}
          />
        </div>

        <div className="register-next-card mt-4 flex w-full max-w-[22rem] items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-lg">
            📩
          </span>
          <p className="text-sm font-extrabold leading-snug text-text-navy">{t("spamHint")}</p>
        </div>
      </div>
    </div>
  );
}
