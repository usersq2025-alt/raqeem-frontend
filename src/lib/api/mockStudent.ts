import { SUBJECT_KEYS } from "@/lib/config/subjects";

const SUBJECT_EN = [
  "Arabic",
  "English",
  "French",
  "Mathematics",
  "Religious Education",
  "Social Studies",
  "Science",
] as const;

const COMPLETED = [12, 8, 4, 9, 6, 3, 1];

export const MOCK_SUBJECTS = SUBJECT_KEYS.map((key, index) => ({
  subject_id: index + 1,
  name_en: SUBJECT_EN[index],
  name_ar: key,
  icon_url: null,
  sort_order: index + 1,
  completed_lessons: COMPLETED[index],
  total_lessons: 20,
}));

export const MOCK_UNITS: Record<number, Array<Record<string, unknown>>> = {
  1: unitSet(["الوحدة الأولى: القراءة", "الوحدة الثانية: الكتابة", "الوحدة الثالثة: القواعد", "الوحدة الرابعة: التعبير"]),
  2: unitSet(["Unit 1: Letters", "Unit 2: Words", "Unit 3: Sentences", "Unit 4: Stories"]),
  3: unitSet(["Unité 1", "Unité 2", "Unité 3", "Unité 4"]),
  4: unitSet(["الوحدة الأولى: الأعداد", "الوحدة الثانية: العمليات", "الوحدة الثالثة: الهندسة", "الوحدة الرابعة: القياس"]),
  5: unitSet(["الوحدة الأولى: الإيمان", "الوحدة الثانية: العبادات", "الوحدة الثالثة: الأخلاق", "الوحدة الرابعة: القصص"]),
  6: unitSet(["الوحدة الأولى: الوطن", "الوحدة الثانية: المجتمع", "الوحدة الثالثة: التاريخ", "الوحدة الرابعة: الجغرافيا"]),
  7: unitSet(["الوحدة الأولى: الكائنات", "الوحدة الثانية: المادة", "الوحدة الثالثة: الطاقة", "الوحدة الرابعة: الأرض"]),
};

function unitSet(titles: string[]) {
  const totals = [10, 8, 10, 6];
  const completed = [10, 4, 2, 0];
  return titles.map((title, index) => ({
    unit_id: index + 1 + titles.length * 10,
    title,
    cover_url: null,
    sort_order: index + 1,
    completed_lessons: completed[index],
    total_lessons: totals[index],
    play_lesson_id: index === 0 ? 1 : index === 1 ? 2 : index === 2 ? 3 : null,
    is_complete: completed[index] >= totals[index],
    review_session_id: index === 0 ? 1 : null,
    review_status: index === 0 ? "pending" : null,
    review_remaining: index === 0 ? 3 : 0,
    gift:
      index === 0
        ? { id: 1, reward_type: "points", points_amount: 25, store_item_id: null }
        : null,
  }));
}

export const MOCK_STORE = {
  // Sequential doctor path: only heartbeat_rug is purchasable
  points_balance: 80,
  next_required_item: "heartbeat_rug",
  items: [
    {
      id: 6,
      category: "furniture",
      slot_key: "heartbeat_rug",
      name: "سجادة نبض",
      image_url: "/images/store/heartbeat-rug.png",
      price_points: 6,
      is_hidden: false,
      is_locked: false,
      is_owned: false,
      can_purchase: true,
    },
    {
      id: 1,
      category: "equipment",
      slot_key: "stethoscope",
      name: "سماعة طبية",
      image_url: "/images/store/stethoscope.png",
      price_points: 40,
      is_hidden: false,
      is_locked: true,
      is_owned: false,
      can_purchase: false,
    },
    {
      id: 2,
      category: "equipment",
      slot_key: "tablet",
      name: "جهاز لوحي طبي",
      image_url: "/images/store/tablet.png",
      price_points: 80,
      is_hidden: false,
      is_locked: true,
      is_owned: false,
      can_purchase: false,
    },
    {
      id: 3,
      category: "equipment",
      slot_key: "microscope",
      name: "مجهر تعليمي",
      image_url: "/images/store/microscope.png",
      price_points: 150,
      is_hidden: false,
      is_locked: true,
      is_owned: false,
      can_purchase: false,
    },
    {
      id: 5,
      category: "equipment",
      slot_key: "anatomy_model",
      name: "مجسّم تشريح",
      image_url: "/images/store/anatomy-model.png",
      price_points: 120,
      is_hidden: false,
      is_locked: true,
      is_owned: false,
      can_purchase: false,
    },
    {
      id: 7,
      category: "furniture",
      slot_key: "trophy_shelf",
      name: "رف الجوائز",
      image_url: "/images/store/trophy-shelf.png",
      price_points: 70,
      is_hidden: false,
      is_locked: true,
      is_owned: false,
      can_purchase: false,
    },
    {
      id: 4,
      category: "equipment",
      slot_key: "exam_bed",
      name: "سرير فحص طبي",
      image_url: "/images/store/exam-bed.png",
      price_points: 200,
      is_hidden: false,
      is_locked: true,
      is_owned: false,
      can_purchase: false,
    },
    {
      id: 8,
      category: "furniture",
      slot_key: "medicine_cabinet",
      name: "خزانة أدوية",
      image_url: "/images/store/medicine-cabinet.png",
      price_points: 180,
      is_hidden: false,
      is_locked: true,
      is_owned: false,
      can_purchase: false,
    },
    {
      id: 9,
      category: "furniture",
      slot_key: "anatomy_poster",
      name: "ملصق تشريح",
      image_url: "/images/store/anatomy-poster.png",
      price_points: 90,
      is_hidden: false,
      is_locked: true,
      is_owned: false,
      can_purchase: false,
    },
  ],
};

export const MOCK_HEADQUARTERS = {
  points_balance: 80,
  profession_code: "doctor",
  gender: "female",
  items: [] as Array<Record<string, unknown>>,
};

export function mockStreak(studentId: number) {
  const today = new Date();
  const iso = (offset: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const lit = studentId !== 12;
  return {
    student_id: studentId,
    streak_current: lit ? 5 : 2,
    streak_longest: 8,
    last_activity_date: lit ? iso(0) : "2020-01-01",
    activity_dates: lit ? [iso(4), iso(3), iso(2), iso(1), iso(0)] : [iso(10), iso(9)],
    badges: lit
      ? [{ code: "streak_3", name_ar: "سلسلة 3 أيام", name_en: "3-day streak", earned_at: `${iso(2)}T12:00:00Z` }]
      : [],
  };
}

export const MOCK_UNIT_PATH = {
  unit_id: 9101,
  subject_id: 7,
  title: "الوحدة الأولى: جسدي يتحرك",
  path_background_url: null,
  unit_icon_url: "/images/units/icons/science-g4-u1.png",
  accent_color: "#2EC4A8",
  stations: [
    { lesson_id: 91001, title: "بنى تتحرك", sort_order: 1, status: "completed", stars: 3, is_finale: false },
    { lesson_id: 91002, title: "عظمي تدعمني", sort_order: 2, status: "completed", stars: 2, is_finale: false },
    { lesson_id: 91003, title: "أتحرك وألعب", sort_order: 3, status: "completed", stars: 1, is_finale: false },
    { lesson_id: 91004, title: "جسمي السليم", sort_order: 4, status: "available", stars: null, is_finale: false },
    { lesson_id: 91005, title: "غذائي الصحي", sort_order: 5, status: "locked", stars: null, is_finale: false },
    { lesson_id: 91006, title: "أصبحت أسرع", sort_order: 6, status: "locked", stars: null, is_finale: false },
    { lesson_id: 91007, title: "القوة والحركة", sort_order: 7, status: "locked", stars: null, is_finale: false },
    { lesson_id: 91008, title: "ورشة التجربة", sort_order: 8, status: "locked", stars: null, is_finale: false },
  ],
};

