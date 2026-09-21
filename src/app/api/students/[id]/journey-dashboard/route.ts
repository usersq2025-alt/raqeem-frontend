import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockJourneyDashboard } from "@/lib/api/journeyDashboard";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";
import { parentLaravelGet } from "@/lib/server/parentLaravel";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session && !isMockAuthEnabled()) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (isMockAuthEnabled()) {
    return NextResponse.json(mockJourneyDashboard(Number(id) || 9001));
  }

  return parentLaravelGet(`/students/${id}/journey-dashboard`, 12_000);
}
