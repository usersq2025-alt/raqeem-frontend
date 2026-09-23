import { toEnglishDigits } from "./indicDigits";

// Only presentation fields are normalized. IDs, URLs, answer keys, passwords,
// and values sent back to the API retain their original representation.
const DISPLAY_FIELDS = new Set([
  "text", "clue", "label", "title", "description", "name", "name_ar", "name_en",
  "nameAr", "nameEn", "question_text", "questionText", "lesson_title", "lessonTitle",
  "unit_title", "unitTitle", "subject_name", "subjectName", "unit_name", "unitName",
  "grade_name", "gradeName", "profession_name_ar", "profession_name_en",
  "professionNameAr", "professionNameEn",
]);

export function normalizeDisplayNumerals<T>(value: T): T {
  if (Array.isArray(value)) return value.map(normalizeDisplayNumerals) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    DISPLAY_FIELDS.has(key) && typeof item === "string"
      ? toEnglishDigits(item)
      : normalizeDisplayNumerals(item),
  ])) as T;
}

export async function readDisplayJson(response: Response): Promise<unknown> {
  return normalizeDisplayNumerals(await response.json().catch(() => null));
}
