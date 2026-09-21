import { NextResponse } from "next/server";
import { parentLaravelGet, parentLaravelPatch } from "@/lib/server/parentLaravel";

export async function GET() {
  return parentLaravelGet("/parent/account", 8_000);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPatch("/parent/account", body, 8_000);
}
