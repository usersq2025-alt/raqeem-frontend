import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** In-memory guardian unlock for mock auth (server process only). */
let mockGuardianUnlocked = true;
let mockPinSet = false;

export function getMockGuardianState() {
  return {
    pin_set: mockPinSet,
    unlocked: mockGuardianUnlocked,
    pin_locked: false,
    unlock_ttl_minutes: 15,
  };
}

function mockParentLaravel(
  path: string,
  body?: unknown,
  sessionParent?: { id: number; full_name?: string | null; email?: string | null }
): NextResponse {
  if (path.includes("/parent/guardian-mode/verify-password")) {
    const password =
      body && typeof body === "object" && "password" in body
        ? String((body as { password?: unknown }).password ?? "")
        : "";
    if (!password) {
      return NextResponse.json({ message: "INVALID_CREDENTIALS", code: "INVALID_CREDENTIALS" }, { status: 422 });
    }
    mockGuardianUnlocked = true;
    return NextResponse.json({
      message: "UNLOCKED",
      unlocked: true,
      pin_set: mockPinSet,
      suggest_pin_setup: !mockPinSet,
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
    if (pin !== "1234") {
      return NextResponse.json({ message: "INVALID", code: "INVALID" }, { status: 422 });
    }
    mockGuardianUnlocked = true;
    return NextResponse.json({ message: "UNLOCKED", unlocked: true, unlock_ttl_minutes: 15 });
  }

  if (path.includes("/parent/guardian-mode/set-pin")) {
    mockPinSet = true;
    mockGuardianUnlocked = true;
    return NextResponse.json({ message: "PIN_SET", pin_set: true, unlocked: true });
  }

  if (path.includes("/parent/guardian-mode/lock")) {
    mockGuardianUnlocked = false;
    return NextResponse.json({ message: "LOCKED", unlocked: false });
  }

  if (path.includes("/parent/guardian-mode") && !path.includes("verify") && !path.includes("set-pin")) {
    return NextResponse.json(getMockGuardianState());
  }

  if (path.includes("/parent/account/change-password")) {
    return NextResponse.json({ message: "PASSWORD_UPDATED" });
  }

  if (path.includes("/parent/account")) {
    const nameFromBody =
      body && typeof body === "object" && "full_name" in body
        ? String((body as { full_name?: unknown }).full_name ?? "")
        : "";
    return NextResponse.json({
      id: sessionParent?.id ?? 1,
      public_id: "RQMP-000001",
      full_name: nameFromBody || sessionParent?.full_name || "ولي الأمر",
      email: sessionParent?.email ?? "parent@example.com",
      phone: null,
      preferred_locale: "ar",
      created_at: new Date().toISOString(),
      pin_set: mockPinSet,
      guardian_unlocked: mockGuardianUnlocked,
    });
  }

  if (path.includes("/parent/students/") && path.includes("/summary")) {
    return NextResponse.json({
      student_id: 1,
      weekly_goal_lessons: 5,
      completed_lessons_this_week: 0,
      completed_lessons_total: 0,
      total_answers: 0,
      correct_answers: 0,
      correct_rate_percent: null,
      streak_current: 0,
      streak_longest: 0,
      last_activity_date: null,
      week_start: new Date().toISOString().slice(0, 10),
      week_end: new Date().toISOString().slice(0, 10),
      most_active_subject: null,
      needs_review_subject: null,
      subjects: [],
      has_hq_started: false,
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

  if (isMockAuthEnabled()) {
    return mockParentLaravel(path, undefined, session.parent);
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

export async function parentLaravelPut(
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<NextResponse> {
  return parentLaravelWrite("PUT", path, body, timeoutMs);
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

  if (isMockAuthEnabled()) {
    return mockParentLaravel(path, body, session.parent);
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
