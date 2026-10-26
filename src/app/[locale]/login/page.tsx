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
      <LoginForm />
    </AuthShell>
  );
}
