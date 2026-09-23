"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocaleDate } from "@/lib/i18n/latinNumerals";
import {
  getParentAlerts, markAlertRead, markAllAlertsRead, saveAlertPreferences,
  type AlertPreferences, type ParentAlert, type ParentAlertsData,
} from "@/lib/api/parentAlerts";
import { CardShell, EmptyBlock, ErrorBlock, SectionIntro, SkeletonBlock } from "./SettingsUi";

const eventKeys = ["lesson_completed", "weekly_goal_reached", "purchase_made", "weekly_report"] as const;

export function AlertsSection({ emailReady, accountLoaded, onUnreadChange }: { emailReady: boolean; accountLoaded: boolean; onUnreadChange: (count: number) => void }) {
  const t = useTranslations("familySettings");
  const locale = useLocale();
  const [data, setData] = useState<ParentAlertsData | null>(null);
  const [draft, setDraft] = useState<AlertPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const next = await getParentAlerts();
      setData(next);
      setDraft(next.preferences);
      onUnreadChange(next.unread_count);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save() {
    if (!draft) return;
    setWorking(true);
    setFeedback("");
    try {
      const preferences = await saveAlertPreferences(draft);
      setDraft(preferences);
      setData((current) => current ? { ...current, preferences } : current);
      setFeedback(t("savedChanges"));
    } catch {
      setFeedback(t("errors.saveFailed"));
    } finally {
      setWorking(false);
    }
  }

  async function readOne(alert: ParentAlert) {
    if (alert.read_at || working) return;
    setWorking(true);
    try {
      await markAlertRead(alert.id);
      setData((current) => current ? {
        ...current,
        unread_count: Math.max(0, current.unread_count - 1),
        alerts: current.alerts.map((row) => row.id === alert.id ? { ...row, read_at: new Date().toISOString() } : row),
      } : current);
      onUnreadChange(Math.max(0, (data?.unread_count ?? 0) - 1));
    } catch {
      setFeedback(t("errors.saveFailed"));
    } finally {
      setWorking(false);
    }
  }

  async function readAll() {
    if (working) return;
    setWorking(true);
    try {
      await markAllAlertsRead();
      setData((current) => current ? {
        ...current,
        unread_count: 0,
        alerts: current.alerts.map((row) => ({ ...row, read_at: row.read_at ?? new Date().toISOString() })),
      } : current);
      onUnreadChange(0);
    } catch {
      setFeedback(t("errors.saveFailed"));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionIntro title={t("alerts.panelTitle")} description={t("alerts.panelLead")} />
      {loading ? <SkeletonBlock rows={4} /> : null}
      {error ? <ErrorBlock message={t("loadError")} retryLabel={t("retry")} onRetry={load} /> : null}
      {!loading && !error && draft && data ? <>
        <CardShell className="bg-white ring-1 ring-brand-navy/10">
          <h3 className="text-base font-extrabold text-text-navy">{t("alerts.deliveryTitle")}</h3>
          <p className="mt-1 text-sm leading-relaxed text-text-gray">{t("alerts.deliveryLead")}</p>
          <div className="mt-4 space-y-2">
            <Toggle label={t("alerts.inApp")} description={t("alerts.inAppHint")} checked={draft.in_app_enabled} onChange={(checked) => setDraft({ ...draft, in_app_enabled: checked })} />
            <Toggle label={t("alerts.email")} description={t("alerts.emailHint")} checked={draft.email_enabled} onChange={(checked) => setDraft({ ...draft, email_enabled: checked })} />
          </div>
          {accountLoaded && !emailReady && draft.email_enabled ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900" role="status">{t("alerts.emailNotReady")}</p> : null}
          <h3 className="mt-6 text-base font-extrabold text-text-navy">{t("alerts.eventsTitle")}</h3>
          <div className="mt-3 space-y-2">
            {eventKeys.map((key) => <Toggle key={key} label={t(`alerts.events.${key}`)} description={t(`alerts.eventHints.${key}`)} checked={draft[key]} onChange={(checked) => setDraft({ ...draft, [key]: checked })} />)}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={working || JSON.stringify(draft) === JSON.stringify(data.preferences)} className="min-h-11 rounded-2xl bg-primary-orange px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">{t("save")}</button>
            {feedback ? <span role="status" className="text-sm font-bold text-text-navy">{feedback}</span> : null}
          </div>
        </CardShell>

        <CardShell className="bg-white ring-1 ring-brand-navy/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-base font-extrabold text-text-navy">{t("alerts.inboxTitle")}</h3><p className="mt-1 text-sm text-text-gray">{t("alerts.unread", { count: data.unread_count })}</p></div>
            {data.unread_count > 0 ? <button type="button" disabled={working} onClick={readAll} className="min-h-11 rounded-2xl bg-[#EDF3FA] px-4 text-sm font-extrabold text-text-navy disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">{t("alerts.readAll")}</button> : null}
          </div>
          {data.alerts.length === 0 ? <div className="mt-4"><EmptyBlock title={t("alerts.emptyTitle")} body={t("alerts.emptyBody")} /></div> : (
            <ul className="mt-4 space-y-2">
              {data.alerts.map((alert) => <li key={alert.id} className={`rounded-2xl p-4 ${alert.read_at ? "bg-neutral-50" : "bg-[#FFF5E8] ring-1 ring-[#F7D7AF]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="font-extrabold text-text-navy">{alertText(alert, t)}</p><p className="mt-1 text-xs font-semibold text-text-gray">{formatLocaleDate(new Date(alert.created_at), locale, { dateStyle: "medium", timeStyle: "short" })}</p></div>
                  {!alert.read_at ? <button type="button" disabled={working} onClick={() => readOne(alert)} className="min-h-11 shrink-0 rounded-xl bg-white px-3 text-xs font-extrabold text-primary-orange disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">{t("alerts.markRead")}</button> : null}
                </div>
              </li>)}
            </ul>
          )}
        </CardShell>
      </> : null}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-[#F8FAFC] p-3.5">
    <span><span className="block text-sm font-extrabold text-text-navy">{label}</span><span className="mt-0.5 block text-xs leading-relaxed text-text-gray">{description}</span></span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-[#F48232]" />
  </label>;
}

function alertText(alert: ParentAlert, t: ReturnType<typeof useTranslations<"familySettings">>) {
  const name = alert.payload.student_name || t("alerts.childFallback");
  if (alert.type === "weekly_goal_reached") return t("alerts.messages.weekly_goal_reached", { name, count: alert.payload.goal ?? 0 });
  if (alert.type === "purchase_made") return t("alerts.messages.purchase_made", { name, item: alert.payload.item_name || t("alerts.itemFallback"), points: alert.payload.points ?? 0 });
  return t("alerts.messages.lesson_completed", { name, lesson: alert.payload.lesson_name || t("alerts.lessonFallback") });
}
