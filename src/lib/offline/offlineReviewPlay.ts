"use client";

/**
 * Drop-in replacement for src/lib/api/review.ts's 3 functions, same signatures and
 * return shapes, so ReviewStationExperience.tsx needs no structural changes - only the
 * import source changes. Mirrors offlineLessonPlay.ts's reasoning exactly (see its doc
 * comment): online play is unaffected, but a genuine connectivity failure (not just
 * navigator.onLine, which stays true when only the backend is unreachable) falls back
 * to a pre-downloaded bundle and grades locally. Once local play has started for a
 * session, it stays local until the batch is finished and synced.
 */
import {
  getReviewQuestion as realGetReviewQuestion,
  getUnitReview as realGetUnitReview,
  submitReviewAnswer as realSubmitReviewAnswer,
  type ReviewSummary,
} from "@/lib/api/review";
import type { PlayQuestion } from "@/lib/api/lessonPlay";
import {
  currentLocalReviewQuestion,
  downloadReviewBundle,
  findCachedReviewBundleFor,
  getCachedReviewBundle,
  getLocalReviewProgress,
  getOrStartLocalReviewProgress,
  markReviewQuestionResolved,
  queueReviewSync,
  submitLocalReviewAnswer,
} from "./reviewOffline";
import type { LocalReviewProgress, OfflineBundleQuestion, ReviewBundleCache } from "./db";

class ReviewUnavailableError extends Error {
  status = 0;
  constructor() {
    super("OFFLINE_NO_REVIEW_BUNDLE");
  }
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

// Same reasoning as offlineLessonPlay.ts's isConnectivityError - navigator.onLine only
// reflects the device's own network interface, not whether OUR server is reachable, so
// the real trigger for falling back is a failed real call, not a false onLine flag.
// Genuine HTTP errors from the backend itself still surface normally.
function isConnectivityError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  if (status === undefined) return true;
  return status >= 500;
}

function questionFromBundle(q: OfflineBundleQuestion): PlayQuestion {
  return {
    id: q.id,
    gameType: q.game_type,
    questionText: q.question_text,
    imageUrl: q.image_url,
    imageAlt: q.image_alt,
    payload: q.payload,
  };
}

function summaryFromLocalProgress(progress: LocalReviewProgress): ReviewSummary {
  return {
    sessionId: progress.sessionId,
    status: progress.status === "completed" ? "completed" : "pending",
    unitId: progress.unitId,
    unitTitle: "",
    subjectId: 0,
    totalQuestions: progress.totalQuestions,
    correctCount: progress.correctCount,
    remaining: progress.remainingIds.length,
    // Never invented locally: the real bonus only exists once the server recomputes it
    // on sync (see ReviewStationController::syncOffline) - stays 0 until then, same as
    // "not finished yet" from the UI's point of view.
    pointsEarned: 0,
  };
}

export async function getUnitReview(unitId: number, studentId: number): Promise<ReviewSummary | null> {
  const existingBundle = await findCachedReviewBundleFor(unitId, studentId);
  if (existingBundle) {
    const existingProgress = await getLocalReviewProgress(existingBundle.sessionId);
    if (existingProgress && existingProgress.status !== "completed") {
      // Unsynced local progress already in flight - keep going locally regardless of
      // connectivity, so a fresh online read can't race ahead of answers the server
      // doesn't know about yet.
      return summaryFromLocalProgress(existingProgress);
    }
  }

  if (isOnline()) {
    try {
      const summary = await realGetUnitReview(unitId, studentId);
      if (summary && summary.status !== "completed" && summary.remaining > 0) {
        void downloadReviewBundle(summary.sessionId, unitId, studentId).catch(() => {
          // Best effort - review still works normally online; it just won't survive
          // going offline mid-session this time.
        });
      }
      return summary;
    } catch (err) {
      if (!existingBundle || !isConnectivityError(err)) throw err;
      // Backend unreachable but this session was already pre-downloaded - fall through
      // to reading it locally instead of surfacing a hard error.
    }
  }

  if (!existingBundle) throw new ReviewUnavailableError();
  const progress = await getOrStartLocalReviewProgress(existingBundle);
  return summaryFromLocalProgress(progress);
}

export async function getReviewQuestion(sessionId: number): Promise<PlayQuestion> {
  const existingProgress = await getLocalReviewProgress(sessionId);
  if (isOnline() && !existingProgress) {
    try {
      return await realGetReviewQuestion(sessionId);
    } catch (err) {
      const bundle = await getCachedReviewBundle(sessionId);
      if (!bundle || !isConnectivityError(err)) throw err;
      const progress = await getOrStartLocalReviewProgress(bundle);
      const question = currentLocalReviewQuestion(bundle, progress);
      if (!question) throw err;
      return questionFromBundle(question);
    }
  }

  const bundle = await getCachedReviewBundle(sessionId);
  if (!bundle) throw new ReviewUnavailableError();
  const progress = await getOrStartLocalReviewProgress(bundle);
  const question = currentLocalReviewQuestion(bundle, progress);
  if (!question) throw new Error("NO_CURRENT_REVIEW_QUESTION");
  return questionFromBundle(question);
}

async function submitReviewAnswerLocally(
  bundle: ReviewBundleCache,
  selectedAnswer: unknown,
  existingProgress: LocalReviewProgress | null | undefined
): Promise<{ isCorrect: boolean; remaining: number; status: string; pointsEarned: number; feedback: Record<string, unknown> }> {
  const progress = existingProgress ?? (await getOrStartLocalReviewProgress(bundle));
  const result = await submitLocalReviewAnswer(bundle, progress, selectedAnswer);

  if (result.progress.status === "completed") {
    // The session is done locally; queue the whole batch now rather than waiting for a
    // separate call the component would otherwise need to make right after this.
    void queueReviewSync(result.progress);
  }

  return {
    isCorrect: result.isCorrect,
    remaining: result.progress.remainingIds.length,
    status: result.progress.status,
    pointsEarned: 0,
    feedback: result.feedback,
  };
}

export async function submitReviewAnswer(
  sessionId: number,
  questionId: number,
  selectedAnswer: unknown
): Promise<{ isCorrect: boolean; remaining: number; status: string; pointsEarned: number; feedback: Record<string, unknown> }> {
  const existingProgress = await getLocalReviewProgress(sessionId);
  if (isOnline() && !existingProgress) {
    try {
      const result = await realSubmitReviewAnswer(sessionId, questionId, selectedAnswer);
      if (result.isCorrect) {
        // Keep the cached bundle (if any) in sync with real server state - see
        // markReviewQuestionResolved's doc comment for why a stale snapshot would
        // re-serve an already-resolved question if connectivity drops later.
        void markReviewQuestionResolved(sessionId, questionId);
      }
      return result;
    } catch (err) {
      const bundle = await getCachedReviewBundle(sessionId);
      if (!bundle || !isConnectivityError(err)) throw err;
      return submitReviewAnswerLocally(bundle, selectedAnswer, null);
    }
  }

  const bundle = await getCachedReviewBundle(sessionId);
  if (!bundle) throw new ReviewUnavailableError();
  return submitReviewAnswerLocally(bundle, selectedAnswer, existingProgress);
}
