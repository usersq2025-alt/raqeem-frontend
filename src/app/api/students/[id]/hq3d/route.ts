import { NextResponse } from "next/server";
import { parentLaravelGet } from "@/lib/server/parentLaravel";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  return parentLaravelGet(`/students/${id}/hq3d`, 12_000);
}
