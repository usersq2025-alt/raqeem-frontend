import { mapPlayQuestion, type PlayQuestion } from "@/lib/api/lessonPlay";

export type ReviewSummary = {
  sessionId: number;
  status: string;
  unitId: number;
  unitTitle: string;
  subjectId: number;
  totalQuestions: number;
  correctCount: number;
  remaining: number;
  pointsEarned: number;
};

async function parse(res: Response): Promise<Record<string, unknown>> {
  const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err = new Error(typeof raw?.message === "string" ? raw.message : "NETWORK") as Error & {
      status: number;
      payload: Record<string, unknown> | null;
    };
    err.status = res.status;
    err.payload = raw;
    throw err;
  }
  return raw ?? {};
}

export function mapReviewSummary(raw: Record<string, unknown>): ReviewSummary | null {
  const sessionId = Number(raw.session_id ?? raw.sessionId);
  if (!Number.isFinite(sessionId) || sessionId <= 0) return null;
  return {
    sessionId,
    status: String(raw.status ?? "pending"),
    unitId: Number(raw.unit_id ?? raw.unitId ?? 0) || 0,
    unitTitle: String(raw.unit_title ?? raw.unitTitle ?? ""),
    subjectId: Number(raw.subject_id ?? raw.subjectId ?? 0) || 0,
    totalQuestions: Number(raw.total_questions ?? raw.totalQuestions ?? 0) || 0,
    correctCount: Number(raw.correct_count ?? raw.correctCount ?? 0) || 0,
    remaining: Number(raw.remaining ?? 0) || 0,
    pointsEarned: Number(raw.points_earned ?? raw.pointsEarned ?? 0) || 0,
  };
}

export async function getUnitReview(unitId: number, studentId: number): Promise<ReviewSummary | null> {
  const res = await fetch(`/api/units/${unitId}/review?studentId=${studentId}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 404) return null;
  return mapReviewSummary(await parse(res));
}

export async function getReviewQuestion(sessionId: number): Promise<PlayQuestion> {
  const res = await fetch(`/api/review-sessions/${sessionId}/current-question`, {
    credentials: "include",
    cache: "no-store",
  });
  return mapPlayQuestion(await parse(res));
}

export async function submitReviewAnswer(
  sessionId: number,
  questionId: number,
  selectedAnswer: unknown
): Promise<{ isCorrect: boolean; remaining: number; status: string; pointsEarned: number; feedback: Record<string, unknown> }> {
  const res = await fetch(`/api/review-sessions/${sessionId}/answer`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, selectedAnswer }),
  });
  const raw = await parse(res);
  const session = raw.session && typeof raw.session === "object" ? (raw.session as Record<string, unknown>) : {};
  return {
    isCorrect: Boolean(raw.is_correct ?? raw.isCorrect),
    remaining: Number(raw.remaining ?? session.remaining ?? 0) || 0,
    status: String(session.status ?? raw.status ?? "pending"),
    pointsEarned: Number(session.points_earned ?? raw.points_earned ?? 0) || 0,
    feedback: (raw.feedback as Record<string, unknown>) ?? {},
  };
}
