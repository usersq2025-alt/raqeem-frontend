"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { type ChildProfile } from "@/lib/api/children";
import {
  getChildLearningSummary,
  type ChildLearningSummary,
} from "@/lib/api/parentSummary";
import { professionAvatarSrc } from "@/lib/config/professions";
import {
  CardShell,
  ComingSoonCard,
  EmptyBlock,
  ErrorBlock,
  SectionIntro,
  SkeletonBlock,
} from "./SettingsUi";

type Props = {
  childrenList: ChildProfile[];
  childrenLoading: boolean;
  childrenError: boolean;
  onRetryChildren: () => void;
  onSummaryLoaded?: (studentId: number, summary: ChildLearningSummary) => void;
};

export function ReportsSection({
  childrenList,
  childrenLoading,
  childrenError,
  onRetryChildren,
  onSummaryLoaded,
}: Props) {
  const t = useTranslations("familySettings");
  const tGrades = useTranslations("child.grades");
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    childrenList.length ? childrenList[0].id : null
  );
  const [summary, setSummary] = useState<ChildLearningSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  const [trackedChildIds, setTrackedChildIds] = useState(() => childrenList.map((c) => c.id).join(","));
  const childIdsKey = childrenList.map((c) => c.id).join(",");
  if (childIdsKey !== trackedChildIds) {
    setTrackedChildIds(childIdsKey);
    if (childrenList.length) {
      const stillValid = selectedId !== null && childrenList.some((c) => c.id === selectedId);
      if (!stillValid) setSelectedId(childrenList[0].id);
    } else {
      setSelectedId(null);
    }
  }

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(false);
      try {
        const next = await getChildLearningSummary(selectedId);
        if (cancelled) return;
        setSummary(next);
        onSummaryLoaded?.(selectedId, next);
      } catch {
        if (!cancelled) {
          setSummary(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, onSummaryLoaded, reloadKey]);

  if (childrenLoading) return <SkeletonBlock rows={4} />;
  if (childrenError) {
    return <ErrorBlock message={t("loadError")} retryLabel={t("retry")} onRetry={onRetryChildren} />;
  }
  if (!childrenList.length) {
    return (
      <div className="space-y-4">
        <SectionIntro title={t("reports.panelTitle")} description={t("reports.panelLead")} />
        <EmptyBlock title={t("learning.needChildTitle")} body={t("learning.needChild")} />
      </div>
    );
  }

  const noLessons = summary && summary.completedLessonsTotal === 0;

  return (
    <div className="space-y-4">
      <SectionIntro title={t("reports.panelTitle")} description={t("reports.panelLead")} />

      <ul className="grid gap-2 sm:grid-cols-2">
        {childrenList.map((child) => {
          const active = child.id === selectedId;
          const avatar =
            professionAvatarSrc(child.professionCode, child.gender) ?? "/images/brand/logo.png";
          const gradeKey = String(child.gradeId) as "1" | "2" | "3" | "4" | "5" | "6";
          return (
            <li key={child.id}>
              <button
                type="button"
                aria-pressed={active}
                className={`flex w-full items-center gap-3 rounded-[22px] p-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                  active ? "bg-[#FFF1E4] ring-2 ring-brand-gold" : "bg-neutral-50 hover:bg-neutral-100"
                }`}
                onClick={() => setSelectedId(child.id)}
              >
                <span className="relative flex h-11 w-11 overflow-hidden rounded-full bg-white">
                  <Image src={avatar} alt="" width={44} height={44} unoptimized className="object-contain p-0.5" />
                </span>
                <span>
                  <span className="block text-sm font-extrabold text-text-navy">{child.fullName}</span>
                  <span className="block text-xs font-semibold text-text-gray">
                    {child.gradeId >= 1 && child.gradeId <= 6 ? tGrades(gradeKey) : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {loading ? <SkeletonBlock rows={3} /> : null}
      {error ? (
        <ErrorBlock
          message={t("loadError")}
          retryLabel={t("retry")}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : null}

      {!loading && !error && summary && noLessons ? (
        <EmptyBlock title={t("reports.emptyTitle")} body={t("reports.emptyBody")} />
      ) : null}

      {!loading && !error && summary && !noLessons ? (
        <CardShell>
          <ul className="space-y-2 text-sm font-semibold text-text-navy">
            <li>{t("reports.weekLessons", { count: summary.completedLessonsThisWeek })}</li>
            <li>{t("reports.totalAnswers", { count: summary.totalAnswers })}</li>
            <li>
              {summary.correctRatePercent == null
                ? t("reports.correctRateUnknown")
                : t("reports.correctRate", { percent: summary.correctRatePercent })}
            </li>
            <li>{t("reports.longestStreak", { count: summary.streakLongest })}</li>
            <li>
              {summary.mostActiveSubject
                ? t("reports.mostActive", {
                    name: locale.startsWith("ar")
                      ? summary.mostActiveSubject.nameAr
                      : summary.mostActiveSubject.nameEn || summary.mostActiveSubject.nameAr,
                  })
                : t("reports.mostActiveUnknown")}
            </li>
            <li>
              {summary.needsReviewSubject
                ? t("reports.needsReview", {
                    name: locale.startsWith("ar")
                      ? summary.needsReviewSubject.nameAr
                      : summary.needsReviewSubject.nameEn || summary.needsReviewSubject.nameAr,
                  })
                : t("reports.needsReviewUnknown")}
            </li>
            <li>
              {summary.lastActivityDate
                ? t("reports.lastActivity", { date: summary.lastActivityDate })
                : t("children.activityNever")}
            </li>
          </ul>
          <Link
            href={`/family/reports?childId=${summary.studentId}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            {t("reports.detailedCta")}
          </Link>
        </CardShell>
      ) : null}

      <ComingSoonCard
        badge={t("comingSoonBadge")}
        title={t("reports.aiTitle")}
        body={t("reports.aiBody")}
        note={t("reportsDisclaimer")}
      />
    </div>
  );
}
