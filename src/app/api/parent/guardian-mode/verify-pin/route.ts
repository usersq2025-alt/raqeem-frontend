import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPost("/api/parent/guardian-mode/verify-pin", body, 8_000);
}
