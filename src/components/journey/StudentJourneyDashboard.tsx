"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { professionAvatarSrc } from "@/lib/config/professions";
import { lessonPlayPath, withChildQuery } from "@/lib/config/subjects";
import { toIndicDigits } from "@/lib/format/indicDigits";
import type { DailyGoalTarget, JourneyDashboard } from "@/lib/api/journeyDashboard";
import { useStudentJourneyDashboard } from "@/hooks/useStudentJourneyDashboard";

type Props = { childId: number; initialData?: JourneyDashboard | null };

const GOAL_OPTIONS: Array<{ value: DailyGoalTarget; key: "light" | "balanced" | "active" | "tour" }> = [
  { value: 1, key: "light" },
  { value: 3, key: "balanced" },
  { value: 5, key: "active" },
  { value: 7, key: "tour" },
];

export function StudentJourneyDashboard({ childId, initialData = null }: Props) {
  const t = useTranslations("student.journeyDashboard");
  const { state, savingGoal, toast, updateDailyGoal, reload } = useStudentJourneyDashboard(childId, initialData);
  const [goalOpen, setGoalOpen] = useState(false);
  const celebrate = state.status === "ready" && state.data.today.goalCompleted;

  if (state.status === "loading") return <JourneyDashboardSkeleton />;
  if (state.status === "error") {
    return (
      <JourneyDashboardError
        onRetry={() => void reload()}
        subjectsHref={withChildQuery("/subjects", childId)}
      />
    );
  }

  const data = state.data;
  const goalTone = goalMessageKey(data);

  return (
    <div className="student-journey-dashboard relative mx-auto w-full max-w-5xl px-4 pb-28 pt-4 md:px-6 md:pb-10 md:pt-6">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(200,233,255,0.55),_transparent_55%),linear-gradient(180deg,#F7FBFF_0%,#F3FFF6_100%)]"
        aria-hidden
      />

      <JourneyGreeting data={data} />

      <div className="mt-5 grid gap-4 md:grid-cols-2 md:gap-5">
        <DailyJourneyCard
          data={data}
          tone={goalTone}
          childId={childId}
          onChangeGoal={() => setGoalOpen(true)}
          celebrate={celebrate}
        />
        <NextLessonCard data={data} childId={childId} />
      </div>

      <SuggestedLessons data={data} childId={childId} />

      <div className="mt-4 grid gap-4 md:grid-cols-3 md:gap-5">
        <NextHeadquartersItem data={data} childId={childId} />
        <StreakSummary data={data} />
        <LatestAchievement data={data} />
      </div>

      <DailyGoalPicker
        open={goalOpen}
        current={data.today.targetLessons}
        saving={savingGoal}
        onClose={() => setGoalOpen(false)}
        onSave={async (target) => {
          const ok = await updateDailyGoal(target);
          if (ok) setGoalOpen(false);
        }}
      />

      {toast ? (
        <p
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl bg-[#1A2B47] px-4 py-3 text-center text-sm font-bold text-white shadow-lg md:bottom-8"
        >
          {t(toast)}
        </p>
      ) : null}
    </div>
  );
}

function goalMessageKey(data: JourneyDashboard): "idle" | "progress" | "done" | "exceeded" {
  const { completedLessons, exceededBy, goalCompleted } = data.today;
  if (exceededBy > 0) return "exceeded";
  if (goalCompleted) return "done";
  if (completedLessons <= 0) return "idle";
  return "progress";
}

function JourneyGreeting({ data }: { data: JourneyDashboard }) {
  const t = useTranslations("student.journeyDashboard");
  const avatar =
    data.child.avatarUrl ||
    (data.child.professionCode ? professionAvatarSrc(data.child.professionCode, "female") : null);

  return (
    <header className="flex items-center gap-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-sm md:h-14 md:w-14">
        {avatar ? (
          <Image src={avatar} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[#E8F4FF] text-lg font-black text-[#1F3A5F]">
            {data.child.name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-black text-[#1F3A5F] md:text-2xl">
          {t("greeting", { name: data.child.name })}
        </h1>
        <p className="mt-0.5 text-sm font-semibold text-[#5B6B82] md:text-[15px]">{t("greetingSub")}</p>
      </div>
    </header>
  );
}

function DailyJourneyCard({
  data,
  tone,
  childId,
  onChangeGoal,
  celebrate,
}: {
  data: JourneyDashboard;
  tone: "idle" | "progress" | "done" | "exceeded";
  childId: number;
  onChangeGoal: () => void;
  celebrate: boolean;
}) {
  const t = useTranslations("student.journeyDashboard");
  const { completedLessons, targetLessons } = data.today;
  const stations = Array.from({ length: Math.min(targetLessons, 7) }, (_, i) => {
    if (i < completedLessons) return "done";
    if (i === completedLessons && !data.today.goalCompleted) return "next";
    return "todo";
  });

  const remaining = Math.max(0, targetLessons - completedLessons);

  const statusText =
    tone === "idle"
      ? t("statusIdle")
      : tone === "exceeded"
        ? t("statusExceeded", {
            completed: toIndicDigits(completedLessons),
            target: toIndicDigits(targetLessons),
          })
        : tone === "done"
          ? t("statusDone")
          : t("statusProgress", {
              completed: toIndicDigits(completedLessons),
              target: toIndicDigits(targetLessons),
            });

  const href = data.nextLesson
    ? lessonPlayPath(data.nextLesson.id, childId)
    : withChildQuery("/subjects", childId);

  return (
    <section
      className={`rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_10px_30px_-18px_rgba(26,43,71,0.35)] ${
        celebrate ? "journey-goal-pop" : ""
      }`}
      aria-labelledby="daily-journey-title"
    >
      <h2 id="daily-journey-title" className="text-lg font-black text-[#1F3A5F]">
        {t("todayTitle")}
      </h2>

      <div
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
        role="list"
        aria-label={t("stationsAria", {
          completed: toIndicDigits(completedLessons),
          target: toIndicDigits(targetLessons),
        })}
      >
        {stations.map((state, i) => (
          <span
            key={i}
            role="listitem"
            aria-label={
              state === "done"
                ? t("stationDone", { n: toIndicDigits(i + 1) })
                : state === "next"
                  ? t("stationNext", { n: toIndicDigits(i + 1) })
                  : t("stationTodo", { n: toIndicDigits(i + 1) })
            }
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white text-sm font-black text-white",
              state === "done"
                ? "bg-[#5FBF6A] shadow-[0_3px_0_#3D9A4A]"
                : state === "next"
                  ? "bg-[#F4A03C] shadow-[0_3px_0_#D4831F]"
                  : "bg-[#B7D4F5] text-[#1F3A5F]/70 shadow-[0_3px_0_#8FB6DE]",
            ].join(" ")}
          >
            {state === "done" ? "✓" : toIndicDigits(i + 1)}
          </span>
        ))}
      </div>

      <p className="mt-4 text-center text-[15px] font-extrabold text-[#1F3A5F]">{statusText}</p>
      <p className="mt-1 text-center text-sm font-semibold text-[#5B6B82]">
        {tone === "idle"
          ? t("hintIdle")
          : tone === "exceeded"
            ? t("hintExceeded")
            : tone === "done"
              ? t("hintDone")
              : remaining === 1
                ? t("hintProgressOne")
                : t("hintProgressMany", { remaining: toIndicDigits(remaining) })}
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link
          href={href}
          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#F48232] px-4 py-3 text-center text-[15px] font-black text-white shadow-[0_4px_0_#D56A1C] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F48232]"
        >
          {t("continueCta")}
        </Link>
        <button
          type="button"
          onClick={onChangeGoal}
          className="inline-flex items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-bold text-[#F48232] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F48232]"
        >
          {t("changeGoal")}
        </button>
      </div>
    </section>
  );
}

function NextLessonCard({ data, childId }: { data: JourneyDashboard; childId: number }) {
  const t = useTranslations("student.journeyDashboard");
  const lesson = data.nextLesson;

  if (!lesson) {
    return (
      <section className="rounded-[28px] border border-dashed border-[#C5D3E3] bg-white/70 p-5">
        <h2 className="text-lg font-black text-[#1F3A5F]">{t("nextTitle")}</h2>
        <p className="mt-3 text-sm font-semibold text-[#5B6B82]">{t("noLessons")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={withChildQuery("/subjects", childId)}
            className="rounded-xl bg-[#1F3A5F] px-3 py-2 text-sm font-bold text-white"
          >
            {t("goSubjects")}
          </Link>
          <Link
            href={withChildQuery("/headquarters", childId)}
            className="rounded-xl border border-[#C5D3E3] px-3 py-2 text-sm font-bold text-[#1F3A5F]"
          >
            {t("goHq")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_10px_30px_-18px_rgba(26,43,71,0.35)]">
      <h2 className="text-lg font-black text-[#1F3A5F]">{t("nextTitle")}</h2>
      <div className="mt-4 flex gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#E8F4FF]">
          {lesson.subjectImage ? (
            <Image src={lesson.subjectImage} alt="" width={64} height={64} className="object-cover" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[#5B6B82]">
              {lesson.subjectName.slice(0, 2)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#F48232]">{lesson.subjectName}</p>
          <p className="mt-0.5 truncate text-[15px] font-black text-[#1F3A5F]">{lesson.title}</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-[#5B6B82]">{lesson.unitName}</p>
          <p className="mt-1 text-xs font-semibold text-[#7A8BA3]">
            {[
              lesson.questionCount != null
                ? t("questions", { count: toIndicDigits(lesson.questionCount) })
                : null,
              lesson.estimatedMinutes != null
                ? t("minutes", { count: toIndicDigits(lesson.estimatedMinutes) })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      <Link
        href={lessonPlayPath(lesson.id, childId)}
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#2EC4A8] px-4 py-3 text-[15px] font-black text-white shadow-[0_4px_0_#1A9A86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EC4A8]"
      >
        {lesson.resumeAvailable ? t("resumeLesson") : t("startLesson")}
      </Link>
    </section>
  );
}

function SuggestedLessons({ data, childId }: { data: JourneyDashboard; childId: number }) {
  const t = useTranslations("student.journeyDashboard");
  if (data.suggestedLessons.length === 0) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_10px_30px_-18px_rgba(26,43,71,0.28)]">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-black text-[#1F3A5F]">{t("suggestionsTitle")}</h2>
        <Link
          href={withChildQuery("/subjects", childId)}
          className="text-sm font-bold text-[#F48232] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F48232]"
        >
          {t("allSubjects")}
        </Link>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {data.suggestedLessons.map((lesson) => (
          <li key={lesson.id}>
            <Link
              href={lessonPlayPath(lesson.id, childId)}
              className="flex h-full flex-col rounded-2xl border border-[#E8EEF5] bg-[#FFFEFB] p-3 transition hover:border-[#F4A03C]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F48232]"
            >
              <div className="relative mb-2 h-12 w-12 overflow-hidden rounded-xl bg-[#E8F4FF]">
                {lesson.subjectImage ? (
                  <Image src={lesson.subjectImage} alt="" width={48} height={48} className="object-cover" unoptimized />
                ) : null}
              </div>
              <p className="text-[11px] font-bold text-[#F48232]">{lesson.subjectName}</p>
              <p className="mt-0.5 line-clamp-2 text-sm font-extrabold text-[#1F3A5F]">{lesson.title}</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-[#7A8BA3]">{lesson.unitName}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NextHeadquartersItem({ data, childId }: { data: JourneyDashboard; childId: number }) {
  const t = useTranslations("student.journeyDashboard");
  if (data.headquartersCompleted) {
    return (
      <section className="rounded-[24px] border border-white/80 bg-white/95 p-4 shadow-sm">
        <h2 className="text-base font-black text-[#1F3A5F]">{t("hqTitle")}</h2>
        <p className="mt-2 text-sm font-semibold text-[#5B6B82]">{t("hqComplete")}</p>
        <Link href={withChildQuery("/headquarters", childId)} className="mt-3 inline-block text-sm font-bold text-[#2EC4A8]">
          {t("goHq")}
        </Link>
      </section>
    );
  }
  const item = data.nextHeadquartersItem;
  if (!item) return null;

  return (
    <section className="rounded-[24px] border border-white/80 bg-white/95 p-4 shadow-sm">
      <h2 className="text-base font-black text-[#1F3A5F]">{t("hqTitle")}</h2>
      <p className="mt-2 text-sm font-extrabold text-[#1F3A5F]">
        {t("hqNext", { name: item.name })}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#5B6B82]">
        {item.canPurchase
          ? t("hqReady")
          : t("hqProgress", {
              have: toIndicDigits(item.currentBalance),
              need: toIndicDigits(item.price),
              left: toIndicDigits(item.remainingPoints),
            })}
      </p>
      <Link
        href={withChildQuery("/store", childId)}
        className="mt-3 inline-flex rounded-xl bg-[#1F3A5F] px-3 py-2 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F3A5F]"
      >
        {t("goStore")}
      </Link>
    </section>
  );
}

function StreakSummary({ data }: { data: JourneyDashboard }) {
  const t = useTranslations("student.journeyDashboard");
  if (!data.streak) return null;
  return (
    <section className="rounded-[24px] border border-white/80 bg-white/95 p-4 shadow-sm">
      <h2 className="text-base font-black text-[#1F3A5F]">{t("streakTitle")}</h2>
      <p className="mt-2 text-2xl font-black text-[#F4A03C]">{toIndicDigits(data.streak.current)}</p>
      <p className="text-xs font-semibold text-[#5B6B82]">
        {data.streak.completedToday ? t("streakActive") : t("streakKeep")}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#7A8BA3]">
        {t("streakLongest", { count: toIndicDigits(data.streak.longest) })}
      </p>
    </section>
  );
}

function LatestAchievement({ data }: { data: JourneyDashboard }) {
  const t = useTranslations("student.journeyDashboard");
  if (!data.latestAchievement) {
    return (
      <section className="rounded-[24px] border border-white/80 bg-white/95 p-4 shadow-sm">
        <h2 className="text-base font-black text-[#1F3A5F]">{t("achievementTitle")}</h2>
        <p className="mt-2 text-sm font-semibold text-[#5B6B82]">{t("achievementEmpty")}</p>
      </section>
    );
  }
  return (
    <section className="rounded-[24px] border border-white/80 bg-white/95 p-4 shadow-sm">
      <h2 className="text-base font-black text-[#1F3A5F]">{t("achievementTitle")}</h2>
      <p className="mt-2 text-sm font-extrabold text-[#1F3A5F]">{data.latestAchievement.title}</p>
      <p className="mt-1 text-xs font-semibold text-[#5B6B82]">{data.latestAchievement.description}</p>
    </section>
  );
}

function DailyGoalPicker({
  open,
  current,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  current: DailyGoalTarget;
  saving: boolean;
  onClose: () => void;
  onSave: (t: DailyGoalTarget) => Promise<void>;
}) {
  const t = useTranslations("student.journeyDashboard");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DailyGoalTarget | null>(null);
  const selected = draft ?? current;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-[#1A2B47]/45"
        aria-label={t("close")}
        onClick={() => {
          setDraft(null);
          onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl md:rounded-[28px]"
      >
        <h2 id={titleId} className="text-lg font-black text-[#1F3A5F]">
          {t("goalPickerTitle")}
        </h2>
        <div className="mt-4 space-y-2" role="radiogroup" aria-label={t("goalPickerTitle")}>
          {GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected === opt.value}
              onClick={() => setDraft(opt.value)}
              className={[
                "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-start transition",
                selected === opt.value
                  ? "border-[#F4A03C] bg-[#FFF6EB]"
                  : "border-[#E8EEF5] bg-white hover:border-[#F4A03C]/40",
              ].join(" ")}
            >
              <span>
                <span className="block text-sm font-extrabold text-[#1F3A5F]">{t(`goal.${opt.key}`)}</span>
                <span className="text-xs font-semibold text-[#7A8BA3]">{t(`goal.${opt.key}Hint`)}</span>
              </span>
              {opt.value === 3 ? (
                <span className="rounded-full bg-[#2EC4A8]/15 px-2 py-0.5 text-[10px] font-bold text-[#1A9A86]">
                  {t("recommended")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave(selected)}
          className="mt-4 w-full rounded-2xl bg-[#F48232] py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {saving ? t("saving") : t("saveGoal")}
        </button>
      </div>
    </div>
  );
}

function JourneyDashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse px-4 pb-28 pt-4 md:px-6 md:pb-10">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-[#DCE8F5]" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-[#DCE8F5]" />
          <div className="h-3 w-56 rounded bg-[#E8EEF5]" />
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="h-56 rounded-[28px] bg-white/80" />
        <div className="h-56 rounded-[28px] bg-white/80" />
      </div>
      <div className="mt-4 h-40 rounded-[28px] bg-white/80" />
    </div>
  );
}

function JourneyDashboardError({ onRetry, subjectsHref }: { onRetry: () => void; subjectsHref: string }) {
  const t = useTranslations("student.journeyDashboard");
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <p className="text-lg font-black text-[#1F3A5F]">{t("errorTitle")}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl bg-[#F48232] px-4 py-2.5 text-sm font-black text-white"
        >
          {t("retry")}
        </button>
        <Link href={subjectsHref} className="rounded-2xl border border-[#C5D3E3] px-4 py-2.5 text-sm font-bold text-[#1F3A5F]">
          {t("goSubjects")}
        </Link>
      </div>
    </div>
  );
}
