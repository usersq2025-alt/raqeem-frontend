"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ExplanationListen, QuestionAudioBar, QuestionAudioProvider, StopAudioOnChange } from "@/components/QuestionAudio";
import type { PlayQuestion } from "@/lib/api/lessonPlay";
import type { AudioManifest } from "@/lib/speech/questionAudio";

// Temporary QA page for the read-aloud feature. It renders the production components only;
// clips are served by the test's request interception, never by a real speech provider.
const QuestionBody = dynamic(() => import("@/components/LessonPlayExperience").then((module) => module.QuestionBody), { ssr: false });

const clip = (key: string) => `/qa-audio/${key.replace(":", "_")}.wav`;
function manifest(segments: string[], system: string[]): AudioManifest {
  return {
    version: "qa",
    segments: Object.fromEntries(segments.map((key) => [key, clip(key)])),
    system: Object.fromEntries(system.map((key) => [key, clip(`sys:${key}`)])),
  };
}

type Fixture = { gameType: string; payload: Record<string, unknown>; audio: AudioManifest; feedback: Record<string, unknown>; image?: boolean };

const fixtures: Record<string, Fixture> = {
  mcq: {
    gameType: "mcq",
    payload: { options: [{ id: "a", text: "قطة" }, { id: "b", text: "كلب" }, { id: "c", text: "أرنب" }] },
    audio: manifest(["q", "opt:a", "opt:b", "opt:c"], ["options", "option_1", "option_2", "option_3", "picture"]),
    feedback: { correct_option_id: "b", explanation: "الكلب حيوان أليف.", explanation_audio_url: clip("expl") },
  },
  "mcq-image": {
    gameType: "mcq",
    image: true,
    payload: { options: [{ id: "a", text: "قطة" }, { id: "p", text: "", image_url: "/qa-audio/pic.svg" }] },
    audio: manifest(["q", "alt", "opt:a"], ["options", "option_1", "option_2", "picture"]),
    feedback: { correct_option_id: "a" },
  },
  true_false: {
    gameType: "true_false",
    payload: {},
    audio: manifest(["q"], ["tf_choices", "true", "false"]),
    feedback: { correct_answer: true },
  },
  matching_pairs: {
    gameType: "matching_pairs",
    payload: { left_items: [{ id: "a", text: "الشمس" }, { id: "b", text: "القمر" }], right_items: [{ id: "y", text: "النهار" }, { id: "x", text: "الليل" }] },
    audio: manifest(["q", "left:a", "left:b", "right:x", "right:y"], ["col_first", "col_second"]),
    feedback: { correct_matches: { a: "y", b: "x" } },
  },
  drag_classify: {
    gameType: "drag_classify",
    payload: { categories: [{ id: "A", name: "الفاكهة" }, { id: "B", name: "الخضار" }], items: [{ id: "x", text: "تفاح" }, { id: "y", text: "جزر" }] },
    audio: manifest(["q", "cat:A", "cat:B", "item:x", "item:y"], ["tray", "categories"]),
    feedback: { correct_assignments: { x: "A", y: "B" } },
  },
  ordering: {
    gameType: "ordering",
    payload: { tokens: [{ id: "t2", text: "الولد" }, { id: "t1", text: "ذهب" }, { id: "t3", text: "المدرسة" }] },
    audio: manifest(["q", "tok:t1", "tok:t2", "tok:t3"], ["ordering_bank"]),
    feedback: { correct_order: ["t2", "t1", "t3"] },
  },
  crossword: {
    gameType: "crossword",
    payload: { words: [{ id: "w1", clue: "حيوان أليف", length: 3 }, { id: "w2", clue: "يضيء الليل", length: 3 }] },
    audio: manifest(["q", "clue:w1", "clue:w2"], ["clue_1", "clue_2"]),
    feedback: { correct_answers: { w1: "قطة", w2: "قمر" } },
  },
};

export default function AudioFixture() {
  const mode = useSearchParams().get("mode") ?? "mcq";
  const [serial, setSerial] = useState(1);
  const [locked, setLocked] = useState(false);
  const fixture = fixtures[mode] ?? fixtures.mcq;
  const question: PlayQuestion = {
    id: serial,
    gameType: fixture.gameType,
    questionText: "سؤال تجريبي للقراءة الصوتية",
    imageUrl: fixture.image ? "/qa-audio/pic.svg" : null,
    imageAlt: fixture.image ? "صورة قطة صغيرة" : null,
    payload: fixture.payload,
    audio: fixture.audio,
  };
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      {/* Same remount-per-question shape as the lesson and review screens. */}
      <QuestionAudioProvider key={`audio-${serial}`} question={question}>
        <StopAudioOnChange token={locked} />
        <div className="rounded-[28px] border-[3px] border-white bg-white/95 px-5 py-6">
          <p className="text-center text-xl font-extrabold">{question.questionText}</p>
          {fixture.image ? <p data-qa-image>[image]</p> : null}
          <QuestionAudioBar />
        </div>
        <QuestionBody
          key={serial}
          question={question}
          phase={locked ? "feedback" : "playing"}
          selected={null}
          feedback={locked ? fixture.feedback : {}}
          isCorrect={locked ? false : null}
          onChange={() => {}}
        />
        {locked ? <ExplanationListen url={clip("expl")} /> : null}
      </QuestionAudioProvider>
      <div className="flex gap-3">
        <button data-qa-lock onClick={() => setLocked(true)}>submit</button>
        <button data-qa-next onClick={() => { setLocked(false); setSerial((n) => n + 1); }}>next question</button>
      </div>
    </main>
  );
}
