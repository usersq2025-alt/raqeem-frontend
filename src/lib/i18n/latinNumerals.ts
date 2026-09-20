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
