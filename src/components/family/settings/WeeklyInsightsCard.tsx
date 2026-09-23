"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getParentWeeklyReport, type ParentWeeklyReport } from "@/lib/api/parentWeeklyReport";
import { formatLocaleDate } from "@/lib/i18n/latinNumerals";
import { CardShell } from "./SettingsUi";

export function WeeklyInsightsCard({ studentId }: { studentId: number }) {
  const t = useTranslations("familySettings.reports.insights");
  const locale = useLocale();
  const [report, setReport] = useState<ParentWeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getParentWeeklyReport(studentId).then((value) => {
      if (!cancelled) { setReport(value); setFailed(false); }
    }).catch(() => { if (!cancelled) { setReport(null); setFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  const date = (value: string) => formatLocaleDate(new Date(`${value}T12:00:00`), locale, { dateStyle: "medium" });

  return <CardShell className="bg-white ring-1 ring-brand-navy/10">
    <h3 className="text-base font-extrabold text-text-navy">{t("title")}</h3>
    {loading ? <p className="mt-3 text-sm text-text-gray">{t("loading")}</p> : null}
    {failed ? <p className="mt-3 text-sm text-text-gray">{t("error")}</p> : null}
    {report && !loading ? <>
      <p className="mt-1 text-xs font-semibold text-text-gray">{t("period", { start: date(report.week_start), end: date(report.week_end) })}</p>
      {!report.has_activity ? <p className="mt-4 text-sm leading-relaxed text-text-gray">{t("noActivity")}</p> : <>
        <p className="mt-4 rounded-2xl bg-[#F4F8FC] p-3 text-sm font-semibold text-text-navy">
          {t("activity", { lessons: report.completed_lessons, answers: report.answers })}
        </p>
        {report.limited_evidence ? <p className="mt-3 text-xs leading-relaxed text-text-gray">{t("limited")}</p> : null}
        {report.strengths.length > 0 ? <div className="mt-5">
          <h4 className="text-sm font-extrabold text-[#267C68]">{t("strengths")}</h4>
          <ul className="mt-2 space-y-2">{report.strengths.map((item) => <li key={item.lesson_id} className="rounded-xl bg-[#EFF9F5] px-3 py-2 text-sm text-text-navy">
            <strong>{item.lesson}</strong><span className="mt-0.5 block text-xs text-text-gray">{t("evidence", { correct: item.correct, answers: item.answers })}</span>
          </li>)}</ul>
        </div> : null}
        {report.practice.length > 0 ? <div className="mt-5">
          <h4 className="text-sm font-extrabold text-[#9B6730]">{t("practice")}</h4>
          <ul className="mt-2 space-y-2">{report.practice.map((item) => <li key={item.lesson_id} className="rounded-xl bg-[#FFF7EC] px-3 py-2 text-sm text-text-navy">
            <strong>{item.lesson}</strong><span className="mt-0.5 block text-xs text-text-gray">{t("evidence", { correct: item.correct, answers: item.answers })}</span>
          </li>)}</ul>
        </div> : null}
        {report.recommendations.length > 0 ? <div className="mt-5">
          <h4 className="text-sm font-extrabold text-text-navy">{t("recommendations")}</h4>
          <ul className="mt-2 space-y-3">{report.recommendations.map((item) => <li key={item.lesson_id} className="rounded-xl bg-[#F4F8FC] p-3 text-sm leading-relaxed text-text-navy">
            <strong>{item.lesson}</strong>
            {item.question ? <p className="mt-2 font-semibold">{t("question", { question: item.question })}</p> : null}
            {item.selected_answer && item.correct_answer ? <p className="mt-1 text-text-gray">{t("answerComparison", { selected: item.selected_answer, correct: item.correct_answer })}</p> : null}
            {item.insight ? <p className="mt-2">{item.insight}</p> : null}
            <p className="mt-2 font-semibold">{t("homeActivity", { activity: item.activity })}</p><p className="mt-1 text-text-gray">{item.tip}</p>
          </li>)}</ul>
        </div> : <p className="mt-4 text-sm leading-relaxed text-text-gray">{t("steady")}</p>}
        <p className="mt-4 text-xs leading-relaxed text-text-gray">{t("disclaimer")}</p>
      </>}
    </> : null}
  </CardShell>;
}
