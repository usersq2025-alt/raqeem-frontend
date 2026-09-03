export type LessonGift = {
  id: number;
  rewardType: string;
  pointsAmount: number;
  storeItemId: number | null;
};

export type LessonAttempt = {
  id: number;
  lessonId: number;
  lessonTitle: string | null;
  unitId: number | null;
  subjectId: number | null;
  nextLessonId: number | null;
  attemptNumber: number;
  status: string;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  answeredCount: number;
  gamesTotal: number;
  currentGameIndex: number;
  batteryRemaining: number;
  batteryTotal: number;
  currentQuestionId: number | null;
  rechargeEndsAt: string | null;
  stars: number;
  pointsEarned: number;
  gift: LessonGift | null;
};

export type PlayQuestion = {
  id: number;
  gameType: string;
  questionText: string;
  imageUrl: string | null;
  payload: Record<string, unknown>;
};

export type AnswerFeedback = {
  isCorrect: boolean;
  correctOptionId?: string | null;
  correctAnswer?: boolean | null;
  label?: string;
};

function mapGift(raw: unknown): LessonGift | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const storeId = Number(row.store_item_id ?? row.storeItemId);
  return {
    id,
    rewardType: String(row.reward_type ?? row.rewardType ?? ""),
    pointsAmount: Number(row.points_amount ?? row.pointsAmount ?? 0) || 0,
    storeItemId: Number.isFinite(storeId) && storeId > 0 ? storeId : null,
  };
}

function optionalId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function mapPlayQuestion(raw: Record<string, unknown>): PlayQuestion {
  return {
    id: Number(raw.id),
    gameType: String(raw.game_type ?? raw.gameType ?? ""),
    questionText: String(raw.question_text ?? raw.questionText ?? ""),
    imageUrl: typeof raw.image_url === "string" ? raw.image_url : typeof raw.imageUrl === "string" ? raw.imageUrl : null,
    payload: raw.payload && typeof raw.payload === "object" ? (raw.payload as Record<string, unknown>) : {},
  };
}

function mapAttempt(raw: Record<string, unknown>): LessonAttempt {
  return {
    id: Number(raw.id),
    lessonId: Number(raw.lesson_id ?? raw.lessonId),
    lessonTitle: typeof raw.lesson_title === "string" ? raw.lesson_title : null,
    unitId: optionalId(raw.unit_id ?? raw.unitId),
    subjectId: optionalId(raw.subject_id ?? raw.subjectId),
    nextLessonId: optionalId(raw.next_lesson_id ?? raw.nextLessonId),
    attemptNumber: Number(raw.attempt_number ?? raw.attemptNumber ?? 1) || 1,
    status: String(raw.status ?? ""),
    correctCount: Number(raw.correct_count ?? 0),
    wrongCount: Number(raw.wrong_count ?? 0),
    totalQuestions: Number(raw.total_questions ?? 0),
    answeredCount: Number(raw.answered_count ?? 0),
    gamesTotal: Number(raw.games_total ?? 0),
    currentGameIndex: Number(raw.current_game_index ?? 1),
    batteryRemaining: Number(raw.battery_segments_remaining ?? 0),
    batteryTotal: Number(raw.battery_segments_total ?? 3),
    currentQuestionId: raw.current_question_id == null ? null : Number(raw.current_question_id),
    rechargeEndsAt: typeof raw.recharge_ends_at === "string" ? raw.recharge_ends_at : null,
    stars: Number(raw.stars ?? 0) || 0,
    pointsEarned: Number(raw.points_earned ?? 0),
    gift: mapGift(raw.gift),
  };
}

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

export async function startLessonAttempt(lessonId: number, studentId: number): Promise<LessonAttempt> {
  const res = await fetch(`/api/lessons/${lessonId}/attempts/start`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  });
  const raw = await parse(res);
  return mapAttempt(raw);
}

export async function getCurrentQuestion(attemptId: number): Promise<PlayQuestion> {
  const res = await fetch(`/api/attempts/${attemptId}/current-question`, { credentials: "include", cache: "no-store" });
  return mapPlayQuestion(await parse(res));
}

export async function submitAnswer(
  attemptId: number,
  questionId: number,
  selectedAnswer: unknown
): Promise<{ attempt: LessonAttempt; isCorrect: boolean; feedback: Record<string, unknown> }> {
  const res = await fetch(`/api/attempts/${attemptId}/answer`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, selectedAnswer }),
  });
  const raw = await parse(res);
  const attemptRaw = (raw.attempt as Record<string, unknown>) ?? raw;
  return {
    attempt: mapAttempt(attemptRaw),
    isCorrect: Boolean(raw.is_correct),
    feedback: (raw.feedback as Record<string, unknown>) ?? {},
  };
}

export async function completeAttempt(attemptId: number): Promise<LessonAttempt> {
  const res = await fetch(`/api/attempts/${attemptId}/complete`, {
    method: "POST",
    credentials: "include",
  });
  return mapAttempt(await parse(res));
}
