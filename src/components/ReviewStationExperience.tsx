"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import {
  PlayChrome,
  PlayFeedbackBanner,
  QuestionBody,
  hintLabelForGameType,
} from "@/components/LessonPlayExperience";
import {
  getReviewQuestion,
  getUnitReview,
  submitReviewAnswer,
  type ReviewSummary,
} from "@/lib/api/review";
import type { PlayQuestion } from "@/lib/api/lessonPlay";
import { withChildQuery } from "@/lib/config/subjects";
import { playUiTone } from "@/lib/play/uiSounds";
import { isExperienceCelebrationEnabled } from "@/lib/experience/experiencePrefs";

type Props = {
  unitId: number;
  childId: number;
};

type Phase = "playing" | "feedback" | "done" | "empty" | "error";

export function ReviewStationExperience({ unitId, childId }: Props) {
  const t = useTranslations("review");
  const tLesson = useTranslations("lesson");
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [question, setQuestion] = useState<PlayQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [selected, setSelected] = useState<unknown>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [bonus, setBonus] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getUnitReview(unitId, childId);
        if (cancelled) return;
        if (!next || next.status === "completed" || next.remaining <= 0) {
          setSummary(next);
          setBonus(next?.pointsEarned ?? 0);
          setPhase(next?.status === "completed" ? "done" : "empty");
          return;
        }
        setSummary(next);
        const q = await getReviewQuestion(next.sessionId);
        if (cancelled) return;
        setQuestion(q);
        setPhase("playing");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitId, childId]);

  useEffect(() => {
    if (phase !== "feedback" || isCorrect == null) return;
    playUiTone(isCorrect ? "success" : "wrong");
    if (!isCorrect || !isExperienceCelebrationEnabled()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void confetti({
      particleCount: 32,
      spread: 50,
      startVelocity: 26,
      origin: { y: 0.72 },
      colors: ["#F48232", "#FDE68A", "#86EFAC", "#7DD3FC"],
      disableForReducedMotion: true,
    });
  }, [phase, isCorrect, question?.id]);

  async function onSubmit() {
    if (!summary || !question || selected == null || busy) return;
    setBusy(true);
    try {
      const result = await submitReviewAnswer(summary.sessionId, question.id, selected);
      setIsCorrect(result.isCorrect);
      setFeedback(result.feedback);
      setSummary({
        ...summary,
        remaining: result.remaining,
        status: result.status,
        pointsEarned: result.pointsEarned,
      });
      setBonus(result.pointsEarned);
      setPhase("feedback");
    } catch {
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  async function onNext() {
    if (!summary) return;
    if (summary.status === "completed" || summary.remaining <= 0) {
      setPhase("done");
      return;
    }
    setBusy(true);
    try {
      const q = await getReviewQuestion(summary.sessionId);
      setQuestion(q);
      setSelected(null);
      setCanSubmit(false);
      setIsCorrect(null);
      setFeedback({});
      setPhase("playing");
    } catch {
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (phase !== "done" || !isExperienceCelebrationEnabled()) return;
    playUiTone("bigSuccess");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.35 },
      colors: ["#F48232", "#FDE68A", "#7DD3FC"],
      disableForReducedMotion: true,
    });
    return () => {
      confetti.reset();
    };
  }, [phase]);

  const backHref =
    summary && summary.subjectId > 0
      ? withChildQuery(`/subjects/${summary.subjectId}/units`, childId)
      : withChildQuery("/subjects", childId);

  if (phase === "error") {
    return <p className="py-16 text-center font-bold text-text-gray">{t("loadError")}</p>;
  }

  if (!summary && phase !== "empty") {
    return <p className="py-16 text-center font-bold text-text-gray">{t("loading")}</p>;
  }

  if (phase === "empty") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Image
          src="/images/student/review-station.png"
          alt=""
          width={140}
          height={140}
          unoptimized
          className="h-28 w-28 object-contain"
        />
        <p className="mt-4 font-bold text-text-gray">{t("empty")}</p>
        <Button href={backHref} className="mt-6">
          {t("back")}
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <Image
          src="/images/student/review-station.png"
          alt=""
          width={140}
          height={140}
          unoptimized
          className="h-28 w-28 object-contain"
        />
        <h1 className="mt-4 text-2xl font-extrabold text-text-navy">{t("done")}</h1>
        <p className="mt-2 text-lg font-extrabold text-primary-orange">{t("bonus", { count: bonus })}</p>
        <Button href={backHref} className="mt-8">
          {t("back")}
        </Button>
      </div>
    );
  }

  const total = Math.max(summary?.totalQuestions ?? 1, 1);
  const answered = total - (summary?.remaining ?? 0);
  const progressPct = Math.round((answered / total) * 100);
  const questionProgress = Math.min(answered + 1, total);

  return (
    <div className="play-stage relative flex min-h-[calc(100dvh-1.5rem)] flex-col pb-4">
      <div className="mb-3 flex items-center gap-3">
        <Image
          src="/images/student/review-station.png"
          alt=""
          width={48}
          height={48}
          unoptimized
          className="h-11 w-11 object-contain"
        />
        <div className="min-w-0">
          <h1 className="text-base font-extrabold text-text-navy">{t("title")}</h1>
          <p className="truncate text-xs font-bold text-text-gray">{summary?.unitTitle}</p>
        </div>
      </div>

      <PlayChrome
        progressPct={progressPct}
        questionLabel={t("questionProgress", { current: questionProgress, total })}
      />

      {question ? (
        <div className="play-question-card mt-4 rounded-[28px] border-[3px] border-white bg-white/95 px-5 py-6 shadow-[0_14px_36px_-18px_rgba(26,43,71,0.4)]">
          <p className="text-center text-xl font-extrabold leading-relaxed text-text-navy sm:text-2xl">
            {question.questionText}
          </p>
        </div>
      ) : null}

      <p className="mt-3 text-center text-sm font-bold text-text-gray">
        {question ? hintLabelForGameType(question.gameType, tLesson) : null}
      </p>

      <div className="mt-3 flex-1">
        {question ? (
          <QuestionBody
            key={`${question.id}-${summary?.remaining ?? 0}`}
            question={question}
            phase={phase === "feedback" ? "feedback" : "playing"}
            selected={selected}
            feedback={feedback}
            isCorrect={isCorrect}
            onChange={(value, ready) => {
              setSelected(value);
              setCanSubmit(ready);
            }}
          />
        ) : null}
      </div>

      {phase === "feedback" && isCorrect != null ? (
        <PlayFeedbackBanner
          isCorrect={isCorrect}
          correctLabel={t("correct")}
          incorrectLabel={t("incorrect")}
          niceTryLabel={t("niceTry")}
          explanation={typeof feedback.explanation === "string" ? feedback.explanation : null}
        />
      ) : null}

      <div className="sticky bottom-0 z-10 mt-4 bg-gradient-to-t from-[#F7FBFF] via-[#F7FBFF]/95 to-transparent pt-3">
        {phase === "playing" ? (
          <Button onClick={onSubmit} disabled={!canSubmit || busy} fullWidth>
            {t("check")}
          </Button>
        ) : (
          <Button onClick={onNext} disabled={busy} fullWidth>
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}
