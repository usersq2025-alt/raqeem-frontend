import Image from "next/image";
import { useTranslations } from "next-intl";

export function HeroIllustration() {
  const t = useTranslations("welcome");

  return (
    <div className="relative flex w-full flex-1 items-center justify-center py-8 md:w-[55%] md:flex-none md:py-4">
      <div className="relative w-full max-w-[420px] md:max-w-none">
        <Image
          src="/images/welcome/hero.png"
          alt={t("heroAlt")}
          width={1200}
          height={900}
          priority
          className="relative z-[1] h-auto w-full object-contain"
          sizes="(max-width: 768px) 420px, 55vw"
        />

        <div
          className="pointer-events-none absolute inset-x-[14%] bottom-[5%] z-0 h-9 rounded-[100%] bg-text-navy/12 blur-md"
          aria-hidden="true"
        />

        <Image
          src="/images/welcome/deco/gold-star.png"
          alt=""
          width={96}
          height={96}
          className="pointer-events-none absolute top-[2%] end-[10%] z-[2] h-11 w-12 animate-float-slow sm:h-[3.4rem] sm:w-[3.4rem] md:top-[0%] md:end-[14%]"
          aria-hidden="true"
        />
        <Image
          src="/images/welcome/deco/notebook.png"
          alt=""
          width={96}
          height={96}
          className="pointer-events-none absolute top-[38%] end-[-2%] z-[2] h-12 w-12 animate-float-delayed sm:h-14 sm:w-14 md:end-[-6%]"
          aria-hidden="true"
        />
        <Image
          src="/images/welcome/deco/yellow-pencil.png"
          alt=""
          width={96}
          height={96}
          className="pointer-events-none absolute bottom-[10%] start-[8%] z-[2] h-11 w-12 rotate-12 animate-float-soft sm:h-14 sm:w-14 md:bottom-[8%] md:start-[12%]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
