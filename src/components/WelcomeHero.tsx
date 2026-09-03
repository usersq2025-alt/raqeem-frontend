import { useTranslations } from "next-intl";
import { Button, DoorIcon, RocketIcon } from "@/components/ui/Button";
import { SiteHeader } from "@/components/SiteHeader";
import { HeroIllustration } from "@/components/HeroIllustration";
import { TrustRow } from "@/components/TrustRow";
import { PARTNER_SLOTS } from "@/config/welcome";

export function WelcomeHero() {
  const t = useTranslations("welcome");

  return (
    <div className="flex min-h-screen flex-col bg-background-white px-5 py-5 sm:px-8 md:px-10 lg:px-16">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center md:flex-row md:items-center md:gap-8 lg:gap-12">
        <HeroIllustration />

        <section className="flex w-full flex-col items-center text-center md:w-[45%] md:flex-none md:items-start md:text-start">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary-orange/70 bg-primary-orange/[0.06] px-3 py-1 text-[11px] font-semibold text-primary-orange sm:text-xs">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M8 1.4 9.7 5.2l4.1.4-3.1 2.7.9 4-3.6-2.1-3.6 2.1.9-4L2.2 5.6l4.1-.4L8 1.4Z"
                fill="#F8CD86"
                stroke="#F48232"
                strokeWidth="0.8"
              />
            </svg>
            {t("eyebrow")}
          </span>

          <h1 className="max-w-[16ch] text-[2.05rem] font-extrabold leading-[1.2] tracking-tight text-text-navy sm:text-[2.45rem] md:text-[2.7rem] lg:text-[3.05rem]">
            {t("headline")}
          </h1>
          <p className="mt-3 max-w-[34ch] text-[15px] font-medium leading-relaxed text-text-gray sm:text-base md:text-lg">
            {t("subheadline")}
          </p>

          <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-4 md:max-w-none md:items-start">
            <Button href="/register" variant="primary">
              <RocketIcon />
              <span>{t("ctaPrimary")}</span>
            </Button>
            <Button href="/login" variant="secondary">
              <DoorIcon />
              <span>{t("ctaSecondary")}</span>
            </Button>
          </div>

          <TrustRow />
        </section>
      </main>

      <footer className="mx-auto mt-4 w-full max-w-6xl pb-2 pt-4">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-gray/80 md:text-start">
          {t("trustedBy")}
        </p>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {PARTNER_SLOTS.map((slot) => (
            <div
              key={slot}
              className="h-8 rounded-lg bg-neutral-100 sm:h-10"
              aria-hidden="true"
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
