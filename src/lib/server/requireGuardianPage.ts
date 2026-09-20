import { cookies } from "next/headers";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { requireParentSession } from "@/lib/server/requireParentSession";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

export type GuardianPageContext = {
  session: Awaited<ReturnType<typeof requireParentSession>>;
  guardian: {
    pinSet: boolean;
    unlocked: boolean;
    pinLocked: boolean;
    unlockTtlMinutes: number;
  };
};

export async function requireGuardianPage(): Promise<GuardianPageContext> {
  const session = await requireParentSession();

  if (USE_MOCK) {
    return {
      session,
      guardian: {
        pinSet: false,
        unlocked: true,
        pinLocked: false,
        unlockTtlMinutes: 15,
      },
    };
  }

  const cookieStore = await cookies();
  const token = parseSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)?.token;
  if (!token) {
    return {
      session,
      guardian: { pinSet: false, unlocked: false, pinLocked: false, unlockTtlMinutes: 15 },
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/parent/guardian-mode`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || !payload) {
      return {
        session,
        guardian: { pinSet: false, unlocked: false, pinLocked: false, unlockTtlMinutes: 15 },
      };
    }
    return {
      session,
      guardian: {
        pinSet: Boolean(payload.pin_set),
        unlocked: Boolean(payload.unlocked),
        pinLocked: Boolean(payload.pin_locked),
        unlockTtlMinutes: Number(payload.unlock_ttl_minutes ?? 15) || 15,
      },
    };
  } catch {
    return {
      session,
      guardian: { pinSet: false, unlocked: false, pinLocked: false, unlockTtlMinutes: 15 },
    };
  }
}
