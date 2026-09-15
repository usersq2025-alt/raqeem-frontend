const INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;

/** Convert Western digits to Eastern Arabic (Hindi) numerals used in elementary Arabic schoolbooks. */
export function toIndicDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => INDIC[Number(digit)] ?? digit);
}
