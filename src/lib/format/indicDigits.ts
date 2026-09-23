/**
 * Force Western digits (0-9) across the platform, including when the
 * input is already a string that may contain Eastern Arabic-Indic
 * (٠-٩) or Extended Arabic-Indic/Persian (۰-۹) digit characters — e.g.
 * text coming straight from the backend API. Plain JS numbers already
 * stringify as Western digits, so this mainly guards string values.
 *
 * Kept under the old name (`toIndicDigits`) for call-site compatibility;
 * despite the name it always OUTPUTS Western digits.
 */
export function toIndicDigits(value: number | string): string {
  if (typeof value === "number") return String(value);
  return value.replace(/[٠-٩۰-۹]/g, (char) => {
    const code = char.charCodeAt(0);
    // Eastern Arabic-Indic ٠-٩ (U+0660–U+0669) and Extended Arabic-Indic/Persian ۰-۹ (U+06F0–U+06F9)
    const digit = code >= 0x06f0 ? code - 0x06f0 : code - 0x0660;
    return String(digit);
  });
}

/** Alias with an honest name for new call sites. */
export const toEnglishDigits = toIndicDigits;
