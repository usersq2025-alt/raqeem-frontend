"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CardShell, SectionIntro } from "./SettingsUi";

const HELP_CARDS = [
  { id: "how", href: "/family/help#how" },
  { id: "points", href: "/family/help#points" },
  { id: "hq", href: "/family/help#hq" },
  { id: "account", href: "/family/help#account" },
  { id: "faq", href: "/family/help#faq" },
] as const;

export function HelpSection() {
  const t = useTranslations("familySettings");

  return (
    <div className="space-y-4">
      <SectionIntro title={t("help.panelTitle")} description={t("help.panelLead")} />

      {HELP_CARDS.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className="block rounded-[22px] bg-neutral-50 p-4 ring-1 ring-brand-navy/5 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <p className="text-sm font-extrabold text-text-navy">{t(`help.cards.${card.id}.title`)}</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-text-gray">
            {t(`help.cards.${card.id}.body`)}
          </p>
        </Link>
      ))}

      <CardShell>
        <p className="text-sm font-extrabold text-text-navy">{t("help.contactTitle")}</p>
        <p className="mt-1 text-sm font-medium text-text-gray">{t("help.contactBody")}</p>
        <Link
          href="/contact"
          className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          {t("help.contact")}
        </Link>
      </CardShell>

      <CardShell>
        <p className="text-sm font-extrabold text-text-navy">{t("help.reportTitle")}</p>
        <p className="mt-1 text-sm font-medium text-text-gray">{t("help.reportBody")}</p>
        <Link
          href="/contact?topic=bug"
          className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy ring-1 ring-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          {t("help.report")}
        </Link>
      </CardShell>
    </div>
  );
}
