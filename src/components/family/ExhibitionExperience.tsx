"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { PlayChrome, PlayFeedbackBanner, QuestionBody } from "@/components/LessonPlayExperience";
import { mapPlayQuestion, type PlayQuestion } from "@/lib/api/lessonPlay";
import { playUiTone } from "@/lib/play/uiSounds";

type ExhibitionQuestion = PlayQuestion & { code: string; grade: number; subject: string };
type Result = { isCorrect: boolean; feedback: Record<string, unknown> };
const GRADES = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];
const GAMES: Record<string, string> = { mcq: "اختيار من متعدد", true_false: "صح أو خطأ", matching_pairs: "وصل ومطابقة", drag_classify: "سحب وإفلات" };
const card = "rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7";
const button = "min-h-11 rounded-2xl px-5 py-3 text-sm font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange disabled:opacity-40";

export function ExhibitionExperience() {
  const router = useRouter();
  const [questions, setQuestions] = useState<ExhibitionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [grade, setGrade] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [game, setGame] = useState("all");
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<unknown>(null);
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/parent/exhibition", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) {
          if (data?.code === "GUARDIAN_LOCKED") { router.refresh(); return; }
          throw new Error(response.status === 403 ? "هذا التبويب مخصص لحساب رقيم التجريبي للمعرض." : "تعذّر تحميل أسئلة المعرض. حاول مجددًا.");
        }
        setQuestions(data.questions.map((row: Record<string, unknown>) => ({ ...mapPlayQuestion(row), code: String(row.code), grade: Number(row.grade), subject: String(row.subject) })));
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "تعذّر الاتصال.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [retry, router]);

  const subjects = [...new Set(questions.filter((q) => q.grade === grade).map((q) => q.subject))];
  const subjectQuestions = questions.filter((q) => q.grade === grade && q.subject === subject);
  const playlist = subjectQuestions.filter((q) => game === "all" || q.gameType === game);
  const question = playlist[index];
  const result = question ? results[question.id] : undefined;
  const answered = playlist.filter((q) => results[q.id]).length;
  const score = playlist.filter((q) => results[q.id]?.isCorrect).length;

  function resetRound() {
    setIndex(0); setSelected(null); setReady(false); setResults({}); setDone(false); setError(""); setRound((r) => r + 1);
  }
  function navigate(next: number) { setIndex(next); setSelected(null); setReady(false); setError(""); }
  async function check() {
    if (!question || !ready || result || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/parent/exhibition/answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: question.id, answer: selected }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data?.code === "GUARDIAN_LOCKED") router.refresh();
        throw new Error(data?.code === "GUARDIAN_LOCKED" ? "أعد فتح وضع ولي الأمر للمتابعة." : "تعذّر التحقق من الإجابة. حاول مجددًا.");
      }
      setResults((current) => ({ ...current, [question.id]: { isCorrect: Boolean(data.is_correct), feedback: data.feedback ?? {} } }));
      playUiTone(data.is_correct ? "success" : "wrong");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذّر الاتصال."); }
    finally { setBusy(false); submitting.current = false; }
  }

  return <main dir="rtl" className="min-h-screen bg-[#F3F6FA] px-4 py-5 text-text-navy sm:px-6">
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <BrandLogo size="sm" />
        <Link href="/family/settings" className={`${button} bg-white`}>حساب ولي الأمر</Link>
      </header>
      <section className={`${card} mb-5`}>
        <p className="mb-1 text-sm font-extrabold text-primary-orange">أهلًا بزوار رقيم</p>
        <h1 className="text-3xl font-black">تبويب المعرض</h1>
        <p className="mt-2 text-sm leading-7 text-text-gray">اختر الصف ثم المادة، وابدأ التحدي مع رقيم.</p>
        {!loading && questions.length > 0 && <p className="mt-3 text-sm font-bold">{questions.length} سؤالًا · 6 صفوف · 7 مواد لكل صف</p>}
      </section>
      {loading ? <p role="status" className={card}>جارٍ تحميل أسئلة المعرض…</p> : null}
      {error ? <div role="alert" className="mb-4 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">{error}{!questions.length && <button className={`${button} ms-3 bg-white`} onClick={() => { setError(""); setLoading(true); setRetry((r) => r + 1); }}>إعادة المحاولة</button>}</div> : null}
      {questions.length > 0 && <>
        <nav aria-label="اختيار الصف والمادة" className="mb-5 flex flex-wrap gap-2">
          <button disabled={busy} className={`${button} ${grade === null ? "bg-primary-orange text-white" : "bg-white"}`} onClick={() => { setGrade(null); setSubject(null); setGame("all"); resetRound(); }}>جميع الصفوف</button>
          {grade !== null && <button disabled={busy} className={`${button} ${subject === null ? "bg-primary-orange text-white" : "bg-white"}`} onClick={() => { setSubject(null); setGame("all"); resetRound(); }}>الصف {GRADES[grade - 1]}</button>}
          {subject && <span className={`${button} bg-orange-50 text-primary-orange`}>{subject}</span>}
        </nav>
        {grade === null ? <section aria-label="الصفوف" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GRADES.map((name, i) => <button key={name} className={`${card} text-start transition hover:border-primary-orange focus-visible:outline-2 focus-visible:outline-primary-orange`} onClick={() => { setGrade(i + 1); resetRound(); }}>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-black text-primary-orange">{i + 1}</span>
            <h2 className="text-xl font-extrabold">الصف {name}</h2><p className="mt-2 text-sm text-text-gray">7 مواد · {questions.filter((q) => q.grade === i + 1).length} سؤالًا</p>
          </button>)}
        </section> : !subject ? <section aria-label="المواد" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((name) => <button key={name} className={`${card} text-start transition hover:border-primary-orange focus-visible:outline-2 focus-visible:outline-primary-orange`} onClick={() => { setSubject(name); setGame("all"); resetRound(); }}>
            <h2 className="text-xl font-extrabold">{name}</h2><p className="mt-2 text-sm text-text-gray">7 أسئلة · 4 أنواع من الألعاب</p><p className="mt-5 font-extrabold text-primary-orange">ابدأ التحدي ←</p>
          </button>)}
        </section> : <>
          <div aria-label="أنواع الألعاب" className="mb-5 flex flex-wrap gap-2">
            {Object.entries({ all: "جميع الألعاب", ...GAMES }).map(([id, label]) => <button key={id} disabled={busy} aria-pressed={game === id} onClick={() => { setGame(id); resetRound(); }} className={`${button} ${game === id ? "bg-text-navy text-white" : "bg-white"}`}>{label}</button>)}
          </div>
          {done ? <section className={`${card} text-center`}>
            <div className="text-5xl text-primary-orange" aria-hidden="true">★</div><h2 className="mt-3 text-2xl font-black">أحسنت، اكتملت الجولة!</h2>
            <p className="my-4 text-lg font-bold">{score} إجابات صحيحة من {playlist.length}</p>
            <div className="flex flex-wrap justify-center gap-3"><button onClick={resetRound} className={`${button} bg-primary-orange text-white`}>جولة جديدة للزائر التالي</button><button onClick={() => { setSubject(null); setGame("all"); resetRound(); }} className={`${button} bg-slate-100`}>اختيار مادة أخرى</button></div>
          </section> : question ? <section className={card} aria-label="لعبة المعرض">
            <PlayChrome progressPct={answered / playlist.length * 100} questionLabel={`السؤال ${index + 1} من ${playlist.length}`} gameLabel={GAMES[question.gameType]} pointsLabel={`${score} إجابات صحيحة`} />
            <h2 dir="auto" className="my-7 text-center text-xl font-extrabold leading-relaxed sm:text-2xl">{question.questionText}</h2>
            <fieldset disabled={busy} className={busy ? "pointer-events-none opacity-70" : ""}>
              <QuestionBody key={`${round}-${question.id}`} question={question} phase={result ? "feedback" : "playing"} selected={selected} feedback={result?.feedback ?? {}} isCorrect={result?.isCorrect ?? null} onChange={(value, canSubmit) => { if (!busy) { setSelected(value); setReady(canSubmit); } }} />
            </fieldset>
            {result && <PlayFeedbackBanner isCorrect={result.isCorrect} correctLabel="إجابة صحيحة، أحسنت!" incorrectLabel="محاولة جيدة" niceTryLabel="شاهد الإجابة الصحيحة ثم تابع التحدي." explanation={typeof result.feedback.explanation === "string" ? result.feedback.explanation : null} />}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button disabled={busy || index === 0} className={`${button} bg-slate-100`} onClick={() => navigate(index - 1)}>السابق</button>
              {result ? <button disabled={busy} className={`${button} bg-primary-orange text-white`} onClick={() => index === playlist.length - 1 ? setDone(true) : navigate(index + 1)}>{index === playlist.length - 1 ? "نتيجة الجولة" : "السؤال التالي"}</button> : <button disabled={!ready || busy} onClick={() => void check()} className={`${button} bg-primary-orange text-white`}>{busy ? "جارٍ التحقق…" : "تحقق من الإجابة"}</button>}
              <button disabled={busy} onClick={resetRound} className={`${button} bg-slate-100`}>إعادة الجولة</button>
            </div>
          </section> : null}
        </>}
      </>}
    </div>
  </main>;
}
