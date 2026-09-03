import Image from "next/image";
import { useTranslations } from "next-intl";

export function HeroIllustration() {
  const t = useTranslations("welcome");

  return (
    <div className="relative flex w-full flex-1 items-center justify-center py-6 md:w-[55%] md:flex-none md:py-0">
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
          className="pointer-events-none absolute inset-x-[12%] bottom-[6%] z-0 h-8 rounded-[100%] bg-text-navy/15 blur-md"
          aria-hidden="true"
        />

        <Image
          src="/images/welcome/deco/gold-star.png"
          alt=""
          width={96}
          height={96}
          className="pointer-events-none absolute -top-1 end-[8%] z-[2] h-12 w-12 animate-float-slow sm:h-14 sm:w-14"
          aria-hidden="true"
        />
        <Image
          src="/images/welcome/deco/notebook.png"
          alt=""
          width={96}
          height={96}
          className="pointer-events-none absolute top-[18%] start-0 z-[2] h-[3.25rem] w-[3.25rem] animate-float-delayed sm:h-14 sm:w-14"
          aria-hidden="true"
        />
        <Image
          src="/images/welcome/deco/yellow-pencil.png"
          alt=""
          width={96}
          height={96}
          className="pointer-events-none absolute bottom-[22%] end-0 z-[2] h-12 w-12 animate-float-soft sm:h-14 sm:w-14"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
