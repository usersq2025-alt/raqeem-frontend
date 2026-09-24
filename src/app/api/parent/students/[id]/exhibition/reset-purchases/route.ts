import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isSafeInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ code: "VALIDATION" }, { status: 422 });
  }

  return parentLaravelPost(`/parent/students/${studentId}/exhibition/reset-purchases`, {}, 8_000);
}
