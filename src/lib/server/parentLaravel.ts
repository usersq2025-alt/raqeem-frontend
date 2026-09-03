import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function parentLaravelGet(path: string, timeoutMs: number): Promise<NextResponse> {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (USE_MOCK) {
    return NextResponse.json({ mock: true }, { status: 501 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { message: "NETWORK" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "NETWORK" }, { status: 503 });
  }
}

export async function parentLaravelPost(
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<NextResponse> {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (USE_MOCK) {
    return NextResponse.json({ mock: true }, { status: 501 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { message: "NETWORK" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "NETWORK" }, { status: 503 });
  }
}
