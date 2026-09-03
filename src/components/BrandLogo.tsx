import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  size?: "sm" | "md";
};

export function BrandLogo({ size = "md" }: Props) {
  const t = useTranslations("meta");
  const heightClass =
    size === "sm"
      ? "h-12 sm:h-[3.25rem]"
      : "h-14 sm:h-16 md:h-[4.5rem]";

  return (
    <Link href="/" className="inline-flex shrink-0 items-center">
      <Image
        src="/images/brand/logo.png"
        alt={t("title")}
        width={220}
        height={140}
        priority
        className={`w-auto object-contain ${heightClass}`}
      />
    </Link>
  );
}
