/** Keep Western digits (0-9) across the platform. Kept under the old name for API compatibility. */
export function toIndicDigits(value: number | string): string {
  return String(value);
}
