import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

export default async function AccountPage() {
  const locale = await getLocale();
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }
  redirect({ href: "/family/settings", locale });
}
