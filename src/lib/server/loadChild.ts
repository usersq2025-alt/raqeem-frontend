import { cookies } from "next/headers";
import { mapChild, type ChildProfile } from "@/lib/api/children";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function loadChild(id: number): Promise<ChildProfile | null> {
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
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || !payload) return null;
    return mapChild(payload);
  } catch {
    return null;
  }
}
