import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPost(`/parent/students/${studentId}/weekly-report/email`, {}, 90_000);
}
