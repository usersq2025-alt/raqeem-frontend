"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LessonCompleteCelebration } from "@/components/LessonCompleteCelebration";
import { Button } from "@/components/ui/Button";
import { withChildQuery } from "@/lib/config/subjects";
import {
  completeAttempt,
  getCurrentQuestion,
  startLessonAttempt,
  submitAnswer,
  type LessonAttempt,
  type PlayQuestion,
} from "@/lib/api/lessonPlay";

type Props = {
  lessonId: number;
  childId: number;
  pointsBalance: number;
};

type Phase = "playing" | "feedback" | "recharge" | "done" | "error";

export function LessonPlayExperience({ lessonId, childId, pointsBalance }: Props) {
  const t = useTranslations("lesson");
  const [attempt, setAttempt] = useState<LessonAttempt | null>(null);
  const [question, setQuestion] = useState<PlayQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [selected, setSelected] = useState<unknown>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const started = await startLessonAttempt(lessonId, childId);
        if (cancelled) return;
        setAttempt(started);
        if (started.status === "battery_depleted") {
          setPhase("recharge");
          return;
        }
        if (!started.currentQuestionId || started.totalQuestions <= 0) {
          setError(t("loadError"));
          setPhase("error");
          return;
        }
        if (started.answeredCount >= started.totalQuestions) {
          const done = started.status === "completed" ? started : await completeAttempt(started.id);
          if (cancelled) return;
          setAttempt(done);
          setPhase("done");
          return;
        }
        const q = await getCurrentQuestion(started.id);
        if (cancelled) return;
        setQuestion(q);
        setPhase("playing");
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        if (status === 423) {
          setPhase("recharge");
          return;
        }
        setError(t("loadError"));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, childId, t]);

  async function onSubmit() {
    if (!attempt || !question || selected == null || busy) return;
    setBusy(true);
    try {
      const result = await submitAnswer(attempt.id, question.id, selected);
      setAttempt(result.attempt);
      setIsCorrect(result.isCorrect);
      setFeedback(result.feedback);
      if (result.attempt.status === "battery_depleted") {
        setPhase("recharge");
        return;
      }
      setPhase("feedback");
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 423) {
        setPhase("recharge");
        return;
      }
      setError(t("submitError"));
    } finally {
      setBusy(false);
    }
  }

  async function onNext() {
    if (!attempt) return;
    setBusy(true);
    try {
      if (attempt.answeredCount >= attempt.totalQuestions) {
        const done = await completeAttempt(attempt.id);
        setAttempt(done);
        setPhase("done");
        return;
      }
      const q = await getCurrentQuestion(attempt.id);
      setQuestion(q);
      setSelected(null);
      setCanSubmit(false);
      setIsCorrect(null);
      setFeedback({});
      setPhase("playing");
    } catch {
      setError(t("loadError"));
    } finally {
      setBusy(false);
    }
  }

  if (phase === "error") {
    return <p className="py-16 text-center font-bold text-text-gray">{error}</p>;
  }

  if (!attempt) {
    return <p className="py-16 text-center font-bold text-text-gray">{t("loading")}</p>;
  }

  if (phase === "recharge") {
    return <RechargeView endsAt={attempt.rechargeEndsAt} childId={childId} />;
  }

  if (phase === "done") {
    return <LessonCompleteCelebration attempt={attempt} childId={childId} />;
  }

  const progressPct =
    attempt.totalQuestions > 0 ? Math.round((attempt.answeredCount / attempt.totalQuestions) * 100) : 0;
  const displayPoints = pointsBalance + attempt.pointsEarned;

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col">
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full rounded-full bg-primary-orange transition-[width] duration-500" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-text-navy">
          <span aria-hidden="true">★</span>
          {t("games", { current: attempt.currentGameIndex, total: Math.max(attempt.gamesTotal, 1) })}
        </div>
        <Battery remaining={attempt.batteryRemaining} total={attempt.batteryTotal} />
      </div>
      <p className="mt-1 text-sm font-bold text-amber-500">{displayPoints}</p>

      {question ? (
        <div className="mt-4 rounded-[28px] bg-white p-5 shadow-[0_12px_32px_-20px_rgba(26,43,71,0.45)]">
          <p className="text-center text-lg font-extrabold leading-relaxed text-text-navy">{question.questionText}</p>
        </div>
      ) : null}

      <div className="mt-4 flex-1">
        {question ? (
          <QuestionBody
            question={question}
            phase={phase === "feedback" ? "feedback" : "playing"}
            selected={selected}
            feedback={feedback}
            isCorrect={isCorrect}
            onChange={(value, ready) => {
              setSelected(value);
              setCanSubmit(ready);
            }}
          />
        ) : null}
      </div>

      {phase === "feedback" && isCorrect != null ? (
        <p className={`mb-3 text-center text-sm font-extrabold ${isCorrect ? "text-emerald-600" : "text-red-500"}`}>
          {isCorrect ? t("correct") : t("incorrect")}
        </p>
      ) : null}

      {phase === "playing" ? (
        <Button onClick={onSubmit} disabled={!canSubmit || busy} fullWidth>
          {t("submit")}
        </Button>
      ) : (
        <Button onClick={onNext} disabled={busy} fullWidth>
          {t("next")}
        </Button>
      )}
    </div>
  );
}

function Battery({ remaining, total }: { remaining: number; total: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={`h-4 w-2.5 rounded-sm ${index < remaining ? "bg-emerald-400" : "bg-neutral-200"}`}
        />
      ))}
      <span className="ms-0.5 h-3 w-1 rounded-e-sm border border-neutral-300" />
    </div>
  );
}

export type QuestionPlayPhase = "playing" | "feedback";

export function QuestionBody({
  question,
  phase,
  selected,
  feedback,
  isCorrect,
  onChange,
}: {
  question: PlayQuestion;
  phase: QuestionPlayPhase;
  selected: unknown;
  feedback: Record<string, unknown>;
  isCorrect: boolean | null;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  if (question.gameType === "mcq") {
    return (
      <McqBody
        payload={question.payload}
        phase={phase}
        selected={selected}
        feedback={feedback}
        onChange={onChange}
      />
    );
  }
  if (question.gameType === "true_false") {
    return <TrueFalseBody phase={phase} selected={selected} feedback={feedback} onChange={onChange} />;
  }
  if (question.gameType === "matching_pairs") {
    return <MatchingBody payload={question.payload} phase={phase} onChange={onChange} />;
  }
  if (question.gameType === "drag_classify") {
    return <DragBody payload={question.payload} phase={phase} onChange={onChange} />;
  }
  if (question.gameType === "ordering") {
    return <OrderingBody payload={question.payload} phase={phase} onChange={onChange} />;
  }
  if (question.gameType === "crossword") {
    return <CrosswordBody payload={question.payload} phase={phase} onChange={onChange} />;
  }
  return <p className="text-center font-bold text-text-gray">{question.gameType}</p>;
}

function optionList(payload: Record<string, unknown>): Array<{ id: string; text: string }> {
  const options = Array.isArray(payload.options) ? payload.options : [];
  return options
    .map((row, index) => {
      if (typeof row === "string") return { id: String(index), text: row };
      if (row && typeof row === "object") {
        const item = row as { id?: unknown; text?: unknown };
        return { id: String(item.id ?? index), text: String(item.text ?? "") };
      }
      return { id: String(index), text: "" };
    })
    .filter((row) => row.text);
}

function McqBody({
  payload,
  phase,
  selected,
  feedback,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: Phase;
  selected: unknown;
  feedback: Record<string, unknown>;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const options = optionList(payload);
  const selectedId =
    selected && typeof selected === "object" && "selected_option_id" in selected
      ? String((selected as { selected_option_id: string }).selected_option_id)
      : null;
  const correctId = feedback.correct_option_id != null ? String(feedback.correct_option_id) : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const locked = phase === "feedback";
        const isPick = selectedId === option.id;
        const isRight = locked && correctId === option.id;
        const isWrong = locked && isPick && correctId !== option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={locked}
            onClick={() => onChange({ selected_option_id: option.id }, true)}
            className={`min-h-[6.5rem] rounded-[22px] border-4 bg-white px-3 py-4 text-base font-extrabold text-text-navy ${
              isRight
                ? "border-emerald-400"
                : isWrong
                  ? "border-red-400"
                  : isPick
                    ? "border-primary-orange shadow-[0_0_0_3px_rgba(244,130,50,0.25)]"
                    : "border-transparent shadow-[0_8px_24px_-16px_rgba(26,43,71,0.4)]"
            }`}
          >
            {option.text}
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseBody({
  phase,
  selected,
  feedback,
  onChange,
}: {
  phase: Phase;
  selected: unknown;
  feedback: Record<string, unknown>;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const t = useTranslations("lesson");
  const value =
    selected && typeof selected === "object" && "answer" in selected
      ? Boolean((selected as { answer: boolean }).answer)
      : null;
  const correct = typeof feedback.correct_answer === "boolean" ? feedback.correct_answer : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {[true, false].map((answer) => {
        const locked = phase === "feedback";
        const isPick = value === answer;
        const isRight = locked && correct === answer;
        const isWrong = locked && isPick && correct !== answer;
        return (
          <button
            key={String(answer)}
            type="button"
            disabled={locked}
            onClick={() => onChange({ answer }, true)}
            className={`min-h-[5.5rem] rounded-[22px] border-4 bg-white text-xl font-extrabold ${
              isRight ? "border-emerald-400" : isWrong ? "border-red-400" : isPick ? "border-primary-orange" : "border-transparent"
            }`}
          >
            {answer ? t("true") : t("false")}
          </button>
        );
      })}
    </div>
  );
}

function MatchingBody({
  payload,
  phase,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: Phase;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const left = useMemo(
    () => (Array.isArray(payload.left_items) ? (payload.left_items as Array<{ id: string; text: string }>) : []),
    [payload.left_items]
  );
  const right = useMemo(
    () => (Array.isArray(payload.right_items) ? (payload.right_items as Array<{ id: string; text: string }>) : []),
    [payload.right_items]
  );
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<string | null>(null);

  function setMatch(leftId: string, rightId: string) {
    const next = { ...matches, [leftId]: rightId };
    setMatches(next);
    const ready = left.length > 0 && left.every((item) => next[item.id]);
    onChange({ matches: next }, ready);
  }

  if (phase === "feedback") {
    return <MatchedSummary left={left} matches={matches} right={right} />;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-2">
        {left.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPick(item.id)}
            className={`rounded-2xl bg-white p-3 text-start text-sm font-bold ${
              pick === item.id ? "ring-2 ring-primary-orange" : "shadow-sm"
            }`}
          >
            {item.text}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {right.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (!pick) return;
              setMatch(pick, item.id);
              setPick(null);
            }}
            className="rounded-2xl bg-white p-3 text-start text-sm font-bold shadow-sm"
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchedSummary({
  left,
  matches,
  right,
}: {
  left: Array<{ id: string; text: string }>;
  matches: Record<string, string>;
  right: Array<{ id: string; text: string }>;
}) {
  return (
    <ul className="space-y-2 text-sm font-bold text-text-navy">
      {left.map((item) => (
        <li key={item.id} className="rounded-2xl bg-white p-3">
          {item.text} → {right.find((row) => row.id === matches[item.id])?.text ?? "—"}
        </li>
      ))}
    </ul>
  );
}

function DragBody({
  payload,
  phase,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: Phase;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const categories = Array.isArray(payload.categories)
    ? (payload.categories as Array<{ id: string; name: string }>)
    : [];
  const items = Array.isArray(payload.items) ? (payload.items as Array<{ id: string; text: string }>) : [];
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<string | null>(null);

  function assign(itemId: string, categoryId: string) {
    const next = { ...assignments, [itemId]: categoryId };
    setAssignments(next);
    onChange({ assignments: next }, items.length > 0 && items.every((item) => next[item.id]));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={phase === "feedback"}
            onClick={() => setPick(item.id)}
            className={`rounded-full bg-white px-3 py-2 text-sm font-bold ${pick === item.id ? "ring-2 ring-primary-orange" : ""}`}
          >
            {item.text}
            {assignments[item.id] ? ` → ${categories.find((c) => c.id === assignments[item.id])?.name ?? ""}` : ""}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            disabled={phase === "feedback"}
            onClick={() => {
              if (!pick) return;
              assign(pick, cat.id);
              setPick(null);
            }}
            className="rounded-[22px] bg-violet-50 p-4 text-sm font-extrabold text-text-navy"
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderingBody({
  payload,
  phase,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: Phase;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const tokens = Array.isArray(payload.tokens) ? (payload.tokens as Array<{ id: string; text: string }>) : [];
  const [order, setOrder] = useState<string[]>([]);

  function addToken(id: string) {
    const next = [...order, id];
    setOrder(next);
    onChange({ order: next }, next.length === tokens.length && tokens.length > 0);
  }

  return (
    <div>
      <p className="mb-3 min-h-[3rem] rounded-[22px] bg-white p-3 text-center font-extrabold text-text-navy">
        {order.map((id) => tokens.find((token) => token.id === id)?.text).join(" ")}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {tokens
          .filter((token) => !order.includes(token.id))
          .map((token) => (
            <button
              key={token.id}
              type="button"
              disabled={phase === "feedback"}
              onClick={() => addToken(token.id)}
              className="rounded-full bg-sky-100 px-3 py-2 text-sm font-bold"
            >
              {token.text}
            </button>
          ))}
      </div>
    </div>
  );
}

function CrosswordBody({
  payload,
  phase,
  onChange,
}: {
  payload: Record<string, unknown>;
  phase: Phase;
  onChange: (value: unknown, ready: boolean) => void;
}) {
  const words = Array.isArray(payload.words)
    ? (payload.words as Array<{ id: string; clue: string; length?: number }>)
    : [];
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function setWord(id: string, value: string) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onChange({ answers: next }, words.length > 0 && words.every((word) => (next[word.id] ?? "").trim() !== ""));
  }

  return (
    <div className="space-y-3">
      {words.map((word) => (
        <label key={word.id} className="block rounded-[22px] bg-white p-3">
          <span className="text-sm font-bold text-text-navy">{word.clue}</span>
          <input
            disabled={phase === "feedback"}
            maxLength={word.length ?? 40}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 font-bold"
            value={answers[word.id] ?? ""}
            onChange={(event) => setWord(word.id, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

function RechargeView({ endsAt, childId }: { endsAt: string | null; childId: number }) {
  const t = useTranslations("lesson");
  const [label, setLabel] = useState("--:--");

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("00:00");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLabel(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-28 w-20 items-end justify-center rounded-2xl bg-violet-200 p-2">
        <div className="h-6 w-full rounded bg-red-400" />
      </div>
      <h1 className="text-2xl font-extrabold text-text-navy">{t("rechargeTitle")}</h1>
      <p className="mt-3 max-w-sm text-sm font-semibold leading-relaxed text-text-gray">{t("rechargeBody")}</p>
      <p className="mt-4 text-lg font-extrabold text-violet-600">{t("rechargeTimer", { time: label })}</p>
      <div className="mt-8 grid w-full max-w-sm grid-cols-1 gap-2.5">
        <Button href={withChildQuery("/headquarters", childId)}>{t("rechargeHq")}</Button>
        <Button href={withChildQuery("/store", childId)} variant="secondary">
          {t("rechargeStore")}
        </Button>
      </div>
    </div>
  );
}
