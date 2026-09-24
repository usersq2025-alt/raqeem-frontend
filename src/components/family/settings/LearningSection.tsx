"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { type ChildProfile } from "@/lib/api/children";
import { updateStudentDailyGoal } from "@/lib/api/parentAccount";
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
  onSaved: (message?: string) => void;
  onSummaryLoaded?: (studentId: number, summary: ChildLearningSummary) => void;
};

const PRESETS = [3, 5, 7] as const;

export function LearningSection({
  childrenList,
  childrenLoading,
  childrenError,
  onRetryChildren,
  onSaved,
  onSummaryLoaded,
}: Props) {
  const t = useTranslations("familySettings");
  const tGrades = useTranslations("child.grades");
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    childrenList.length ? childrenList[0].id : null
  );
  const [summary, setSummary] = useState<ChildLearningSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      setSummaryLoading(true);
      setSummaryError(false);
      try {
        const next = await getChildLearningSummary(selectedId);
        if (cancelled) return;
        setSummary(next);
        onSummaryLoaded?.(selectedId, next);
      } catch {
        if (!cancelled) {
          setSummary(null);
          setSummaryError(true);
        }
      } finally {
        if (!cancelled) setSummaryLoading(false);
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
        <SectionIntro title={t("learning.panelTitle")} description={t("learning.panelLead")} />
        <EmptyBlock title={t("learning.needChildTitle")} body={t("learning.needChild")} />
      </div>
    );
  }

  const selected = childrenList.find((c) => c.id === selectedId) ?? null;
  const goal = summary?.dailyGoalTarget ?? 3;
  const done = summary?.completedLessonsToday ?? 0;

  async function saveGoal(n: number) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const saved = await updateStudentDailyGoal(selected.id, n);
      setSummary((current) => (current ? { ...current, dailyGoalTarget: saved } : current));
      onSaved(t("learning.saved"));
    } catch {
      setError(t("errors.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionIntro title={t("learning.panelTitle")} description={t("learning.panelLead")} />

      <div>
        <p className="mb-2 text-sm font-extrabold text-text-navy">{t("learning.pickChild")}</p>
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
                  className={`flex w-full items-center gap-3 rounded-[22px] p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                    active
                      ? "bg-[#FFF1E4] ring-2 ring-brand-gold"
                      : "bg-neutral-50 ring-1 ring-brand-navy/5 hover:bg-neutral-100"
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
      </div>

      {summaryLoading ? <SkeletonBlock rows={3} /> : null}
      {summaryError ? (
        <ErrorBlock
          message={t("loadError")}
          retryLabel={t("retry")}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : null}

      {!summaryLoading && !summaryError && selected ? (
        <>
          <CardShell>
            <p className="text-sm font-extrabold text-text-navy">{t("learning.goalTitle")}</p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-text-gray">{t("learning.goalHint")}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy}
                  aria-pressed={goal === n}
                  className={`min-h-11 rounded-2xl text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-45 ${
                    goal === n
                      ? "bg-[#FFF1E4] text-primary-orange ring-2 ring-brand-gold"
                      : "bg-white text-text-navy ring-1 ring-brand-navy/10 hover:bg-neutral-50"
                  }`}
                  onClick={() => void saveGoal(n)}
                >
                  {t(`learning.presets.${n}`)}
                  {n === 3 ? (
                    <span className="mt-0.5 block text-[10px] font-bold text-primary-orange">
                      {t("learning.recommended")}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}

            <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-brand-navy/5">
              <p className="text-sm font-extrabold text-text-navy">
                {t("learning.currentGoal", { count: goal })}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-gray">
                {t("learning.dayProgress", { done, goal })}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-primary-orange transition-all"
                  style={{ width: `${Math.min(100, Math.round((done / Math.max(goal, 1)) * 100))}%` }}
                />
              </div>
            </div>
          </CardShell>

          <CardShell>
            <p className="text-sm font-extrabold text-text-navy">{t("learning.subjectsTitle")}</p>
            {summary?.subjects?.length ? (
              <ul className="mt-3 space-y-2">
                {summary.subjects.map((subject) => (
                  <li
                    key={subject.subjectId}
                    className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-brand-navy/5"
                  >
                    <span className="text-sm font-extrabold text-text-navy">
                      {locale.startsWith("ar") ? subject.nameAr : subject.nameEn || subject.nameAr}
                    </span>
                    <span className="text-xs font-bold text-text-gray">
                      {subject.status === "available"
                        ? t("learning.subjectAvailable")
                        : t("learning.subjectEmpty")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm font-medium text-text-gray">{t("learning.subjectsEmpty")}</p>
            )}
          </CardShell>

          <ComingSoonCard
            badge={t("comingSoonBadge")}
            title={t("learning.smartReviewTitle")}
            body={t("learning.smartReviewBody")}
          />
        </>
      ) : null}
    </div>
  );
}
