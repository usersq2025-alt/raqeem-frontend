"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { UnitProgress } from "@/lib/api/student";
import { UNIT_ACCENTS, lessonPlayPath, unitLessonPath, unitReviewPath } from "@/lib/config/subjects";
import { Link } from "@/i18n/navigation";

type Props = {
  unit: UnitProgress;
  childId: number;
  index: number;
  selected?: boolean;
  onPreview?: () => void;
  onOpenGift?: () => void;
};

export function UnitCard({ unit, childId, index, selected = false, onPreview, onOpenGift }: Props) {
  const t = useTranslations("student");
  const accent = UNIT_ACCENTS[index % UNIT_ACCENTS.length];
  const href = unit.playLessonId
    ? lessonPlayPath(unit.playLessonId, childId)
    : unitLessonPath(unit.unitId, childId);
  const [fill, setFill] = useState(0);
  const icon = unit.iconUrl ?? unit.coverUrl;
  const needsReview = Boolean(unit.reviewSessionId) && unit.reviewStatus !== "completed";
  const hasGift = Boolean(unit.gift);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFill(unit.percentage);
      return;
    }
    const frame = window.requestAnimationFrame(() => setFill(unit.percentage));
    return () => window.cancelAnimationFrame(frame);
  }, [unit.percentage]);

  return (
    <article
      className={`unit-card flex w-full flex-col rounded-[24px] bg-white text-start shadow-[0_10px_28px_-18px_rgba(26,43,71,0.4)] ${
        selected ? "ring-2 ring-primary-orange" : ""
      }`}
    >
      <Link href={href} onMouseEnter={onPreview} onFocus={onPreview} className="flex items-center gap-3 p-3">
        <span
          className="relative flex h-[4.6rem] w-[4.6rem] shrink-0 items-center justify-center overflow-hidden rounded-[20px]"
          style={{ background: `${accent}22` }}
        >
          {icon ? (
            <Image src={icon} alt="" width={160} height={160} unoptimized className="h-[4.15rem] w-[4.15rem] object-contain" />
          ) : (
            <UnitGlyph index={index} color={accent} />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold text-text-navy">{unit.title}</span>
          <span className="mt-0.5 block text-sm font-semibold text-text-gray">
            {t("unitLessons", { completed: unit.completedLessons, total: unit.totalLessons })}
          </span>
          <span className="mt-2 flex items-center gap-2">
            <span className="unit-progress-track h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <span
                className="unit-progress-fill block h-full rounded-full"
                style={{ width: `${fill}%`, background: accent }}
              />
            </span>
            <span className="w-10 shrink-0 text-end text-xs font-extrabold" style={{ color: accent }}>
              {unit.percentage}%
            </span>
          </span>
        </span>
      </Link>

      {needsReview || hasGift ? (
        <div className="flex flex-wrap gap-2 px-3 pb-3">
          {needsReview ? (
            <Link
              href={unitReviewPath(unit.unitId, childId)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F7F4] px-3 py-1.5 text-xs font-extrabold text-text-navy"
            >
              <Image src="/images/student/review-station.png" alt="" width={22} height={22} unoptimized className="h-5 w-5 object-contain" />
              {t("units.review")}
            </Link>
          ) : null}
          {hasGift ? (
            <button
              type="button"
              onClick={onOpenGift}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF1E4] px-3 py-1.5 text-xs font-extrabold text-primary-orange"
            >
              <Image src="/images/student/unit-gift.png" alt="" width={22} height={22} unoptimized className="h-5 w-5 object-contain" />
              {t("units.gift")}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function UnitGlyph({ index, color }: { index: number; color: string }) {
  if (index % 3 === 0) {
    return (
      <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
        <circle cx="18" cy="40" r="8" fill={color} />
        <circle cx="32" cy="22" r="7" fill={color} opacity="0.8" />
        <circle cx="46" cy="38" r="9" fill={color} opacity="0.65" />
      </svg>
    );
  }
  if (index % 3 === 1) {
    return (
      <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden="true">
        <rect x="10" y="28" width="18" height="18" rx="3" fill={color} />
        <circle cx="44" cy="24" r="10" fill={color} opacity="0.85" />
        <polygon points="32,48 48,48 40,34" fill={color} opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden="true">
      <rect x="16" y="12" width="32" height="40" rx="6" fill={color} />
      <rect x="22" y="20" width="20" height="4" rx="2" fill="white" />
      <rect x="22" y="28" width="14" height="4" rx="2" fill="white" opacity="0.8" />
    </svg>
  );
}
