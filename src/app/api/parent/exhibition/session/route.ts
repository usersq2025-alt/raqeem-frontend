import { NextResponse } from "next/server";
import { parentLaravelGet, parentLaravelPost } from "@/lib/server/parentLaravel";

export async function GET() {
  return parentLaravelGet("/parent/exhibition/session", 10_000);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.profession_code !== "string" ||
    !Number.isInteger(body.grade_level) ||
    body.grade_level < 1 ||
    body.grade_level > 6
  ) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }
  return parentLaravelPost(
    "/parent/exhibition/session",
    {
      profession_code: body.profession_code,
      grade_level: body.grade_level,
      gender: body.gender === "female" ? "female" : "male",
      fresh: body.fresh === true,
    },
    15_000
  );
}