import { NextResponse } from "next/server";
import { parentLaravelPatch } from "@/lib/server/parentLaravel";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPatch(`/parent/students/${studentId}/daily-goal`, body, 8_000);
}
