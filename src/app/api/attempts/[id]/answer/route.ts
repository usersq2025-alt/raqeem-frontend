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
    questionId?: number;
    question_id?: number;
    selectedAnswer?: unknown;
    selected_answer?: unknown;
  } | null;
  const questionId = Number(body?.questionId ?? body?.question_id);
  const selectedAnswer = body?.selectedAnswer ?? body?.selected_answer;
  if (!Number.isFinite(questionId) || selectedAnswer === undefined) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPost(
    `/attempts/${id}/answer`,
    { question_id: questionId, selected_answer: selectedAnswer },
    15_000
  );
}
