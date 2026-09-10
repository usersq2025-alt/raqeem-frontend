import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RocketIcon } from "@/components/ui/Button";
import { SiteHeader } from "@/components/SiteHeader";
import { HeroIllustration } from "@/components/HeroIllustration";
import { TrustRow } from "@/components/TrustRow";

const HIGHLIGHTS = [
  { key: "parent" as const, tint: "bg-orange-50", ink: "text-primary-orange" },
  { key: "iq" as const, tint: "bg-sky-50", ink: "text-sky-600" },
  { key: "games" as const, tint: "bg-violet-50", ink: "text-violet-600" },
];

export function WelcomeHero() {
  const t = useTranslations("welcome");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background-white">
      <HeroBackdrop />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 md:px-10 lg:px-16">
        <SiteHeader />

        <main className="mx-auto flex w-full flex-1 flex-col items-center md:flex-row md:items-center md:gap-8 lg:gap-12">
          <HeroIllustration />

          <section className="flex w-full flex-col items-center pb-8 text-center md:order-first md:w-[45%] md:flex-none md:items-start md:pb-0 md:text-start">
            <h1 className="max-w-[16ch] text-[2.05rem] font-extrabold leading-[1.18] tracking-tight text-text-navy sm:text-[2.45rem] md:text-[2.7rem] lg:text-[3.05rem]">
              {t("headline")}
            </h1>
            <p className="mt-3 max-w-[28ch] text-[15px] font-semibold leading-relaxed text-text-gray sm:text-base md:text-lg">
              {t("subheadline")}
            </p>

            <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-3 md:max-w-none md:items-start">
              <Link href="/register" className="hero-cta">
                <RocketIcon />
                <span>{t("ctaPrimary")}</span>
              </Link>
              <p className="text-sm font-medium text-text-gray">
                {t("ctaLoginPrompt")}{" "}
                <Link
                  href="/login"
                  className="font-extrabold text-text-navy underline decoration-primary-orange/70 underline-offset-4 transition-colors hover:text-primary-orange"
                >
                  {t("ctaLogin")}
                </Link>
              </p>
            </div>

            <TrustRow />
          </section>
        </main>

        <section className="mt-2 grid w-full gap-3 pb-8 sm:grid-cols-3 sm:gap-4 md:mt-4 md:pb-10">
          {HIGHLIGHTS.map((item) => (
            <article
              key={item.key}
              className="rounded-[22px] bg-white/80 p-4 shadow-[0_12px_32px_-20px_rgba(26,43,71,0.35)] ring-1 ring-white/80 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5"
            >
              <span className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${item.tint} ${item.ink}`}>
                <HighlightIcon name={item.key} />
              </span>
              <h2 className="text-sm font-extrabold text-text-navy sm:text-base">{t(`highlights.${item.key}.title`)}</h2>
              <p className="mt-1 text-xs font-medium leading-relaxed text-text-gray sm:text-sm">
                {t(`highlights.${item.key}.body`)}
              </p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span className="hero-blob hero-blob-a" />
      <span className="hero-blob hero-blob-b" />
      <span className="hero-blob hero-blob-c" />
      <span className="hero-blob hero-blob-d" />
      <span className="hero-blob hero-blob-e" />
    </div>
  );
}

function HighlightIcon({ name }: { name: "parent" | "iq" | "games" }) {
  if (name === "parent") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M12 3.5 19 7v5.2c0 4.4-3 7.6-7 8.8-4-1.2-7-4.4-7-8.8V7l7-3.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.2 12.2 11 14l3.8-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "iq") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M9.2 16.5h5.6M10 19h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 13.2A5.2 5.2 0 1 1 16 8.6c0 2-1.1 3.3-2.4 4.4-.7.6-1.1 1.3-1.1 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="4.5" y="6" width="15" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
