"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { withChildQuery } from "@/lib/config/subjects";

type Props = {
  childId: number;
};

export function ComingSoonScreen({ childId }: Props) {
  const t = useTranslations("student");
  const tDesk = useTranslations("student.desktop");

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_19rem] md:items-start md:gap-8">
      <section className="rounded-[28px] bg-white p-6 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)] md:min-h-[22rem] md:p-8">
        <h1 className="text-2xl font-extrabold text-text-navy">{t("comingSoon")}</h1>
        <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-text-gray md:text-base">
          {tDesk("comingSoonLead")}
        </p>
        <p className="mt-2 text-sm font-semibold text-text-gray">{tDesk("comingSoonHint")}</p>
      </section>

      <aside className="mt-5 hidden rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)] md:mt-0 md:block">
        <h2 className="text-sm font-extrabold text-text-navy">{tDesk("shortcuts")}</h2>
        <ul className="mt-3 flex flex-col gap-2">
          <li>
            <Link
              href={withChildQuery("/subjects", childId)}
              className="flex rounded-2xl bg-[#FFF1E4] px-3 py-2.5 text-sm font-extrabold text-primary-orange"
            >
              {t("nav.subjects")}
            </Link>
          </li>
          <li>
            <Link
              href={withChildQuery("/store", childId)}
              className="flex rounded-2xl bg-neutral-50 px-3 py-2.5 text-sm font-extrabold text-text-navy"
            >
              {t("nav.store")}
            </Link>
          </li>
          <li>
            <Link
              href={withChildQuery("/headquarters", childId)}
              className="flex rounded-2xl bg-neutral-50 px-3 py-2.5 text-sm font-extrabold text-text-navy"
            >
              {t("nav.headquarters")}
            </Link>
          </li>
        </ul>
      </aside>
    </div>
  );
}
