import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { studentId?: number; student_id?: number } | null;
  const studentId = Number(body?.studentId ?? body?.student_id);
  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPost(`/lessons/${id}/attempts/start`, { student_id: studentId }, 15_000);
}
