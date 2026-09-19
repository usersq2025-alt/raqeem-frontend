import Image from "next/image";
import { useTranslations } from "next-intl";

export function HeroIllustration() {
  const t = useTranslations("welcome");

  return (
    <div className="relative flex w-full items-center justify-center">
      <div className="relative w-full max-w-[28rem] md:max-w-none">
        <Image
          src="/images/welcome/raqeem-homepage-hero-v2.png"
          alt={t("heroAlt")}
          width={1024}
          height={857}
          priority
          className="relative z-[1] h-auto w-full object-contain"
          sizes="(max-width: 768px) 90vw, 48vw"
        />
      </div>
    </div>
  );
}
