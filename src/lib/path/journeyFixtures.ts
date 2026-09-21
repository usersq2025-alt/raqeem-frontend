/**
 * Dev-only Unit Learning Journey fixtures.
 * Enabled only when NODE_ENV === "development".
 * Never used in production builds or production seeders.
 */

import type { UnitPath } from "@/lib/api/units";
import { mapUnitPath } from "@/lib/api/units";

export type JourneyFixtureKey = "progress" | "complete" | "long";

export const JOURNEY_FIXTURE_CHILD = {
  id: 9001,
  fullName: "أحمد التجريبي",
  professionCode: "doctor" as const,
  gender: "male" as const,
  pointsBalance: 42,
};

const SCIENCE_SUBJECT_ID = 7; // SUBJECT_KEYS index → science theme art

function station(
  lessonId: number,
  title: string,
  sortOrder: number,
  status: "completed" | "available" | "locked",
  stars: number | null = null,
  isFinale = false
) {
  return { lesson_id: lessonId, title, sort_order: sortOrder, status, stars, is_finale: isFinale };
}

/** Case 1: 8 lessons — 3 completed, 1 current, 4 locked, review locked */
export const FIXTURE_PROGRESS_RAW = {
  unit_id: 9101,
  subject_id: SCIENCE_SUBJECT_ID,
  title: "الوحدة الأولى: جسدي يتحرك",
  path_background_url: null,
  unit_icon_url: "/images/units/icons/science-g4-u1.png",
  accent_color: "#2EC4A8",
  stations: [
    station(91001, "بنى تتحرك", 1, "completed", 3),
    station(91002, "عظمي تدعمني", 2, "completed", 2),
    station(91003, "أتحرك وألعب في الساحة الكبيرة", 3, "completed", 1),
    station(91004, "جسمي السليم", 4, "available", null),
    station(91005, "غذائي الصحي المتوازن كل يوم", 5, "locked", null),
    station(91006, "أصبحت أسرع", 6, "locked", null),
    station(91007, "القوة والحركة", 7, "locked", null),
    station(91008, "ورشة التجربة العلمية", 8, "locked", null),
  ],
};

/** Case 2: same unit — all lessons completed, review available */
export const FIXTURE_COMPLETE_RAW = {
  ...FIXTURE_PROGRESS_RAW,
  unit_id: 9102,
  stations: FIXTURE_PROGRESS_RAW.stations.map((row, index) => ({
    ...row,
    status: "completed" as const,
    stars: index % 3 === 0 ? 3 : index % 2 === 0 ? 2 : 1,
  })),
};

/** Case 3: long unit — 15 lessons, mixed states (background height stress test) */
export const FIXTURE_LONG_RAW = {
  unit_id: 9103,
  subject_id: SCIENCE_SUBJECT_ID,
  title: "مسار طويل: استكشاف العلوم",
  path_background_url: null,
  unit_icon_url: "/images/units/icons/science-g4-u1.png",
  accent_color: "#2EC4A8",
  stations: [
    station(92001, "البداية", 1, "completed", 3),
    station(92002, "الملاحظة", 2, "completed", 2),
    station(92003, "الفرضية", 3, "completed", 3),
    station(92004, "التجربة", 4, "completed", 1),
    station(92005, "القياس", 5, "completed", 2),
    station(92006, "الخلايا", 6, "completed", 2),
    station(92007, "الطاقة", 7, "available", null),
    station(92008, "الضوء", 8, "locked", null),
    station(92009, "الصوت", 9, "locked", null),
    station(92010, "المغناطيس", 10, "locked", null),
    station(92011, "الماء", 11, "locked", null),
    station(92012, "الهواء", 12, "locked", null),
    station(92013, "النبات", 13, "locked", null),
    station(92014, "الحيوان", 14, "locked", null),
    station(92015, "التحدي الكبير", 15, "locked", null, true),
  ],
};

const FIXTURES: Record<JourneyFixtureKey, Record<string, unknown>> = {
  progress: FIXTURE_PROGRESS_RAW,
  complete: FIXTURE_COMPLETE_RAW,
  long: FIXTURE_LONG_RAW,
};

/** Stable unit ids for real path routes in development. */
export const JOURNEY_FIXTURE_UNIT_IDS: Record<number, JourneyFixtureKey> = {
  9101: "progress",
  9102: "complete",
  9103: "long",
};

export function isJourneyFixturesEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function parseJourneyFixtureKey(raw: string | undefined | null): JourneyFixtureKey | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key === "progress" || key === "complete" || key === "long") return key;
  return null;
}

export function getJourneyFixture(key: JourneyFixtureKey): UnitPath | null {
  return mapUnitPath(FIXTURES[key] ?? null);
}

export function getJourneyFixtureByUnitId(unitId: number): UnitPath | null {
  const key = JOURNEY_FIXTURE_UNIT_IDS[unitId];
  if (!key) return null;
  return getJourneyFixture(key);
}
