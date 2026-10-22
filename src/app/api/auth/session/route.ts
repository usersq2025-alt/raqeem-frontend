import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionCookie, SESSION_COOKIE_NAME, SESSION_HINT_COOKIE_NAME, type SessionPayload } from "@/lib/auth/sessionCookie";

const MAX_AGE = 60 * 60 * 24 * 30;

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}

export async function GET() {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  return NextResponse.json({ parentId: session?.parent.id ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  const body = (await request.json()) as Partial<SessionPayload>;

  if (!body.token || !body.parent?.id) {
    return NextResponse.json({ message: "Invalid session payload" }, { status: 400 });
  }

  // Validate the bearer token and derive the parent from the API, never from client claims.
  const mock = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true" && process.env.NODE_ENV !== "production";
  if (!mock) {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return NextResponse.json({ message: "Session unavailable" }, { status: 503 });
    try {
      const check = await fetch(`${base.replace(/\/$/, "")}/parent/account`, {
        headers: { Authorization: `Bearer ${body.token}`, Accept: "application/json" },
        cache: "no-store", signal: AbortSignal.timeout(10_000),
      });
      if (!check.ok) return NextResponse.json({ message: "Invalid session" }, { status: check.status === 401 || check.status === 403 ? 401 : 503 });
      const account = await check.json();
      if (typeof account.id !== "number") return NextResponse.json({ message: "Invalid session" }, { status: 401 });
      body.parent = { id: account.id, public_id: account.public_id, full_name: account.full_name, email: account.email };
    } catch { return NextResponse.json({ message: "Session unavailable" }, { status: 503 }); }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(body), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  response.cookies.set(SESSION_HINT_COOKIE_NAME, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });

  return response;
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  const base = process.env.NEXT_PUBLIC_API_URL;
  const mock = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true" && process.env.NODE_ENV !== "production";
  if (session && !mock && base) {
    try {
      const result = await fetch(`${base.replace(/\/$/, "")}/logout`, {
        method: "POST", headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
        cache: "no-store", signal: AbortSignal.timeout(10_000),
      });
      if (!result.ok && result.status !== 401) return NextResponse.json({ message: "Unable to revoke session. Try again." }, { status: 503 });
    } catch { return NextResponse.json({ message: "Unable to revoke session. Try again." }, { status: 503 }); }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(SESSION_HINT_COOKIE_NAME, "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
