import { ApiError } from "@/lib/api/client";

export { SUPPORT_URL } from "@/lib/config/support";

/** How long a verification code stays valid. Unrelated to the resend wait. */
export const CODE_VALIDITY_SECONDS = 300;

const INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Latin digits only, mirroring the server so the form agrees with it. */
export function toLatinDigits(raw: string): string {
  return raw.replace(/[٠-٩۰-۹]/g, (digit) => {
    const indic = INDIC_DIGITS.indexOf(digit);
    return String(indic >= 0 ? indic : PERSIAN_DIGITS.indexOf(digit));
  });
}

/** Same rules as MsgPlusSmsGateway::normalize. Returns +9639XXXXXXXX or null. */
export function normalizeSyrianPhone(raw: string): string | null {
  let phone = toLatinDigits(raw.trim()).replace(/[\s().-]/g, "");
  if (phone.startsWith("00963")) phone = `+${phone.slice(2)}`;
  else if (/^09\d{8}$/.test(phone)) phone = `+963${phone.slice(1)}`;
  else if (/^9639\d{8}$/.test(phone)) phone = `+${phone}`;
  return /^\+9639\d{8}$/.test(phone) ? phone : null;
}

/** Identity of a number for per-number UI state; equal for equivalent spellings. */
export function phoneKey(raw: string): string {
  return normalizeSyrianPhone(raw) ?? toLatinDigits(raw).replace(/\D/g, "");
}

function duration(unit: "hour" | "minute" | "second", value: number, locale: string): string {
  return new Intl.NumberFormat(`${locale}-u-nu-latn`, { style: "unit", unit, unitDisplay: "long" }).format(value);
}

/** "2 hours", "5 minutes and 3 seconds", "ساعتان". For sentences. */
export function formatDuration(totalSeconds: number, locale: string): string {
  const total = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(duration("hour", hours, locale));
    if (minutes > 0) parts.push(duration("minute", minutes, locale));
  } else if (minutes > 0) {
    parts.push(duration("minute", minutes, locale));
    if (seconds > 0) parts.push(duration("second", seconds, locale));
  } else {
    parts.push(duration("second", seconds, locale));
  }
  const text = new Intl.ListFormat(locale, { type: "conjunction", style: "long" }).format(parts);
  // Always used after a preposition ("بعد ..."), where the Arabic dual is genitive.
  return locale === "ar" ? text.replace("ساعتان", "ساعتين").replace("دقيقتان", "دقيقتين").replace("ثانيتان", "ثانيتين") : text;
}

/** "1:05" for short waits, a sentence-style duration beyond an hour. For buttons. */
export function formatCountdown(totalSeconds: number, locale: string): string {
  const total = Math.max(0, Math.ceil(totalSeconds));
  if (total >= 3600) return formatDuration(total, locale);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export type SendFailure =
  | { kind: "taken" }
  | { kind: "blocked" }
  | { kind: "cooldown"; retryAfter: number }
  | { kind: "invalid" }
  | { kind: "unavailable" }
  | { kind: "network" }
  | { kind: "unknown" };

type FailureBody = { code?: string; message?: string; retry_after?: number; support_required?: boolean } | null;

/** Maps a failed code request to one distinct, actionable situation. */
export function classifySendFailure(error: unknown): SendFailure {
  if (!(error instanceof ApiError)) return { kind: "unknown" };
  const body = (error.body && typeof error.body === "object" ? error.body : null) as FailureBody;
  if (error.status === 0) return { kind: "network" };
  if (error.status === 422 && (body?.code === "PHONE_TAKEN" || body?.message === "PHONE_TAKEN")) return { kind: "taken" };
  if (error.status === 423 || body?.support_required === true) return { kind: "blocked" };
  if (error.status === 429) {
    const seconds = Number(body?.retry_after ?? error.retryAfter ?? 60);
    return { kind: "cooldown", retryAfter: Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60 };
  }
  if (error.status === 422) return { kind: "invalid" };
  if (error.status >= 500) return { kind: "unavailable" };
  return { kind: "unknown" };
}
