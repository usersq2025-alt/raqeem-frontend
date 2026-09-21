import { NextResponse } from "next/server";
import { parentLaravelPost } from "@/lib/server/parentLaravel";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";


export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = String(body?.text ?? "").trim();
  if (text.length < 2 || text.length > 80) {
    return NextResponse.json({ approved: false, reason: "unapproved" }, { status: 422 });
  }

  if (isMockAuthEnabled()) {
    const blocked = /قتل|سلاح|sex|kill|drug/i.test(text);
    return NextResponse.json(
      blocked ? { approved: false, reason: "unapproved" } : { approved: true }
    );
  }

  return parentLaravelPost("/career/moderate-text", { text }, 20_000);
}
