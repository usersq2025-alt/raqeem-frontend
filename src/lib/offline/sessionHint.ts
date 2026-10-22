import { SESSION_HINT_COOKIE_NAME } from "@/lib/auth/sessionCookie";

/**
 * Client-side only. Reads the non-sensitive "was logged in" flag set alongside the real
 * (httpOnly) session cookie, so offline-aware UI can tell "logged in but offline" apart
 * from "never logged in" without a network round trip. Never carries a token or id.
 */
export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((entry) => entry === `${SESSION_HINT_COOKIE_NAME}=1`);
}
