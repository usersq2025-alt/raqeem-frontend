"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NAV_LINKS = [
  { href: "/features" as const, key: "features" as const },
  { href: "/contact" as const, key: "contact" as const },
];

export function SiteHeader() {
  const t = useTranslations("welcome.nav");
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 flex items-center justify-between gap-4">
      <BrandLogo />

      <nav className="hidden items-center gap-7 md:flex" aria-label={t("menu")}>
        {NAV_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-medium text-text-gray transition-colors hover:text-text-navy"
          >
            {t(item.key)}
          </Link>
        ))}
        <LanguageSwitcher />
      </nav>

      <div className="flex items-center gap-2 md:hidden">
        <LanguageSwitcher />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-orange/40 text-text-navy"
          aria-expanded={open}
          aria-label={open ? t("close") : t("menu")}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? t("close") : t("menu")}</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            {open ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M5 7h14M5 12h14M5 17h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-full mt-2 rounded-2xl border border-primary-orange/20 bg-white p-4 shadow-lg md:hidden">
          <nav className="flex flex-col gap-3" aria-label={t("menu")}>
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-2 py-2 text-sm font-medium text-text-gray hover:bg-primary-orange/5 hover:text-text-navy"
                onClick={() => setOpen(false)}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
