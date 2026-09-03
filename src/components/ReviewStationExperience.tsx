"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { QuestionBody } from "@/components/LessonPlayExperience";
import {
  getReviewQuestion,
  getUnitReview,
  submitReviewAnswer,
  type ReviewSummary,
} from "@/lib/api/review";
import type { PlayQuestion } from "@/lib/api/lessonPlay";
import { withChildQuery } from "@/lib/config/subjects";

type Props = {
  unitId: number;
  childId: number;
};

type Phase = "playing" | "feedback" | "done" | "empty" | "error";

export function ReviewStationExperience({ unitId, childId }: Props) {
  const t = useTranslations("review");
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

  async function onSubmit() {
    if (!summary || !question || selected == null || busy) return;
    setBusy(true);
    try {
      const result = await submitReviewAnswer(summary.sessionId, question.id, selected);
      setIsCorrect(result.isCorrect);
      setFeedback(result.feedback);
      setSummary({ ...summary, remaining: result.remaining, status: result.status, pointsEarned: result.pointsEarned });
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
    if (phase !== "done") return;
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
        <Image src="/images/student/review-station.png" alt="" width={140} height={140} unoptimized className="h-28 w-28 object-contain" />
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
        <Image src="/images/student/review-station.png" alt="" width={140} height={140} unoptimized className="h-28 w-28 object-contain" />
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

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Image src="/images/student/review-station.png" alt="" width={56} height={56} unoptimized className="h-12 w-12 object-contain" />
        <div>
          <h1 className="text-lg font-extrabold text-text-navy">{t("title")}</h1>
          <p className="text-xs font-bold text-text-gray">{summary?.unitTitle}</p>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full rounded-full bg-primary-orange transition-[width] duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {question ? (
        <div className="mt-4 rounded-[28px] bg-white p-5 shadow-[0_12px_32px_-20px_rgba(26,43,71,0.45)]">
          <p className="text-center text-lg font-extrabold leading-relaxed text-text-navy">{question.questionText}</p>
        </div>
      ) : null}

      <div className="mt-4 flex-1">
        {question ? (
          <QuestionBody
            key={`${question.id}-${summary?.remaining ?? 0}-${phase}`}
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
        <p className={`mb-3 text-center text-sm font-extrabold ${isCorrect ? "text-emerald-600" : "text-red-500"}`}>
          {isCorrect ? t("correct") : t("incorrect")}
        </p>
      ) : null}

      {phase === "playing" ? (
        <Button onClick={onSubmit} disabled={!canSubmit || busy} fullWidth>
          {t("submit")}
        </Button>
      ) : (
        <Button onClick={onNext} disabled={busy} fullWidth>
          {t("next")}
        </Button>
      )}
    </div>
  );
}
