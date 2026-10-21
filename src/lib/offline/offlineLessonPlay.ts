"use client";

/**
 * Drop-in replacement for src/lib/api/lessonPlay.ts's 4 functions, same signatures and
 * return shapes, so LessonPlayExperience.tsx needs no structural changes - only the
 * import source changes. Delegates to the real API whenever truly online with no
 * pending local work; falls back to a local, pre-downloaded bundle (see
 * lessonOffline.ts) otherwise. Once local play has started for an attempt, it stays
 * local until the batch is finished and synced, even if connectivity briefly returns
 * mid-lesson - this avoids the server and the device ever disagreeing about which
 * question is "current" for the same attempt.
 */
import {
  completeAttempt as realCompleteAttempt,
  getCurrentQuestion as realGetCurrentQuestion,
  startLessonAttempt as realStartLessonAttempt,
  submitAnswer as realSubmitAnswer,
  type LessonAttempt,
  type LessonGift,
  type PlayQuestion,
} from "@/lib/api/lessonPlay";
import {
  batterySegmentsRemaining,
  calculateLocalStars,
  currentLocalQuestion,
  downloadLessonBundle,
  findCachedLessonBundleFor,
  getCachedLessonBundle,
  getLocalProgress,
  getOrStartLocalProgress,
  getOrStartLocalProgressAt,
  queueLessonSync,
  submitLocalAnswer,
  updateBundleStartPosition,
} from "./lessonOffline";
import type { LessonBundleCache, LocalAttemptProgress, OfflineBundleQuestion } from "./db";

class OfflineUnavailableError extends Error {
  status = 0;
  constructor() {
    super("OFFLINE_NO_BUNDLE");
  }
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

// navigator.onLine only reflects the device's own network interface, not whether OUR
// server is actually reachable - it stays true when the backend is down but the wifi/
// cellular radio is up. So the real trigger for falling back to local play is a failed
// real API call, not just a false onLine flag. A genuine HTTP error from the backend
// itself (401 session expired, 422 validation, ...) must still surface normally though -
// only a true connectivity failure (no response at all, or the proxy's own 5xx "I
// couldn't reach Laravel" response) should fall back.
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

function attemptFromLocalProgress(bundle: LessonBundleCache, progress: LocalAttemptProgress, gift: LessonGift | null = null): LessonAttempt {
  const answeredCount = progress.correctCount + progress.wrongCount;
  const completed = progress.status === "all_answered";
  return {
    id: progress.attemptId,
    lessonId: progress.lessonId,
    lessonTitle: null,
    unitId: null,
    subjectId: null,
    nextLessonId: null,
    attemptNumber: 1,
    status: completed ? "completed" : progress.status,
    correctCount: progress.correctCount,
    wrongCount: progress.wrongCount,
    totalQuestions: progress.totalQuestions,
    answeredCount,
    gamesTotal: 1,
    currentGameIndex: 1,
    batteryRemaining: batterySegmentsRemaining(bundle, progress),
    batteryTotal: bundle.rules.battery.total_segments,
    currentQuestionId: currentLocalQuestion(bundle, progress)?.id ?? null,
    rechargeEndsAt: null,
    // Never invented locally: the real value only exists once the server recomputes it
    // on sync (see LessonAttemptController::syncOffline) - stars/points stay at their
    // pre-sync placeholder (0) until then, same as "not finished yet" from the UI's POV.
    stars: 0,
    pointsEarned: 0,
    gift,
  };
}

export async function startLessonAttempt(lessonId: number, childId: number): Promise<LessonAttempt> {
  const existingBundle = await findCachedLessonBundleFor(lessonId, childId);
  if (existingBundle) {
    const existingProgress = await getLocalProgress(existingBundle.attemptId);
    if (existingProgress && existingProgress.status !== "all_answered") {
      // Unsynced local progress already in flight - keep going locally regardless of
      // connectivity, so a fresh online start() can't race ahead of answers the server
      // doesn't know about yet.
      return attemptFromLocalProgress(existingBundle, existingProgress);
    }
  }

  if (isOnline()) {
    try {
      const attempt = await realStartLessonAttempt(lessonId, childId);
      void downloadLessonBundle(attempt.id, childId, {
        answeredCount: attempt.answeredCount,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
      }).catch(() => {
        // Best effort - the lesson still works normally online; it just won't survive
        // going offline mid-lesson this time.
      });
      return attempt;
    } catch (err) {
      if (!existingBundle || !isConnectivityError(err)) throw err;
      // Backend unreachable but this lesson was already pre-downloaded - fall through
      // to starting it locally instead of surfacing a hard error.
    }
  }

  if (!existingBundle) throw new OfflineUnavailableError();
  const progress = await getOrStartLocalProgress(existingBundle);
  return attemptFromLocalProgress(existingBundle, progress);
}

function localCurrentQuestion(bundle: LessonBundleCache, progress: LocalAttemptProgress): PlayQuestion {
  const question = currentLocalQuestion(bundle, progress);
  if (!question) throw new Error("NO_CURRENT_QUESTION");
  return questionFromBundle(question);
}

export async function getCurrentQuestion(attemptId: number): Promise<PlayQuestion> {
  const existingProgress = await getLocalProgress(attemptId);
  if (isOnline() && !existingProgress) {
    try {
      return await realGetCurrentQuestion(attemptId);
    } catch (err) {
      const bundle = await getCachedLessonBundle(attemptId);
      if (!bundle || !isConnectivityError(err)) throw err;
      const progress = await getOrStartLocalProgress(bundle);
      return localCurrentQuestion(bundle, progress);
    }
  }

  const bundle = await getCachedLessonBundle(attemptId);
  if (!bundle) throw new OfflineUnavailableError();
  const progress = await getOrStartLocalProgress(bundle);
  return localCurrentQuestion(bundle, progress);
}

async function submitAnswerLocally(
  bundle: LessonBundleCache,
  questionId: number,
  selectedAnswer: unknown,
  existingProgress: LocalAttemptProgress | null | undefined
): Promise<{ attempt: LessonAttempt; isCorrect: boolean; feedback: Record<string, unknown> }> {
  // questionId locates the exact bundle position even on the very first local call for
  // this attempt (e.g. connectivity dropped between start() and the first answer).
  const progress = existingProgress ?? (await getOrStartLocalProgressAt(bundle, questionId));
  const result = await submitLocalAnswer(bundle, progress, selectedAnswer);

  if (result.progress.status === "all_answered") {
    // The lesson is done locally; queue the whole batch now rather than waiting for a
    // separate completeAttempt() call the component makes right after this resolves.
    void queueLessonSync(result.progress);
  }

  return {
    attempt: attemptFromLocalProgress(bundle, result.progress),
    isCorrect: result.isCorrect,
    feedback: result.feedback,
  };
}

export async function submitAnswer(
  attemptId: number,
  questionId: number,
  selectedAnswer: unknown
): Promise<{ attempt: LessonAttempt; isCorrect: boolean; feedback: Record<string, unknown> }> {
  const existingProgress = await getLocalProgress(attemptId);
  if (isOnline() && !existingProgress) {
    try {
      const result = await realSubmitAnswer(attemptId, questionId, selectedAnswer);
      // Keep any cached bundle's resume point current - see updateBundleStartPosition's
      // doc comment for why a stale snapshot would double-count already-answered
      // questions if connectivity drops later in this same lesson.
      void updateBundleStartPosition(attemptId, {
        answeredCount: result.attempt.answeredCount,
        correctCount: result.attempt.correctCount,
        wrongCount: result.attempt.wrongCount,
      });
      return result;
    } catch (err) {
      const bundle = await getCachedLessonBundle(attemptId);
      if (!bundle || !isConnectivityError(err)) throw err;
      return submitAnswerLocally(bundle, questionId, selectedAnswer, null);
    }
  }

  const bundle = await getCachedLessonBundle(attemptId);
  if (!bundle) throw new OfflineUnavailableError();
  return submitAnswerLocally(bundle, questionId, selectedAnswer, existingProgress);
}

export async function completeAttempt(attemptId: number): Promise<LessonAttempt> {
  const existingProgress = await getLocalProgress(attemptId);
  const useLocal = !isOnline() || !!existingProgress;
  if (!useLocal) return realCompleteAttempt(attemptId);

  const bundle = await getCachedLessonBundle(attemptId);
  if (!bundle || !existingProgress) throw new OfflineUnavailableError();
  await queueLessonSync(existingProgress);
  return attemptFromLocalProgress(bundle, existingProgress);
}
