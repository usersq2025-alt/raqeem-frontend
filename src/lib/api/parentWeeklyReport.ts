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
  recommendations: { lesson_id: number; lesson: string; question?: string; selected_answer?: string | null; correct_answer?: string | null; insight?: string; activity: string; tip: string; source: "ai" | "local" }[];
  limited_evidence: boolean;
  has_activity: boolean;
};

export async function getParentWeeklyReport(studentId: number): Promise<ParentWeeklyReport> {
  const response = await fetch(`/api/parent/students/${studentId}/weekly-report`, { credentials: "include", cache: "no-store" });
  const raw = (await readDisplayJson(response)) as { report?: ParentWeeklyReport } | null;
  if (!response.ok || !raw?.report) throw new Error("WEEKLY_REPORT_UNAVAILABLE");
  return raw.report;
}

export async function requestParentWeeklyReportEmail(studentId: number): Promise<void> {
  const response = await fetch(`/api/parent/students/${studentId}/weekly-report/email`, {
    method: "POST", credentials: "include", cache: "no-store",
  });
  const raw = (await readDisplayJson(response)) as { code?: string; status?: string } | null;
  if (!response.ok || raw?.status !== "QUEUED") throw new Error(raw?.code ?? "SEND_FAILED");
}
