import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/forms/LoginForm";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

export default async function LoginPage() {
  const locale = await getLocale();
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);

  if (session) {
    redirect({ href: "/children", locale });
    return;
  }

  const t = await getTranslations("login");

  return (
    <AuthShell backHref="/" backLabel={t("back")}>
      <h1 className="text-center text-2xl font-extrabold text-text-navy md:text-[1.7rem]">
        {t("title")}
      </h1>
      <p className="mt-2 text-center text-sm leading-6 text-text-gray">{t("subtitle")}</p>
      <LoginForm />
    </AuthShell>
  );
}
