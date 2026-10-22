import { db, type GameRules, type LessonBundleCache, type LocalAttemptProgress, type OfflineBundleQuestion } from "./db";
import { enqueue, registerSyncHandler } from "./syncEngine";
import { isAnswerCorrect } from "./answerGrading";

const KIND = "lesson-sync";

function outboxId(attemptId: number): string {
  return `${KIND}:${attemptId}`;
}

interface LessonSyncPayload {
  attemptId: number;
  opId: string;
  answers: { question_id: number; selected_answer: unknown }[];
  completed: boolean;
}

// POST .../sync-offline is idempotent server-side (op_id), so a plain retry on
// reconnect is all this handler needs - see LessonAttemptController::syncOffline.
registerSyncHandler(KIND, async (item) => {
  const payload = item.payload as LessonSyncPayload;
  const response = await fetch(`/api/attempts/${payload.attemptId}/sync-offline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ op_id: payload.opId, answers: payload.answers, completed: payload.completed }),
  });
  if (!response.ok) throw new Error(`Lesson sync failed: HTTP ${response.status}`);
  await db.lessonBundles.delete(payload.attemptId);
  await db.lessonProgress.delete(payload.attemptId);
});

/**
 * Downloads the full question set + answer keys for a lesson attempt so it can be
 * solved with zero further network calls. Call this once, while still online, right
 * after starting/resuming the attempt (see decision: download the current lesson
 * first, nothing else, before any background preloading).
 *
 * `startPosition` mirrors the real attempt's current counters at download time (0 for a
 * brand new attempt; >0 when resuming one with prior online progress) - see
 * LessonBundleCache's doc comment for why this is kept instead of always starting at 0.
 */
export async function downloadLessonBundle(
  attemptId: number,
  childId: number,
  startPosition: { answeredCount: number; correctCount: number; wrongCount: number }
): Promise<LessonBundleCache> {
  const response = await fetch(`/api/attempts/${attemptId}/offline-bundle`, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to download lesson bundle: HTTP ${response.status}`);
  const data = (await response.json()) as { attempt_id: number; lesson_id: number; questions: OfflineBundleQuestion[]; rules: GameRules };
  const bundle: LessonBundleCache = {
    attemptId: data.attempt_id,
    lessonId: data.lesson_id,
    childId,
    questions: data.questions,
    rules: data.rules,
    cachedAt: Date.now(),
    startIndex: startPosition.answeredCount,
    startCorrectCount: startPosition.correctCount,
    startWrongCount: startPosition.wrongCount,
  };
  await db.lessonBundles.put(bundle);
  return bundle;
}

export function getCachedLessonBundle(attemptId: number): Promise<LessonBundleCache | undefined> {
  return db.lessonBundles.get(attemptId);
}

/**
 * Keeps a cached bundle's "resume from here" snapshot current while the attempt is
 * still being answered for real, online. Without this, a bundle downloaded once at
 * attempt-start stays frozen at its original (often 0/0/0) position - so if connectivity
 * drops only AFTER a few real online answers already landed, the local fallback would
 * replay those already-answered questions from the start and resubmit them in the sync
 * batch, double-counting them server-side. Call this after every real online answer
 * succeeds, best-effort (a cached bundle may not exist, e.g. lesson wasn't pre-downloaded).
 */
export async function updateBundleStartPosition(
  attemptId: number,
  position: { answeredCount: number; correctCount: number; wrongCount: number }
): Promise<void> {
  const bundle = await db.lessonBundles.get(attemptId);
  if (!bundle) return;
  await db.lessonBundles.update(attemptId, {
    startIndex: position.answeredCount,
    startCorrectCount: position.correctCount,
    startWrongCount: position.wrongCount,
  });
}

export function findCachedLessonBundleFor(lessonId: number, childId: number): Promise<LessonBundleCache | undefined> {
  return db.lessonBundles.where({ lessonId, childId }).first();
}

export function getLocalProgress(attemptId: number): Promise<LocalAttemptProgress | undefined> {
  return db.lessonProgress.get(attemptId);
}

/** Resumes this attempt's local progress if it already exists (the child closed the
 * app mid-lesson while offline, or a prior call already bootstrapped it), otherwise
 * starts fresh from the bundle's recorded start position. */
export async function getOrStartLocalProgress(bundle: LessonBundleCache): Promise<LocalAttemptProgress> {
  const existing = await db.lessonProgress.get(bundle.attemptId);
  if (existing) return existing;

  const progress: LocalAttemptProgress = {
    attemptId: bundle.attemptId,
    lessonId: bundle.lessonId,
    childId: bundle.childId,
    currentIndex: bundle.startIndex,
    correctCount: bundle.startCorrectCount,
    wrongCount: bundle.startWrongCount,
    totalQuestions: bundle.questions.length,
    status: "in_progress",
    answers: [],
    updatedAt: Date.now(),
  };
  await db.lessonProgress.put(progress);
  return progress;
}

/** Bootstraps local progress starting at a specific question (located by id within the
 * bundle) rather than the bundle's recorded start position - used when a question_id is
 * already known (an offline submitAnswer call) and is a more precise position hint than
 * whatever the bundle was downloaded with. A no-op if progress already exists. */
export async function getOrStartLocalProgressAt(bundle: LessonBundleCache, questionId: number): Promise<LocalAttemptProgress> {
  const existing = await db.lessonProgress.get(bundle.attemptId);
  if (existing) return existing;

  const index = bundle.questions.findIndex((q) => q.id === questionId);
  const progress: LocalAttemptProgress = {
    attemptId: bundle.attemptId,
    lessonId: bundle.lessonId,
    childId: bundle.childId,
    currentIndex: index >= 0 ? index : bundle.startIndex,
    correctCount: bundle.startCorrectCount,
    wrongCount: bundle.startWrongCount,
    totalQuestions: bundle.questions.length,
    status: "in_progress",
    answers: [],
    updatedAt: Date.now(),
  };
  await db.lessonProgress.put(progress);
  return progress;
}

export function currentLocalQuestion(bundle: LessonBundleCache, progress: LocalAttemptProgress): OfflineBundleQuestion | null {
  return bundle.questions[progress.currentIndex] ?? null;
}

/** Mirrors LessonAttemptService::submitAnswer's battery/last-question rules exactly
 * (same config values, read from bundle.rules - one source of truth, see
 * LessonAttemptController::offlineBundle). The server remains the real authority: this
 * is only for instant local feedback while offline, replayed for real on sync. */
export async function submitLocalAnswer(
  bundle: LessonBundleCache,
  progress: LocalAttemptProgress,
  selectedAnswer: unknown
): Promise<{ isCorrect: boolean; feedback: Record<string, unknown>; progress: LocalAttemptProgress }> {
  const question = currentLocalQuestion(bundle, progress);
  if (!question) throw new Error("No current question in local lesson progress");

  const isCorrect = isAnswerCorrect(question.game_type, question.payload, question.answer_key, selectedAnswer);
  const correctCount = progress.correctCount + (isCorrect ? 1 : 0);
  const wrongCount = progress.wrongCount + (isCorrect ? 0 : 1);
  const total = progress.totalQuestions;
  const wrongRatio = total > 0 ? wrongCount / total : 0;
  const answeredCount = correctCount + wrongCount;
  const isLastRemaining = total > 0 && answeredCount >= total;

  let status: LocalAttemptProgress["status"] = "in_progress";
  if (isLastRemaining) {
    status = "all_answered";
  } else if (wrongRatio >= bundle.rules.battery.depleted_at_wrong_ratio) {
    status = "battery_depleted";
  }

  const next: LocalAttemptProgress = {
    ...progress,
    currentIndex: progress.currentIndex + 1,
    correctCount,
    wrongCount,
    status,
    answers: [...progress.answers, { questionId: question.id, selectedAnswer }],
    updatedAt: Date.now(),
  };
  await db.lessonProgress.put(next);

  return { isCorrect, feedback: question.answer_key, progress: next };
}

export function batterySegmentsRemaining(bundle: LessonBundleCache, progress: LocalAttemptProgress): number {
  const total = progress.totalQuestions;
  const ratio = total > 0 ? progress.wrongCount / total : 0;
  const segments = bundle.rules.battery.total_segments;
  if (ratio >= bundle.rules.battery.depleted_at_wrong_ratio) {
    return progress.status === "battery_depleted" ? 0 : segments;
  }
  if (ratio >= bundle.rules.battery.segment_2_lost_at_wrong_ratio) return segments - 2;
  if (ratio >= bundle.rules.battery.segment_1_lost_at_wrong_ratio) return segments - 1;
  return segments;
}

export function calculateLocalStars(bundle: LessonBundleCache, progress: LocalAttemptProgress): number {
  const ratio = progress.totalQuestions > 0 ? progress.correctCount / progress.totalQuestions : 0;
  if (ratio >= bundle.rules.stars.three_star_min_ratio) return 3;
  if (ratio >= bundle.rules.stars.two_star_min_ratio) return 2;
  return 1;
}

/** Queues the whole locally-solved batch for sync and returns immediately - never
 * blocks the "lesson finished!" screen on connectivity. Safe to call again with the
 * same progress (enqueue's coalescing key is the attempt id); only the latest state is
 * ever sent. */
export async function queueLessonSync(progress: LocalAttemptProgress): Promise<void> {
  // Deterministic from content, not a timestamp (device clocks aren't trusted anywhere
  // in this design) - repeated calls for the same finished attempt reuse the same op_id.
  const payload: LessonSyncPayload = {
    attemptId: progress.attemptId,
    opId: `${progress.attemptId}:${progress.answers.length}:${progress.status}`,
    answers: progress.answers.map((a) => ({ question_id: a.questionId, selected_answer: a.selectedAnswer })),
    completed: progress.status === "all_answered",
  };
  await enqueue(outboxId(progress.attemptId), KIND, progress.childId, payload);
}
