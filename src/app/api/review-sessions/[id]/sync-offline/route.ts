import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    op_id?: string;
    answers?: { question_id: number; selected_answer: unknown }[];
  } | null;
  if (!body?.op_id || !Array.isArray(body.answers)) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPost(`/review-sessions/${id}/sync-offline`, { op_id: body.op_id, answers: body.answers }, 15_000);
}
