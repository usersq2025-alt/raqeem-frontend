"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import type { LessonAttempt } from "@/lib/api/lessonPlay";
import { unitPathFocus, withChildQuery } from "@/lib/config/subjects";

const CONFETTI_COLORS = ["#F48232", "#F9A8D4", "#7DD3FC", "#FDE68A", "#C4B5FD", "#6EE7B7"];

type Props = {
  attempt: LessonAttempt;
  childId: number;
};

export function LessonCompleteCelebration({ attempt, childId }: Props) {
  const t = useTranslations("lesson");
  const tUnits = useTranslations("student.units");
  const replay = attempt.attemptNumber > 1;
  const awarded = replay ? 0 : attempt.pointsEarned;
  const stars = Math.max(0, Math.min(3, attempt.stars || (replay ? 0 : awarded > 0 ? Math.min(3, Math.max(1, Math.ceil(awarded / 4))) : 1)));
  const phrases = (t.raw("phrases") as string[] | undefined) ?? [];
  const phrase = phrases.length > 0 ? phrases[attempt.id % phrases.length] : t("finished");
  const nextHref =
    attempt.nextLessonId && attempt.unitId
      ? unitPathFocus(attempt.unitId, childId, attempt.nextLessonId)
      : withChildQuery("/subjects", childId);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void confetti({
      particleCount: 90,
      spread: 76,
      startVelocity: 34,
      origin: { y: 0.28 },
      colors: CONFETTI_COLORS,
      scalar: 0.9,
      ticks: 180,
      disableForReducedMotion: true,
    });
    const later = window.setTimeout(() => {
      void confetti({
        particleCount: 40,
        spread: 110,
        origin: { y: 0.45 },
        colors: CONFETTI_COLORS,
        scalar: 0.7,
        disableForReducedMotion: true,
      });
    }, 420);
    return () => {
      window.clearTimeout(later);
      confetti.reset();
    };
  }, []);

  const homeHref = useMemo(() => withChildQuery("/subjects", childId), [childId]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10 text-center">
      <p className="text-sm font-extrabold text-primary-orange">{phrase}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-text-navy">{t("finished")}</h1>
      <div className="celebration-stars mt-6 flex items-end gap-2" aria-label={t("stars", { count: stars })}>
        {[1, 2, 3].map((index) => (
          <Star key={index} filled={index <= stars} delay={index} large={index === 2} />
        ))}
      </div>
      <p className={`mt-6 text-2xl font-extrabold ${awarded > 0 ? "text-primary-orange" : "text-text-gray"}`}>
        {t("points", { count: awarded })}
      </p>
      {replay ? <p className="mt-1 text-sm font-semibold text-text-gray">{t("replayPoints")}</p> : null}

      {attempt.gift ? (
        <div className="mt-6 flex w-full max-w-sm items-center gap-3 rounded-[24px] bg-white p-4 text-start shadow-[0_12px_28px_-18px_rgba(26,43,71,0.4)]">
          <Image src="/images/student/unit-gift.png" alt="" width={72} height={72} unoptimized className="h-16 w-16 object-contain" />
          <div>
            <p className="text-sm font-extrabold text-text-navy">{tUnits("giftTitle")}</p>
            <p className="mt-1 text-sm font-bold text-primary-orange">
              {attempt.gift.rewardType === "store_item" ? tUnits("giftItem") : tUnits("giftPoints", { count: attempt.gift.pointsAmount })}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row-reverse">
        {attempt.nextLessonId && attempt.unitId ? (
          <Button href={nextHref} className="sm:flex-1">
            {t("nextLesson")}
          </Button>
        ) : null}
        <Button href={homeHref} variant={attempt.nextLessonId ? "secondary" : "primary"} className="sm:flex-1">
          {t("backHome")}
        </Button>
      </div>
    </div>
  );
}

function Star({ filled, delay, large }: { filled: boolean; delay: number; large?: boolean }) {
  return (
    <span
      className={`celebration-star inline-flex ${large ? "h-16 w-16" : "h-12 w-12"} ${filled ? "is-lit" : ""}`}
      style={{ animationDelay: `${delay * 120}ms` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-full w-full">
        <path
          d="M24 4.5 29.4 17.2 43 18.4 32.8 27.6 35.8 41 24 34.2 12.2 41 15.2 27.6 5 18.4 18.6 17.2Z"
          fill={filled ? "#F6C15B" : "#E5E7EB"}
          stroke={filled ? "#E2A322" : "#D1D5DB"}
          strokeWidth="2"
        />
      </svg>
    </span>
  );
}
