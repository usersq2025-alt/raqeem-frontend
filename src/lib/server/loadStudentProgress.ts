import { cookies } from "next/headers";
import { asRows, mapStreak, mapSubject, mapUnit, orderSubjects, type StudentStreak, type SubjectProgress, type UnitProgress } from "@/lib/api/student";
import { mapUnitPath, type UnitPath } from "@/lib/api/units";
import { MOCK_SUBJECTS, MOCK_UNIT_PATH, MOCK_UNITS, mockStreak } from "@/lib/api/mockStudent";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";
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
    return response.json().catch(() => null);
  } catch {
    return null;
  }
}

export async function loadSubjectsProgress(studentId: number): Promise<SubjectProgress[]> {
  if (USE_MOCK) {
    return orderSubjects(MOCK_SUBJECTS.map(mapSubject).filter((row): row is SubjectProgress => row !== null));
  }
  const raw = await laravelGet(`/students/${studentId}/subjects`);
  return orderSubjects(asRows(raw).map(mapSubject).filter((row): row is SubjectProgress => row !== null));
}

export async function loadUnitsProgress(subjectId: number, studentId: number): Promise<UnitProgress[]> {
  if (USE_MOCK) {
    return asRows(MOCK_UNITS[subjectId] ?? MOCK_UNITS[4])
      .map(mapUnit)
      .filter((row): row is UnitProgress => row !== null);
  }
  const raw = await laravelGet(`/subjects/${subjectId}/units?student_id=${studentId}`);
  return asRows(raw)
    .map(mapUnit)
    .filter((row): row is UnitProgress => row !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function loadLessonsProgress(unitId: number, studentId: number): Promise<
  Array<{ lessonId: number; title: string; status: string; sortOrder: number; stars: number | null }>
> {
  const raw = USE_MOCK
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

export async function loadUnitPath(unitId: number, studentId: number): Promise<UnitPath | null> {
  if (USE_MOCK) {
    return mapUnitPath({ ...MOCK_UNIT_PATH, unit_id: unitId });
  }
  const raw = await laravelGet(`/units/${unitId}/path?student_id=${studentId}`);
  return mapUnitPath(raw);
}

export async function loadStreak(studentId: number): Promise<StudentStreak> {
  if (USE_MOCK) {
    return mapStreak(mockStreak(studentId));
  }
  const raw = (await laravelGet(`/students/${studentId}/streak`)) as Record<string, unknown> | null;
  return mapStreak(raw ?? {});
}
