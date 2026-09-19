import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { BrandPageDecor } from "@/components/BrandPageDecor";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RAQEEM_CONTACT_EMAIL } from "@/config/landing";

export default async function ContactPage() {
  const t = await getTranslations("contactPage");

  return (
    <main className="landing-page relative min-h-screen overflow-x-hidden bg-brand-cream font-body text-brand-navy-dark">
      <BrandPageDecor density="compact" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[720px] flex-col px-5 py-6 sm:px-8">
        <header className="mb-10 flex items-center justify-between gap-3">
          <BrandLogo size="sm" />
          <LanguageSwitcher />
        </header>

        <section className="rounded-[28px] bg-white/85 p-7 shadow-[0_18px_40px_-28px_rgba(0,56,144,0.35)] ring-1 ring-brand-navy/10 sm:p-10">
          <h1 className="text-[1.85rem] font-black text-brand-navy-dark sm:text-[2.2rem]">{t("title")}</h1>
          <p className="mt-4 text-lg font-medium leading-relaxed text-brand-navy/75 sm:text-xl">
            {t("body")}
          </p>

          <div className="mt-8 rounded-[22px] bg-brand-cream px-5 py-5">
            <p className="text-sm font-bold text-brand-navy/60 sm:text-base">{t("emailLabel")}</p>
            <a
              href={`mailto:${RAQEEM_CONTACT_EMAIL}`}
              className="mt-2 inline-flex break-all text-xl font-extrabold text-brand-navy underline decoration-brand-gold decoration-2 underline-offset-4 hover:text-brand-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold sm:text-2xl"
            >
              {RAQEEM_CONTACT_EMAIL}
            </a>
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex min-h-11 items-center text-base font-bold text-brand-navy underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            {t("backHome")}
          </Link>
        </section>
      </div>
    </main>
  );
}
