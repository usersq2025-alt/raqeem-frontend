import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
// A trial visitor only needs the session for a day; the backend prunes the throwaway account after a few days.
const MAX_AGE = 60 * 60 * 24;

/** Public trial entry: mints a throwaway guardian+student on the API and signs this browser in as it. */
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

  try {
    const response = await fetch(`${API_BASE_URL}/public-demo/start`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        profession_code: body.profession_code,
        grade_level: body.grade_level,
        gender: body.gender === "female" ? "female" : "male",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.token || !payload?.parent?.id) {
      return NextResponse.json({ message: payload?.message ?? "FAILED", code: payload?.code }, { status: response.status || 502 });
    }

    const result = NextResponse.json({ student_id: payload.session.student_id });
    result.cookies.set(SESSION_COOKIE_NAME, JSON.stringify({ token: payload.token, parent: payload.parent }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });
    return result;
  } catch {
    return NextResponse.json({ message: "NETWORK" }, { status: 503 });
  }
}
