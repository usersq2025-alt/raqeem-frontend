import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { AddChildExperience } from "@/components/forms/AddChildExperience";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

export default async function AddChildPage() {
  const locale = await getLocale();
  const t = await getTranslations("child");
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect({ href: "/register", locale });
    return;
  }

  return (
    <AuthShell backHref="/children" backLabel={t("back")} alwaysShowBack>
      <AddChildExperience />
    </AuthShell>
  );
}
