import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { parseSessionCookie, SESSION_COOKIE_NAME, type SessionPayload } from "@/lib/auth/sessionCookie";

export async function requireParentSession(): Promise<SessionPayload> {
  const locale = await getLocale();
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect({ href: "/login", locale });
    throw new Error("redirect");
  }
  return session;
}
