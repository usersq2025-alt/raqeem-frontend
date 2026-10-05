import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionCookie, SESSION_COOKIE_NAME, type SessionPayload } from "@/lib/auth/sessionCookie";

const MAX_AGE = 60 * 60 * 24 * 365;

export async function GET() {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  return NextResponse.json({ parentId: session?.parent.id ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<SessionPayload>;

  if (!body.token || !body.parent?.id) {
    return NextResponse.json({ message: "Invalid session payload" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(body), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
