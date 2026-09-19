import { useTranslations } from "next-intl";
import { ShieldIcon } from "@/components/landing/LandingIcons";

export function TrustRow() {
  const t = useTranslations("welcome");

  return (
    <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-brand-navy/10 bg-white/80 px-4 py-2.5 text-start shadow-[0_8px_24px_-18px_rgba(0,56,144,0.35)]">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
        <ShieldIcon className="h-5 w-5" />
      </span>
      <p className="text-base font-bold leading-snug text-brand-navy-dark sm:text-lg">
        {t("trustLine")}
      </p>
    </div>
  );
}
