"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { UnitLessonSummary, UnitProgress } from "@/lib/api/student";
import { UNIT_ACCENTS, lessonPlayPath, unitLessonPath, unitReviewPath } from "@/lib/config/subjects";
import { useAnimatedFill } from "@/lib/utils/useAnimatedFill";
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
  const fill = useAnimatedFill(unit.percentage);
  const icon = unit.iconUrl ?? unit.coverUrl;
  const needsReview = Boolean(unit.reviewSessionId) && unit.reviewStatus !== "completed";
  const hasGift = Boolean(unit.gift);
  const lessons = unit.lessons;

  return (
    <article
      className={`unit-card flex w-full flex-col rounded-[24px] bg-white text-start shadow-[0_10px_28px_-18px_rgba(26,43,71,0.4)] ${
        selected ? "ring-2 ring-primary-orange" : ""
      }`}
    >
      <Link href={href} onMouseEnter={onPreview} onFocus={onPreview} className="flex items-center gap-3 p-3 pb-2">
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

      {lessons.length > 0 ? (
        <ul className="mx-3 mb-3 space-y-1.5 rounded-[18px] bg-[#F7F9FC] px-3 py-2.5" aria-label={t("lessonsTitle")}>
          {lessons.map((lesson, lessonIndex) => (
            <LessonRow key={lesson.lessonId} lesson={lesson} childId={childId} index={lessonIndex} accent={accent} />
          ))}
        </ul>
      ) : null}

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

function LessonRow({
  lesson,
  childId,
  index,
  accent,
}: {
  lesson: UnitLessonSummary;
  childId: number;
  index: number;
  accent: string;
}) {
  const t = useTranslations("student");
  const locked = lesson.status === "locked";
  const title = lesson.title || t("untitledLesson", { number: index + 1 });
  const content = (
    <>
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-extrabold"
        style={{
          background: lesson.status === "completed" ? accent : lesson.status === "available" ? `${accent}22` : "#E8ECF2",
          color: lesson.status === "completed" ? "#fff" : lesson.status === "available" ? accent : "#8A93A6",
        }}
        aria-hidden="true"
      >
        {lesson.status === "completed" ? "✓" : index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold leading-snug ${locked ? "text-text-gray" : "text-text-navy"}`}>
          {title}
        </span>
        <span className="mt-0.5 block text-[0.7rem] font-semibold text-text-gray">
          {lesson.status === "completed"
            ? t("path.completed")
            : lesson.status === "available"
              ? t("path.current")
              : t("path.locked")}
        </span>
      </span>
      {lesson.stars != null ? (
        <span className="shrink-0 text-xs font-extrabold text-primary-orange" aria-label={t("path.stars", { count: lesson.stars })}>
          {"★".repeat(Math.max(0, Math.min(3, lesson.stars)))}
        </span>
      ) : null}
    </>
  );

  if (locked) {
    return <li className="flex items-start gap-2 rounded-xl px-1.5 py-1.5 opacity-70">{content}</li>;
  }

  return (
    <li>
      <Link
        href={lessonPlayPath(lesson.lessonId, childId)}
        className="flex items-start gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-white"
      >
        {content}
      </Link>
    </li>
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
