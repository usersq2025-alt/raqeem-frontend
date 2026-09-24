"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getReportEmailQuota, requestParentWeeklyReportEmail, type ReportEmailQuota } from "@/lib/api/parentWeeklyReport";
import { formatLocaleDate } from "@/lib/i18n/latinNumerals";
import { CardShell } from "./SettingsUi";

export function WeeklyInsightsCard({ studentId, email, emailVerified }: { studentId: number; email: string | null; emailVerified: boolean }) {
  const t = useTranslations("familySettings.reports.insights");
  const locale = useLocale();
  const [quota, setQuota] = useState<ReportEmailQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getReportEmailQuota(studentId).then((value) => {
      if (!cancelled) { setQuota(value); setFailed(false); }
    }).catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  async function sendEmail() {
    if (sending || !emailVerified) return;
    setSending(true);
    setSendError(null);
    setSent(false);
    try {
      setQuota(await requestParentWeeklyReportEmail(studentId));
      setSent(true);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "SEND_FAILED");
    } finally {
      setSending(false);
    }
  }

  const date = (value: string) => formatLocaleDate(new Date(`${value}T12:00:00`), locale, { dateStyle: "medium" });
  const sendErrorKey = sendError === "EMAIL_NOT_VERIFIED" ? "emailNotVerified"
    : sendError === "WEEKLY_REPORT_LIMIT_REACHED" ? "weeklyLimitReached"
      : sendError === "NO_ACTIVITY" ? "noActivity"
        : sendError === "GUARDIAN_LOCKED" ? "guardianLocked" : "sendFailed";

  return <CardShell className="bg-white ring-1 ring-brand-navy/10">
    <h3 className="text-base font-extrabold text-text-navy">{t("title")}</h3>
    <p className="mt-2 text-sm leading-relaxed text-text-gray">{t("sendEmailHint")}</p>
    {email ? <p className="mt-3 rounded-xl bg-[#F4F8FC] px-3 py-2 text-sm font-bold text-text-navy" dir="ltr">{email}</p> : null}
    {!emailVerified ? <p className="mt-3 text-sm font-semibold text-[#9B3F34]">{t("emailNotVerified")}</p> : null}
    {loading ? <p className="mt-3 text-sm text-text-gray">{t("loadingQuota")}</p> : null}
    {failed ? <p className="mt-3 text-sm text-text-gray">{t("quotaError")}</p> : null}
    {quota ? <p className="mt-3 text-xs font-semibold text-text-navy">{quota.unlimited ? t("unlimited") : t("quota", { used: quota.used, limit: quota.limit ?? 1, reset: date(quota.resets_at) })}</p> : null}
    <button type="button" onClick={() => void sendEmail()}
      disabled={loading || failed || sending || !emailVerified || (quota !== null && !quota.unlimited && quota.remaining === 0)}
      className="mt-4 min-h-11 rounded-xl bg-brand-navy px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:cursor-not-allowed disabled:opacity-60">
      {sending ? t("sending") : quota !== null && !quota.unlimited && quota.remaining === 0 ? t("limitButton") : sent ? t("sendAgain") : t("sendNow")}
    </button>
    <div aria-live="polite" role="status" className="mt-3 text-sm font-semibold">
      {sent ? <p className="text-[#267C68]">{t("sent")}</p> : null}
      {sendError ? <p className="text-[#9B3F34]">{t(sendErrorKey)}</p> : null}
    </div>
  </CardShell>;
}
