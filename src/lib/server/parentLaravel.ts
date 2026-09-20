import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function mockParentLaravel(path: string, body?: unknown): NextResponse {
  if (path.includes("/parent/guardian-mode/verify-password")) {
    const password =
      body && typeof body === "object" && "password" in body
        ? String((body as { password?: unknown }).password ?? "")
        : "";
    if (!password) {
      return NextResponse.json({ message: "INVALID_CREDENTIALS", code: "INVALID_CREDENTIALS" }, { status: 422 });
    }
    return NextResponse.json({
      message: "UNLOCKED",
      unlocked: true,
      pin_set: false,
      suggest_pin_setup: true,
      unlock_ttl_minutes: 15,
    });
  }

  if (path.includes("/parent/guardian-mode/verify-pin")) {
    const pin =
      body && typeof body === "object" && "pin" in body
        ? String((body as { pin?: unknown }).pin ?? "")
        : "";
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ message: "INVALID", code: "INVALID" }, { status: 422 });
    }
    // Demo PIN for local mock: 1234
    if (pin !== "1234") {
      return NextResponse.json({ message: "INVALID", code: "INVALID" }, { status: 422 });
    }
    return NextResponse.json({ message: "UNLOCKED", unlocked: true, unlock_ttl_minutes: 15 });
  }

  if (path.includes("/parent/guardian-mode/set-pin")) {
    return NextResponse.json({ message: "PIN_SET", pin_set: true, unlocked: true });
  }

  if (path.includes("/parent/guardian-mode/lock")) {
    return NextResponse.json({ message: "LOCKED", unlocked: false });
  }

  if (path.includes("/parent/guardian-mode") && !path.includes("verify") && !path.includes("set-pin")) {
    return NextResponse.json({
      pin_set: false,
      unlocked: false,
      pin_locked: false,
      unlock_ttl_minutes: 15,
    });
  }

  if (path.includes("/parent/account/change-password")) {
    return NextResponse.json({ message: "PASSWORD_UPDATED" });
  }

  if (path.includes("/parent/account")) {
    return NextResponse.json({
      id: 1,
      public_id: "RQMP-000001",
      full_name: "ولي الأمر",
      email: "parent@example.com",
      phone: null,
      preferred_locale: "ar",
      created_at: new Date().toISOString(),
      pin_set: false,
      guardian_unlocked: true,
    });
  }

  if (path.includes("/weekly-goal")) {
    return NextResponse.json({ id: 1, weekly_goal_lessons: 5 });
  }

  if (path.includes("/students/") && body) {
    return NextResponse.json({ ...(typeof body === "object" ? body : {}), id: 1 });
  }

  return NextResponse.json({ mock: true, message: "MOCK_UNSUPPORTED" }, { status: 501 });
}

export async function parentLaravelGet(path: string, timeoutMs: number): Promise<NextResponse> {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (USE_MOCK) {
    return mockParentLaravel(path);
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
  return parentLaravelWrite("POST", path, body, timeoutMs);
}

export async function parentLaravelPatch(
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<NextResponse> {
  return parentLaravelWrite("PATCH", path, body, timeoutMs);
}

async function parentLaravelWrite(
  method: "POST" | "PATCH" | "PUT",
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<NextResponse> {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (USE_MOCK) {
    return mockParentLaravel(path, body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
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
