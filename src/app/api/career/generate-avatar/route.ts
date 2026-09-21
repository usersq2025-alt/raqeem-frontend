import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";


export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: string; gender?: string } | null;
  const text = String(body?.text ?? "").trim();
  const gender = body?.gender === "female" ? "female" : "male";
  if (text.length < 2 || text.length > 80) {
    return NextResponse.json({ message: "VALIDATION" }, { status: 422 });
  }

  if (isMockAuthEnabled()) {
    await new Promise((resolve) => setTimeout(resolve, 1600));
    return NextResponse.json({
      avatar_url: `/images/professions/${gender}/astronaut.png`,
      cached: false,
      fallback: false,
    });
  }

  return parentLaravelPost("/career/generate-avatar", { text, gender }, 95_000);
}
