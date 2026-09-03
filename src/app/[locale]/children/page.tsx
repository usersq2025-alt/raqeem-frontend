import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ChildrenHub } from "@/components/ChildrenHub";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

export default async function ChildrenPage() {
  const locale = await getLocale();
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }

  return <ChildrenHub parentName={session.parent.full_name ?? ""} />;
}
