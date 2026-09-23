import { readDisplayJson } from "@/lib/format/displayNumerals";
import { SUBJECT_KEYS, subjectKeyFromRow, type SubjectKey } from "@/lib/config/subjects";

export type SubjectProgress = {
  subjectId: number;
  key: SubjectKey;
  nameAr: string | null;
  nameEn: string | null;
  iconUrl: string | null;
  completedLessons: number;
  totalLessons: number;
  catalogUnitCount: number;
  catalogLessonCount: number;
};

export type UnitGift = {
  id: number;
  rewardType: string;
  pointsAmount: number;
  storeItemId: number | null;
};

export type UnitLessonSummary = {
  lessonId: number;
  title: string;
  sortOrder: number;
  status: "completed" | "available" | "locked" | "coming_soon";
  stars: number | null;
};

export type UnitProgress = {
  unitId: number;
  title: string;
  coverUrl: string | null;
  iconUrl: string | null;
  sortOrder: number;
  completedLessons: number;
  totalLessons: number;
  catalogLessonCount: number;
  isPublished: boolean;
  percentage: number;
  playLessonId: number | null;
  isComplete: boolean;
  reviewSessionId: number | null;
  reviewStatus: string | null;
  reviewRemaining: number;
  gift: UnitGift | null;
  lessons: UnitLessonSummary[];
};

export type StudentBadge = {
  code: string;
  nameAr: string;
  nameEn: string;
  earnedAt: string | null;
};

export type StudentStreak = {
  streakCurrent: number;
  streakLongest: number;
  lastActivityDate: string | null;
  isActiveToday: boolean;
  activityDates: string[];
  badges: StudentBadge[];
};

export class StudentApiError extends Error {
  constructor(
    message: string,
    public readonly code: "NETWORK" | "UNAUTHENTICATED",
    public readonly status = 400
  ) {
    super(message);
    this.name = "StudentApiError";
  }
}

function isActiveToday(lastActivityDate: string | null): boolean {
  if (!lastActivityDate) return false;
  const today = new Date();
  const local = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return lastActivityDate.slice(0, 10) === local;
}

function mapSubject(row: Record<string, unknown>): SubjectProgress | null {
  const subjectId = Number(row.subject_id ?? row.subjectId ?? row.id);
  if (!Number.isFinite(subjectId)) return null;
  return {
    subjectId,
    key: subjectKeyFromRow({
      name_en: typeof row.name_en === "string" ? row.name_en : undefined,
      nameEn: typeof row.nameEn === "string" ? row.nameEn : undefined,
      sort_order: Number(row.sort_order ?? row.sortOrder),
      sortOrder: Number(row.sortOrder ?? row.sort_order),
    }),
    nameAr: typeof row.name_ar === "string" ? row.name_ar : typeof row.nameAr === "string" ? row.nameAr : null,
    nameEn: typeof row.name_en === "string" ? row.name_en : typeof row.nameEn === "string" ? row.nameEn : null,
    iconUrl: typeof row.icon_url === "string" ? row.icon_url : typeof row.iconUrl === "string" ? row.iconUrl : null,
    completedLessons: Number(row.completed_lessons ?? row.completedLessons ?? 0) || 0,
    totalLessons: Number(row.total_lessons ?? row.totalLessons ?? 0) || 0,
    catalogUnitCount: Number(row.catalog_unit_count ?? row.catalogUnitCount ?? (Number(row.total_lessons ?? row.totalLessons ?? 0) > 0 ? 1 : 0)) || 0,
    catalogLessonCount: Number(row.catalog_lesson_count ?? row.catalogLessonCount ?? row.total_lessons ?? row.totalLessons ?? 0) || 0,
  };
}

function mapUnitLesson(row: Record<string, unknown>): UnitLessonSummary | null {
  const lessonId = Number(row.lesson_id ?? row.lessonId);
  if (!Number.isFinite(lessonId) || lessonId <= 0) return null;
  const statusRaw = String(row.status ?? "locked");
  const status: UnitLessonSummary["status"] =
    statusRaw === "completed" || statusRaw === "available" || statusRaw === "coming_soon" ? statusRaw : "locked";
  const starsRaw = row.stars;
  const stars = starsRaw == null ? null : Number(starsRaw);
  return {
    lessonId,
    title: String(row.title ?? "").trim(),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0) || 0,
    status,
    stars: stars != null && Number.isFinite(stars) ? Math.max(0, Math.min(3, stars)) : null,
  };
}

function mapUnit(row: Record<string, unknown>): UnitProgress | null {
  const unitId = Number(row.unit_id ?? row.unitId ?? row.id);
  if (!Number.isFinite(unitId)) return null;
  const total = Number(row.total_lessons ?? row.totalLessons ?? 0) || 0;
  const completed = Number(row.completed_lessons ?? row.completedLessons ?? 0) || 0;
  const percentageRaw = row.percentage;
  const percentage =
    typeof percentageRaw === "number"
      ? percentageRaw
      : total > 0
        ? Math.round((completed / total) * 100)
        : 0;
  const lessonsRaw = row.lessons;
  const lessons = Array.isArray(lessonsRaw)
    ? lessonsRaw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map(mapUnitLesson)
        .filter((lesson): lesson is UnitLessonSummary => lesson !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  return {
    unitId,
    title: String(row.title ?? "").trim(),
    coverUrl: typeof row.cover_url === "string" ? row.cover_url : typeof row.coverUrl === "string" ? row.coverUrl : null,
    iconUrl: (() => {
      const icon = row.unit_icon_url ?? row.unitIconUrl ?? row.icon_url ?? row.iconUrl;
      return typeof icon === "string" && icon.trim() ? icon.trim() : null;
    })(),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0) || 0,
    completedLessons: completed,
    totalLessons: total,
    catalogLessonCount: Number(row.catalog_lesson_count ?? row.catalogLessonCount ?? lessons.length) || 0,
    isPublished: Boolean(row.is_published ?? row.isPublished ?? true),
    percentage: Math.max(0, Math.min(100, percentage)),
    playLessonId: (() => {
      const rawId = row.play_lesson_id ?? row.playLessonId;
      const id = Number(rawId);
      return Number.isFinite(id) && id > 0 ? id : null;
    })(),
    isComplete: Boolean(row.is_complete ?? row.isComplete) || (total > 0 && completed >= total),
    reviewSessionId: (() => {
      const rawId = row.review_session_id ?? row.reviewSessionId;
      const id = Number(rawId);
      return Number.isFinite(id) && id > 0 ? id : null;
    })(),
    reviewStatus: typeof row.review_status === "string" ? row.review_status : typeof row.reviewStatus === "string" ? row.reviewStatus : null,
    reviewRemaining: Number(row.review_remaining ?? row.reviewRemaining ?? 0) || 0,
    gift: mapGift(row.gift),
    lessons,
  };
}

function mapGift(raw: unknown): UnitGift | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const storeRaw = row.store_item_id ?? row.storeItemId;
  const storeId = Number(storeRaw);
  return {
    id,
    rewardType: String(row.reward_type ?? row.rewardType ?? ""),
    pointsAmount: Number(row.points_amount ?? row.pointsAmount ?? 0) || 0,
    storeItemId: Number.isFinite(storeId) && storeId > 0 ? storeId : null,
  };
}

function asRows(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return ((raw as { data: unknown[] }).data).filter(
      (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object"
    );
  }
  return [];
}

function orderSubjects(rows: SubjectProgress[]): SubjectProgress[] {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return SUBJECT_KEYS.map((key) => byKey.get(key)).filter((row): row is SubjectProgress => Boolean(row));
}

async function studentFetch(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: "include", cache: "no-store" });
  } catch {
    throw new StudentApiError("NETWORK", "NETWORK", 503);
  }
  const raw = await readDisplayJson(response);
  if (response.status === 401) {
    throw new StudentApiError("UNAUTHENTICATED", "UNAUTHENTICATED", 401);
  }
  if (!response.ok) {
    throw new StudentApiError("NETWORK", "NETWORK", response.status);
  }
  return raw;
}

export function mapStreak(raw: Record<string, unknown>): StudentStreak {
  const last =
    typeof raw.last_activity_date === "string"
      ? raw.last_activity_date
      : typeof raw.lastActivityDate === "string"
        ? raw.lastActivityDate
        : null;
  const datesRaw = raw.activity_dates ?? raw.activityDates;
  const badgesRaw = raw.badges;
  return {
    streakCurrent: Number(raw.streak_current ?? raw.streakCurrent ?? 0) || 0,
    streakLongest: Number(raw.streak_longest ?? raw.streakLongest ?? 0) || 0,
    lastActivityDate: last,
    isActiveToday: isActiveToday(last),
    activityDates: Array.isArray(datesRaw)
      ? datesRaw.map((value) => String(value).slice(0, 10)).filter(Boolean)
      : [],
    badges: Array.isArray(badgesRaw)
      ? badgesRaw
          .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
          .map((row) => ({
            code: String(row.code ?? ""),
            nameAr: String(row.name_ar ?? row.nameAr ?? ""),
            nameEn: String(row.name_en ?? row.nameEn ?? ""),
            earnedAt: typeof row.earned_at === "string" ? row.earned_at : typeof row.earnedAt === "string" ? row.earnedAt : null,
          }))
          .filter((row) => row.code)
      : [],
  };
}

export async function getSubjects(studentId: number): Promise<SubjectProgress[]> {
  const raw = await studentFetch(`/api/students/${studentId}/subjects`);
  return orderSubjects(asRows(raw).map(mapSubject).filter((row): row is SubjectProgress => row !== null));
}

export async function getUnits(subjectId: number, studentId: number): Promise<UnitProgress[]> {
  const raw = await studentFetch(`/api/subjects/${subjectId}/units?studentId=${studentId}`);
  return asRows(raw)
    .map(mapUnit)
    .filter((row): row is UnitProgress => row !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getStreak(studentId: number): Promise<StudentStreak> {
  const raw = (await studentFetch(`/api/students/${studentId}/streak`)) as Record<string, unknown>;
  return mapStreak(raw && typeof raw === "object" ? raw : {});
}

export { orderSubjects, mapSubject, mapUnit, asRows };
