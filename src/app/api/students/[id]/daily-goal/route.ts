import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockJourneyDashboard, type DailyGoalTarget } from "@/lib/api/journeyDashboard";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";
import { parentLaravelPut } from "@/lib/server/parentLaravel";

type Props = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session && !isMockAuthEnabled()) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { target_lessons?: unknown } | null;
  const target = Number(body?.target_lessons);

  if (isMockAuthEnabled()) {
    if (![3, 5, 7].includes(target)) {
      return NextResponse.json({ message: "Invalid target" }, { status: 422 });
    }
    const mock = mockJourneyDashboard(Number(id) || 9001);
    mock.today.targetLessons = target as DailyGoalTarget;
    mock.today.goalCompleted = mock.today.completedLessons >= target;
    mock.today.exceededBy = Math.max(0, mock.today.completedLessons - target);
    return NextResponse.json(mock);
  }

  return parentLaravelPut(`/students/${id}/daily-goal`, { target_lessons: target }, 12_000);
}
