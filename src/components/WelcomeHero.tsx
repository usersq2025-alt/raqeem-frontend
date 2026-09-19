"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { HeroIllustration } from "@/components/HeroIllustration";
import { LandingCta } from "@/components/landing/LandingCta";
import { BrandPageDecor } from "@/components/BrandPageDecor";
import {
  AiSection,
  FaqSection,
  FinalCtaSection,
  HowItWorksSection,
  LandingFooter,
  ProductJourneyShowcase,
  SafetySection,
  SubjectsSection,
  ValueCardsSection,
} from "@/components/landing/LandingSections";
import { LANDING_MAX_WIDTH } from "@/config/landing";

export function WelcomeHero() {
  const t = useTranslations("welcome");

  return (
    <div className="landing-page relative min-h-screen overflow-x-hidden bg-brand-cream font-body text-brand-navy-dark">
      <BrandPageDecor density="full" />
      <div className="relative z-10">
        <SiteHeader />

        <main>
          <section className="relative overflow-hidden">
            <div
              className={`mx-auto flex ${LANDING_MAX_WIDTH} flex-col px-5 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5 lg:min-h-[calc(100vh-4.5rem)] lg:justify-center lg:px-10 lg:pb-10 lg:pt-4`}
            >
              <div className="flex w-full flex-col items-center gap-5 md:flex-row md:items-center md:gap-8 lg:gap-10">
                <div className="relative z-10 flex w-full flex-col items-center text-center md:order-first md:w-[48%] md:items-start md:text-start">
                  <h1 className="font-sans text-[2.25rem] font-black leading-[1.22] tracking-tight text-brand-navy-dark sm:text-[2.65rem] md:text-[2.9rem] lg:text-[3.25rem]">
                    <span className="block whitespace-nowrap">{t("headlineLine1")}</span>
                    <span className="block whitespace-nowrap">{t("headlineLine2")}</span>
                  </h1>
                  <p className="mt-4 max-w-[36ch] text-lg font-medium leading-[1.75] text-[#334E6E] sm:text-xl md:text-[1.25rem]">
                    {t("subheadline")}
                  </p>

                  <div className="mt-6 flex w-full max-w-md flex-col items-center gap-3 md:max-w-none md:items-start">
                    <LandingCta href="/register">{t("ctaPrimary")}</LandingCta>
                    <p className="text-base font-medium text-[#334E6E] sm:text-lg">
                      {t("ctaLoginPrompt")}{" "}
                      <Link
                        href="/login"
                        className="font-extrabold text-brand-navy underline decoration-brand-gold decoration-2 underline-offset-4 transition-colors hover:text-brand-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
                      >
                        {t("ctaLogin")}
                      </Link>
                    </p>
                  </div>
                </div>

                <div className="relative z-10 w-full md:w-[52%]">
                  <HeroIllustration />
                </div>
              </div>
            </div>
          </section>

          <ValueCardsSection />
          <HowItWorksSection />
          <ProductJourneyShowcase />
          <SubjectsSection />
          <SafetySection />
          <AiSection />
          <FaqSection />
          <FinalCtaSection />
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
