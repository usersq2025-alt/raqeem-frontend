import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { hasChosenProfession, type ChildProfile } from "@/lib/api/children";
import { loadChild } from "@/lib/server/loadChild";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

export async function requireStudentChild(rawChildId?: string): Promise<ChildProfile> {
  const locale = await getLocale();
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect({ href: "/login", locale });
  }

  const childId = Number(rawChildId);
  if (!Number.isFinite(childId) || childId <= 0) {
    redirect({ href: "/children", locale });
  }

  const child = await loadChild(childId);
  if (!child) {
    redirect({ href: "/children", locale });
    throw new Error("redirect");
  }

  if (!hasChosenProfession(child)) {
    redirect({ href: `/career-selection?childId=${child.id}`, locale });
    throw new Error("redirect");
  }

  return child;
}
