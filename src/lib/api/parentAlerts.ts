import { readDisplayJson } from "@/lib/format/displayNumerals";

export type AlertPreferences = {
  in_app_enabled: boolean;
  email_enabled: boolean;
  lesson_completed: boolean;
  weekly_goal_reached: boolean;
  purchase_made: boolean;
  weekly_report: boolean;
};

export type ParentAlert = {
  id: number;
  student_id: number | null;
  type: "lesson_completed" | "weekly_goal_reached" | "purchase_made";
  payload: { student_name?: string; lesson_name?: string; goal?: number; item_name?: string; points?: number };
  read_at: string | null;
  created_at: string;
};

export type ParentAlertsData = {
  preferences: AlertPreferences;
  unread_count: number;
  alerts: ParentAlert[];
};

async function request(path: string, method: "GET" | "PATCH" | "POST", body?: unknown) {
  const response = await fetch(path, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await readDisplayJson(response);
  if (!response.ok) throw new Error("PARENT_ALERT_REQUEST_FAILED");
  return result;
}

export async function getParentAlerts(): Promise<ParentAlertsData> {
  return (await request("/api/parent/alerts", "GET")) as ParentAlertsData;
}

export async function saveAlertPreferences(preferences: AlertPreferences): Promise<AlertPreferences> {
  const result = (await request("/api/parent/alerts/preferences", "PATCH", preferences)) as { preferences: AlertPreferences };
  return result.preferences;
}

export async function markAlertRead(id: number): Promise<void> {
  await request(`/api/parent/alerts/${id}/read`, "POST");
}

export async function markAllAlertsRead(): Promise<void> {
  await request("/api/parent/alerts/read-all", "POST");
}
