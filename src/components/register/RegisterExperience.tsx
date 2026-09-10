"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RegisterForm } from "@/components/forms/RegisterForm";

export function RegisterExperience() {
  const t = useTranslations("register");
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <main
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

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-8 sm:px-6 md:max-w-none md:items-center md:px-6 md:py-10">
        <article className="register-form-card mx-auto w-full max-w-[440px]">
          <header className="relative mb-6 flex items-center justify-center">
            <Link
              href="/"
              className="absolute start-0 flex h-10 w-10 items-center justify-center rounded-full text-text-navy transition-colors hover:bg-neutral-100"
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
            <BrandLogo size="sm" />
            <div className="absolute end-0">
              <LanguageSwitcher />
            </div>
          </header>

          <h1 className="text-start text-2xl font-extrabold leading-snug text-text-navy md:text-[1.85rem]">
            {t("title")}
          </h1>
          <p className="mt-2 text-start text-sm font-medium leading-relaxed text-text-gray">
            {t("subtitle")}
          </p>
          <RegisterForm />
        </article>
      </div>
    </main>
  );
}
