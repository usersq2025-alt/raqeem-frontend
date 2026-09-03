"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

function LanguageSwitcherLink() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("welcome");
  const nextLocale = locale === "ar" ? "en" : "ar";
  const query = searchParams.toString();
  const href = (query ? `${pathname}?${query}` : pathname) as typeof pathname;

  return (
    <Link
      href={href}
      locale={nextLocale}
      className="inline-flex items-center justify-center rounded-full border-[1.5px] border-primary-orange bg-white px-4 py-1.5 text-sm font-bold text-primary-orange transition-transform duration-200 hover:bg-primary-orange/5 active:scale-[0.97]"
    >
      {t("langToggle")}
    </Link>
  );
}

export function LanguageSwitcher() {
  return (
    <Suspense
      fallback={
        <span
          className="inline-flex h-9 w-[4.75rem] rounded-full border-[1.5px] border-primary-orange/40"
          aria-hidden="true"
        />
      }
    >
      <LanguageSwitcherLink />
    </Suspense>
  );
}
