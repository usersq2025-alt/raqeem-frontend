export type DailyGoalTarget = 3 | 5 | 7;

export type JourneyDashboard = {
  child: {
    id: number;
    name: string;
    avatarUrl?: string;
    professionCode?: string;
    professionNameAr?: string;
    professionNameEn?: string;
    gender?: "male" | "female";
    gradeName?: string;
    pointsBalance: number;
  };
  today: {
    date: string;
    targetLessons: DailyGoalTarget;
    completedLessons: number;
    goalCompleted: boolean;
    exceededBy: number;
  };
  nextLesson?: {
    id: number;
    title: string;
    subjectId: number;
    subjectName: string;
    subjectImage?: string;
    unitId: number;
    unitName: string;
    questionCount?: number;
    estimatedMinutes?: number;
    resumeAvailable: boolean;
    href: string;
  };
  suggestedLessons: Array<{
    id: number;
    title: string;
    subjectId: number;
    subjectName: string;
    subjectImage?: string;
    unitId: number;
    unitName: string;
    href: string;
  }>;
  nextHeadquartersItem?: {
    itemKey: string;
    name: string;
    imageUrl?: string;
    price: number;
    currentBalance: number;
    remainingPoints: number;
    canPurchase: boolean;
  };
  headquartersCompleted: boolean;
  streak?: {
    current: number;
    longest: number;
    completedToday: boolean;
    recentDays: Array<{ date: string; active: boolean; isToday: boolean }>;
  };
  latestAchievement?: {
    type: "lesson" | "purchase" | "unit";
    title: string;
    description: string;
    occurredAt: string;
  };
  smartReviewAvailable: boolean;
};

function asTarget(n: number): DailyGoalTarget {
  if (n === 3 || n === 5 || n === 7) return n;
  return 3;
}

function mapLesson(raw: Record<string, unknown> | null | undefined) {
  if (!raw || typeof raw !== "object") return undefined;
  const id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return undefined;
  const base = {
    id,
    title: String(raw.title ?? ""),
    subjectId: Number(raw.subject_id ?? raw.subjectId ?? 0),
    subjectName: String(raw.subject_name ?? raw.subjectName ?? ""),
    unitId: Number(raw.unit_id ?? raw.unitId ?? 0),
    unitName: String(raw.unit_name ?? raw.unitName ?? ""),
    href: String(raw.href ?? `/lessons/${id}/play`),
  };
  const subjectImage = raw.subject_image ?? raw.subjectImage;
  const questionCount = raw.question_count ?? raw.questionCount;
  const estimatedMinutes = raw.estimated_minutes ?? raw.estimatedMinutes;
  const resumeAvailable = Boolean(raw.resume_available ?? raw.resumeAvailable);

  return {
    ...base,
    ...(typeof subjectImage === "string" && subjectImage ? { subjectImage } : {}),
    ...(questionCount != null && Number.isFinite(Number(questionCount))
      ? { questionCount: Number(questionCount) }
      : {}),
    ...(estimatedMinutes != null && Number.isFinite(Number(estimatedMinutes))
      ? { estimatedMinutes: Number(estimatedMinutes) }
      : {}),
    resumeAvailable,
  };
}

export function mapJourneyDashboard(raw: unknown): JourneyDashboard | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const childRaw = (row.child ?? {}) as Record<string, unknown>;
  const todayRaw = (row.today ?? {}) as Record<string, unknown>;
  const hqRaw = (row.next_headquarters_item ?? row.nextHeadquartersItem) as
    | Record<string, unknown>
    | null
    | undefined;
  const streakRaw = (row.streak ?? null) as Record<string, unknown> | null;
  const achRaw = (row.latest_achievement ?? row.latestAchievement) as
    | Record<string, unknown>
    | null
    | undefined;

  const suggestionsRaw = Array.isArray(row.suggested_lessons)
    ? row.suggested_lessons
    : Array.isArray(row.suggestedLessons)
      ? row.suggestedLessons
      : [];

  const nextLesson = mapLesson(
    (row.next_lesson ?? row.nextLesson) as Record<string, unknown> | undefined
  );
  // mapLesson always includes resumeAvailable for next; strip for suggestions
  const suggestedLessons = suggestionsRaw
    .map((item) => {
      const mapped = mapLesson(item as Record<string, unknown>);
      if (!mapped) return null;
      const { resumeAvailable: _r, questionCount: _q, estimatedMinutes: _e, ...rest } = mapped;
      void _r;
      void _q;
      void _e;
      return rest;
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const childId = Number(childRaw.id);
  if (!Number.isFinite(childId) || childId <= 0) return null;

  return {
    child: {
      id: childId,
      name: String(childRaw.name ?? ""),
      ...(typeof (childRaw.avatar_url ?? childRaw.avatarUrl) === "string"
        ? { avatarUrl: String(childRaw.avatar_url ?? childRaw.avatarUrl) }
        : {}),
      ...(typeof (childRaw.profession_code ?? childRaw.professionCode) === "string"
        ? { professionCode: String(childRaw.profession_code ?? childRaw.professionCode) }
        : {}),
      ...(typeof (childRaw.profession_name_ar ?? childRaw.professionNameAr) === "string"
        ? { professionNameAr: String(childRaw.profession_name_ar ?? childRaw.professionNameAr) }
        : {}),
      ...(typeof (childRaw.profession_name_en ?? childRaw.professionNameEn) === "string"
        ? { professionNameEn: String(childRaw.profession_name_en ?? childRaw.professionNameEn) }
        : {}),
      ...(["male", "female"].includes(String(childRaw.gender))
        ? { gender: String(childRaw.gender) as "male" | "female" }
        : {}),
      ...(typeof (childRaw.grade_name ?? childRaw.gradeName) === "string"
        ? { gradeName: String(childRaw.grade_name ?? childRaw.gradeName) }
        : {}),
      pointsBalance: Number(childRaw.points_balance ?? childRaw.pointsBalance ?? 0),
    },
    today: {
      date: String(todayRaw.date ?? ""),
      targetLessons: asTarget(Number(todayRaw.target_lessons ?? todayRaw.targetLessons ?? 3)),
      completedLessons: Number(todayRaw.completed_lessons ?? todayRaw.completedLessons ?? 0),
      goalCompleted: Boolean(todayRaw.goal_completed ?? todayRaw.goalCompleted),
      exceededBy: Number(todayRaw.exceeded_by ?? todayRaw.exceededBy ?? 0),
    },
    ...(nextLesson ? { nextLesson } : {}),
    suggestedLessons,
    ...(hqRaw && typeof hqRaw === "object"
      ? {
          nextHeadquartersItem: {
            itemKey: String(hqRaw.item_key ?? hqRaw.itemKey ?? ""),
            name: String(hqRaw.name ?? ""),
            ...(typeof (hqRaw.image_url ?? hqRaw.imageUrl) === "string"
              ? { imageUrl: String(hqRaw.image_url ?? hqRaw.imageUrl) }
              : {}),
            price: Number(hqRaw.price ?? 0),
            currentBalance: Number(hqRaw.current_balance ?? hqRaw.currentBalance ?? 0),
            remainingPoints: Number(hqRaw.remaining_points ?? hqRaw.remainingPoints ?? 0),
            canPurchase: Boolean(hqRaw.can_purchase ?? hqRaw.canPurchase),
          },
        }
      : {}),
    headquartersCompleted: Boolean(row.headquarters_completed ?? row.headquartersCompleted),
    ...(streakRaw
      ? {
          streak: {
            current: Number(streakRaw.current ?? 0),
            longest: Number(streakRaw.longest ?? 0),
            completedToday: Boolean(streakRaw.completed_today ?? streakRaw.completedToday),
            recentDays: (Array.isArray(streakRaw.recent_days)
              ? streakRaw.recent_days
              : Array.isArray(streakRaw.recentDays)
                ? streakRaw.recentDays
                : []
            ).map((day) => {
              const value = day as Record<string, unknown>;
              return {
                date: String(value.date ?? ""),
                active: Boolean(value.active),
                isToday: Boolean(value.is_today ?? value.isToday),
              };
            }),
          },
        }
      : {}),
    ...(achRaw && typeof achRaw === "object"
      ? {
          latestAchievement: {
            type: (["lesson", "purchase", "unit"].includes(String(achRaw.type))
              ? String(achRaw.type)
              : "lesson") as "lesson" | "purchase" | "unit",
            title: String(achRaw.title ?? ""),
            description: String(achRaw.description ?? ""),
            occurredAt: String(achRaw.occurred_at ?? achRaw.occurredAt ?? ""),
          },
        }
      : {}),
    smartReviewAvailable: Boolean(row.smart_review_available ?? row.smartReviewAvailable),
  };
}

export function mockJourneyDashboard(studentId = 9001): JourneyDashboard {
  return {
    child: {
      id: studentId,
      name: "سارة",
      professionCode: "doctor",
      professionNameAr: "طبيبة",
      professionNameEn: "Doctor",
      gender: "female",
      gradeName: "الرابع",
      pointsBalance: 4,
    },
    today: {
      date: "2026-09-21",
      targetLessons: 3,
      completedLessons: 1,
      goalCompleted: false,
      exceededBy: 0,
    },
    nextLesson: {
      id: 91004,
      title: "جسمي السليم ونشاطي اليومي",
      subjectId: 7,
      subjectName: "العلوم",
      subjectImage: "/images/subjects/science.png",
      unitId: 9101,
      unitName: "جسدي يتحرك",
      questionCount: 8,
      resumeAvailable: false,
      href: "/lessons/91004/play",
    },
    suggestedLessons: [
      {
        id: 92001,
        title: "أحرفي الأولى",
        subjectId: 1,
        subjectName: "لغتي",
        subjectImage: "/images/subjects/arabic.png",
        unitId: 101,
        unitName: "البداية",
        href: "/lessons/92001/play",
      },
      {
        id: 93001,
        title: "عدّ إلى عشرة",
        subjectId: 2,
        subjectName: "رياضيات",
        subjectImage: "/images/subjects/math.png",
        unitId: 201,
        unitName: "الأعداد",
        href: "/lessons/93001/play",
      },
      {
        id: 94001,
        title: "وطني الجميل",
        subjectId: 3,
        subjectName: "وطنيّتي",
        unitId: 301,
        unitName: "بلادي",
        href: "/lessons/94001/play",
      },
    ],
    nextHeadquartersItem: {
      itemKey: "exam_bed",
      name: "سرير الفحص",
      imageUrl: "/images/store/exam-bed.png",
      price: 6,
      currentBalance: 4,
      remainingPoints: 2,
      canPurchase: false,
    },
    headquartersCompleted: false,
    streak: {
      current: 3,
      longest: 5,
      completedToday: true,
      recentDays: [
        { date: "2026-09-15", active: false, isToday: false },
        { date: "2026-09-16", active: false, isToday: false },
        { date: "2026-09-17", active: false, isToday: false },
        { date: "2026-09-18", active: false, isToday: false },
        { date: "2026-09-19", active: true, isToday: false },
        { date: "2026-09-20", active: true, isToday: false },
        { date: "2026-09-21", active: true, isToday: true },
      ],
    },
    latestAchievement: {
      type: "lesson",
      title: "أتحرك",
      description: "أكملت درسًا جديدًا",
      occurredAt: "2026-09-21T07:00:00+03:00",
    },
    smartReviewAvailable: false,
  };
}
