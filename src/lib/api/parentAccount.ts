import { GuardianApiError } from "@/lib/api/guardian";

export type ParentAccount = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  preferredLocale: string | null;
  emailVerifiedAt: string | null;
  createdAt: string | null;
  pinSet: boolean;
  guardianUnlocked: boolean;
};

export class ParentAccountApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ParentAccountApiError";
  }
}

function mapAccount(raw: Record<string, unknown>): ParentAccount {
  return {
    id: Number(raw.id),
    fullName: String(raw.full_name ?? raw.fullName ?? ""),
    email: typeof raw.email === "string" ? raw.email : raw.email === null ? null : null,
    phone: typeof raw.phone === "string" ? raw.phone : raw.phone === null ? null : null,
    phoneCountryCode:
      typeof raw.phone_country_code === "string"
        ? raw.phone_country_code
        : typeof raw.phoneCountryCode === "string"
          ? raw.phoneCountryCode
          : null,
    preferredLocale:
      typeof raw.preferred_locale === "string"
        ? raw.preferred_locale
        : typeof raw.preferredLocale === "string"
          ? raw.preferredLocale
          : null,
    emailVerifiedAt:
      typeof raw.email_verified_at === "string"
        ? raw.email_verified_at
        : typeof raw.emailVerifiedAt === "string"
          ? raw.emailVerifiedAt
          : null,
    createdAt:
      typeof raw.created_at === "string"
        ? raw.created_at
        : typeof raw.createdAt === "string"
          ? raw.createdAt
          : null,
    pinSet: Boolean(raw.pin_set ?? raw.pinSet),
    guardianUnlocked: Boolean(raw.guardian_unlocked ?? raw.guardianUnlocked),
  };
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const code =
      (raw && typeof raw.code === "string" && raw.code) ||
      (raw && typeof raw.message === "string" && raw.message) ||
      "NETWORK";
    const message = raw && typeof raw.message === "string" ? raw.message : code;
    throw new ParentAccountApiError(message, code, response.status);
  }
  return raw ?? {};
}

export async function getParentAccount(): Promise<ParentAccount> {
  const response = await fetch("/api/parent/account", { credentials: "include", cache: "no-store" });
  const raw = await parseResponse(response);
  return mapAccount(raw);
}

export async function updateParentAccount(payload: {
  fullName?: string;
  preferredLocale?: string;
}): Promise<ParentAccount> {
  const body: Record<string, string> = {};
  if (payload.fullName !== undefined) body.full_name = payload.fullName;
  if (payload.preferredLocale !== undefined) body.preferred_locale = payload.preferredLocale;

  const response = await fetch("/api/parent/account", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await parseResponse(response);
  return mapAccount(raw);
}

export async function changeParentPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const response = await fetch("/api/parent/account/change-password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
    }),
  });
  await parseResponse(response);
}

export async function updateStudentWeeklyGoal(studentId: number, weeklyGoalLessons: number): Promise<number> {
  const response = await fetch(`/api/parent/students/${studentId}/weekly-goal`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weekly_goal_lessons: weeklyGoalLessons }),
  });
  const raw = await parseResponse(response);
  return Number(raw.weekly_goal_lessons ?? weeklyGoalLessons);
}

export async function updateChildProfile(
  childId: number,
  payload: { fullName?: string; gradeId?: number }
): Promise<void> {
  const body: Record<string, string | number> = {};
  if (payload.fullName !== undefined) body.full_name = payload.fullName;
  if (payload.gradeId !== undefined) body.grade_id = payload.gradeId;

  const response = await fetch(`/api/children/${childId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await parseResponse(response);
  void raw;
}

export function isGuardianLockedError(error: unknown): error is ParentAccountApiError {
  return error instanceof ParentAccountApiError && error.code === "GUARDIAN_LOCKED";
}

export function isGuardianLockedFromUnknown(error: unknown): boolean {
  if (error instanceof GuardianApiError) return false;
  return isGuardianLockedError(error);
}
