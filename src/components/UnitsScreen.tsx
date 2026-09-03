"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { UnitProgress } from "@/lib/api/student";
import type { SubjectKey } from "@/lib/config/subjects";
import { lessonPlayPath, subjectCoverSrc, UNIT_ACCENTS, unitLessonPath, unitReviewPath, withChildQuery } from "@/lib/config/subjects";
import { UnitCard } from "@/components/UnitCard";
import { Button } from "@/components/ui/Button";
import { useMountedViewTransitionName } from "@/lib/utils/useMountedViewTransitionName";
import { Link } from "@/i18n/navigation";

type Props = {
  childId: number;
  subjectId: number;
  subjectKey: SubjectKey;
  iconUrl: string | null;
  units: UnitProgress[];
};

export function UnitsScreen({ childId, subjectId, subjectKey, iconUrl, units }: Props) {
  const t = useTranslations("student");
  const tDesk = useTranslations("student.desktop");
  const cover = subjectCoverSrc(subjectKey, iconUrl);
  const coverTransition = useMountedViewTransitionName(`subject-cover-${subjectId}`);
  const defaultUnit =
    units.find((unit) => unit.completedLessons < unit.totalLessons && unit.totalLessons > 0) ?? units[0] ?? null;
  const [previewId, setPreviewId] = useState<number | null>(defaultUnit?.unitId ?? null);
  const [giftUnit, setGiftUnit] = useState<UnitProgress | null>(null);
  const preview = useMemo(
    () => units.find((unit) => unit.unitId === previewId) ?? defaultUnit,
    [defaultUnit, previewId, units]
  );
  const previewIndex = preview ? units.findIndex((unit) => unit.unitId === preview.unitId) : 0;
  const accent = UNIT_ACCENTS[Math.max(0, previewIndex) % UNIT_ACCENTS.length];
  const previewHref = preview
    ? preview.playLessonId
      ? lessonPlayPath(preview.playLessonId, childId)
      : unitLessonPath(preview.unitId, childId)
    : withChildQuery("/subjects", childId);
  const previewIcon = preview?.iconUrl ?? preview?.coverUrl ?? cover;

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:items-start md:gap-7">
      <div>
        <header className="relative mb-5 flex items-center justify-center py-1 md:justify-start md:gap-3">
          <Link
            href={withChildQuery("/subjects", childId)}
            className="absolute start-0 top-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-navy shadow-sm md:static md:top-auto"
            aria-label={t("back")}
          >
            <BackChevron />
          </Link>
          <div className="flex flex-col items-center md:flex-row md:gap-3">
            <span className="relative mb-1 flex h-14 w-14 items-center justify-center md:mb-0" style={coverTransition}>
              <Image src={cover} alt="" width={160} height={160} unoptimized className="h-full w-full object-contain" />
            </span>
            <h1 className="text-xl font-extrabold text-text-navy md:text-2xl">{t(`subjects.${subjectKey}`)}</h1>
          </div>
        </header>

        {units.length === 0 ? (
          <p className="py-10 text-center font-semibold text-text-gray">{t("emptyUnits")}</p>
        ) : (
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3">
            {units.map((unit, index) => (
              <UnitCard
                key={unit.unitId}
                unit={unit}
                childId={childId}
                index={index}
                selected={preview?.unitId === unit.unitId}
                onPreview={() => setPreviewId(unit.unitId)}
                onOpenGift={() => setGiftUnit(unit)}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="sticky top-6 hidden rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)] md:block">
        <h2 className="text-sm font-extrabold text-text-navy">{tDesk("unitPreview")}</h2>
        {preview ? (
          <>
            <div
              className="mt-4 flex h-28 items-center justify-center rounded-[22px]"
              style={{ background: `${accent}22` }}
            >
              <Image src={previewIcon} alt="" width={140} height={140} unoptimized className="h-24 w-24 object-contain" />
            </div>
            <p className="mt-4 text-lg font-extrabold text-text-navy">{preview.title}</p>
            <p className="mt-1 text-sm font-semibold text-text-gray">
              {t("unitLessons", { completed: preview.completedLessons, total: preview.totalLessons })}
            </p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full" style={{ width: `${preview.percentage}%`, background: accent }} />
            </div>
            <p className="mt-1 text-end text-xs font-extrabold" style={{ color: accent }}>
              {preview.percentage}%
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {preview.reviewSessionId && preview.reviewStatus !== "completed" ? (
                <Button href={unitReviewPath(preview.unitId, childId)} variant="secondary" fullWidth>
                  {t("units.review")}
                </Button>
              ) : null}
              {preview.gift ? (
                <Button type="button" variant="secondary" fullWidth onClick={() => setGiftUnit(preview)}>
                  {t("units.gift")}
                </Button>
              ) : null}
              <Button href={previewHref} fullWidth>
                {tDesk("openUnit")}
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm font-semibold text-text-gray">{tDesk("noUnitSelected")}</p>
        )}
      </aside>
      {giftUnit?.gift ? <GiftModal unit={giftUnit} onClose={() => setGiftUnit(null)} /> : null}
    </div>
  );
}

function BackChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:rotate-180" fill="none" aria-hidden="true">
      <path d="M14.5 6.5 9 12l5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GiftModal({ unit, onClose }: { unit: UnitProgress; onClose: () => void }) {
  const t = useTranslations("student.units");
  const gift = unit.gift;
  if (!gift) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-[0_24px_48px_-24px_rgba(26,43,71,0.55)]">
        <Image src="/images/student/unit-gift.png" alt="" width={140} height={140} unoptimized className="mx-auto h-28 w-28 object-contain" />
        <h2 className="mt-3 text-xl font-extrabold text-text-navy">{t("giftTitle")}</h2>
        <p className="mt-2 text-sm font-extrabold text-primary-orange">
          {gift.rewardType === "store_item" ? t("giftItem") : t("giftPoints", { count: gift.pointsAmount })}
        </p>
        <div className="mt-5">
          <Button type="button" onClick={onClose} fullWidth>
            {t("giftClose")}
          </Button>
        </div>
      </div>
    </div>
  );
}
