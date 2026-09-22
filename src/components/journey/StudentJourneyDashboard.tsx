"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { professionAvatarSrc } from "@/lib/config/professions";
import { lessonPlayPath, withChildQuery } from "@/lib/config/subjects";
import { toIndicDigits } from "@/lib/format/indicDigits";
import type { DailyGoalTarget, JourneyDashboard } from "@/lib/api/journeyDashboard";
import { useStudentJourneyDashboard } from "@/hooks/useStudentJourneyDashboard";

type Props = { childId: number; initialData?: JourneyDashboard | null };

const GOAL_OPTIONS: Array<{ value: DailyGoalTarget; key: "balanced" | "active" | "champion"; icon: string }> = [
  { value: 3, key: "balanced", icon: "🌱" },
  { value: 5, key: "active", icon: "⚡" },
  { value: 7, key: "champion", icon: "🏆" },
];

export function StudentJourneyDashboard({ childId, initialData = null }: Props) {
  const t = useTranslations("student.journeyDashboard");
  const { state, savingGoal, toast, updateDailyGoal, reload } = useStudentJourneyDashboard(childId, initialData);
  const [goalOpen, setGoalOpen] = useState(false);

  if (state.status === "loading") return <JourneyDashboardSkeleton />;
  if (state.status === "error") return <JourneyDashboardError onRetry={() => void reload()} subjectsHref={withChildQuery("/subjects", childId)} />;

  const data = state.data;
  return (
    <main className="student-journey-dashboard relative mx-auto w-full max-w-6xl overflow-hidden px-4 pb-28 pt-4 md:px-7 md:pb-12 md:pt-7">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(131,211,255,.28),transparent_25%),radial-gradient(circle_at_88%_30%,rgba(255,209,117,.25),transparent_28%),linear-gradient(180deg,#F7FBFF_0%,#F4FFF8_100%)]" />
      <JourneyGreeting data={data} />
      <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <StreakHero data={data} />
        <DailyMission data={data} childId={childId} onChangeGoal={() => setGoalOpen(true)} />
      </div>
      <DailyGoalPicker open={goalOpen} current={data.today.targetLessons} saving={savingGoal} onClose={() => setGoalOpen(false)} onSave={async (target) => { const ok = await updateDailyGoal(target); if (ok) setGoalOpen(false); }} />
      {toast ? <p role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl bg-[#1A2B47] px-4 py-3 text-center text-sm font-bold text-white shadow-xl md:bottom-8">{t(toast)}</p> : null}
    </main>
  );
}

function JourneyGreeting({ data }: { data: JourneyDashboard }) {
  const t = useTranslations("student.journeyDashboard");
  const locale = useLocale();
  const avatar = data.child.professionCode ? professionAvatarSrc(data.child.professionCode, data.child.gender) : data.child.avatarUrl;
  const professionName = locale === "ar" ? data.child.professionNameAr : data.child.professionNameEn;
  const professionLabels = t.raw("professionLabels") as Record<string, Record<string, string>>;
  const professionLabel = data.child.professionCode
    ? professionLabels[data.child.professionCode]?.[data.child.gender ?? "male"]
    : undefined;

  return (
    <header className="relative overflow-hidden rounded-[30px] border border-white bg-white/85 px-5 py-4 shadow-[0_18px_50px_-30px_rgba(26,43,71,.45)] backdrop-blur md:px-7 md:py-5">
      <span className="journey-float absolute -start-4 top-2 h-16 w-16 rounded-full bg-[#FFD66B]/25" aria-hidden />
      <span className="journey-float-delayed absolute end-8 -top-8 h-20 w-20 rounded-full bg-[#73DCC7]/20" aria-hidden />
      <div className="relative flex items-center gap-4 md:gap-6">
        <div className="relative h-24 w-24 shrink-0 md:h-32 md:w-32">
          <span className="absolute inset-2 rounded-full bg-gradient-to-br from-[#FFE9A8] to-[#C9F6EC] blur-md" aria-hidden />
          <div className="relative h-full w-full overflow-hidden rounded-[28px] border-4 border-white bg-[#EEF7FF] shadow-lg">
            {avatar ? <Image src={avatar} alt={professionName || data.child.name} fill sizes="128px" className="object-cover object-top" unoptimized /> : <span className="flex h-full items-center justify-center text-4xl font-black text-[#1F3A5F]">{data.child.name.slice(0, 1)}</span>}
          </div>
          <span className="absolute -bottom-2 -end-2 rounded-full border-4 border-white bg-[#F48232] px-2.5 py-1 text-lg shadow-md" aria-hidden>✨</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-[#F48232] md:text-sm">{t("adventureEyebrow")}</p>
          <h1 className="mt-1 break-words text-xl font-black leading-tight text-[#1F3A5F] sm:text-2xl md:text-4xl">{t("greeting", { name: data.child.name })}</h1>
          <p className="mt-1.5 text-sm font-bold text-[#61728A] md:text-base">{t("greetingSub")}</p>
          {professionLabel || professionName ? <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#EAF8F5] px-3 py-1.5 text-xs font-black text-[#158574] md:text-sm"><span aria-hidden>⭐</span>{professionLabel ?? t("futureProfession", { profession: professionName ?? "" })}</span> : null}
        </div>
      </div>
    </header>
  );
}

function StreakHero({ data }: { data: JourneyDashboard }) {
  const t = useTranslations("student.journeyDashboard");
  const locale = useLocale();
  const streak = data.streak ?? { current: 0, longest: 0, completedToday: false, recentDays: [] };
  const nextMilestone = [3, 7, 14, 30].find((value) => value > streak.current) ?? 50;
  const milestoneProgress = Math.min(100, (streak.current / nextMilestone) * 100);

  return (
    <section className="journey-streak-card relative min-h-[390px] overflow-hidden rounded-[34px] border border-[#FFD58A]/70 bg-[linear-gradient(145deg,#FFF9E9_0%,#FFF1CC_50%,#FFE4A3_100%)] p-5 shadow-[0_22px_55px_-30px_rgba(211,121,20,.55)] md:p-7" aria-labelledby="streak-title">
      <div className="journey-spark-field pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div><p className="text-xs font-black text-[#C76816]">{t("streakEyebrow")}</p><h2 id="streak-title" className="mt-1 text-2xl font-black text-[#1F3A5F] md:text-3xl">{t("streakTitle")}</h2><p className="mt-1 text-sm font-bold text-[#765936]">{streak.completedToday ? t("streakActive") : t("streakKeep")}</p></div>
        <div className="journey-flame-wrap relative flex h-32 w-28 shrink-0 items-center justify-center" aria-label={t("streakCount", { count: toIndicDigits(streak.current) })}>
          <span className="journey-flame-glow absolute h-20 w-20 rounded-full bg-[#FF9D22]/45 blur-xl" aria-hidden />
          <span className="journey-flame text-7xl drop-shadow-[0_8px_10px_rgba(220,96,10,.28)]" aria-hidden>🔥</span>
          <span className="absolute bottom-1 rounded-full bg-white px-3 py-1 text-lg font-black text-[#E66C16] shadow-md">{toIndicDigits(streak.current)}</span>
        </div>
      </div>
      <div className="relative mt-6 rounded-[26px] bg-white/75 p-4 shadow-inner backdrop-blur-sm">
        <div className="grid grid-cols-7 gap-1.5" role="list" aria-label={t("weekAria")}>
          {streak.recentDays.map((day) => {
            const dayName = new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(`${day.date}T12:00:00`));
            return <div key={day.date} role="listitem" className="flex min-w-0 flex-col items-center gap-2"><span className={`text-[10px] font-black md:text-xs ${day.isToday ? "text-[#E66C16]" : "text-[#78879A]"}`}>{day.isToday ? t("todayDay") : dayName}</span><span className={["relative flex aspect-square w-full max-w-12 items-center justify-center rounded-2xl border-2 text-lg font-black transition", day.active ? "journey-day-active border-[#FFB43D] bg-gradient-to-b from-[#FFCC62] to-[#FF9A2F] text-white shadow-[0_5px_0_#D97713]" : day.isToday ? "border-dashed border-[#F4A03C] bg-white text-[#F4A03C]" : "border-white bg-[#EDF2F6] text-[#A9B4C1]"].join(" ")}>{day.active ? "✓" : day.isToday ? "●" : "·"}</span></div>;
          })}
        </div>
      </div>
      <div className="relative mt-5"><div className="flex items-center justify-between gap-3 text-xs font-black text-[#765936]"><span>{t("nextMilestone", { count: toIndicDigits(nextMilestone) })}</span><span>{t("streakLongest", { count: toIndicDigits(streak.longest) })}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-gradient-to-r from-[#FF8A25] via-[#FFC241] to-[#FFE073] transition-[width] duration-700" style={{ width: `${milestoneProgress}%` }} /></div></div>
    </section>
  );
}

function DailyMission({ data, childId, onChangeGoal }: { data: JourneyDashboard; childId: number; onChangeGoal: () => void }) {
  const t = useTranslations("student.journeyDashboard");
  const { completedLessons, targetLessons, goalCompleted } = data.today;
  const completed = Math.min(completedLessons, targetLessons);
  const percentage = Math.min(100, (completedLessons / targetLessons) * 100);
  const href = data.nextLesson ? lessonPlayPath(data.nextLesson.id, childId) : withChildQuery("/subjects", childId);
  const goalKey = GOAL_OPTIONS.find((option) => option.value === targetLessons)?.key ?? "balanced";
  return (
    <section className={`relative overflow-hidden rounded-[34px] border border-white bg-white/95 p-5 shadow-[0_20px_55px_-32px_rgba(26,43,71,.48)] md:p-7 ${goalCompleted ? "journey-goal-pop" : ""}`} aria-labelledby="mission-title">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-[#22A58E]">{t("missionEyebrow")}</p><h2 id="mission-title" className="mt-1 text-2xl font-black text-[#1F3A5F]">{t("todayTitle")}</h2></div><button type="button" onClick={onChangeGoal} className="rounded-full bg-[#FFF1E4] px-3 py-2 text-xs font-black text-[#E66C16] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F48232]">{t("changeGoal")}</button></div>
      <div className="mt-5 flex items-center justify-between gap-4 rounded-[24px] bg-[#F2FBF8] p-4"><div><p className="text-sm font-black text-[#168875]">{t(`goal.${goalKey}`)}</p><p className="mt-1 text-xs font-bold text-[#66788E]">{t(`goal.${goalKey}Hint`)}</p></div><div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#2EC4A8 ${percentage}%, #DDEFEA ${percentage}% 100%)` }}><div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white shadow-inner"><strong className="text-xl font-black text-[#1F3A5F]">{toIndicDigits(completed)}/{toIndicDigits(targetLessons)}</strong><span className="text-[9px] font-black text-[#7A8BA3]">{t("lessonsUnit")}</span></div></div></div>
      <div className="mt-5 flex justify-between gap-1.5" aria-label={t("stationsAria", { completed: toIndicDigits(completedLessons), target: toIndicDigits(targetLessons) })}>{Array.from({ length: targetLessons }, (_, index) => <span key={index} className={["h-3 flex-1 rounded-full transition-colors", index < completedLessons ? "bg-[#2EC4A8]" : index === completedLessons && !goalCompleted ? "journey-current-step bg-[#F4A03C]" : "bg-[#E6EDF3]"].join(" ")} />)}</div>
      <p className="mt-5 text-center text-sm font-extrabold text-[#52657E]">{goalCompleted ? t("statusDone") : completedLessons === 0 ? t("statusIdle") : t("statusProgress", { completed: toIndicDigits(completedLessons), target: toIndicDigits(targetLessons) })}</p>
      {data.nextLesson ? <p className="mt-2 truncate text-center text-xs font-bold text-[#8290A2]">{t("nextLessonInline", { lesson: data.nextLesson.title })}</p> : null}
      <Link href={href} className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#F48232] to-[#FFAA45] px-4 py-3.5 text-base font-black text-white shadow-[0_5px_0_#D76A1C] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F48232]">{goalCompleted ? t("extraLessonCta") : data.nextLesson?.resumeAvailable ? t("resumeLesson") : t("startMissionCta")}</Link>
    </section>
  );
}

function DailyGoalPicker({ open, current, saving, onClose, onSave }: { open: boolean; current: DailyGoalTarget; saving: boolean; onClose: () => void; onSave: (target: DailyGoalTarget) => Promise<void> }) {
  const t = useTranslations("student.journeyDashboard");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DailyGoalTarget | null>(null);
  const selected = draft ?? current;
  useEffect(() => { if (!open) return; const previous = document.activeElement as HTMLElement | null; const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose(); document.addEventListener("keydown", onKey); panelRef.current?.querySelector<HTMLElement>("button")?.focus(); return () => { document.removeEventListener("keydown", onKey); previous?.focus(); }; }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center"><button type="button" className="absolute inset-0 bg-[#1A2B47]/50 backdrop-blur-sm" aria-label={t("close")} onClick={onClose} /><div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative z-10 w-full max-w-md rounded-t-[30px] bg-white p-5 shadow-2xl md:rounded-[30px] md:p-6"><h2 id={titleId} className="text-xl font-black text-[#1F3A5F]">{t("goalPickerTitle")}</h2><p className="mt-1 text-sm font-semibold text-[#718096]">{t("goalPickerSub")}</p><div className="mt-5 space-y-3" role="radiogroup">{GOAL_OPTIONS.map((option) => <button key={option.value} type="button" role="radio" aria-checked={selected === option.value} onClick={() => setDraft(option.value)} className={["flex w-full items-center gap-3 rounded-[22px] border-2 px-4 py-3 text-start transition", selected === option.value ? "border-[#F4A03C] bg-[#FFF7EB] shadow-sm" : "border-[#E8EEF5] hover:border-[#F4A03C]/50"].join(" ")}><span className="text-2xl" aria-hidden>{option.icon}</span><span className="flex-1"><strong className="block text-sm font-black text-[#1F3A5F]">{t(`goal.${option.key}`)}</strong><span className="text-xs font-semibold text-[#718096]">{t(`goal.${option.key}Hint`)}</span></span>{option.value === 3 ? <span className="rounded-full bg-[#DFF7F1] px-2 py-1 text-[10px] font-black text-[#168875]">{t("recommended")}</span> : null}</button>)}</div><button type="button" disabled={saving} onClick={() => void onSave(selected)} className="mt-5 w-full rounded-2xl bg-[#F48232] py-3.5 text-sm font-black text-white shadow-[0_4px_0_#D56A1C] disabled:opacity-60">{saving ? t("saving") : t("saveGoal")}</button></div></div>;
}

function JourneyDashboardSkeleton() { return <div className="mx-auto w-full max-w-6xl animate-pulse px-4 py-6"><div className="h-40 rounded-[30px] bg-white/80" /><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="h-96 rounded-[34px] bg-white/80" /><div className="h-96 rounded-[34px] bg-white/80" /></div></div>; }

function JourneyDashboardError({ onRetry, subjectsHref }: { onRetry: () => void; subjectsHref: string }) { const t = useTranslations("student.journeyDashboard"); return <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center"><p className="text-lg font-black text-[#1F3A5F]">{t("errorTitle")}</p><div className="mt-5 flex gap-2"><button type="button" onClick={onRetry} className="rounded-2xl bg-[#F48232] px-4 py-2.5 text-sm font-black text-white">{t("retry")}</button><Link href={subjectsHref} className="rounded-2xl border border-[#C5D3E3] px-4 py-2.5 text-sm font-bold text-[#1F3A5F]">{t("goSubjects")}</Link></div></div>; }
