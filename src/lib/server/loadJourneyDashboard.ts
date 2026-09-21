import { cookies } from "next/headers";
import {
  mapJourneyDashboard,
  mockJourneyDashboard,
  type JourneyDashboard,
} from "@/lib/api/journeyDashboard";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function loadJourneyDashboard(studentId: number): Promise<JourneyDashboard | null> {
  if (isMockAuthEnabled()) {
    return mockJourneyDashboard(studentId);
  }

  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/journey-dashboard`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    const raw = await response.json().catch(() => null);
    return mapJourneyDashboard(raw);
  } catch {
    return null;
  }
}
