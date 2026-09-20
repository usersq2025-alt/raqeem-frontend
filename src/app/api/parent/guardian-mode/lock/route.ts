import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

export async function POST() {
  return parentLaravelPost("/api/parent/guardian-mode/lock", {}, 8_000);
}
