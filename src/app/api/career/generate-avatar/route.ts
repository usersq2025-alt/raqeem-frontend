import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: string; gender?: string } | null;
  const text = String(body?.text ?? "").trim();
  const gender = body?.gender === "female" ? "female" : "male";
  if (text.length < 2 || text.length > 80) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }

  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 1600));
    return NextResponse.json({
      avatar_url: `/images/professions/${gender}/astronaut.png`,
      cached: false,
      fallback: false,
    });
  }

  return parentLaravelPost("/career/generate-avatar", { text, gender }, 95_000);
}
