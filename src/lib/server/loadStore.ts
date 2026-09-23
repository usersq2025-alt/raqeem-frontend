import { readDisplayJson } from "@/lib/format/displayNumerals";
import { cookies } from "next/headers";
import { mapHeadquarters, mapStoreCatalog, type HeadquartersSceneData, type StoreCatalog } from "@/lib/api/store";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { MOCK_HEADQUARTERS, MOCK_STORE } from "@/lib/api/mockStudent";
import { isMockAuthEnabled } from "@/lib/config/useMockAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function laravelGet(path: string): Promise<unknown | null> {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    return readDisplayJson(response);
  } catch {
    return null;
  }
}

export async function loadStoreCatalog(studentId: number): Promise<StoreCatalog | null> {
  if (isMockAuthEnabled()) return mapStoreCatalog(MOCK_STORE);
  const raw = await laravelGet(`/store/items?student_id=${studentId}`);
  return raw ? mapStoreCatalog(raw) : null;
}

export async function loadHeadquarters(studentId: number): Promise<HeadquartersSceneData | null> {
  if (isMockAuthEnabled()) return mapHeadquarters(MOCK_HEADQUARTERS);
  const raw = await laravelGet(`/students/${studentId}/headquarters`);
  return raw ? mapHeadquarters(raw) : null;
}
