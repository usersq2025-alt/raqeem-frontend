import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPost(`/parent/alerts/${id}/read`, {}, 12_000);
}
