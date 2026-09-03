export const SUBJECT_KEYS = [
  "arabic",
  "english",
  "french",
  "math",
  "religion",
  "social",
  "science",
] as const;

export type SubjectKey = (typeof SUBJECT_KEYS)[number];

const NAME_EN_TO_KEY: Record<string, SubjectKey> = {
  arabic: "arabic",
  english: "english",
  french: "french",
  mathematics: "math",
  math: "math",
  "religious education": "religion",
  religion: "religion",
  "social studies": "social",
  science: "science",
};

export const SUBJECT_TINTS: Record<SubjectKey, string> = {
  arabic: "bg-[#E8F3FF]",
  english: "bg-[#FFE8F0]",
  french: "bg-[#EDE7FF]",
  math: "bg-[#E8F8EE]",
  religion: "bg-[#FFF4D6]",
  social: "bg-[#FFE9DC]",
  science: "bg-[#E7F7F4]",
};

export const UNIT_ACCENTS = ["#7C9CFF", "#F48FB1", "#7ED3B2", "#F6C15B", "#C9A0FF", "#FF9F7A", "#6EC8E6"] as const;

export function subjectKeyFromRow(row: {
  name_en?: string;
  nameEn?: string;
  sort_order?: number;
  sortOrder?: number;
}): SubjectKey {
  const en = String(row.name_en ?? row.nameEn ?? "")
    .trim()
    .toLowerCase();
  if (en && NAME_EN_TO_KEY[en]) return NAME_EN_TO_KEY[en];

  const order = Number(row.sort_order ?? row.sortOrder ?? 0);
  if (order >= 1 && order <= SUBJECT_KEYS.length) {
    return SUBJECT_KEYS[order - 1];
  }

  return "arabic";
}

export function subjectCoverSrc(key: SubjectKey, iconUrl: string | null | undefined): string {
  const remote = typeof iconUrl === "string" ? iconUrl.trim() : "";
  if (remote) return remote;
  return `/images/subjects/${key}.png?v=6`;
}

export function withChildQuery(path: string, childId: number): string {
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}childId=${childId}`;
}

export function lessonPlayPath(lessonId: number, childId: number): string {
  return withChildQuery(`/lessons/${lessonId}/play`, childId);
}

export function unitLessonPath(unitId: number, childId: number): string {
  return withChildQuery(`/units/${unitId}/path`, childId);
}

export function unitReviewPath(unitId: number, childId: number): string {
  return withChildQuery(`/units/${unitId}/review`, childId);
}

export function unitPathFocus(unitId: number, childId: number, lessonId: number): string {
  return withChildQuery(`/units/${unitId}/path?focusLesson=${lessonId}`, childId);
}

export function streakPath(childId: number): string {
  return withChildQuery("/streak", childId);
}
