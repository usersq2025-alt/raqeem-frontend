/**
 * Fail-closed mock auth: opt-in only via exact "true".
 * Unset / empty / misspelled / "false" → real backend mode.
 */
export function isMockAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";
}
