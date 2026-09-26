import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.question_id) || !body.answer || typeof body.answer !== "object") {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPost("/parent/exhibition/answer", { question_id: body.question_id, answer: body.answer }, 10_000);
}
