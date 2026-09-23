import { readDisplayJson } from "@/lib/format/displayNumerals";
import { cookies } from "next/headers";
import { mapChild, type ChildProfile } from "@/lib/api/children";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function loadChild(id: number): Promise<ChildProfile | null> {
  if (isMockAuthEnabled()) {
    return {
      id,
      fullName: "طفل تجريبي",
      gradeId: 4,
      pointsBalance: 120,
      professionId: 1,
      professionCode: "doctor",
      professionNameAr: "طبيب",
      professionNameEn: "Doctor",
      gender: "female",
      weeklyGoalLessons: 5,
      lastActivityDate: null,
      streakCurrent: 3,
    };
  }

  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/students/${id}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const payload = (await readDisplayJson(response)) as Record<string, unknown> | null;
    if (!response.ok || !payload) return null;
    return mapChild(payload);
  } catch {
    return null;
  }
}
