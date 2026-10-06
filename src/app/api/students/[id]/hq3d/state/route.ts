import { NextResponse } from "next/server";
import { parentLaravelPut } from "@/lib/server/parentLaravel";

type Props = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Props) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { state?: unknown } | null;
  if (!/^\d+$/.test(id) || !body?.state || typeof body.state !== "object") {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPut(`/students/${id}/hq3d/state`, { state: body.state }, 15_000);
}
