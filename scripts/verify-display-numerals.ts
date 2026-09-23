import assert from "node:assert/strict";
import { normalizeDisplayNumerals } from "../src/lib/format/displayNumerals";
import { toEnglishDigits } from "../src/lib/format/indicDigits";
import { formatLocaleDate } from "../src/lib/i18n/latinNumerals";

assert.equal(toEnglishDigits("السؤال ٣ من ۱۰"), "السؤال 3 من 10");
assert.equal(toEnglishDigits(120), "120");
const source = {
  id: "٣", image_url: "/صور/٣.png", selected_option_id: "٣",
  question_text: "اختر ٣", payload: { options: [{ id: "٣", text: "١٢" }] },
  correct_matches: { "٣": "١٢" }, title: "الوحدة ۲",
};
const result = normalizeDisplayNumerals(source);
assert.equal(result.question_text, "اختر 3");
assert.equal(result.payload.options[0].text, "12");
assert.equal(result.title, "الوحدة 2");
assert.equal(result.id, source.id);
assert.equal(result.image_url, source.image_url);
assert.equal(result.selected_option_id, source.selected_option_id);
assert.deepEqual(result.correct_matches, source.correct_matches);
assert.equal(source.payload.options[0].text, "١٢", "Must not mutate API response");
for (const locale of ["ar", "ar-EG", "ar-SA", "en-US"]) {
  assert(!/[\u0660-\u0669\u06f0-\u06f9]/.test(formatLocaleDate(new Date("2026-09-22T12:00:00Z"), locale, { year: "numeric", month: "long", day: "numeric", numberingSystem: "arab" })));
}
console.log("Display numerals: mixed digits, nested text, identifier preservation, immutability and 4 date locales passed.");
