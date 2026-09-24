import { readDisplayJson } from "@/lib/format/displayNumerals";
import type { ParentAccount } from "@/lib/api/parentAccount";

export type ChildLearningSummary = {
  studentId: number;
  weeklyGoalLessons: number;
  dailyGoalTarget: number;
  completedLessonsToday: number;
  goalDate: string;
  completedLessonsThisWeek: number;
  completedLessonsTotal: number;
  totalAnswers: number;
  correctAnswers: number;
  correctRatePercent: number | null;
  streakCurrent: number;
  streakLongest: number;
  lastActivityDate: string | null;
  weekStart: string;
  weekEnd: string;
  mostActiveSubject: SubjectSummary | null;
  needsReviewSubject: SubjectSummary | null;
  subjects: SubjectStatusRow[];
  hasHqStarted: boolean;
};

export type SubjectSummary = {
  subjectId: number;
  nameAr: string;
  nameEn: string;
  completedLessons: number;
  totalLessons: number;
};

export type SubjectStatusRow = SubjectSummary & {
  sortOrder: number;
  status: "available" | "empty" | "updating";
};

export class ParentSummaryApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ParentSummaryApiError";
  }
}

function mapSubject(raw: Record<string, unknown>): SubjectSummary {
  return {
    subjectId: Number(raw.subject_id ?? raw.subjectId),
    nameAr: String(raw.name_ar ?? raw.nameAr ?? ""),
    nameEn: String(raw.name_en ?? raw.nameEn ?? ""),
    completedLessons: Number(raw.completed_lessons ?? raw.completedLessons ?? 0) || 0,
    totalLessons: Number(raw.total_lessons ?? raw.totalLessons ?? 0) || 0,
  };
}

export function mapLearningSummary(raw: Record<string, unknown>): ChildLearningSummary {
  const most = raw.most_active_subject ?? raw.mostActiveSubject;
  const needs = raw.needs_review_subject ?? raw.needsReviewSubject;
  const subjectsRaw = Array.isArray(raw.subjects) ? raw.subjects : [];

  return {
    studentId: Number(raw.student_id ?? raw.studentId),
    weeklyGoalLessons: Number(raw.weekly_goal_lessons ?? raw.weeklyGoalLessons ?? 5) || 5,
    dailyGoalTarget: Number(raw.daily_goal_target ?? raw.dailyGoalTarget ?? 3) || 3,
    completedLessonsToday: Number(raw.completed_lessons_today ?? raw.completedLessonsToday ?? 0) || 0,
    goalDate: String(raw.goal_date ?? raw.goalDate ?? ""),
    completedLessonsThisWeek: Number(raw.completed_lessons_this_week ?? raw.completedLessonsThisWeek ?? 0) || 0,
    completedLessonsTotal: Number(raw.completed_lessons_total ?? raw.completedLessonsTotal ?? 0) || 0,
    totalAnswers: Number(raw.total_answers ?? raw.totalAnswers ?? 0) || 0,
    correctAnswers: Number(raw.correct_answers ?? raw.correctAnswers ?? 0) || 0,
    correctRatePercent:
      raw.correct_rate_percent === null || raw.correctRatePercent === null
        ? null
        : Number(raw.correct_rate_percent ?? raw.correctRatePercent),
    streakCurrent: Number(raw.streak_current ?? raw.streakCurrent ?? 0) || 0,
    streakLongest: Number(raw.streak_longest ?? raw.streakLongest ?? 0) || 0,
    lastActivityDate:
      typeof raw.last_activity_date === "string"
        ? raw.last_activity_date
        : typeof raw.lastActivityDate === "string"
          ? raw.lastActivityDate
          : null,
    weekStart: String(raw.week_start ?? raw.weekStart ?? ""),
    weekEnd: String(raw.week_end ?? raw.weekEnd ?? ""),
    mostActiveSubject:
      most && typeof most === "object" ? mapSubject(most as Record<string, unknown>) : null,
    needsReviewSubject:
      needs && typeof needs === "object" ? mapSubject(needs as Record<string, unknown>) : null,
    subjects: subjectsRaw
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
      .map((row) => ({
        ...mapSubject(row),
        sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0) || 0,
        status:
          row.status === "updating" || row.status === "empty" || row.status === "available"
            ? row.status
            : Number(row.total_lessons ?? row.totalLessons ?? 0) > 0
              ? "available"
              : "empty",
      })),
    hasHqStarted: Boolean(raw.has_hq_started ?? raw.hasHqStarted),
  };
}

export async function getChildLearningSummary(studentId: number): Promise<ChildLearningSummary> {
  const response = await fetch(`/api/parent/students/${studentId}/summary`, {
    credentials: "include",
    cache: "no-store",
  });
  const raw = (await readDisplayJson(response)) as Record<string, unknown> | null;
  if (!response.ok || !raw) {
    const code =
      (raw && typeof raw.code === "string" && raw.code) ||
      (raw && typeof raw.message === "string" && raw.message) ||
      "NETWORK";
    throw new ParentSummaryApiError(String(code), code, response.status);
  }
  return mapLearningSummary(raw);
}

export type { ParentAccount };
