"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

function LanguageSwitcherControl() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("welcome");
  const query = searchParams.toString();
  const href = (query ? `${pathname}?${query}` : pathname) as typeof pathname;

  return (
    <div
      className="inline-flex min-h-11 items-center rounded-full border border-brand-navy/15 bg-white/90 p-1 text-sm font-bold shadow-sm"
      role="group"
      aria-label={t("langToggle")}
    >
      <Link
        href={href}
        locale="ar"
        className={[
          "inline-flex min-h-9 min-w-10 items-center justify-center rounded-full px-2.5 transition-colors sm:min-w-[3.25rem] sm:px-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2",
          locale === "ar"
            ? "bg-brand-navy text-white"
            : "text-brand-navy/70 hover:bg-brand-cream hover:text-brand-navy",
        ].join(" ")}
        aria-current={locale === "ar" ? "true" : undefined}
      >
        <span>{t("langAr")}</span>
      </Link>
      <span className="px-0.5 text-brand-navy/25 sm:px-1" aria-hidden="true">
        |
      </span>
      <Link
        href={href}
        locale="en"
        className={[
          "inline-flex min-h-9 min-w-10 items-center justify-center rounded-full px-2.5 transition-colors sm:min-w-[3.25rem] sm:px-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2",
          locale === "en"
            ? "bg-brand-navy text-white"
            : "text-brand-navy/70 hover:bg-brand-cream hover:text-brand-navy",
        ].join(" ")}
        aria-current={locale === "en" ? "true" : undefined}
      >
        <span>{t("langEn")}</span>
      </Link>
    </div>
  );
}

export function LanguageSwitcher() {
  return (
    <Suspense
      fallback={
        <span
          className="inline-flex h-11 w-[9.5rem] rounded-full border border-brand-navy/15 bg-white/80"
          aria-hidden="true"
        />
      }
    >
      <LanguageSwitcherControl />
    </Suspense>
  );
}
