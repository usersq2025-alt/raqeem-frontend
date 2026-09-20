import { ApiError } from "@/lib/api/client";

export type GuardianStatus = {
  pinSet: boolean;
  unlocked: boolean;
  pinLocked: boolean;
  pinLockedUntil?: string | null;
  unlockTtlMinutes: number;
  /** snake_case mirrors for callers that read API shape directly */
  pin_set: boolean;
  pin_locked: boolean;
  unlock_ttl_minutes: number;
};

export type ParentAccount = {
  id: number;
  publicId?: string;
  public_id?: string;
  fullName: string;
  full_name: string;
  email: string;
  phone?: string | null;
  phoneCountryCode?: string | null;
  phone_country_code?: string | null;
  preferredLocale?: string | null;
  preferred_locale?: string | null;
  emailVerifiedAt?: string | null;
  email_verified_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  pinSet: boolean;
  pin_set: boolean;
  guardianUnlocked: boolean;
  guardian_unlocked: boolean;
};

export class GuardianApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
    public readonly retryAfter?: number | null
  ) {
    super(message);
    this.name = "GuardianApiError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...init,
    });
  } catch {
    throw new GuardianApiError("NETWORK", "NETWORK", 0);
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const code =
      (typeof body?.code === "string" && body.code) ||
      (typeof body?.message === "string" && body.message) ||
      "ERROR";
    const retry =
      typeof body?.retry_after === "number"
        ? body.retry_after
        : typeof body?.retry_after_seconds === "number"
          ? body.retry_after_seconds
          : null;
    throw new GuardianApiError(code, code, response.status, retry);
  }
  return body as T;
}

function mapStatus(raw: Record<string, unknown>): GuardianStatus {
  const pinSet = Boolean(raw.pin_set ?? raw.pinSet);
  const pinLocked = Boolean(raw.pin_locked ?? raw.pinLocked);
  const unlockTtlMinutes = Number(raw.unlock_ttl_minutes ?? raw.unlockTtlMinutes ?? 15);
  return {
    pinSet,
    unlocked: Boolean(raw.unlocked),
    pinLocked,
    pinLockedUntil: (raw.pin_locked_until ?? raw.pinLockedUntil ?? null) as string | null,
    unlockTtlMinutes,
    pin_set: pinSet,
    pin_locked: pinLocked,
    unlock_ttl_minutes: unlockTtlMinutes,
  };
}

function mapAccount(raw: Record<string, unknown>): ParentAccount {
  const fullName = String(raw.full_name ?? raw.fullName ?? "");
  const pinSet = Boolean(raw.pin_set ?? raw.pinSet);
  const unlocked = Boolean(raw.guardian_unlocked ?? raw.guardianUnlocked);
  return {
    id: Number(raw.id),
    publicId: (raw.public_id ?? raw.publicId) as string | undefined,
    public_id: (raw.public_id ?? raw.publicId) as string | undefined,
    fullName,
    full_name: fullName,
    email: String(raw.email ?? ""),
    phone: (raw.phone ?? null) as string | null,
    phoneCountryCode: (raw.phone_country_code ?? raw.phoneCountryCode ?? null) as string | null,
    phone_country_code: (raw.phone_country_code ?? raw.phoneCountryCode ?? null) as string | null,
    preferredLocale: (raw.preferred_locale ?? raw.preferredLocale ?? null) as string | null,
    preferred_locale: (raw.preferred_locale ?? raw.preferredLocale ?? null) as string | null,
    emailVerifiedAt: (raw.email_verified_at ?? raw.emailVerifiedAt ?? null) as string | null,
    email_verified_at: (raw.email_verified_at ?? raw.emailVerifiedAt ?? null) as string | null,
    createdAt: (raw.created_at ?? raw.createdAt ?? null) as string | null,
    created_at: (raw.created_at ?? raw.createdAt ?? null) as string | null,
    pinSet,
    pin_set: pinSet,
    guardianUnlocked: unlocked,
    guardian_unlocked: unlocked,
  };
}

export async function getGuardianStatus() {
  const raw = await call<Record<string, unknown>>("/api/parent/guardian-mode");
  return mapStatus(raw);
}

export function verifyGuardianPin(pin: string) {
  return call<{ unlocked: boolean }>("/api/parent/guardian-mode/verify-pin", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export async function verifyGuardianPassword(password: string) {
  const raw = await call<Record<string, unknown>>("/api/parent/guardian-mode/verify-password", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  return {
    unlocked: Boolean(raw.unlocked),
    pinSet: Boolean(raw.pin_set ?? raw.pinSet),
    pin_set: Boolean(raw.pin_set ?? raw.pinSet),
    suggestPinSetup: Boolean(raw.suggest_pin_setup ?? raw.suggestPinSetup),
    suggest_pin_setup: Boolean(raw.suggest_pin_setup ?? raw.suggestPinSetup),
  };
}

export function setGuardianPin(
  passwordOrPayload: string | { password: string; pin: string; pinConfirmation?: string },
  pinMaybe?: string
) {
  const password =
    typeof passwordOrPayload === "string" ? passwordOrPayload : passwordOrPayload.password;
  const pin = typeof passwordOrPayload === "string" ? pinMaybe ?? "" : passwordOrPayload.pin;
  const pinConfirmation =
    typeof passwordOrPayload === "string"
      ? pin
      : passwordOrPayload.pinConfirmation ?? passwordOrPayload.pin;

  return call<{ pin_set: boolean; pinSet?: boolean }>("/api/parent/guardian-mode/set-pin", {
    method: "POST",
    body: JSON.stringify({ password, pin, pin_confirmation: pinConfirmation }),
  });
}

export function lockGuardianMode() {
  return call<{ unlocked: boolean }>("/api/parent/guardian-mode/lock", { method: "POST", body: "{}" });
}

export async function getParentAccount() {
  const raw = await call<Record<string, unknown>>("/api/parent/account");
  return mapAccount(raw);
}

export async function updateParentAccount(payload: {
  full_name?: string;
  fullName?: string;
  preferred_locale?: string | null;
  preferredLocale?: string | null;
}) {
  const raw = await call<Record<string, unknown>>("/api/parent/account", {
    method: "PATCH",
    body: JSON.stringify({
      full_name: payload.full_name ?? payload.fullName,
      preferred_locale: payload.preferred_locale ?? payload.preferredLocale,
    }),
  });
  return mapAccount(raw);
}

export function changeParentPassword(currentPassword: string, newPassword: string) {
  return call<{ message: string }>("/api/parent/account/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export function updateWeeklyGoal(studentId: number, weeklyGoalLessons: number) {
  return call<{ id: number; weekly_goal_lessons: number }>(
    `/api/parent/students/${studentId}/weekly-goal`,
    {
      method: "PATCH",
      body: JSON.stringify({ weekly_goal_lessons: weeklyGoalLessons }),
    }
  );
}

export function updateChildProfile(
  studentId: number,
  payload: { full_name?: string; fullName?: string; grade_id?: number; gradeId?: number }
) {
  return call<Record<string, unknown>>(`/api/children/${studentId}`, {
    method: "PATCH",
    body: JSON.stringify({
      full_name: payload.full_name ?? payload.fullName,
      grade_id: payload.grade_id ?? payload.gradeId,
    }),
  });
}

export function toGuardianError(error: unknown): GuardianApiError {
  if (error instanceof GuardianApiError) return error;
  if (error instanceof ApiError) {
    return new GuardianApiError(error.message, error.message, error.status);
  }
  return new GuardianApiError("NETWORK", "NETWORK", 0);
}
