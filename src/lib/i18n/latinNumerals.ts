/**
 * Force Western digits (0-9) across Arabic UI instead of Eastern Arabic-Indic (٠-٩).
 */

export const LATIN_NUMBER_FORMATS = {
  number: {
    standard: {
      numberingSystem: "latn" as const,
    },
    integer: {
      numberingSystem: "latn" as const,
      maximumFractionDigits: 0,
    },
  },
  dateTime: {
    short: {
      numberingSystem: "latn" as const,
    },
    medium: {
      numberingSystem: "latn" as const,
    },
    long: {
      numberingSystem: "latn" as const,
    },
  },
} as const;

/** Intl locale tag that keeps Arabic text rules but Western numerals. */
export function withLatinNumerals(locale: string): string {
  if (!locale.startsWith("ar")) return locale;
  if (locale.includes("nu-latn")) return locale;
  const base = locale.split("-u-")[0] || "ar";
  return `${base}-u-nu-latn`;
}

/**
 * The ONE place in the app that should ever construct `Intl.DateTimeFormat`
 * for a locale-only ("ar" | "en") value. Always resolves Arabic to the
 * Western-numeral variant so day/month/year digits never render as
 * Eastern Arabic-Indic characters. Use this instead of calling
 * `new Intl.DateTimeFormat(...)` directly with a raw locale string.
 */
export function formatLocaleDate(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, { ...options, numberingSystem: "latn" }).format(date);
}
