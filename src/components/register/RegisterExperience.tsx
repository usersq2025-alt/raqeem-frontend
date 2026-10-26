"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RegisterForm } from "@/components/forms/RegisterForm";

export function RegisterExperience() {
  const t = useTranslations("register");
  const locale = useLocale();
  const isRtl = locale === "ar";
  // While a code is being entered the screen has one visible title (the code step's own).
  const [codeStep, setCodeStep] = useState(false);

  return (
    <main
      data-auth-buttons
      lang={locale}
      dir={isRtl ? "rtl" : "ltr"}
      className="relative min-h-dvh overflow-x-hidden bg-background-white text-start [text-align:start]"
    >
      <div className="auth-corner-blobs pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="hero-blob hero-blob-a" />
        <span className="hero-blob hero-blob-b" />
        <span className="hero-blob hero-blob-c" />
        <span className="hero-blob hero-blob-d" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-start px-5 py-4 sm:px-6 md:max-w-none md:items-center md:justify-center md:px-6 md:py-10">
        <article className="register-form-card mx-auto w-full max-w-[440px]">
          <header className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Link
              href="/"
              className="justify-self-start flex h-10 w-10 items-center justify-center rounded-full text-text-navy transition-colors hover:bg-neutral-100"
              aria-label={t("back")}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:rotate-180" fill="none" aria-hidden="true">
                <path
                  d="M15 5 8 12l7 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <div className="flex min-w-0 justify-center overflow-hidden">
              <BrandLogo size="sm" />
            </div>
            <div className="justify-self-end">
              <LanguageSwitcher />
            </div>
          </header>

          <h1 className={codeStep ? "sr-only" : "text-start text-2xl font-extrabold leading-snug text-text-navy md:text-[1.85rem]"}>
            {t("title")}
          </h1>
          <div className="mt-3" />
          <RegisterForm onCodeStep={setCodeStep} />
        </article>
      </div>
    </main>
  );
}
