import { db, type LocalReviewProgress, type OfflineBundleQuestion, type ReviewBundleCache } from "./db";
import { enqueue, registerSyncHandler } from "./syncEngine";
import { isAnswerCorrect } from "./answerGrading";

const KIND = "review-sync";

function outboxId(sessionId: number): string {
  return `${KIND}:${sessionId}`;
}

interface ReviewSyncPayload {
  sessionId: number;
  opId: string;
  answers: { question_id: number; selected_answer: unknown }[];
}

// POST .../sync-offline is idempotent server-side (op_id), so a plain retry on
// reconnect is all this handler needs - see ReviewStationController::syncOffline.
registerSyncHandler(KIND, async (item) => {
  const payload = item.payload as ReviewSyncPayload;
  const response = await fetch(`/api/review-sessions/${payload.sessionId}/sync-offline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ op_id: payload.opId, answers: payload.answers }),
  });
  if (!response.ok) throw new Error(`Review sync failed: HTTP ${response.status}`);
  await db.reviewBundles.delete(payload.sessionId);
  await db.reviewProgress.delete(payload.sessionId);
});

/** Downloads every not-yet-correct question in this review session so it can be solved
 * with zero further network calls. Call this once, while still online, right after a
 * successful getUnitReview() (mirrors downloadLessonBundle - see its doc comment). */
export async function downloadReviewBundle(sessionId: number, unitId: number, childId: number): Promise<ReviewBundleCache> {
  const response = await fetch(`/api/review-sessions/${sessionId}/offline-bundle`, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to download review bundle: HTTP ${response.status}`);
  const data = (await response.json()) as { session_id: number; unit_id: number; questions: OfflineBundleQuestion[] };
  const bundle: ReviewBundleCache = {
    sessionId: data.session_id,
    unitId: data.unit_id,
    childId,
    questions: data.questions,
    cachedAt: Date.now(),
  };
  await db.reviewBundles.put(bundle);
  return bundle;
}

export function getCachedReviewBundle(sessionId: number): Promise<ReviewBundleCache | undefined> {
  return db.reviewBundles.get(sessionId);
}

/**
 * Keeps a cached bundle's question list current while the session is still being
 * answered for real, online - mirrors updateBundleStartPosition's reasoning in
 * lessonOffline.ts. Without this, a bundle downloaded once would keep re-serving a
 * question the child already answered correctly online, and later resubmit it in the
 * sync batch. Call this after every real online answer that comes back correct
 * (an incorrect one stays "current" server-side too, so the bundle doesn't change).
 */
export async function markReviewQuestionResolved(sessionId: number, questionId: number): Promise<void> {
  const bundle = await db.reviewBundles.get(sessionId);
  if (!bundle) return;
  await db.reviewBundles.update(sessionId, {
    questions: bundle.questions.filter((q) => q.id !== questionId),
  });
}

export function findCachedReviewBundleFor(unitId: number, childId: number): Promise<ReviewBundleCache | undefined> {
  return db.reviewBundles.where({ unitId, childId }).first();
}

export function getLocalReviewProgress(sessionId: number): Promise<LocalReviewProgress | undefined> {
  return db.reviewProgress.get(sessionId);
}

export async function getOrStartLocalReviewProgress(bundle: ReviewBundleCache): Promise<LocalReviewProgress> {
  const existing = await db.reviewProgress.get(bundle.sessionId);
  if (existing) return existing;

  const progress: LocalReviewProgress = {
    sessionId: bundle.sessionId,
    unitId: bundle.unitId,
    childId: bundle.childId,
    remainingIds: bundle.questions.map((q) => q.id),
    totalQuestions: bundle.questions.length,
    correctCount: 0,
    status: bundle.questions.length === 0 ? "completed" : "in_progress",
    answers: [],
    updatedAt: Date.now(),
  };
  await db.reviewProgress.put(progress);
  return progress;
}

export function currentLocalReviewQuestion(bundle: ReviewBundleCache, progress: LocalReviewProgress): OfflineBundleQuestion | null {
  const nextId = progress.remainingIds[0];
  if (nextId === undefined) return null;
  return bundle.questions.find((q) => q.id === nextId) ?? null;
}

/** Mirrors ReviewStationService::submitAnswer's retry-until-correct rule: a wrong
 * answer leaves the question's id at the front of remainingIds (presented again next),
 * a correct one removes it. The server remains the real authority: this is only for
 * instant local feedback while offline, replayed for real on sync. */
export async function submitLocalReviewAnswer(
  bundle: ReviewBundleCache,
  progress: LocalReviewProgress,
  selectedAnswer: unknown
): Promise<{ isCorrect: boolean; feedback: Record<string, unknown>; progress: LocalReviewProgress }> {
  const question = currentLocalReviewQuestion(bundle, progress);
  if (!question) throw new Error("No current question in local review progress");

  const isCorrect = isAnswerCorrect(question.game_type, question.payload, question.answer_key, selectedAnswer);
  const remainingIds = isCorrect ? progress.remainingIds.slice(1) : progress.remainingIds;

  const next: LocalReviewProgress = {
    ...progress,
    remainingIds,
    correctCount: progress.correctCount + (isCorrect ? 1 : 0),
    status: remainingIds.length === 0 ? "completed" : "in_progress",
    answers: [...progress.answers, { questionId: question.id, selectedAnswer }],
    updatedAt: Date.now(),
  };
  await db.reviewProgress.put(next);

  return { isCorrect, feedback: question.answer_key, progress: next };
}

/** Queues the whole locally-solved batch for sync and returns immediately - never
 * blocks the "review finished!" screen on connectivity. Safe to call again with the
 * same progress (enqueue's coalescing key is the session id); only the latest state is
 * ever sent. */
export async function queueReviewSync(progress: LocalReviewProgress): Promise<void> {
  // Deterministic from content, not a timestamp (device clocks aren't trusted anywhere
  // in this design) - repeated calls for the same finished session reuse the same op_id.
  const payload: ReviewSyncPayload = {
    sessionId: progress.sessionId,
    opId: `${progress.sessionId}:${progress.answers.length}:${progress.status}`,
    answers: progress.answers.map((a) => ({ question_id: a.questionId, selected_answer: a.selectedAnswer })),
  };
  await enqueue(outboxId(progress.sessionId), KIND, progress.childId, payload);
}
