import { NextResponse } from "next/server";
import { parentLaravelPatch } from "@/lib/server/parentLaravel";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isFinite(studentId) || studentId <= 0) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }

  const payload: Record<string, unknown> = {};
  if (typeof body.full_name === "string") payload.full_name = body.full_name;
  if (typeof body.fullName === "string") payload.full_name = body.fullName;
  if (typeof body.grade_id === "number") payload.grade_id = body.grade_id;
  if (typeof body.gradeId === "number") payload.grade_id = body.gradeId;

  return parentLaravelPatch(`/api/students/${studentId}`, payload, 8_000);
}
