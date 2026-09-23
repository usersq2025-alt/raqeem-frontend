"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { StudentShell } from "@/components/StudentShell";
import { LessonPlayExperience, PlayChrome } from "@/components/LessonPlayExperience";
import { StoreExperience } from "@/components/store/StoreExperience";
import { ExperiencePreferencesExperience } from "@/components/experience/ExperiencePreferencesExperience";
import { SubjectsHome } from "@/components/SubjectsHome";
import { StudentJourneyDashboard } from "@/components/journey/StudentJourneyDashboard";
import { HeadquartersExperience } from "@/components/headquarters/HeadquartersExperience";
import type { PlayQuestion } from "@/lib/api/lessonPlay";
import { mapHeadquarters, mapStoreCatalog } from "@/lib/api/store";
import { MOCK_HEADQUARTERS, MOCK_STORE, MOCK_SUBJECTS, mockStreak } from "@/lib/api/mockStudent";
import { mockJourneyDashboard } from "@/lib/api/journeyDashboard";
import { mapStreak, type SubjectProgress } from "@/lib/api/student";
import { SUBJECT_KEYS } from "@/lib/config/subjects";

// Real lesson pages fetch questions after mount; preserve that boundary in QA.
const QuestionBody = dynamic(() => import("@/components/LessonPlayExperience").then((module) => module.QuestionBody), { ssr: false });

const fixtures: Record<string, { payload: Record<string, unknown>; feedback: Record<string, unknown> }> = {
  mcq: { payload: { options: [{ id: "a", text: "الإجابة الأولى" }, { id: "b", text: "الإجابة الثانية" }] }, feedback: { correct_option_id: "b" } },
  true_false: { payload: {}, feedback: { correct_answer: true } },
  crossword: { payload: { words: [{ id: "w1", clue: "حيوان أليف", length: 3 }, { id: "w2", clue: "يضيء الليل", length: 3 }] }, feedback: { correct_answers: { w1: "قطة", w2: "قمر" } } },
  ordering: { payload: { tokens: ["A", "B", "C", "D", "E"].map((id) => ({ id, text: id })) }, feedback: { correct_order: ["A", "B", "C", "D", "E"] } },
  matching_pairs: { payload: { left_items: [{ id: "a", text: "الشمس" }, { id: "b", text: "القمر" }], right_items: [{ id: "x", text: "الليل" }, { id: "y", text: "النهار" }] }, feedback: { correct_matches: { a: "y", b: "x" } } },
  drag_classify: { payload: { categories: [{ id: "a", name: "الفاكهة" }, { id: "b", name: "الخضار" }], items: [{ id: "x", text: "تفاح" }, { id: "y", text: "جزر" }] }, feedback: { correct_assignments: { x: "a", y: "b" } } },
};

const qaChild = { id: 1, fullName: "سارة", gradeId: 4, pointsBalance: 120, professionId: 1, professionCode: "doctor", professionNameAr: "طبيبة", professionNameEn: "Doctor", gender: "female" as const, weeklyGoalLessons: 5, lastActivityDate: null, streakCurrent: 5 };

export default function UxFixture() {
  const mode = useSearchParams().get("mode") ?? "store";
  const [selected, setSelected] = useState<unknown>(null);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  if (mode === "store") return <StudentShell><StoreExperience childId={1} catalog={mapStoreCatalog(MOCK_STORE)} /><div style={{ height: 1000 }} /></StudentShell>;
  if (mode === "headquarters") return <StudentShell><HeadquartersExperience child={qaChild} scene={mapHeadquarters(MOCK_HEADQUARTERS)} catalog={mapStoreCatalog(MOCK_STORE)} highlightId={null} fromBalance={null} /></StudentShell>;
  if (mode === "settings") return <StudentShell><ExperiencePreferencesExperience childId={1} /></StudentShell>;
  if (mode === "subjects") {
    const subjects: SubjectProgress[] = MOCK_SUBJECTS.map((row, index) => ({
      subjectId: row.subject_id,
      key: SUBJECT_KEYS[index],
      nameAr: typeof row.name_ar === "string" ? row.name_ar : null,
      nameEn: typeof row.name_en === "string" ? row.name_en : null,
      iconUrl: null,
      completedLessons: index === 6 ? row.completed_lessons : 0,
      totalLessons: index === 6 ? row.total_lessons : 0,
      catalogUnitCount: index < 5 || index === 6 ? 1 : 0,
      catalogLessonCount: index < 5 || index === 6 ? 1 : 0,
    }));
    return <StudentShell><SubjectsHome child={qaChild} subjects={subjects} streak={mapStreak(mockStreak(1))} /></StudentShell>;
  }
  if (mode === "journey") return <StudentShell><StudentJourneyDashboard childId={1} initialData={mockJourneyDashboard(1)} /></StudentShell>;
  if (mode === "lesson-flow" || mode === "lesson-recharge") return <main className="mx-auto max-w-3xl p-4"><LessonPlayExperience lessonId={1} childId={1} pointsBalance={120} /></main>;
  const fixture = fixtures[mode] ?? fixtures.mcq;
  const question: PlayQuestion = { id: 1, gameType: mode, questionText: "اختر الإجابة الصحيحة", imageUrl: null, payload: fixture.payload };
  return <main className="mx-auto max-w-3xl space-y-6 p-4">
    <PlayChrome progressPct={30} questionLabel="السؤال 3 / 10" pointsLabel="120" batteryTotal={3} batteryRemaining={3} totalQuestions={10} answeredCount={3} previousLabel="السابق" nextLabel="التالي" />
    <h1 className="text-center text-xl font-bold">{question.questionText}</h1>
    <QuestionBody question={question} phase={locked ? "feedback" : "playing"} selected={selected} feedback={locked ? fixture.feedback : {}} isCorrect={locked ? false : null} onChange={(value, complete) => { setSelected(value); setReady(complete); }} />
    <button data-qa-submit disabled={!ready || locked} onClick={() => setLocked(true)}>تحقق من الإجابة</button>
    <output data-qa-answer className="sr-only">{JSON.stringify(selected)}</output>
  </main>;
}
