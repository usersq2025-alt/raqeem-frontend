"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { UnitProgress } from "@/lib/api/student";
import type { SubjectKey } from "@/lib/config/subjects";
import { UNIT_ACCENTS, unitLessonPath, unitReviewPath } from "@/lib/config/subjects";
import { UnitTopicIcon } from "@/components/UnitTopicIcon";
import { useAnimatedFill } from "@/lib/utils/useAnimatedFill";
import { Link } from "@/i18n/navigation";

type Props = {
  unit: UnitProgress;
  subjectKey: SubjectKey;
  childId: number;
  index: number;
  selected?: boolean;
  onPreview?: () => void;
  onOpenGift?: () => void;
};

export function UnitCard({ unit, subjectKey, childId, index, selected = false, onPreview, onOpenGift }: Props) {
  const t = useTranslations("student");
  const accent = UNIT_ACCENTS[index % UNIT_ACCENTS.length];
  const href = unitLessonPath(unit.unitId, childId);
  const fill = useAnimatedFill(unit.percentage);
  const needsReview = Boolean(unit.reviewSessionId) && unit.reviewStatus !== "completed";
  const hasGift = Boolean(unit.gift);
  const header = (
    <>
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-[#E5EDF3] bg-[#F3F7FA] text-[#5C7791]"
      >
        <UnitTopicIcon subject={subjectKey} unit={unit} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold text-text-navy">{unit.title}</span>
        <span className="mt-0.5 block text-sm font-semibold text-text-gray">
          {unit.totalLessons > 0
            ? t("unitLessons", { completed: unit.completedLessons, total: unit.totalLessons })
            : t("catalogLessons", { count: unit.catalogLessonCount })}
        </span>
        {unit.totalLessons > 0 ? (
          <span className="mt-2 flex items-center gap-2">
            <span className="unit-progress-track h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <span className="unit-progress-fill block h-full rounded-full" style={{ width: `${fill}%`, background: accent }} />
            </span>
            <span className="w-10 shrink-0 text-end text-xs font-extrabold" style={{ color: accent }}>{unit.percentage}%</span>
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <article
      className={`unit-card flex w-full flex-col rounded-[24px] bg-white text-start shadow-[0_10px_28px_-18px_rgba(26,43,71,0.4)] ${
        selected ? "ring-2 ring-primary-orange" : ""
      }`}
    >
      {unit.totalLessons > 0 ? (
        <Link href={href} onMouseEnter={onPreview} onFocus={onPreview} className="flex items-center gap-3 p-3 pb-2">{header}</Link>
      ) : (
        <div onMouseEnter={onPreview} className="flex items-center gap-3 p-3 pb-2">{header}</div>
      )}

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
