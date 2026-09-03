import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const locale = await getLocale();
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect({ href: "/login", locale });
  }

  const { childId } = await searchParams;
  const id = Number(childId);
  if (!Number.isFinite(id) || id <= 0) {
    redirect({ href: "/children", locale });
  }

  redirect({ href: `/subjects?childId=${id}`, locale });
}
