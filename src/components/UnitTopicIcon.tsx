import type { UnitProgress } from "@/lib/api/student";
import type { SubjectKey } from "@/lib/config/subjects";

type Topic =
  | "movement" | "nature" | "health" | "science" | "people" | "message" | "art"
  | "chart" | "numbers" | "operations" | "shapes" | "measure" | "fraction" | "clock"
  | "heart" | "balance" | "book" | "map" | "history" | "home" | "work"
  | "sun" | "mountain" | "energy";

function clean(value: string): string {
  return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "");
}

export function unitTopic(subject: SubjectKey, unit: Pick<UnitProgress, "title" | "lessons">): Topic {
  const title = clean(unit.title);
  const lessons = clean(unit.lessons.map((lesson) => lesson.title).join(" "));

  if (subject === "science") {
    if (/بنى تتحرك|عظامي|ألعب وأتحرك/.test(lessons)) return "movement";
    if (/مركز القيادة|أشياء لا أراها|أمزج ألواني/.test(lessons)) return "science";
    if (/استمرار الحياة|تضيء الكون|دوالب الهواء/.test(lessons)) return "sun";
    if (/نبتتي|طاقة الحياة|رحلة المواد/.test(lessons)) return "nature";
    if (/الصخور|قوة الطفو/.test(lessons)) return "mountain";
    if (/مصادر الطاقة|إعادة التدوير/.test(lessons)) return "energy";
    return "science";
  }
  if (subject === "math") {
    if (/التمثيلات البيانية/.test(title)) return "chart";
    if (/جمع|طرح|ضرب|القسمة/.test(title)) return "operations";
    if (/الهندسة/.test(title)) return "shapes";
    if (/القياس/.test(title)) return "measure";
    if (/الكسور/.test(title)) return "fraction";
    if (/الوقت/.test(title)) return "clock";
    return "numbers";
  }
  if (subject === "arabic") {
    if (/البيئة/.test(title)) return "nature";
    if (/الصحة/.test(title)) return "health";
    if (/العلوم/.test(title)) return "science";
    if (/المواطنة/.test(title)) return "people";
    if (/التواصل/.test(title)) return "message";
    if (/الفنون|التراث/.test(title)) return "art";
    return "book";
  }
  if (subject === "religion") {
    if (/صدق|بر|رحمة/.test(title)) return "heart";
    if (/حقوق|عدل/.test(title)) return "balance";
    return "book";
  }
  if (subject === "social") {
    if (/الطبيعة/.test(title)) return "map";
    if (/التاريخ/.test(title)) return "history";
    if (/الحياة/.test(title)) return "home";
    if (/الاقتصاد/.test(title)) return "work";
    return "people";
  }
  return /طبيعة|بيئة|نبات/.test(title + lessons) ? "nature" : "book";
}

export function UnitTopicIcon({ subject, unit, className = "h-7 w-7" }: {
  subject: SubjectKey;
  unit: Pick<UnitProgress, "title" | "lessons">;
  className?: string;
}) {
  const topic = unitTopic(subject, unit);
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...shared}>
      {topic === "movement" && <><circle cx="18" cy="6.5" r="2.3" /><path d="m12 15 4-4 4 2 2.5 4M16 11l-2 8-5 6m7-6 4 2 3 5m-11-9-4 2" /></>}
      {topic === "nature" && <><path d="M25 6C14 6 7 11 7 19a7 7 0 0 0 7 7c8 0 13-8 11-20ZM9 23c3-4 7-7 12-10" /></>}
      {topic === "health" && <><path d="M16 26S5 19 5 11a5 5 0 0 1 9-3l2 2 2-2a5 5 0 0 1 9 3c0 8-11 15-11 15Z" /><path d="M9 16h4l2-3 3 6 2-3h3" /></>}
      {topic === "science" && <><circle cx="16" cy="16" r="2" /><ellipse cx="16" cy="16" rx="11" ry="4.5" transform="rotate(35 16 16)" /><ellipse cx="16" cy="16" rx="11" ry="4.5" transform="rotate(-35 16 16)" /></>}
      {topic === "people" && <><circle cx="11" cy="11" r="3" /><circle cx="22" cy="12" r="2.5" /><path d="M4.5 25v-2a6.5 6.5 0 0 1 13 0v2H4.5Zm15-1v-1a5 5 0 0 0-2-4 5 5 0 0 1 9 4v1h-7Z" /></>}
      {topic === "message" && <><path d="M6 7h20v14H15l-6 5v-5H6V7Z" /><path d="M10 12h12m-12 4h8" /></>}
      {topic === "art" && <><path d="M16 5a11 11 0 1 0 0 22h2a3 3 0 0 0 2-5 2 2 0 0 1 1-3h3a4 4 0 0 0 3-4A11 11 0 0 0 16 5Z" /><circle cx="10" cy="15" r="1" /><circle cx="13" cy="10" r="1" /><circle cx="19" cy="10" r="1" /><circle cx="23" cy="14" r="1" /></>}
      {topic === "chart" && <><path d="M6 6v20h20M10 21v-5h4v5m3 0V11h4v10m3 0v-7h3v7" /></>}
      {topic === "numbers" && <><path d="M9 8v16m-4-3h8m5-11h8m-8 7h8m-8 7h8" /></>}
      {topic === "operations" && <><path d="M6 10h8m-4-4v8m9-6 7 7m0-7-7 7M6 24h8m7-4h6m-6 5h6" /></>}
      {topic === "shapes" && <><path d="m11 7 7 12H4l7-12Zm9 8h8v10h-8V15ZM7 23h9" /></>}
      {topic === "measure" && <><path d="m8 26-3-3L23 5l4 4L8 26ZM10 19l2 2m2-6 2 2m2-6 2 2" /></>}
      {topic === "fraction" && <><circle cx="16" cy="16" r="11" /><path d="M16 5v11h11M16 16 8 24" /></>}
      {topic === "clock" && <><circle cx="16" cy="16" r="11" /><path d="M16 9v8l5 3" /></>}
      {topic === "heart" && <><path d="M16 26S5 19 5 11a5 5 0 0 1 9-3l2 2 2-2a5 5 0 0 1 9 3c0 8-11 15-11 15Z" /></>}
      {topic === "balance" && <><path d="M16 5v20M9 26h14M7 10h18M9 10 5 20h8L9 10Zm14 0-4 10h8l-4-10Z" /></>}
      {topic === "book" && <><path d="M16 9C12 6 8 6 5 7v17c4-1 8 0 11 2 3-2 7-3 11-2V7c-3-1-7-1-11 2Zm0 0v17" /></>}
      {topic === "map" && <><path d="m4 9 8-3 8 3 8-3v17l-8 3-8-3-8 3V9Zm8-3v17m8-14v17" /></>}
      {topic === "history" && <><path d="m4 12 12-7 12 7H4Zm3 13h18M9 13v10m7-10v10m7-10v10M5 27h22" /></>}
      {topic === "home" && <><path d="m4 15 12-10 12 10M7 13v14h18V13M13 27v-9h6v9" /></>}
      {topic === "work" && <><rect x="5" y="11" width="22" height="16" rx="2" /><path d="M11 11V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3M5 17c7 4 15 4 22 0m-13 2h4" /></>}
      {topic === "sun" && <><circle cx="16" cy="16" r="5" /><path d="M16 3v4m0 18v4M3 16h4m18 0h4M6.8 6.8l2.8 2.8m12.8 12.8 2.8 2.8m0-18.4-2.8 2.8M9.6 22.4l-2.8 2.8" /></>}
      {topic === "mountain" && <><path d="m3 26 10-17 6 10 3-5 7 12H3Zm7-12 3 4 2-3" /></>}
      {topic === "energy" && <><path d="M19 4 8 18h8l-3 10 11-15h-8l3-9Z" /></>}
    </svg>
  );
}
