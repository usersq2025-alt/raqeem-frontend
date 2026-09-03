import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

export default async function AccountPage() {
  const locale = await getLocale();
  const t = await getTranslations("placeholder");
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }

  return (
    <AuthShell backHref="/children" backLabel={t("back")}>
      <p className="py-8 text-center text-lg text-text-gray">{t("account")}</p>
    </AuthShell>
  );
}
