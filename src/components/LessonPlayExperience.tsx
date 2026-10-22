"use client";

import { QuestionImage } from "@/components/QuestionImage";
import {
  ExplanationListen,
  ListenItem,
  QuestionAudioBar,
  QuestionAudioProvider,
  StopAudioOnChange,
  useItemListen,
  useReadingLayout,
} from "@/components/QuestionAudio";
import { mapExplanationAudio } from "@/lib/speech/questionAudio";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import confetti from "canvas-confetti";
import { useTranslations } from "next-intl";
import { LessonCompleteCelebration } from "@/components/LessonCompleteCelebration";
import { LessonPlayLoading } from "@/components/LessonPlayLoading";
import { QuestionTransitionBar } from "@/components/QuestionTransitionBar";
import { Button } from "@/components/ui/Button";
import { ExitConfirmModal } from "@/components/ui/ExitConfirmModal";
import { useRouter } from "@/i18n/navigation";
import { useGuardedBack } from "@/lib/navigation/useGuardedBack";
import { unitLessonPath, withChildQuery } from "@/lib/config/subjects";
import { toIndicDigits } from "@/lib/format/indicDigits";
import { type LessonAttempt, type PlayQuestion } from "@/lib/api/lessonPlay";
// Offline-aware drop-in replacements (same signatures/shapes as @/lib/api/lessonPlay):
// fall back to a pre-downloaded local bundle when offline, otherwise behave exactly
// like the real API. See src/lib/offline/offlineLessonPlay.ts.
import {
  completeAttempt,
  getCurrentQuestion,
  startLessonAttempt,
  submitAnswer,
} from "@/lib/offline/offlineLessonPlay";
import { playUiTone } from "@/lib/play/uiSounds";
import { isExperienceCelebrationEnabled } from "@/lib/experience/experiencePrefs";

type Props = {
  lessonId: number;
  childId: number;
  pointsBalance: number;
};

type Phase = "playing" | "feedback" | "recharge" | "done" | "error";

/** Placeholder while no question is loaded, so the audio provider can always mount. */
const NO_QUESTION: PlayQuestion = { id: 0, gameType: "", questionText: "", imageUrl: null, payload: {} };

type AnsweredReview = {
  question: PlayQuestion;
  selected: unknown;
  feedback: Record<string, unknown>;
  isCorrect: boolean;
};

type LiveDraft = {
  question: PlayQuestion;
  selected: unknown;
  canSubmit: boolean;
  phase: Phase;
  isCorrect: boolean | null;
  feedback: Record<string, unknown>;
};

export function LessonPlayExperience({ lessonId, childId, pointsBalance }: Props) {
  const t = useTranslations("lesson");
  const router = useRouter();
  const [attempt, setAttempt] = useState<LessonAttempt | null>(null);
  const [question, setQuestion] = useState<PlayQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [selected, setSelected] = useState<unknown>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<Record<string, unknown>>({});
  const [rechargeEndsAt, setRechargeEndsAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<AnsweredReview[]>([]);
  /** null = السؤال الحي الحالي، رقم = سؤال سابق من السجل */
  const [browseIndex, setBrowseIndex] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const advancingRef = useRef(false);
  const liveDraftRef = useRef<LiveDraft | null>(null);
  const browsingPast = browseIndex != null;
  const rewardedQuestions = useRef(new Set<number>());
  const submitBarRef = useRef<HTMLDivElement>(null);
  const [runId, setRunId] = useState(0);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const exitHref = attempt?.unitId ? unitLessonPath(attempt.unitId, childId) : withChildQuery("/subjects", childId);
  // Guarded (confirm-before-leaving) for as long as there's an active, unfinished
  // attempt - entering the lesson from the path screen is a real push, so leaving
  // through here (back button or the in-page exit button, both funnelled through
  // requestExit) pops that same entry instead of pushing a new one, which is what
  // previously left a stale duplicate "lesson" entry behind on exit.
  const { restoreGuard } = useGuardedBack(Boolean(attempt) && phase !== "done", () => setShowExitConfirm(true));

  function requestExit() {
    router.back();
  }
  function stayInLesson() {
    setShowExitConfirm(false);
    restoreGuard();
  }
  function confirmExitLesson() {
    setShowExitConfirm(false);
    const before = window.location.pathname;
    router.back();
    // Safety net for a deep-linked lesson with nothing to go back to in this tab's
    // own history - falls back to a real navigation instead of silently doing nothing.
    window.setTimeout(() => {
      if (window.location.pathname === before) router.replace(exitHref);
    }, 350);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const started = await startLessonAttempt(lessonId, childId);
        if (cancelled) return;
        setAttempt(started);
        if (started.status === "battery_depleted") {
          setRechargeEndsAt(started.rechargeEndsAt);
          setPhase("recharge");
          return;
        }
        if (!started.currentQuestionId || started.totalQuestions <= 0) {
          setError(t("loadError"));
          setPhase("error");
          return;
        }
        if (started.answeredCount >= started.totalQuestions) {
          const done = started.status === "completed" ? started : await completeAttempt(started.id);
          if (cancelled) return;
          setAttempt(done);
          setPhase("done");
          return;
        }
        const q = await getCurrentQuestion(started.id);
        if (cancelled) return;
        setQuestion(q);
        setPhase("playing");
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        if (status === 423) {
          const retrySeconds = Number((err as { payload?: Record<string, unknown> }).payload?.retry_after_seconds);
          if (Number.isFinite(retrySeconds)) {
            setRechargeEndsAt(new Date(Date.now() + Math.max(0, retrySeconds) * 1000).toISOString());
          }
          setPhase("recharge");
          return;
        }
        setError(t("loadError"));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, childId, t, runId]);

  function restartLesson() {
    liveDraftRef.current = null;
    advancingRef.current = false;
    rewardedQuestions.current.clear();
    setAttempt(null);
    setQuestion(null);
    setSelected(null);
    setCanSubmit(false);
    setIsCorrect(null);
    setFeedback({});
    setHistory([]);
    setBrowseIndex(null);
    setTransitioning(false);
    setError(null);
    setBusy(false);
    setPhase("playing");
    window.scrollTo({ top: 0 });
    setRunId((n) => n + 1);
  }

  // As soon as the answer is complete (one tap for MCQ, last pair/card for matching/classify),
  // make sure the "check" bar is on screen and draw attention to it.
  useEffect(() => {
    if (!canSubmit || phase !== "playing" || browsingPast) return;
    const bar = submitBarRef.current;
    if (!bar) return;
    const timer = window.setTimeout(() => {
      const rect = bar.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.top < 0) {
        bar.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "end",
        });
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [canSubmit, phase, browsingPast, question?.id]);

  useEffect(() => {
    if (phase !== "feedback" || isCorrect == null || browsingPast || !question || rewardedQuestions.current.has(question.id)) return;
    rewardedQuestions.current.add(question.id);
    if (isCorrect === false) {
      // A wrong answer is feedback, not a punishment: a soft, short, non-alarming tone only.
      playUiTone("wrong");
      return;
    }
    playUiTone("success");
    if (!isExperienceCelebrationEnabled()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pointsEl = document.querySelector<HTMLElement>("[data-play-points]");
    const rect = pointsEl?.getBoundingClientRect();
    const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.85;
    const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.12;
    void confetti({
      particleCount: 28,
      spread: 42,
      startVelocity: 34,
      origin: { x: 0.5, y: 0.72 },
      colors: ["#F48232", "#FDE68A", "#86EFAC", "#7DD3FC"],
      disableForReducedMotion: true,
    });
    const later = window.setTimeout(() => {
      void confetti({
        particleCount: 18,
        spread: 28,
        startVelocity: 26,
        origin: { x, y },
        colors: ["#F48232", "#FFD54F", "#FFFFFF"],
        disableForReducedMotion: true,
      });
    }, 180);
    return () => window.clearTimeout(later);
  }, [phase, isCorrect, question, browsingPast]);

  async function onSubmit() {
    if (!attempt || !question || selected == null || busy || browsingPast) return;
    setBusy(true);
    try {
      const result = await submitAnswer(attempt.id, question.id, selected);
      setAttempt(result.attempt);
      setIsCorrect(result.isCorrect);
      setFeedback(result.feedback);
      if (result.attempt.status === "battery_depleted") {
        setRechargeEndsAt(result.attempt.rechargeEndsAt);
      }
      setHistory((prev) => [
        ...prev,
        {
          question,
          selected,
          feedback: result.feedback,
          isCorrect: result.isCorrect,
        },
      ]);
      setPhase("feedback");
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 423) {
        const retrySeconds = Number((err as { payload?: Record<string, unknown> }).payload?.retry_after_seconds);
        if (Number.isFinite(retrySeconds)) {
          setRechargeEndsAt(new Date(Date.now() + Math.max(0, retrySeconds) * 1000).toISOString());
        }
        setPhase("recharge");
        return;
      }
      setError(t("submitError"));
    } finally {
      setBusy(false);
    }
  }

  function applyHistoryItem(index: number) {
    const item = history[index];
    if (!item) return;
    setBrowseIndex(index);
    setQuestion(item.question);
    setSelected(item.selected);
    setCanSubmit(false);
    setIsCorrect(item.isCorrect);
    setFeedback(item.feedback);
    setPhase("feedback");
    setTransitioning(false);
  }

  function goToPreviousQuestion() {
    if (history.length === 0) return;
    if (browseIndex === null) {
      if (question) {
        liveDraftRef.current = {
          question,
          selected,
          canSubmit,
          phase,
          isCorrect,
          feedback,
        };
      }
      applyHistoryItem(history.length - 1);
      return;
    }
    if (browseIndex > 0) applyHistoryItem(browseIndex - 1);
  }

  function goToNextQuestionView() {
    if (browseIndex === null) return;
    if (browseIndex < history.length - 1) {
      applyHistoryItem(browseIndex + 1);
      return;
    }
    const draft = liveDraftRef.current;
    setBrowseIndex(null);
    if (draft) {
      setQuestion(draft.question);
      setSelected(draft.selected);
      setCanSubmit(draft.canSubmit);
      setPhase(draft.phase);
      setIsCorrect(draft.isCorrect);
      setFeedback(draft.feedback);
    }
  }

  async function onNext() {
    if (!attempt || advancingRef.current) return;
    advancingRef.current = true;
    setBusy(true);
    try {
      if (attempt.status === "battery_depleted") {
        setPhase("recharge");
        return;
      }
      if (attempt.answeredCount >= attempt.totalQuestions) {
        const done = await completeAttempt(attempt.id);
        setAttempt(done);
        setPhase("done");
        return;
      }
      const q = await getCurrentQuestion(attempt.id);
      liveDraftRef.current = null;
      setBrowseIndex(null);
      setQuestion(q);
      setSelected(null);
      setCanSubmit(false);
      setIsCorrect(null);
      setFeedback({});
      setPhase("playing");
    } catch {
      setError(t("loadError"));
    } finally {
      setBusy(false);
      advancingRef.current = false;
    }
  }

  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  });

  useEffect(() => {
    if (phase !== "feedback" || browsingPast || isCorrect !== true || feedback.explanation) return;
    const feedbackHold = 1400;
    const travelMs = 1600;
    let cancelled = false;
    const showTravel = window.setTimeout(() => {
      if (cancelled) return;
      setTransitioning(true);
      playUiTone("pop");
    }, feedbackHold);
    const goNext = window.setTimeout(() => {
      if (cancelled) return;
      void onNextRef.current().finally(() => {
        if (!cancelled) setTransitioning(false);
      });
    }, feedbackHold + travelMs);
    return () => {
      cancelled = true;
      window.clearTimeout(showTravel);
      window.clearTimeout(goNext);
    };
  }, [phase, question?.id, browsingPast, isCorrect, feedback.explanation]);

  if (phase === "error") {
    return <p className="py-16 text-center font-bold text-text-gray">{error}</p>;
  }

  if (phase === "recharge") {
    return <RechargeView endsAt={rechargeEndsAt} childId={childId} />;
  }

  if (!attempt) {
    return <LessonPlayLoading />;
  }

  if (phase === "done") {
    return <LessonCompleteCelebration attempt={attempt} childId={childId} onReplay={restartLesson} />;
  }

  const progressPct =
    attempt.totalQuestions > 0 ? Math.round((attempt.answeredCount / attempt.totalQuestions) * 100) : 0;
  const displayPoints = pointsBalance + attempt.pointsEarned;
  const questionProgress =
    browseIndex != null
      ? browseIndex + 1
      : Math.min(attempt.answeredCount + 1, Math.max(attempt.totalQuestions, 1));
  const hint = !browsingPast && question ? hintLabelForGameType(question.gameType, t) : "";
  const canGoPrevious = history.length > 0 && (browseIndex === null || browseIndex > 0);
  const canGoForward = browseIndex != null;

  return (
    <div className="play-stage relative flex min-h-[calc(100dvh-1.5rem)] flex-col pb-4">
      <PlayChrome
        progressPct={progressPct}
        questionLabel={t("questionProgress", {
          current: toIndicDigits(questionProgress),
          total: toIndicDigits(Math.max(attempt.totalQuestions, 1)),
        })}
        pointsLabel={t("points", { count: displayPoints })}
        batteryRemaining={attempt.batteryRemaining}
        batteryTotal={attempt.batteryTotal}
        answeredCount={attempt.answeredCount}
        totalQuestions={Math.max(attempt.totalQuestions, 1)}
        previousLabel={t("previousQuestion")}
        nextLabel={
          browseIndex != null && browseIndex >= history.length - 1
            ? t("backToCurrent")
            : t("nextQuestion")
        }
        onPrevious={goToPreviousQuestion}
        onNext={goToNextQuestionView}
        previousDisabled={!canGoPrevious || transitioning}
        nextDisabled={!canGoForward || transitioning}
        viewingPastLabel={browsingPast ? t("viewingPast") : null}
        onExit={requestExit}
        exitLabel={t("exitLesson")}
      />

      <ExitConfirmModal
        open={showExitConfirm}
        title={t("exitConfirmTitle")}
        body={t("exitConfirmBody")}
        stayLabel={t("exitConfirmStay")}
        leaveLabel={t("exitConfirmLeave")}
        onStay={stayInLesson}
        onLeave={confirmExitLesson}
      />

      <QuestionAudioProvider key={`audio-${question?.id ?? "none"}-${browseIndex ?? "live"}`} question={question ?? NO_QUESTION}>
      <StopAudioOnChange token={phase} />
      {question ? (
        <div className="play-question-card mt-3 rounded-[28px] border-[3px] border-white bg-white/95 px-5 py-6 shadow-[0_14px_36px_-18px_rgba(26,43,71,0.4)]">
          <p className="text-center text-xl font-extrabold leading-relaxed text-text-navy sm:text-2xl">
            {question.questionText}
          </p>
          <QuestionImage key={`${question.id}-${question.imageUrl}`} src={question.imageUrl} alt={question.imageAlt} />
          <QuestionAudioBar />
        </div>
      ) : null}

      {hint ? <p className="mt-3 text-center text-sm font-bold text-text-gray">{hint}</p> : null}

      <div className="mt-3 flex-1">
        {question ? (
          <QuestionBody
            key={`${question.id}-${browseIndex ?? "live"}`}
            question={question}
            phase={phase === "feedback" || browsingPast ? "feedback" : "playing"}
            selected={selected}
            feedback={feedback}
            isCorrect={isCorrect}
            onChange={(value, ready) => {
              if (browsingPast) return;
              setSelected(value);
              setCanSubmit(ready);
            }}
          />
        ) : null}
      </div>

      {(phase === "feedback" || browsingPast) && isCorrect != null ? (
        <PlayFeedbackBanner
          key={`${question?.id}-${browseIndex ?? "live"}`}
          isCorrect={isCorrect}
          correctLabel={t("correct")}
          incorrectLabel={t("incorrect")}
          niceTryLabel={t("niceTry")}
          explanation={typeof feedback.explanation === "string" ? feedback.explanation : null}
          explanationAudioUrl={mapExplanationAudio(feedback)}
          onNext={browsingPast ? goToNextQuestionView : () => void onNext()}
          nextLabel={
            browsingPast
              ? browseIndex != null && browseIndex >= history.length - 1
                ? t("backToCurrent")
                : t("nextQuestion")
              : attempt.status === "battery_depleted"
                ? t("goToBreak")
                : attempt.answeredCount >= attempt.totalQuestions
                  ? t("finishLesson")
                  : t("nextQuestion")
          }
          nextDisabled={!browsingPast && (busy || transitioning)}
        />
      ) : null}
      </QuestionAudioProvider>

      <div
        ref={submitBarRef}
        className="sticky bottom-0 z-10 mt-4 bg-gradient-to-t from-[#F7FBFF] via-[#F7FBFF]/95 to-transparent pb-[env(safe-area-inset-bottom)] pt-3"
      >
        {browsingPast ? (
          <Button onClick={goToNextQuestionView} fullWidth>
            {browseIndex != null && browseIndex >= history.length - 1
              ? t("backToCurrent")
              : t("nextQuestion")}
          </Button>
        ) : phase === "playing" ? (
          <Button
            onClick={onSubmit}
            disabled={!canSubmit || busy}
            fullWidth
            className={canSubmit && !busy ? "play-check-ready" : undefined}
          >
            {t("check")}
          </Button>
        ) : phase === "feedback" ? (
          <Button onClick={() => void onNext()} disabled={busy || transitioning} fullWidth>
            {attempt.status === "battery_depleted"
              ? t("goToBreak")
              : attempt.answeredCount >= attempt.totalQuestions
                ? t("finishLesson")
                : t("nextQuestion")}
          </Button>
        ) : (
          <div className="h-12" aria-hidden="true" />
        )}
      </div>

      {transitioning && !browsingPast ? (
        <QuestionTransitionBar
          label={
            attempt.answeredCount >= attempt.totalQuestions ? t("autoNextDone") : t("autoNext")
          }
        />
      ) : null}
    </div>
  );
}

export function hintLabelForGameType(
  gameType: string,
  t: (key: string) => string
): string {
  switch (gameType) {
    case "mcq":
    case "true_false":
      return t("hintChoose");
    case "matching_pairs":
      return t("hintMatch");
    case "drag_classify":
      return t("hintClassify");
    case "ordering":
      return t("hintOrder");
    case "crossword":
      return t("hintCrossword");
    default:
      return "";
  }
}

export function PlayChrome({
  progressPct,
  questionLabel,
  gameLabel,
  pointsLabel,
  batteryRemaining,
  batteryTotal,
  answeredCount,
  totalQuestions,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  viewingPastLabel,
  onExit,
  exitLabel,
}: {
  onExit?: () => void;
  exitLabel?: string;
  progressPct: number;
  questionLabel: string;
  gameLabel?: string;
  pointsLabel?: string;
  batteryRemaining?: number;
  batteryTotal?: number;
  answeredCount?: number;
  totalQuestions?: number;
  previousLabel?: string;
  nextLabel?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  viewingPastLabel?: string | null;
}) {
  const t = useTranslations("lesson");
  const showBattery = (batteryTotal ?? 0) > 0;
  const showNav = Boolean(previousLabel || nextLabel);
  const remaining =
    totalQuestions != null && answeredCount != null ? Math.max(0, totalQuestions - answeredCount) : null;

  return (
    <div className="play-chrome space-y-2.5 rounded-[22px] bg-[#F7FBFF] px-3 py-3">
      {onExit && exitLabel ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-extrabold text-text-gray shadow-[0_6px_16px_-10px_rgba(26,43,71,0.5)] transition hover:text-text-navy"
          >
            <span aria-hidden="true">✕</span>
            {exitLabel}
          </button>
        </div>
      ) : null}
      <div role="progressbar" aria-label={questionLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(100, progressPct)))} className="play-trail relative h-3.5 overflow-hidden rounded-full bg-white shadow-inner">
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-l from-primary-orange to-[#FFAA55] transition-[width] duration-500"
          style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          data-play-question-pill
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-black text-text-navy shadow-[0_6px_16px_-10px_rgba(26,43,71,0.5)]"
        >
          <FlagIcon />
          {questionLabel}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {pointsLabel ? (
            <span
              data-play-points
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 text-sm font-extrabold text-amber-700"
            >
              <span aria-hidden="true">★</span>
              {pointsLabel}
            </span>
          ) : null}
          {showBattery ? <Battery remaining={batteryRemaining ?? 0} total={batteryTotal ?? 0} /> : null}
        </div>
      </div>

      {gameLabel ? <p className="truncate text-[11px] font-bold text-text-gray">{gameLabel}</p> : null}

      {remaining != null && remaining > 0 ? (
        <p className="text-center text-[11px] font-bold text-text-gray">{t("questionsRemaining", { count: toIndicDigits(remaining) })}</p>
      ) : null}

      {showNav ? (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <ChromeNavButton direction="previous" disabled={previousDisabled} onClick={onPrevious} label={previousLabel} />
          {viewingPastLabel ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-600">
              {viewingPastLabel}
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
          <ChromeNavButton direction="next" disabled={nextDisabled} onClick={onNext} label={nextLabel} />
        </div>
      ) : null}
    </div>
  );
}

function ChromeNavButton({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: "previous" | "next";
  disabled?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  if (!label) return <span aria-hidden="true" />;
  const isPrevious = direction === "previous";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="play-chrome-nav flex min-h-[2.5rem] items-center gap-1.5 rounded-full px-3 text-sm font-extrabold text-sky-700 disabled:opacity-30"
    >
      {isPrevious ? <ChevronIcon dir="previous" /> : null}
      <span className="truncate">{label}</span>
      {!isPrevious ? <ChevronIcon dir="next" /> : null}
    </button>
  );
}

function ChevronIcon({ dir }: { dir: "previous" | "next" }) {
  // Logical start/end chevrons: rotated with CSS so they always point the right way in RTL and LTR.
  const rotate = dir === "previous" ? "rotate-0 rtl:rotate-180" : "rotate-180 rtl:rotate-0";
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${rotate}`} fill="none" aria-hidden="true">
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-primary-orange" fill="none" aria-hidden="true">
      <path d="M6 3.5v17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M6 4.5c2-1.2 4-1.2 6 0s4 1.2 6 0v8c-2 1.2-4 1.2-6 0s-4-1.2-6 0v-8Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Answer feedback as a bottom sheet: green when correct, orange when wrong. The explanation opens by itself on a
 * wrong answer and stays behind a "why?" button on a correct one. The X only closes the sheet; moving on is the
 * separate next button. Callers should key it per question so a closed sheet re-opens for the next one.
 */
export function PlayFeedbackBanner({
  isCorrect,
  correctLabel,
  incorrectLabel,
  niceTryLabel,
  explanation,
  explanationAudioUrl,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  isCorrect: boolean;
  correctLabel: string;
  incorrectLabel: string;
  niceTryLabel: string;
  explanation?: string | null;
  /** Pre-generated spoken explanation; arrives with the answer feedback, never before. */
  explanationAudioUrl?: string | null;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  const t = useTranslations("lesson");
  const [open, setOpen] = useState(true);
  const [whyOpen, setWhyOpen] = useState(false);
  const showExplanation = Boolean(explanation) && (!isCorrect || whyOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) {
    return explanation ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-orange px-5 py-2 text-base font-black text-white shadow-[0_6px_0_0_rgba(194,100,20,0.35)] transition active:translate-y-[2px] active:shadow-[0_3px_0_0_rgba(194,100,20,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"
      >
        <span aria-hidden="true">💡</span>
        {t("explanation")}
      </button>
    ) : null;
  }

  return (
    <div
      data-play-feedback
      role="status"
      className={`play-feedback-banner play-feedback-sheet fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-2xl rounded-t-[28px] border-x-4 border-t-4 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-18px_40px_-18px_rgba(26,43,71,0.45)] ${
        isCorrect
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-orange-300 bg-orange-50 text-orange-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-black text-white ${
            isCorrect ? "bg-emerald-500" : "bg-primary-orange"
          }`}
          aria-hidden="true"
        >
          {isCorrect ? "✓" : "!"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold">{isCorrect ? correctLabel : incorrectLabel}</p>
          {!isCorrect ? <p className="text-sm font-bold opacity-80">{niceTryLabel}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("reviewClose")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 text-xl font-black leading-none text-text-navy transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {explanation && isCorrect ? (
        <button
          type="button"
          aria-expanded={whyOpen}
          onClick={() => setWhyOpen((value) => !value)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-base font-black text-white shadow-[0_6px_0_0_rgba(4,120,87,0.35)] transition active:translate-y-[2px] active:shadow-[0_3px_0_0_rgba(4,120,87,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <span aria-hidden="true">💡</span>
          {t("why")}
        </button>
      ) : null}

      {showExplanation ? (
        <div
          className={`mt-3 max-h-[40dvh] overflow-y-auto rounded-2xl border-2 bg-white px-4 py-3 shadow-sm ${
            isCorrect ? "border-emerald-300" : "border-orange-300"
          }`}
        >
          <p className={`mb-1 text-sm font-extrabold ${isCorrect ? "text-emerald-600" : "text-primary-orange"}`}>
            {t("explanation")}
          </p>
          <p className="text-lg font-bold leading-relaxed text-text-navy">{explanation}</p>
          <ExplanationListen url={explanationAudioUrl ?? null} />
        </div>
      ) : null}

      {onNext ? (
        <Button onClick={onNext} disabled={nextDisabled} fullWidth className="mt-3">
          {nextLabel}
        </Button>
      ) : null}
    </div>
  );
}

function Battery({ remaining, total }: { remaining: number; total: number }) {
  const t = useTranslations("lesson");
  const safeTotal = Math.max(total, 1);
  const ratio = Math.max(0, Math.min(1, remaining / safeTotal));
  const fill =
    ratio > 0.55 ? "#22C55E" : ratio > 0.25 ? "#F59E0B" : ratio > 0 ? "#EF4444" : "#D1D5DB";
  const width = Math.max(ratio > 0 ? 3.5 : 0, ratio * 21.2);
  const label = t("batteryLabel", { remaining: toIndicDigits(remaining), total: toIndicDigits(total) });

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-[0_6px_16px_-10px_rgba(26,43,71,0.5)]"
      title={label}
      aria-label={label}
    >
      <svg viewBox="0 0 32 18" className="h-[1.1rem] w-9" aria-hidden="true">
        <rect x="1" y="2" width="26" height="14" rx="3" fill="none" stroke="#64748B" strokeWidth="2" />
        <rect x="28" y="6" width="3.5" height="6" rx="1.2" fill="#64748B" />
        <rect x="3.4" y="4.4" width={width} height="9.2" rx="1.6" fill={fill} />
      </svg>
      <span className="text-xs font-black tabular-nums" style={{ color: fill }} aria-hidden="true">
        {toIndicDigits(remaining)}
      </span>
    </span>
  );
}

export type QuestionPlayPhase = "playing" | "feedback";

export function QuestionBody({
  question,
  phase,
  selected,
  feedback,
  isCorrect,
  onChange,
}: {
  question: PlayQuestion;
  phase: QuestionPlayPhase;
  selected: unknown;
  feedback: Record<string, unknown>;
  isCorrect: boolean | null;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  if (question.gameType === "mcq") {
    return (
      <McqBody
        payload={question.payload}
        phase={phase}
        selected={selected}
        feedback={feedback}
        onChange={onChange}
      />
    );
  }
  if (question.gameType === "true_false") {
    return <TrueFalseBody phase={phase} selected={selected} feedback={feedback} onChange={onChange} />;
  }
  if (question.gameType === "matching_pairs") {
    return (
      <MatchingBody
        payload={question.payload}
        phase={phase}
        selected={selected}
        feedback={feedback}
        isCorrect={isCorrect}
        onChange={onChange}
      />
    );
  }
  if (question.gameType === "drag_classify") {
    return (
      <DragBody
        payload={question.payload}
        phase={phase}
        selected={selected}
        feedback={feedback}
        isCorrect={isCorrect}
        onChange={onChange}
      />
    );
  }
  if (question.gameType === "ordering") {
    return (
      <OrderingBody
        payload={question.payload}
        phase={phase}
        selected={selected}
        feedback={feedback}
        isCorrect={isCorrect}
        onChange={onChange}
      />
    );
  }
  if (question.gameType === "crossword") {
    return (
      <CrosswordBody payload={question.payload} phase={phase} selected={selected} feedback={feedback} onChange={onChange} />
    );
  }
  return <p className="text-center font-bold text-text-gray">{question.gameType}</p>;
}

/** Picture for an option / card / item: lets pre-readers play without reading (shown alone when the text is empty). */
function ItemPicture({ url, text, small = false }: { url?: string | null; text?: string; small?: boolean }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={text || ""}
      loading="lazy"
      draggable={false}
      className={`pointer-events-none mx-auto shrink-0 select-none rounded-2xl bg-white object-contain ${
        small ? "h-16 w-16 sm:h-20 sm:w-20" : "h-24 w-24 sm:h-28 sm:w-28"
      }`}
    />
  );
}

function optionList(payload: Record<string, unknown>): Array<{ id: string; text: string; imageUrl: string | null }> {
  const options = Array.isArray(payload.options) ? payload.options : [];
  return options
    .map((row, index) => {
      if (typeof row === "string") return { id: String(index), text: toIndicDigits(row), imageUrl: null };
      if (row && typeof row === "object") {
        const item = row as { id?: unknown; text?: unknown; image_url?: unknown };
        return {
          id: String(item.id ?? index),
          text: toIndicDigits(String(item.text ?? "")),
          imageUrl: typeof item.image_url === "string" && item.image_url ? item.image_url : null,
        };
      }
      return { id: String(index), text: "", imageUrl: null };
    })
    .filter((row) => row.text || row.imageUrl);
}

function shuffleOptions<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j]!;
    next[j] = tmp!;
  }
  return next;
}

// Color only marks the option's LETTER badge before an answer is submitted —
// never the whole tile. That keeps the pre-answer state calm and low-saturation
// so the green "correct" reveal afterwards is the thing that actually stands out.
const MCQ_BADGE_TINTS = ["bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700"];

/**
 * Small ✓ / ✗ badge that pops onto a tile once an answer is revealed.
 * Shared across every game type so "you're right" / "that's not it" always
 * looks and reads the same way, wherever it appears.
 */
function AnswerBadge({ correct }: { correct: boolean }) {
  return (
    <span
      className={`play-badge-pop absolute -top-2 -end-2 z-20 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white shadow-md ${
        correct ? "bg-emerald-500" : "bg-rose-400"
      }`}
      aria-hidden="true"
    >
      {correct ? "✓" : "✗"}
    </span>
  );
}

/**
 * Brief, non-blocking sparkle burst around a just-revealed correct tile.
 * Purely CSS-driven (see `.play-sparkle` in globals.css), so it automatically
 * disappears under prefers-reduced-motion without any JS branching here.
 */
function SparkleBurst() {
  if (!isExperienceCelebrationEnabled()) return null;
  const sparkles: Array<{ style: CSSProperties; color: string; delay: string }> = [
    { style: { top: "-10%", insetInlineStart: "8%" }, color: "#F6C15B", delay: "0ms" },
    { style: { top: "6%", insetInlineEnd: "-8%" }, color: "#7DD3FC", delay: "70ms" },
    { style: { bottom: "-10%", insetInlineStart: "24%" }, color: "#86EFAC", delay: "130ms" },
    { style: { top: "26%", insetInlineStart: "-10%" }, color: "#F48232", delay: "190ms" },
  ];
  return (
    <span className="pointer-events-none absolute inset-0 z-10 overflow-visible" aria-hidden="true">
      {sparkles.map((s, i) => (
        <span key={i} className="play-sparkle" style={{ ...s.style, color: s.color, animationDelay: s.delay }}>
          ✦
        </span>
      ))}
    </span>
  );
}

// Shared "this pair belongs together" identity: a color AND a glyph, so the
// relationship never rides on color alone (colorblind- / accessibility-safe).
const PAIR_ACCENTS = [
  { text: "text-sky-700", ring: "ring-sky-300", bg: "bg-sky-50", glyph: "●" },
  { text: "text-violet-700", ring: "ring-violet-300", bg: "bg-violet-50", glyph: "■" },
  { text: "text-amber-700", ring: "ring-amber-300", bg: "bg-amber-50", glyph: "▲" },
  { text: "text-rose-700", ring: "ring-rose-300", bg: "bg-rose-50", glyph: "◆" },
  { text: "text-teal-700", ring: "ring-teal-300", bg: "bg-teal-50", glyph: "★" },
  { text: "text-orange-700", ring: "ring-orange-300", bg: "bg-orange-50", glyph: "♥" },
];

function PairBadge({ accent }: { accent: (typeof PAIR_ACCENTS)[number] }) {
  return (
    <span
      className={`play-badge-pop absolute -top-2 -start-2 z-20 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black shadow-sm ring-2 ${accent.bg} ${accent.text} ${accent.ring}`}
      aria-hidden="true"
    >
      {accent.glyph}
    </span>
  );
}

function McqBody({
  payload,
  phase,
  selected,
  feedback,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: QuestionPlayPhase;
  selected: unknown;
  feedback: Record<string, unknown>;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const t = useTranslations("lesson");
  const [options] = useState(() => shuffleOptions(optionList(payload)));
  // Read-aloud follows the shuffled order the student actually sees.
  useReadingLayout(options.map((option) => ({ key: `opt:${option.id}`, group: "options", pictureOnly: !option.text })));
  const hasListen = useItemListen();
  const selectedId =
    selected && typeof selected === "object" && "selected_option_id" in selected
      ? String((selected as { selected_option_id: string }).selected_option_id)
      : null;
  const correctId = feedback.correct_option_id != null ? String(feedback.correct_option_id) : null;
  const locked = phase === "feedback";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option, index) => {
        const isPick = selectedId === option.id;
        const isRight = locked && correctId === option.id;
        const isWrong = locked && isPick && correctId !== option.id;
        const isFadedOut = locked && !isRight && !isWrong;
        const letter = String.fromCharCode(65 + index);
        const badgeTint = MCQ_BADGE_TINTS[index % MCQ_BADGE_TINTS.length]!;
        const listenId = `opt:${option.id}`;
        return (
          <div key={option.id} className="relative">
          <button
            type="button"
            disabled={locked}
            onClick={() => {
              playUiTone("click");
              onChange({ selected_option_id: option.id }, true);
            }}
            className={`play-choice-tile play-mcq-card relative flex h-full w-full min-h-[5.75rem] items-center justify-between gap-3 rounded-[26px] border-[3px] px-4 py-4 text-start text-lg font-extrabold text-text-navy transition-opacity sm:min-h-[7rem] sm:text-xl ${hasListen(listenId) ? "pe-16" : ""} ${
              isRight
                ? "play-choice-right play-glow-ring border-emerald-400 bg-emerald-50"
                : isWrong
                  ? "play-choice-wrong border-rose-300 bg-rose-50"
                  : isPick
                    ? "play-choice-selected border-primary-orange bg-white"
                    : `border-neutral-100 bg-white shadow-[0_10px_28px_-16px_rgba(26,43,71,0.3)] ${
                        isFadedOut ? "opacity-55" : ""
                      }`
            }`}
          >
            {isRight ? <SparkleBurst /> : null}
            {isRight || isWrong ? <AnswerBadge correct={isRight} /> : null}
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-black ${
                isRight ? "bg-emerald-100 text-emerald-700" : isWrong ? "bg-rose-100 text-rose-600" : isPick ? "bg-orange-100 text-primary-orange" : badgeTint
              }`}
            >
              {letter}
            </span>
            <ItemPicture url={option.imageUrl} text={option.text} />
            {option.text ? <span className="leading-snug">{option.text}</span> : null}
          </button>
          <ListenItem
            id={listenId}
            label={t("listenOptionLabel", { letter })}
            className="absolute end-2 top-1/2 -translate-y-1/2"
          />
          </div>
        );
      })}
    </div>
  );
}

function TrueFalseBody({
  phase,
  selected,
  feedback,
  onChange,
}: {
  phase: QuestionPlayPhase;
  selected: unknown;
  feedback: Record<string, unknown>;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const t = useTranslations("lesson");
  const hasListen = useItemListen();
  const value =
    selected && typeof selected === "object" && "answer" in selected
      ? Boolean((selected as { answer: boolean }).answer)
      : null;
  const correct = typeof feedback.correct_answer === "boolean" ? feedback.correct_answer : null;
  const locked = phase === "feedback";

  return (
    <div className="relative mx-auto grid max-w-md grid-cols-2 gap-3">
      {[true, false].map((answer) => {
        const isPick = value === answer;
        const isRight = locked && correct === answer;
        const isWrong = locked && isPick && correct !== answer;
        const isFadedOut = locked && !isRight && !isWrong;
        const positive = answer === true;
        return (
          <button
            key={String(answer)}
            type="button"
            disabled={locked}
            onClick={() => {
              playUiTone("click");
              onChange({ answer }, true);
            }}
            className={`play-tf-flat relative flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-[24px] border-[3px] text-xl font-black transition-colors sm:min-h-[8.25rem] ${
              isRight
                ? "play-glow-ring border-emerald-400 bg-emerald-50 text-emerald-700"
                : isWrong
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : isPick
                    ? "border-primary-orange bg-white text-text-navy"
                    : `border-neutral-100 bg-white text-text-navy ${isFadedOut ? "opacity-55" : ""}`
            }`}
          >
            {isRight ? <SparkleBurst /> : null}
            {isRight || isWrong ? <AnswerBadge correct={isRight} /> : null}
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl font-black ${
                isRight
                  ? "bg-emerald-500 text-white"
                  : isWrong
                    ? "bg-rose-400 text-white"
                    : isPick
                      ? "bg-primary-orange text-white"
                      : "bg-neutral-100 text-text-gray"
              }`}
              aria-hidden="true"
            >
              {positive ? "✓" : "✗"}
            </span>
            <span>{answer ? t("true") : t("false")}</span>
          </button>
        );
      })}
      {/* Speakers float over the tiles (siblings, not children) so the tile buttons keep their original DOM position. */}
      {hasListen("sys:true") ? <ListenItem id="sys:true" label={t("true")} className="absolute start-2 top-2" /> : null}
      {hasListen("sys:false") ? <ListenItem id="sys:false" label={t("false")} className="absolute start-[calc(50%+0.875rem)] top-2" /> : null}
    </div>
  );
}

function MatchingBody({
  payload,
  phase,
  selected,
  feedback,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: QuestionPlayPhase;
  selected: unknown;
  feedback: Record<string, unknown>;
  isCorrect: boolean | null;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const t = useTranslations("lesson");
  const left = useMemo(
    () => (Array.isArray(payload.left_items) ? (payload.left_items as Array<{ id: string; text: string; image_url?: string | null }>) : []),
    [payload.left_items]
  );
  const right = useMemo(
    () => (Array.isArray(payload.right_items) ? (payload.right_items as Array<{ id: string; text: string; image_url?: string | null }>) : []),
    [payload.right_items]
  );
  const matchItemsKey = useMemo(
    () =>
      `${left.map((item) => item.id).join("\0")}\0${right.map((item) => item.id).join("\0")}`,
    [left, right]
  );
  // Two columns, each read top to bottom, exactly as laid out on screen.
  useReadingLayout([
    ...left.map((item) => ({ key: `left:${item.id}`, group: "left" as const, pictureOnly: !item.text })),
    ...right.map((item) => ({ key: `right:${item.id}`, group: "right" as const, pictureOnly: !item.text })),
  ]);
  const hasListen = useItemListen();
  const [matches, setMatches] = useState<Record<string, string>>(() => readMatches(selected));
  const [pick, setPick] = useState<{ side: "left" | "right"; id: string } | null>(null);
  const [matchesKey, setMatchesKey] = useState(matchItemsKey);
  const boardId = useId().replace(/:/g, "");
  const [lines, setLines] = useState<Array<{ leftId: string; rightId: string; x1: number; y1: number; x2: number; y2: number }>>(
    []
  );

  if (matchItemsKey !== matchesKey) {
    setMatchesKey(matchItemsKey);
    setMatches(readMatches(selected));
    setPick(null);
  }

  const locked = phase === "feedback";
  const correctMap =
    feedback.label === "correct"
      ? matches
      : feedback.correct_matches && typeof feedback.correct_matches === "object"
      ? (feedback.correct_matches as Record<string, string>)
      : null;
  // Stable per-question color+glyph identity for each correct pair, revealed
  // only once locked — never before, so the answer can't be read off early.
  const pairAccentByLeftId = useMemo(() => {
    if (!correctMap) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    Object.keys(correctMap).forEach((leftId, index) => {
      map[leftId] = index % PAIR_ACCENTS.length;
    });
    return map;
  }, [correctMap]);
  const visibleMatches = locked && correctMap ? correctMap : matches;

  function publish(next: Record<string, string>) {
    setMatches(next);
    const ready = left.length > 0 && left.every((item) => next[item.id]);
    onChange({ matches: next }, ready);
  }

  function edgeLine(leftId: string, rightId: string) {
    const board = document.getElementById(boardId);
    if (!board) return null;
    const leftEl = board.querySelector<HTMLButtonElement>(`[data-match-left="${leftId}"]`);
    const rightEl = board.querySelector<HTMLButtonElement>(`[data-match-right="${rightId}"]`);
    if (!leftEl || !rightEl) return null;
    const boardBox = board.getBoundingClientRect();
    const a = leftEl.getBoundingClientRect();
    const b = rightEl.getBoundingClientRect();
    const rtl = getComputedStyle(board).direction === "rtl";
    // Connect from the inner edges so the stroke sits in the gap, not over the text.
    return {
      leftId,
      rightId,
      x1: (rtl ? a.left : a.right) - boardBox.left,
      y1: a.top + a.height / 2 - boardBox.top,
      x2: (rtl ? b.right : b.left) - boardBox.left,
      y2: b.top + b.height / 2 - boardBox.top,
    };
  }

  function refreshLines(nextMatches: Record<string, string>) {
    const nextLines = Object.entries(nextMatches)
      .map(([leftId, rightId]) => edgeLine(leftId, rightId))
      .filter((row): row is NonNullable<typeof row> => row != null);
    setLines(nextLines);
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (Object.keys(visibleMatches).length === 0) {
        setLines([]);
        return;
      }
      refreshLines(visibleMatches);
    });
    const onResize = () => refreshLines(visibleMatches);
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [visibleMatches, phase, left, right]);

  function clearMatch(leftId: string) {
    if (locked) return;
    const next = { ...matches };
    delete next[leftId];
    publish(next);
    setPick(null);
  }

  function pair(leftId: string, rightId: string) {
    if (locked) return;
    playUiTone("pop");
    const next = { ...matches, [leftId]: rightId };
    for (const [lid, rid] of Object.entries(next)) {
      if (lid !== leftId && rid === rightId) delete next[lid];
    }
    publish(next);
    setPick(null);
  }

  function onLeftClick(id: string) {
    if (locked) return;
    if (matches[id] && pick?.side !== "right") {
      clearMatch(id);
      return;
    }
    playUiTone("click");
    if (pick?.side === "right") {
      const rightId = pick.id;
      pair(id, rightId);
      return;
    }
    setPick(pick?.side === "left" && pick.id === id ? null : { side: "left", id });
  }

  function onRightClick(id: string) {
    if (locked) return;
    const owner = Object.entries(matches).find(([, rid]) => rid === id)?.[0];
    if (owner) {
      clearMatch(owner);
      return;
    }
    playUiTone("click");
    if (pick?.side === "left") {
      const leftId = pick.id;
      pair(leftId, id);
      return;
    }
    setPick(pick?.side === "right" && pick.id === id ? null : { side: "right", id });
  }

  function lineColor(leftId: string, rightId: string) {
    if (!locked || !correctMap) return "#94A3B8";
    return correctMap[leftId] === rightId ? ["#0369a1", "#6d28d9", "#b45309", "#be123c", "#0f766e", "#c2410c"][pairAccentByLeftId[leftId] ?? 0] : "#FB7185";
  }

  function cardTone(opts: {
    side: "left" | "right";
    id: string;
    paired: boolean;
    ok: boolean | null;
  }) {
    const selected = pick?.side === opts.side && pick.id === opts.id;
    const awaiting = Boolean(pick && pick.side !== opts.side && !opts.paired && !locked);
    if (locked && correctMap) {
      const leftId = opts.side === "left" ? opts.id : Object.keys(correctMap).find((id) => correctMap[id] === opts.id);
      const index = leftId == null ? undefined : pairAccentByLeftId[leftId];
      if (index != null) {
        const accent = PAIR_ACCENTS[index]!;
        return `border-transparent ring-2 ${accent.ring} ${accent.bg} ${accent.text}`;
      }
    }
    if (opts.ok === false) return "border-rose-300 bg-rose-50/50";
    if (opts.ok === true) return "play-glow-ring border-emerald-300 bg-emerald-50/50";
    if (selected) {
      return opts.side === "left"
        ? "play-choice-selected border-sky-500 bg-sky-100"
        : "play-choice-selected border-violet-500 bg-violet-100";
    }
    if (awaiting) {
      return opts.side === "left"
        ? "border-sky-300 bg-sky-50/70"
        : "border-violet-300 bg-violet-50/70";
    }
    if (opts.paired) return "border-slate-200 bg-slate-50/80";
    return opts.side === "left" ? "border-sky-100 bg-white" : "border-violet-100 bg-white";
  }

  const rowCount = Math.max(left.length, right.length, 1);

  return (
    <div id={boardId} className="relative space-y-3">
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
        {lines.map((line) => (
          <line
            key={`${line.leftId}-${line.rightId}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={lineColor(line.leftId, line.rightId)}
            strokeWidth="4"
            strokeLinecap="round"
            opacity={locked ? 1 : 0.85}
          />
        ))}
      </svg>

      {Array.from({ length: rowCount }, (_, row) => {
        const leftItem = left[row];
        const rightItem = right[row];
        return (
          <div key={row} className="relative z-10 grid grid-cols-2 items-stretch gap-6 sm:gap-10">
            {leftItem ? (
              (() => {
                const pairedRight = matches[leftItem.id];
                const ok = locked && correctMap ? correctMap[leftItem.id] === pairedRight : null;
                const expectedId = correctMap?.[leftItem.id];
                const expected = expectedId ? right.find((rowItem) => rowItem.id === expectedId)?.text : null;
                const pairIndex = locked && correctMap ? pairAccentByLeftId[leftItem.id] : undefined;
                return (
                  <div className="relative flex">
                  <button
                    type="button"
                    data-match-left={leftItem.id}
                    disabled={locked}
                    onClick={() => onLeftClick(leftItem.id)}
                    className={`relative flex min-h-[4.75rem] w-full flex-col items-stretch justify-center rounded-[22px] border-[3px] px-3 py-3 text-start text-sm font-extrabold text-text-navy shadow-[0_8px_24px_-16px_rgba(26,43,71,0.35)] transition-colors sm:text-base ${hasListen(`left:${leftItem.id}`) ? "pe-12" : ""} ${cardTone(
                      { side: "left", id: leftItem.id, paired: Boolean(pairedRight), ok }
                    )}`}
                  >
                    {pairIndex != null ? <PairBadge accent={PAIR_ACCENTS[pairIndex]!} /> : null}
                    <ItemPicture url={leftItem.image_url} text={leftItem.text} />
                    {leftItem.text ? <span>{leftItem.text}</span> : null}
                    {ok === false && expected ? (
                      <span className="mt-1 text-xs font-bold text-rose-500">
                        {t("matchShouldBe", { text: expected })}
                      </span>
                    ) : null}
                  </button>
                  <ListenItem
                    id={`left:${leftItem.id}`}
                    label={leftItem.text || t("listenOptionLabel", { letter: String(row + 1) })}
                    className="absolute end-1 top-1/2 h-10 w-10 -translate-y-1/2"
                  />
                  </div>
                );
              })()
            ) : (
              <div />
            )}

            {rightItem ? (
              (() => {
                const paired = Object.values(matches).includes(rightItem.id);
                const owner = Object.entries(matches).find(([, rid]) => rid === rightItem.id)?.[0];
                const ok = locked && correctMap && owner ? correctMap[owner] === rightItem.id : null;
                const correctOwnerLeftId = correctMap
                  ? Object.entries(correctMap).find(([, rid]) => rid === rightItem.id)?.[0]
                  : undefined;
                const pairIndex =
                  locked && correctOwnerLeftId != null ? pairAccentByLeftId[correctOwnerLeftId] : undefined;
                return (
                  <div className="relative flex">
                  <button
                    type="button"
                    data-match-right={rightItem.id}
                    disabled={locked}
                    onClick={() => onRightClick(rightItem.id)}
                    className={`relative flex min-h-[4.75rem] w-full flex-col items-stretch justify-center gap-1 rounded-[22px] border-[3px] px-3 py-3 text-start text-sm font-extrabold text-text-navy shadow-[0_8px_24px_-16px_rgba(26,43,71,0.35)] transition-colors sm:text-base ${hasListen(`right:${rightItem.id}`) ? "pe-12" : ""} ${cardTone(
                      { side: "right", id: rightItem.id, paired, ok }
                    )}`}
                  >
                    {pairIndex != null ? <PairBadge accent={PAIR_ACCENTS[pairIndex]!} /> : null}
                    <ItemPicture url={rightItem.image_url} text={rightItem.text} />
                    {rightItem.text ? <span>{rightItem.text}</span> : null}
                  </button>
                  <ListenItem
                    id={`right:${rightItem.id}`}
                    label={rightItem.text || t("listenOptionLabel", { letter: String(row + 1) })}
                    className="absolute end-1 top-1/2 h-10 w-10 -translate-y-1/2"
                  />
                  </div>
                );
              })()
            ) : (
              <div />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DragBody({
  payload,
  phase,
  selected,
  feedback,
  isCorrect,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: QuestionPlayPhase;
  selected: unknown;
  feedback: Record<string, unknown>;
  isCorrect: boolean | null;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const t = useTranslations("lesson");
  const categories = Array.isArray(payload.categories)
    ? (payload.categories as Array<{ id: string; name: string; image_url?: string | null }>)
    : [];
  const items = Array.isArray(payload.items)
    ? (payload.items as Array<{ id: string; text: string; image_url?: string | null }>)
    : [];
  const [assignments, setAssignments] = useState<Record<string, string>>(() => readAssignments(selected));
  const [pick, setPick] = useState<string | null>(null);
  const [drag, setDrag] = useState<{
    itemId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [hoverZone, setHoverZone] = useState<string | null>(null);
  const dragRef = useRef<{
    itemId: string;
    pointerId: number;
    moved: boolean;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } | null>(null);

  function publish(next: Record<string, string>) {
    setAssignments(next);
    onChange({ assignments: next }, items.length > 0 && items.every((item) => next[item.id]));
  }

  function assign(itemId: string, categoryId: string) {
    publish({ ...assignments, [itemId]: categoryId });
    setPick(null);
    playUiTone("pop");
  }

  function clearItem(itemId: string) {
    const next = { ...assignments };
    delete next[itemId];
    publish(next);
    setPick(null);
  }

  function zoneFromPoint(clientX: number, clientY: number): string | null {
    const stack = document.elementsFromPoint(clientX, clientY);
    for (const node of stack) {
      if (!(node instanceof HTMLElement)) continue;
      const zone = node.closest<HTMLElement>("[data-drop-zone]");
      if (zone?.dataset.dropZone) return zone.dataset.dropZone;
    }
    return null;
  }

  function onCardPointerDown(event: ReactPointerEvent<HTMLButtonElement>, itemId: string) {
    if (phase === "feedback") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      itemId,
      pointerId: event.pointerId,
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    };
    setDrag({
      itemId,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
    setPick(itemId);
    setHoverZone(null);
  }

  function onCardPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 6) {
      active.moved = true;
    }
    setDrag((prev) =>
      prev
        ? {
            ...prev,
            x: event.clientX - active.offsetX,
            y: event.clientY - active.offsetY,
          }
        : prev
    );
    setHoverZone(zoneFromPoint(event.clientX, event.clientY));
  }

  function finishPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const zone = zoneFromPoint(event.clientX, event.clientY);
    const moved = active.moved;
    const itemId = active.itemId;
    dragRef.current = null;
    setDrag(null);
    setHoverZone(null);

    if (moved) {
      if (zone === "tray") clearItem(itemId);
      else if (zone) assign(itemId, zone);
      return;
    }

    // Tap fallback: select, or place into a tapped zone, or clear if already assigned.
    if (assignments[itemId]) {
      clearItem(itemId);
      return;
    }
    setPick(itemId);
  }

  const correctMap =
    feedback.correct_assignments && typeof feedback.correct_assignments === "object"
      ? (feedback.correct_assignments as Record<string, string>)
      : null;
  const locked = phase === "feedback";
  const unassigned = items.filter((item) => !assignments[item.id]);
  const draggingItem = drag ? items.find((item) => item.id === drag.itemId) : null;
  // Screen order: the tray first (items still waiting), then the bins.
  useReadingLayout([
    ...unassigned.map((item) => ({ key: `item:${item.id}`, group: "tray" as const, pictureOnly: !item.text })),
    ...categories.map((cat) => ({ key: `cat:${cat.id}`, group: "categories" as const, pictureOnly: !cat.name })),
  ]);
  const hasListen = useItemListen();

  const binThemes = [
    { shell: "from-sky-100 to-sky-200 border-sky-300", marker: "●", glow: "border-sky-400 bg-sky-50 scale-[1.03]", accent: "border-sky-400 bg-sky-50 text-sky-800" },
    { shell: "from-violet-100 to-violet-200 border-violet-300", marker: "◆", glow: "border-violet-400 bg-violet-50 scale-[1.03]", accent: "border-violet-400 bg-violet-50 text-violet-800" },
    { shell: "from-amber-100 to-amber-200 border-amber-300", marker: "▲", glow: "border-amber-400 bg-amber-50 scale-[1.03]", accent: "border-amber-400 bg-amber-50 text-amber-800" },
    { shell: "from-slate-100 to-slate-200 border-slate-300", marker: "■", glow: "border-slate-400 bg-slate-50 scale-[1.03]", accent: "border-slate-400 bg-slate-50 text-slate-800" },
  ];
  const categoryIndexById = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((cat, index) => {
      map[cat.id] = index % binThemes.length;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  function correctThemeFor(itemId: string) {
    const expectedCategoryId = correctMap?.[itemId];
    if (expectedCategoryId == null) return null;
    const index = categoryIndexById[expectedCategoryId];
    return index != null ? binThemes[index] ?? null : null;
  }

  function cardClass(itemId: string, inBucket: boolean) {
    const assigned = assignments[itemId];
    const ok = correctMap ? correctMap[itemId] === assigned : isCorrect;
    if (locked && ok === false) {
      const theme = correctThemeFor(itemId);
      return theme ? `play-badge-pop ${theme.accent}` : "border-neutral-200 bg-neutral-50 text-text-gray";
    }
    if (locked && ok === true) return "play-glow-ring border-emerald-300 bg-emerald-50 text-emerald-800";
    if (pick === itemId || drag?.itemId === itemId) return "play-choice-selected border-primary-orange bg-white text-text-navy";
    if (inBucket) return "border-neutral-100 bg-white shadow-sm";
    return "border-neutral-100 bg-white shadow-[0_10px_24px_-14px_rgba(26,43,71,0.3)]";
  }

  function renderCard(item: { id: string; text: string; image_url?: string | null }, inBucket: boolean) {
    const isGhost = drag?.itemId === item.id;
    const assigned = assignments[item.id];
    const ok = locked && correctMap ? correctMap[item.id] === assigned : null;
    const wrongTheme = locked && ok === false ? correctThemeFor(item.id) : null;
    const expectedCategoryName =
      wrongTheme && correctMap ? categories.find((cat) => cat.id === correctMap[item.id])?.name : null;
    return (
      <span key={item.id} className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={locked}
        onPointerDown={(event) => onCardPointerDown(event, item.id)}
        onClick={(event) => {
          event.stopPropagation();
          if (locked || event.detail !== 0) return;
          if (assignments[item.id]) clearItem(item.id);
          else setPick(item.id);
        }}
        onPointerMove={onCardPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={() => {
          dragRef.current = null;
          setDrag(null);
          setHoverZone(null);
          setPick(null);
        }}
        className={`play-drag-card relative flex flex-col items-center justify-center gap-1 touch-none select-none min-h-[3.35rem] rounded-[22px] border-[3px] px-4 py-2.5 text-sm font-extrabold sm:text-base ${cardClass(
          item.id,
          inBucket
        )} ${isGhost ? "opacity-30" : ""}`}
      >
        {ok === true ? <AnswerBadge correct /> : null}
        {wrongTheme ? (
          <span
            className="play-badge-pop absolute -top-2 -end-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs shadow-sm ring-2 ring-white"
            role="img"
            aria-label={expectedCategoryName ? t("belongsIn", { category: expectedCategoryName }) : undefined}
            title={expectedCategoryName ?? undefined}
          >
            {wrongTheme.marker}
          </span>
        ) : null}
        <ItemPicture url={item.image_url} text={item.text} small={inBucket} />
        {item.text}
        {expectedCategoryName ? <span className="mt-1 block text-xs font-bold">{t("belongsIn", { category: expectedCategoryName })}</span> : null}
      </button>
      {hasListen(`item:${item.id}`) ? (
        <ListenItem id={`item:${item.id}`} label={item.text || t("classifyTray")} className="h-10 w-10" />
      ) : null}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div
        data-drop-zone="tray"
        className={`rounded-[26px] border-[3px] border-dashed p-3 transition-colors ${
          hoverZone === "tray" ? "border-primary-orange bg-orange-50" : "border-sky-100 bg-white/70"
        }`}
      >
        <p className="mb-2 text-center text-xs font-extrabold text-text-gray">{t("classifyTray")}</p>
        <div className="flex min-h-[3.5rem] flex-wrap justify-center gap-2.5">
          {unassigned.length === 0 ? (
            <p className="py-2 text-sm font-bold text-text-gray">{t("classifyTrayEmpty")}</p>
          ) : (
            unassigned.map((item) => renderCard(item, false))
          )}
        </div>
      </div>

      <div className={`grid gap-3 ${categories.length > 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"}`}>
        {categories.map((cat, catIndex) => {
          const inBucket = items.filter((item) => assignments[item.id] === cat.id);
          const theme = binThemes[catIndex % binThemes.length]!;
          const hot = hoverZone === cat.id;
          return (
            <div
              key={cat.id}
              data-drop-zone={cat.id}
              onClick={() => {
                if (locked || !pick) return;
                assign(pick, cat.id);
              }}
              className={`play-bin relative min-h-[9.5rem] rounded-[30px] border-[4px] bg-gradient-to-b p-4 text-start transition-all duration-150 ${theme.shell} ${
                hot ? theme.glow : ""
              }`}
            >
              <button type="button" disabled={locked || !pick} onClick={(event) => {
                event.stopPropagation();
                if (pick && !locked) assign(pick, cat.id);
              }} className={`flex min-h-11 w-full items-center gap-2 text-start disabled:cursor-default ${hasListen(`cat:${cat.id}`) ? "pe-12" : ""}`}>
                <span className="text-2xl" aria-hidden="true">
                  {theme.marker}
                </span>
                <ItemPicture url={cat.image_url} text={cat.name} small />
                {cat.name ? <p className="text-base font-black text-text-navy">{cat.name}</p> : null}
              </button>
              <ListenItem id={`cat:${cat.id}`} label={cat.name || t("classifyTray")} className="absolute end-3 top-3 h-10 w-10" />
              <p className="mt-1 text-xs font-bold text-text-gray">{t("dropHere")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {inBucket.map((item) => renderCard(item, true))}
              </div>
            </div>
          );
        })}
      </div>

      {drag && draggingItem ? (
        <div
          className="play-drag-ghost pointer-events-none fixed z-[80] rounded-[22px] border-[3px] border-primary-orange bg-white px-4 py-2.5 text-sm font-extrabold text-text-navy shadow-[0_18px_40px_-12px_rgba(26,43,71,0.45)] sm:text-base"
          style={{
            left: drag.x,
            top: drag.y,
            width: drag.width,
            minHeight: drag.height,
            transform: "scale(1.08) rotate(-2deg)",
          }}
        >
          <ItemPicture url={draggingItem.image_url} text={draggingItem.text} small />
          {draggingItem.text}
        </div>
      ) : null}
    </div>
  );
}

function OrderingBody({
  payload,
  phase,
  selected,
  feedback,
  isCorrect,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: QuestionPlayPhase;
  selected: unknown;
  feedback: Record<string, unknown>;
  isCorrect: boolean | null;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const t = useTranslations("lesson");
  const tokens = Array.isArray(payload.tokens) ? (payload.tokens as Array<{ id: string; text: string; image_url?: string | null }>) : [];
  const [order, setOrder] = useState<string[]>(() => readOrder(selected));
  const [justReturnedIds, setJustReturnedIds] = useState<string[]>([]);
  const returnTimerRef = useRef<number | null>(null);
  const slotCount = Math.max(tokens.length, 1);
  const locked = phase === "feedback";
  // The word bank as it looks now: tokens already placed in a slot are not in it.
  useReadingLayout(
    tokens
      .filter((token) => !order.includes(token.id))
      .map((token) => ({ key: `tok:${token.id}`, group: "tokens" as const, pictureOnly: !token.text })),
  );
  const hasListen = useItemListen();

  useEffect(() => {
    return () => {
      if (returnTimerRef.current) window.clearTimeout(returnTimerRef.current);
    };
  }, []);

  function publish(next: string[]) {
    setOrder(next);
    onChange({ order: next }, next.length === tokens.length && tokens.length > 0);
  }

  function placeToken(id: string) {
    if (locked || order.includes(id)) return;
    const empty = order.length;
    if (empty >= tokens.length) return;
    playUiTone("pop");
    publish([...order, id]);
  }

  // Tapping a placed card unlinks the chain starting at that point: the tapped
  // card AND every card after it return together to the bank, leaving only the
  // correct earlier portion in place. This avoids forcing a manual one-by-one
  // removal from the end when a student wants to rebuild from an earlier slot.
  function clearSlot(index: number) {
    if (locked) return;
    if (!order[index]) return;
    playUiTone("click");
    const removed = order.slice(index);
    const next = order.slice(0, index);
    publish(next);
    setJustReturnedIds(removed);
    if (returnTimerRef.current) window.clearTimeout(returnTimerRef.current);
    returnTimerRef.current = window.setTimeout(() => setJustReturnedIds([]), 450);
  }

  const correctOrder = Array.isArray(feedback.correct_order) ? (feedback.correct_order as string[]) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-center gap-2.5">
        {tokens
          .filter((token) => !order.includes(token.id))
          .map((token) => (
            <span key={token.id} className="inline-flex items-center gap-1">
            <button
              type="button"
              disabled={locked}
              onClick={() => placeToken(token.id)}
              className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-[20px] border-[3px] border-white bg-sky-100 px-4 py-2.5 text-sm font-extrabold text-text-navy shadow-sm sm:text-base ${
                justReturnedIds.includes(token.id) ? "play-return-pop" : ""
              }`}
            >
              <ItemPicture url={token.image_url} text={token.text} small />
              {token.text}
            </button>
            {hasListen(`tok:${token.id}`) ? (
              <ListenItem id={`tok:${token.id}`} label={token.text || t("orderSlot", { n: "" })} className="h-10 w-10" />
            ) : null}
            </span>
          ))}
      </div>
      {!locked && order.length > 0 ? (
        <p className="text-center text-xs font-bold text-text-gray">{t("hintOrderClear")}</p>
      ) : null}

      <div className="relative mx-auto w-full max-w-sm">
        <svg className="pointer-events-none absolute start-7 top-4 bottom-4 w-0" aria-hidden="true">
          <line x1="0" y1="0" x2="0" y2="100%" stroke="#D5DCE6" strokeWidth="6" strokeLinecap="round" />
          {locked && isCorrect !== false ? (
            <line x1="0" y1="0" x2="0" y2="100%" stroke="#2EC4A8" strokeWidth="5" strokeLinecap="round" />
          ) : null}
        </svg>
        <div className="absolute start-[1.55rem] top-4 bottom-4 w-1.5 rounded-full bg-[#D5DCE6]" aria-hidden="true">
          <div
            className="w-full rounded-full bg-[#2EC4A8] transition-all duration-500"
            style={{ height: `${tokens.length ? (order.length / tokens.length) * 100 : 0}%` }}
          />
        </div>

        <ol className="relative space-y-3">
          {Array.from({ length: slotCount }, (_, index) => {
            const id = order[index];
            const token = id ? tokens.find((row) => row.id === id) : null;
            const ok = locked && correctOrder ? correctOrder[index] === id : null;
            return (
              <li key={index} className="flex items-center gap-3">
                <span
                  className={`relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-white text-lg font-black shadow-md ${
                    token
                      ? ok === false
                        ? "bg-rose-400 text-white"
                        : ok === true
                          ? "bg-emerald-500 text-white"
                          : "bg-sky-600 text-white"
                      : "bg-[#E8EAEE] text-[#9AA3AF]"
                  }`}
                >
                  {toIndicDigits(index + 1)}
                </span>
                <button
                  type="button"
                  disabled={locked || !token}
                  onClick={() => clearSlot(index)}
                  aria-label={t("orderSlot", { n: toIndicDigits(index + 1) })}
                  className={`flex min-h-[3.5rem] flex-1 items-center gap-2 rounded-[22px] border-[3px] px-4 py-2 text-start text-sm font-extrabold sm:text-base ${
                    token
                      ? ok === false
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : ok === true
                          ? "play-glow-ring border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-white bg-white text-text-navy shadow-[0_8px_24px_-16px_rgba(26,43,71,0.4)]"
                      : "border-dashed border-slate-200 bg-white/70 text-text-gray"
                  }`}
                >
                  {token ? (
                    <>
                      <ItemPicture url={token.image_url} text={token.text} small />
                      {token.text}
                    </>
                  ) : (
                    "…"
                  )}
                </button>
                {token && hasListen(`tok:${token.id}`) ? (
                  <ListenItem id={`tok:${token.id}`} label={token.text || t("orderSlot", { n: toIndicDigits(index + 1) })} className="h-10 w-10" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {locked && correctOrder && isCorrect === false ? (
        <p className="text-center text-sm font-bold text-emerald-700">
          {t("expected")}:{" "}
          {correctOrder.map((id) => tokens.find((token) => token.id === id)?.text).filter(Boolean).join(" ← ")}
        </p>
      ) : null}
    </div>
  );
}

function CrosswordBody({
  payload,
  phase,
  selected,
  feedback,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: QuestionPlayPhase;
  selected: unknown;
  feedback: Record<string, unknown>;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const t = useTranslations("lesson");
  const words = Array.isArray(payload.words)
    ? (payload.words as Array<{ id: string; clue: string; length?: number }>)
    : [];
  useReadingLayout(words.map((word) => ({ key: `clue:${word.id}`, group: "clues" as const })));
  const hasListen = useItemListen();
  const [answers, setAnswers] = useState<Record<string, string>>(() => readCrosswordAnswers(selected));
  const correctAnswers = feedback.correct_answers && typeof feedback.correct_answers === "object"
    ? feedback.correct_answers as Record<string, string>
    : null;

  function setWord(id: string, value: string) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onChange({ answers: next }, words.length > 0 && words.every((word) => (next[word.id] ?? "").trim() !== ""));
  }

  return (
    <div className="space-y-3">
      {words.map((word, index) => {
        const expected = phase === "feedback" ? correctAnswers?.[word.id] : null;
        const correct = expected != null ? answers[word.id]?.trim() === expected.trim() : null;
        return <label
          key={word.id}
          className={`relative block rounded-[24px] border-[3px] bg-white p-4 shadow-[0_8px_24px_-16px_rgba(26,43,71,0.4)] ${correct === true ? "border-emerald-300 bg-emerald-50" : correct === false ? "border-rose-200 bg-rose-50/40" : "border-white"}`}
        >
          <span className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-sm font-black text-amber-700">
              {toIndicDigits(index + 1)}
            </span>
            <span className={`text-base font-extrabold leading-snug text-text-navy ${hasListen(`clue:${word.id}`) ? "pe-12" : ""}`}>{word.clue}</span>
          </span>
          <input
            disabled={phase === "feedback"}
            maxLength={word.length ?? 40}
            className="mt-3 w-full rounded-2xl border-2 border-sky-100 bg-sky-50/60 px-4 py-3 text-base font-extrabold text-text-navy outline-none focus:border-primary-orange"
            value={answers[word.id] ?? ""}
            onChange={(event) => setWord(word.id, event.target.value)}
          />
          {/* After the input in DOM order so the <label> still focuses the input, not this button. */}
          <ListenItem id={`clue:${word.id}`} label={word.clue || t("listenOptionLabel", { letter: toIndicDigits(index + 1) })} className="absolute end-3 top-3 h-10 w-10" />
          {correct === true ? <span className="mt-2 block text-sm font-extrabold text-emerald-700">✓ {t("correct")}</span> : null}
          {correct === false ? <span className="mt-2 block text-sm font-extrabold text-text-navy">{t("expected")}: {toIndicDigits(expected ?? "")}</span> : null}
        </label>
      })}
    </div>
  );
}

function readMatches(selected: unknown): Record<string, string> {
  if (!selected || typeof selected !== "object") return {};
  const matches = (selected as { matches?: unknown }).matches;
  if (!matches || typeof matches !== "object") return {};
  return { ...(matches as Record<string, string>) };
}

function readAssignments(selected: unknown): Record<string, string> {
  if (!selected || typeof selected !== "object") return {};
  const assignments = (selected as { assignments?: unknown }).assignments;
  if (!assignments || typeof assignments !== "object") return {};
  return { ...(assignments as Record<string, string>) };
}

function readOrder(selected: unknown): string[] {
  if (!selected || typeof selected !== "object") return [];
  const order = (selected as { order?: unknown }).order;
  return Array.isArray(order) ? order.map(String) : [];
}

function readCrosswordAnswers(selected: unknown): Record<string, string> {
  if (!selected || typeof selected !== "object") return {};
  const answers = (selected as { answers?: unknown }).answers;
  if (!answers || typeof answers !== "object") return {};
  return { ...(answers as Record<string, string>) };
}

function RechargeView({ endsAt, childId }: { endsAt: string | null; childId: number }) {
  const t = useTranslations("lesson");
  const [label, setLabel] = useState("--:--");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("00:00");
        setReady(true);
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setReady(false);
      setLabel(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-28 w-20 items-end justify-center rounded-2xl bg-violet-200 p-2">
        <div className="h-6 w-full rounded bg-red-400" />
      </div>
      <h1 className="text-2xl font-extrabold text-text-navy">{t("rechargeTitle")}</h1>
      <p className="mt-3 max-w-sm text-sm font-semibold leading-relaxed text-text-gray">{t("rechargeBody")}</p>
      <p className="mt-4 text-lg font-extrabold text-violet-600">{t("rechargeTimer", { time: label })}</p>
      <div className="mt-8 grid w-full max-w-sm grid-cols-1 gap-2.5">
        {ready ? <Button onClick={() => window.location.reload()}>{t("resumeAfterBreak")}</Button> : null}
        <Button href={withChildQuery("/headquarters", childId)}>{t("rechargeHq")}</Button>
        <Button href={withChildQuery("/store", childId)} variant="secondary">
          {t("rechargeStore")}
        </Button>
      </div>
    </div>
  );
}
