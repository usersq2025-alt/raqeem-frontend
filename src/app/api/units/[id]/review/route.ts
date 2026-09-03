import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { parentLaravelGet } from "@/lib/server/parentLaravel";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const studentId = new URL(request.url).searchParams.get("studentId") ?? "";

  if (USE_MOCK) {
    return NextResponse.json({
      session_id: 1,
      status: "pending",
      unit_id: Number(id) || 1,
      unit_title: "Review",
      subject_id: 1,
      total_questions: 3,
      correct_count: 0,
      remaining: 3,
      points_earned: 0,
    });
  }

  return parentLaravelGet(`/units/${id}/review?student_id=${encodeURIComponent(studentId)}`, 12_000);
}
