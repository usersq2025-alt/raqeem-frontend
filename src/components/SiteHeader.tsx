"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LANDING_MAX_WIDTH, LANDING_NAV } from "@/config/landing";

export function SiteHeader() {
  const t = useTranslations("welcome.nav");
  const tw = useTranslations("welcome");
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-navy/8 bg-brand-cream/90 backdrop-blur-md">
      <div
        className={`mx-auto flex ${LANDING_MAX_WIDTH} items-center gap-3 px-5 py-3 sm:px-8 lg:px-10`}
      >
        <BrandLogo size="sm" />

        <nav
          className="ms-2 hidden items-center gap-0.5 lg:flex xl:gap-1"
          aria-label={t("menu")}
        >
          {LANDING_NAV.map((item) =>
            item.href.startsWith("#") ? (
              <a
                key={item.id}
                href={item.href}
                className="rounded-lg px-2 py-2 text-[0.86rem] font-bold text-brand-navy-dark/80 transition-colors hover:bg-white/70 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 xl:px-2.5 xl:text-[0.92rem]"
              >
                {t(item.id)}
              </a>
            ) : (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-lg px-2 py-2 text-[0.86rem] font-bold text-brand-navy-dark/80 transition-colors hover:bg-white/70 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 xl:px-2.5 xl:text-[0.92rem]"
              >
                {t(item.id)}
              </Link>
            )
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="hidden min-h-11 items-center justify-center rounded-full border border-brand-navy/20 bg-white px-4 text-sm font-extrabold text-brand-navy transition-colors hover:border-brand-navy hover:bg-brand-navy hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 md:inline-flex"
          >
            {tw("login")}
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-navy/20 bg-white text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? t("close") : t("menu")}
            onClick={() => setOpen((value) => !value)}
          >
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
      </div>

      {open ? (
        <div
          id={menuId}
          className="border-t border-brand-navy/8 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-sm lg:hidden"
        >
          <nav className="mx-auto flex max-w-[1200px] flex-col gap-1" aria-label={t("menu")}>
            {LANDING_NAV.map((item) =>
              item.href.startsWith("#") ? (
                <a
                  key={item.id}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-sm font-bold text-brand-navy-dark hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  onClick={() => setOpen(false)}
                >
                  {t(item.id)}
                </a>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-sm font-bold text-brand-navy-dark hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  onClick={() => setOpen(false)}
                >
                  {t(item.id)}
                </Link>
              )
            )}
            <Link
              href="/login"
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-navy px-4 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 md:hidden"
              onClick={() => setOpen(false)}
            >
              {tw("login")}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
