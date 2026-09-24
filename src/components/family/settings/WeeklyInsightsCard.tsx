"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getParentWeeklyReport, requestParentWeeklyReportEmail, type ParentWeeklyReport, type ReportEmailQuota } from "@/lib/api/parentWeeklyReport";
import { formatLocaleDate } from "@/lib/i18n/latinNumerals";
import { CardShell } from "./SettingsUi";

export function WeeklyInsightsCard({ studentId }: { studentId: number }) {
  const t = useTranslations("familySettings.reports.insights");
  const locale = useLocale();
  const [report, setReport] = useState<ParentWeeklyReport | null>(null);
  const [quota, setQuota] = useState<ReportEmailQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getParentWeeklyReport(studentId).then((value) => {
      if (!cancelled) { setReport(value.report); setQuota(value.email_quota); setFailed(false); }
    }).catch(() => { if (!cancelled) { setReport(null); setFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  const date = (value: string) => formatLocaleDate(new Date(`${value}T12:00:00`), locale, { dateStyle: "medium" });

  async function sendEmail() {
    if (sending || !report?.has_activity) return;
    setSending(true);
    setSendError(null);
    try {
      const nextQuota = await requestParentWeeklyReportEmail(studentId);
      setQuota(nextQuota);
      setSent(true);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "SEND_FAILED");
    } finally {
      setSending(false);
    }
  }

  const sendErrorKey = sendError === "EMAIL_NOT_VERIFIED" ? "emailNotVerified"
    : sendError === "WEEKLY_REPORT_LIMIT_REACHED" ? "weeklyLimitReached"
      : sendError === "GUARDIAN_LOCKED" ? "guardianLocked" : "sendFailed";

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
            {item.check ? <p className="mt-2 rounded-lg bg-white p-2 text-xs text-text-navy"><strong>{t("checkLabel")}</strong> {item.check}</p> : null}
          </li>)}</ul>
        </div> : <p className="mt-4 text-sm leading-relaxed text-text-gray">{t("steady")}</p>}
        <p className="mt-4 text-xs leading-relaxed text-text-gray">{t("disclaimer")}</p>
      </>}
      {report.has_activity ? <div className="mt-5 rounded-2xl border border-brand-navy/10 bg-[#F8FBFE] p-4">
        <p className="text-sm font-bold text-text-navy">{t("sendEmailTitle")}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-gray">{t("sendEmailHint")}</p>
        {quota ? <p className="mt-2 text-xs font-semibold text-text-navy">{quota.unlimited ? t("unlimited") : t("quota", { used: quota.used, limit: quota.limit ?? 1, reset: date(quota.resets_at) })}</p> : null}
        <button type="button" onClick={sendEmail} disabled={sending || (quota !== null && !quota.unlimited && quota.remaining === 0)}
          className="mt-3 rounded-xl bg-brand-navy px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:cursor-not-allowed disabled:opacity-60">
          {sending ? t("sending") : quota !== null && !quota.unlimited && quota.remaining === 0 ? t("limitButton") : sent ? t("sendAgain") : t("sendNow")}
        </button>
        <div aria-live="polite" role="status" className="mt-2 text-xs font-semibold">
          {sent ? <p className="text-[#267C68]">{t("sent")}</p> : null}
          {sendError ? <p className="text-[#9B3F34]">{t(sendErrorKey)}</p> : null}
        </div>
      </div> : null}
    </> : null}
  </CardShell>;
}
