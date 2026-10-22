import { readDisplayJson } from "@/lib/format/displayNumerals";
import { cookies } from "next/headers";
import { asRows, mapStreak, type StudentStreak } from "@/lib/api/student";
import { mockStreak } from "@/lib/api/mockStudent";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
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

export async function loadLessonsProgress(unitId: number, studentId: number): Promise<
  Array<{ lessonId: number; title: string; status: string; sortOrder: number; stars: number | null }>
> {
  const raw = isMockAuthEnabled()
    ? [
        { lesson_id: 1, title: "Greetings & Introductions", status: "available", sort_order: 1, stars: null },
      ]
    : await laravelGet(`/units/${unitId}/lessons?student_id=${studentId}`);
  return asRows(raw).map((row) => ({
    lessonId: Number(row.lesson_id ?? row.lessonId),
    title: String(row.title ?? ""),
    status: String(row.status ?? "available"),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    stars: row.stars == null ? null : Number(row.stars),
  }));
}

export async function loadStreak(studentId: number): Promise<StudentStreak> {
  if (isMockAuthEnabled()) {
    return mapStreak(mockStreak(studentId));
  }
  const raw = (await laravelGet(`/students/${studentId}/streak`)) as Record<string, unknown> | null;
  return mapStreak(raw ?? {});
}
