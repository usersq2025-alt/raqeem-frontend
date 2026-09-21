import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MOCK_UNITS } from "@/lib/api/mockStudent";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { parentLaravelGet } from "@/lib/server/parentLaravel";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";


type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const studentId = new URL(request.url).searchParams.get("studentId") ?? "";

  if (isMockAuthEnabled()) {
    return NextResponse.json(MOCK_UNITS[Number(id)] ?? MOCK_UNITS[4]);
  }

  return parentLaravelGet(`/subjects/${id}/units?student_id=${encodeURIComponent(studentId)}`, 12_000);
}
