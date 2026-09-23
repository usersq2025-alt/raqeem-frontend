"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { type ChildProfile } from "@/lib/api/children";
import {
  getChildLearningSummary,
  type ChildLearningSummary,
} from "@/lib/api/parentSummary";
import { professionAvatarSrc } from "@/lib/config/professions";
import { formatLocaleDate, withLatinNumerals } from "@/lib/i18n/latinNumerals";
import {
  CardShell,
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
  const requestedId = Number(useSearchParams().get("childId"));
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    childrenList.find((child) => child.id === requestedId)?.id ?? childrenList[0]?.id ?? null
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

  const number = (value: number) => new Intl.NumberFormat(withLatinNumerals(locale)).format(value);
  const date = (value: string) => formatLocaleDate(new Date(`${value}T12:00:00`), locale, { dateStyle: "medium" });

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

      {!loading && !error && summary ? <>
        <CardShell className="bg-[#FFF7EC] ring-1 ring-[#F9DCB7]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-text-navy">{t("reports.weeklyGoal")}</h3>
              <p className="mt-1 text-xs font-semibold text-text-gray">{t("reports.weekRange", { start: date(summary.weekStart), end: date(summary.weekEnd) })}</p>
            </div>
            <p className="text-2xl font-extrabold text-primary-orange" dir="ltr">{number(summary.completedLessonsThisWeek)} / {number(summary.weeklyGoalLessons)}</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white" role="progressbar" aria-label={t("reports.weeklyGoal")} aria-valuemin={0} aria-valuemax={summary.weeklyGoalLessons} aria-valuenow={Math.min(summary.completedLessonsThisWeek, summary.weeklyGoalLessons)}>
            <div className="h-full rounded-full bg-primary-orange transition-all" style={{ width: `${Math.min(100, (summary.completedLessonsThisWeek / summary.weeklyGoalLessons) * 100)}%` }} />
          </div>
          <p className="mt-3 text-sm font-bold text-text-navy">{summary.completedLessonsThisWeek >= summary.weeklyGoalLessons ? t("reports.goalReached") : t("reports.goalRemaining", { count: number(Math.max(0, summary.weeklyGoalLessons - summary.completedLessonsThisWeek)) })}</p>
        </CardShell>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label={t("reports.completedLabel")} value={number(summary.completedLessonsTotal)} hint={t("reports.completedHint")} />
          <Metric label={t("reports.accuracyLabel")} value={summary.correctRatePercent === null ? "—" : `${number(summary.correctRatePercent)}%`} hint={summary.correctRatePercent === null ? t("reports.noAnswers") : t("reports.answersCount", { count: number(summary.totalAnswers) })} />
          <Metric label={t("reports.streakLabel")} value={number(summary.streakCurrent)} hint={t("reports.streakHint")} />
        </div>

        <CardShell className="bg-white ring-1 ring-brand-navy/10">
          <h3 className="text-base font-extrabold text-text-navy">{t("reports.subjectsTitle")}</h3>
          <p className="mt-1 text-sm text-text-gray">{t("reports.subjectsHint")}</p>
          {summary.subjects.length ? <ul className="mt-4 space-y-4">{summary.subjects.map((subject) => {
            const name = locale.startsWith("ar") ? subject.nameAr : subject.nameEn || subject.nameAr;
            const percent = subject.totalLessons ? Math.round(subject.completedLessons / subject.totalLessons * 100) : 0;
            return <li key={subject.subjectId}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-bold text-text-navy"><span>{name}</span><span dir="ltr">{number(subject.completedLessons)} / {number(subject.totalLessons)}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#E8EEF4]" role="progressbar" aria-label={name} aria-valuemin={0} aria-valuemax={subject.totalLessons || 1} aria-valuenow={subject.completedLessons}>
                <div className="h-full rounded-full bg-[#40A48D]" style={{ width: `${percent}%` }} />
              </div>
            </li>;
          })}</ul> : <p className="mt-4 text-sm font-semibold text-text-gray">{t("reports.noSubjects")}</p>}
        </CardShell>

        <CardShell>
          <h3 className="text-base font-extrabold text-text-navy">{t("reports.nextStepTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-gray">{summary.completedLessonsTotal === 0
            ? t("reports.startGuidance")
            : summary.needsReviewSubject
              ? t("reports.nextSubject", { name: locale.startsWith("ar") ? summary.needsReviewSubject.nameAr : summary.needsReviewSubject.nameEn || summary.needsReviewSubject.nameAr })
              : t("reports.keepGoing")}</p>
          <p className="mt-3 text-xs font-semibold text-text-gray">{summary.lastActivityDate ? t("reports.lastActivity", { date: date(summary.lastActivityDate) }) : t("children.activityNever")}</p>
        </CardShell>
      </> : null}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-[22px] bg-white p-4 ring-1 ring-brand-navy/10"><p className="text-xs font-bold text-text-gray">{label}</p><p className="mt-2 text-3xl font-extrabold text-text-navy" dir="auto">{value}</p><p className="mt-1 text-xs font-medium text-text-gray">{hint}</p></div>;
}
