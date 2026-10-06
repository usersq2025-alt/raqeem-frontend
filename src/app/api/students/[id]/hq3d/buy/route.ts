import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { toolId?: unknown } | null;
  const toolId = typeof body?.toolId === "string" ? body.toolId : "";
  if (!/^\d+$/.test(id) || !/^[a-z0-9_]{1,64}$/.test(toolId)) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPost(`/students/${id}/hq3d/buy`, { tool_id: toolId }, 15_000);
}
