import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MOCK_SUBJECTS } from "@/lib/api/mockStudent";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { parentLaravelGet } from "@/lib/server/parentLaravel";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";


type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (isMockAuthEnabled()) {
    return NextResponse.json(MOCK_SUBJECTS);
  }

  return parentLaravelGet(`/students/${id}/subjects`, 12_000);
}
