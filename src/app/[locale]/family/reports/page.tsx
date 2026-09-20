import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

export default async function FamilyReportsPage() {
  const locale = await getLocale();
  const t = await getTranslations("familySettings");
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }

  return (
    <AuthShell backHref="/children" backLabel={t("backToHub")}>
      <div className="rounded-[28px] bg-white p-6 text-center shadow-sm">
        <span className="inline-flex rounded-full bg-[#FFF1E4] px-3 py-1 text-xs font-extrabold text-primary-orange">
          {t("comingSoonBadge")}
        </span>
        <h1 className="mt-3 text-xl font-extrabold text-text-navy">{t("sections.reports")}</h1>
        <p className="mt-2 text-sm font-medium text-text-gray">{t("comingSoon")}</p>
        <p className="mt-3 text-sm font-semibold text-text-navy">{t("reportsDisclaimer")}</p>
      </div>
    </AuthShell>
  );
}
