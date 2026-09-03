"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ChildProfile } from "@/lib/api/children";
import type { StudentStreak, SubjectProgress } from "@/lib/api/student";
import { StreakBadge } from "@/components/StreakBadge";
import { SubjectCard } from "@/components/SubjectCard";
import { professionAvatarSrc } from "@/lib/config/professions";
import { subjectCoverSrc, streakPath, withChildQuery } from "@/lib/config/subjects";
import { useMountedViewTransitionName } from "@/lib/utils/useMountedViewTransitionName";
import { Link } from "@/i18n/navigation";

type Props = {
  child: ChildProfile;
  subjects: SubjectProgress[];
  streak: StudentStreak;
};

export function SubjectsHome({ child, subjects, streak }: Props) {
  const t = useTranslations("student");
  const tDesk = useTranslations("student.desktop");
  const tGrades = useTranslations("child.grades");
  const avatar = professionAvatarSrc(child.professionCode, child.gender) ?? "/images/brand/logo.png";
  const gradeKey = String(child.gradeId) as "1" | "2" | "3" | "4" | "5" | "6";
  const gradeLabel = child.gradeId >= 1 && child.gradeId <= 6 ? tGrades(gradeKey) : "";

  const avatarTransition = useMountedViewTransitionName(`child-avatar-${child.id}`);
  const totals = subjects.reduce(
    (acc, subject) => {
      acc.completed += subject.completedLessons;
      acc.total += subject.totalLessons;
      return acc;
    },
    { completed: 0, total: 0 }
  );
  const nextSubject =
    subjects.find((subject) => subject.completedLessons < subject.totalLessons && subject.totalLessons > 0) ??
    subjects.find((subject) => subject.totalLessons > 0) ??
    null;
  const recent = [...subjects]
    .filter((subject) => subject.completedLessons > 0)
    .sort((a, b) => b.completedLessons / Math.max(b.totalLessons, 1) - a.completedLessons / Math.max(a.totalLessons, 1))
    .slice(0, 3);

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_19.5rem] md:items-start md:gap-7">
      <div>
        <header className="relative mb-5 flex flex-col items-center pt-1 md:hidden">
          <div className="absolute end-0 top-0">
            <StreakBadge days={streak.streakCurrent} isActiveToday={streak.isActiveToday} href={streakPath(child.id)} />
          </div>
          <Image src="/images/brand/logo.png" alt={t("brandAlt")} width={160} height={90} className="h-12 w-auto object-contain" priority />

          <div className="mt-4 flex w-full items-center gap-3">
            <span
              className="relative flex h-[4.6rem] w-[4.6rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_10px_24px_-16px_rgba(26,43,71,0.5)]"
              style={avatarTransition}
            >
              <Image src={avatar} alt={child.fullName} width={200} height={200} unoptimized className="h-[88%] w-[88%] object-contain" />
            </span>
            <div className="min-w-0 text-start">
              <p className="truncate text-xl font-extrabold text-text-navy">{child.fullName}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-text-gray">
                <span className="inline-flex items-center gap-1 text-primary-orange">
                  <span aria-hidden="true">★</span>
                  {t("points", { count: child.pointsBalance })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CapIcon />
                  {gradeLabel}
                </span>
              </p>
            </div>
          </div>
        </header>

        <div className="mb-5">
          <h1 className="sr-only text-2xl font-extrabold text-text-navy md:not-sr-only">{t("homeTitle")}</h1>
          {gradeLabel ? (
            <p className="mt-1 hidden items-center gap-1.5 text-sm font-bold text-text-gray md:inline-flex">
              <CapIcon />
              {gradeLabel}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {subjects.map((subject, index) => (
            <SubjectCard key={subject.subjectId} subject={subject} childId={child.id} index={index} />
          ))}
        </div>
      </div>

      <aside className="mt-5 hidden flex-col gap-4 md:mt-0 md:flex">
        <section className="rounded-[24px] bg-white p-4 shadow-[0_14px_32px_-22px_rgba(26,43,71,0.4)]">
          <h2 className="text-sm font-extrabold text-text-navy">{tDesk("continueLearning")}</h2>
          {nextSubject ? (
            <Link
              href={withChildQuery(`/subjects/${nextSubject.subjectId}/units`, child.id)}
              className="mt-3 flex items-center gap-3 rounded-[20px] bg-[#FFF8F1] p-3"
            >
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <Image
                  src={subjectCoverSrc(nextSubject.key, nextSubject.iconUrl)}
                  alt=""
                  width={112}
                  height={112}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-text-navy">{t(`subjects.${nextSubject.key}`)}</span>
                <span className="mt-0.5 block text-xs font-bold text-text-gray">
                  {t("lessonsCount", { completed: nextSubject.completedLessons, total: nextSubject.totalLessons })}
                </span>
                <span className="mt-1 block text-xs font-extrabold text-primary-orange">{tDesk("openSubject")}</span>
              </span>
            </Link>
          ) : (
            <p className="mt-3 text-sm font-semibold text-text-gray">{tDesk("allCaughtUp")}</p>
          )}
        </section>

        <section className="rounded-[24px] bg-white p-4 shadow-[0_14px_32px_-22px_rgba(26,43,71,0.4)]">
          <h2 className="text-sm font-extrabold text-text-navy">{tDesk("streakTitle")}</h2>
          <div className="mt-3">
            <StreakBadge days={streak.streakCurrent} isActiveToday={streak.isActiveToday} href={streakPath(child.id)} />
          </div>
          <p className="mt-2 text-xs font-bold text-text-gray">{tDesk("streakLongest", { count: streak.streakLongest })}</p>
          <p className="mt-1 text-xs font-semibold text-text-gray">
            {streak.isActiveToday ? tDesk("streakDone") : tDesk("streakKeep")}
          </p>
        </section>

        <section className="rounded-[24px] bg-white p-4 shadow-[0_14px_32px_-22px_rgba(26,43,71,0.4)]">
          <h2 className="text-sm font-extrabold text-text-navy">{tDesk("progressOverview")}</h2>
          <p className="mt-2 text-sm font-extrabold text-text-navy">
            {tDesk("lessonsDone", { completed: totals.completed, total: totals.total })}
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-primary-orange"
              style={{ width: `${totals.total > 0 ? Math.min(100, Math.round((totals.completed / totals.total) * 100)) : 0}%` }}
            />
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-4 shadow-[0_14px_32px_-22px_rgba(26,43,71,0.4)]">
          <h2 className="text-sm font-extrabold text-text-navy">{tDesk("recentSubjects")}</h2>
          {recent.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-text-gray">{tDesk("noRecent")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {recent.map((subject) => (
                <li key={subject.subjectId}>
                  <Link
                    href={withChildQuery(`/subjects/${subject.subjectId}/units`, child.id)}
                    className="flex items-center justify-between gap-2 rounded-2xl bg-neutral-50 px-3 py-2"
                  >
                    <span className="text-sm font-extrabold text-text-navy">{t(`subjects.${subject.key}`)}</span>
                    <span className="text-xs font-bold text-text-gray">
                      {subject.completedLessons}/{subject.totalLessons}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function CapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-text-navy" fill="none" aria-hidden="true">
      <path d="M3 10.5 12 6l9 4.5-9 4.5L3 10.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 12.5v4.2c1.6 1 3.2 1.5 5 1.5s3.4-.5 5-1.5V12.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
