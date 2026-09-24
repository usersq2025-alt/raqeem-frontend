import { readDisplayJson } from "@/lib/format/displayNumerals";

export type LessonEvidence = {
  lesson_id: number;
  lesson: string;
  subject: string;
  answers: number;
  correct: number;
  percent: number;
};

export type ParentWeeklyReport = {
  week_start: string;
  week_end: string;
  completed_lessons: number;
  answers: number;
  correct_answers: number;
  strengths: LessonEvidence[];
  practice: LessonEvidence[];
  recommendations: { lesson_id: number; lesson: string; question?: string; selected_answer?: string | null; correct_answer?: string | null; insight?: string; activity: string; tip: string; check?: string; source: "ai" | "local" }[];
  limited_evidence: boolean;
  has_activity: boolean;
};

export type ReportEmailQuota = { used: number; limit: number | null; remaining: number | null; unlimited: boolean; resets_at: string };

export async function getParentWeeklyReport(studentId: number): Promise<{ report: ParentWeeklyReport; email_quota: ReportEmailQuota }> {
  const response = await fetch(`/api/parent/students/${studentId}/weekly-report`, { credentials: "include", cache: "no-store" });
  const raw = (await readDisplayJson(response)) as { report?: ParentWeeklyReport; email_quota?: ReportEmailQuota } | null;
  if (!response.ok || !raw?.report || !raw.email_quota) throw new Error("WEEKLY_REPORT_UNAVAILABLE");
  return { report: raw.report, email_quota: raw.email_quota };
}

export async function requestParentWeeklyReportEmail(studentId: number): Promise<ReportEmailQuota> {
  const response = await fetch(`/api/parent/students/${studentId}/weekly-report/email`, {
    method: "POST", credentials: "include", cache: "no-store",
  });
  const raw = (await readDisplayJson(response)) as { code?: string; status?: string; email_quota?: ReportEmailQuota } | null;
  if (!response.ok || raw?.status !== "QUEUED" || !raw.email_quota) throw new Error(raw?.code ?? "SEND_FAILED");
  return raw.email_quota;
}
