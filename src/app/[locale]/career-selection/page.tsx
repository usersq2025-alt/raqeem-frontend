import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { CareerSelectionExperience } from "@/components/CareerSelectionExperience";
import { loadChild } from "@/lib/server/loadChild";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function CareerSelectionPage({ searchParams }: Props) {
  const locale = await getLocale();
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }

  const { childId: raw } = await searchParams;
  const childId = Number(raw);
  if (!Number.isFinite(childId) || childId <= 0) {
    redirect({ href: "/children", locale });
    return;
  }

  const child = await loadChild(childId);
  if (!child) {
    redirect({ href: "/children", locale });
    return;
  }

  return <CareerSelectionExperience childId={childId} gender={child.gender} />;
}
