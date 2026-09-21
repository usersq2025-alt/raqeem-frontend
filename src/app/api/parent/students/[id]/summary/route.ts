import { NextResponse } from "next/server";
import { parentLaravelGet } from "@/lib/server/parentLaravel";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isFinite(studentId) || studentId <= 0) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelGet(`/parent/students/${studentId}/summary`, 12_000);
}
