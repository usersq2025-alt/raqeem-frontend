"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { StudentStreak } from "@/lib/api/student";
import { StreakBadge } from "@/components/StreakBadge";
import { Button } from "@/components/ui/Button";
import { withChildQuery } from "@/lib/config/subjects";

type Props = {
  childId: number;
  streak: StudentStreak;
};

export function StreakCalendarExperience({ childId, streak }: Props) {
  const t = useTranslations("student.streak");
  const tStudent = useTranslations("student");
  const locale = useLocale();
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const active = new Set(streak.activityDates);
  const weekStart = locale.startsWith("ar") ? 6 : 0;
  const matrix = useMemo(() => buildMonth(cursor.year, cursor.month, weekStart), [cursor.month, cursor.year, weekStart]);
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(2024, 8, 1 + ((index + weekStart) % 7));
      return formatter.format(date);
    });
  }, [locale, weekStart]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(cursor.year, cursor.month, 1)
  );
  const todayKey = toKey(today);

  function shift(delta: number) {
    setCursor((current) => {
      const date = new Date(current.year, current.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  return (
    <div className="md:mx-auto md:max-w-2xl">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-navy">{t("title")}</h1>
          <p className="mt-1 text-sm font-bold text-text-gray">{t("longest", { count: streak.streakLongest })}</p>
        </div>
        <StreakBadge days={streak.streakCurrent} isActiveToday={streak.isActiveToday} />
      </header>

      <section className="rounded-[28px] bg-white p-4 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)]" aria-label={t("calendarAria")}>
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} className="rounded-full px-3 py-1 text-lg font-extrabold text-text-navy" aria-label="prev">
            ‹
          </button>
          <p className="text-sm font-extrabold text-text-navy">{monthLabel}</p>
          <button type="button" onClick={() => shift(1)} className="rounded-full px-3 py-1 text-lg font-extrabold text-text-navy" aria-label="next">
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-text-gray">
          {weekdayLabels.map((label) => (
            <span key={label} className="py-1">
              {label}
            </span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {matrix.map((cell, index) => {
            if (!cell) return <span key={`empty-${index}`} />;
            const key = toKey(cell);
            const lit = active.has(key);
            const isToday = key === todayKey;
            return (
              <span
                key={key}
                className={`flex h-10 items-center justify-center rounded-2xl text-sm font-extrabold ${
                  lit ? "bg-[#FFF1E4] text-primary-orange" : "text-text-navy"
                } ${isToday ? "ring-2 ring-primary-orange" : ""}`}
              >
                {cell.getDate()}
              </span>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)]">
        <h2 className="text-sm font-extrabold text-text-navy">{t("badges")}</h2>
        {streak.badges.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-text-gray">{t("noBadges")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {streak.badges.map((badge) => (
              <li key={badge.code} className="rounded-2xl bg-[#FFF8F1] px-4 py-3 text-sm font-extrabold text-text-navy">
                {locale.startsWith("ar") ? badge.nameAr || badge.nameEn : badge.nameEn || badge.nameAr}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6">
        <Button href={withChildQuery("/subjects", childId)} variant="secondary">
          {tStudent("back")}
        </Button>
      </div>
    </div>
  );
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildMonth(year: number, month: number, weekStart: number) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() - weekStart + 7) % 7;
  const cells: Array<Date | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
