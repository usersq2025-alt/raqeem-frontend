"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import type { PlayQuestion } from "@/lib/api/lessonPlay";
import {
  buildReadingPlan,
  createAudioQueue,
  type AudioLike,
  type AudioQueue,
  type QueueSnapshot,
  type ReadItem,
} from "@/lib/speech/questionAudio";

type QuestionAudioContextValue = {
  /** True when this question has a pre-generated stem clip and the feature is on. */
  available: boolean;
  snapshot: QueueSnapshot;
  /** Filled by the question body with the items on screen, in screen order. */
  layoutRef: MutableRefObject<ReadItem[]>;
  listenAll: () => void;
  stop: () => void;
  /** Plays one item (a segment key) or a fixed phrase ("sys:true"). */
  playOne: (id: string) => void;
  hasClip: (id: string) => boolean;
  playUrl: (id: string, url: string) => void;
};

const noopLayout: MutableRefObject<ReadItem[]> = { current: [] };
const NONE: QuestionAudioContextValue = {
  available: false,
  snapshot: { state: "idle", currentId: null },
  layoutRef: noopLayout,
  listenAll: () => {},
  stop: () => {},
  playOne: () => {},
  hasClip: () => false,
  playUrl: () => {},
};

const QuestionAudioContext = createContext<QuestionAudioContextValue>(NONE);

/**
 * Owns the audio player for the question on screen. Nothing starts by itself:
 * every sound follows a tap on one of the listen buttons. The player stops when
 * the question changes, the page hides, or the component unmounts.
 */
export function QuestionAudioProvider({ question, children }: { question: PlayQuestion; children: ReactNode }) {
  const audio = question.audio ?? null;
  const [snapshot, setSnapshot] = useState<QueueSnapshot>({ state: "idle", currentId: null });
  const layoutRef = useRef<ReadItem[]>([]);
  const queueRef = useRef<AudioQueue | null>(null);

  const queue = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createAudioQueue({
      createAudio: () => new Audio() as unknown as AudioLike,
      onChange: setSnapshot,
    });
  }, []);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // New question (or leaving the page): silence immediately, and warm up only the stem clip.
  useEffect(() => {
    layoutRef.current = [];
    queueRef.current?.preload(audio?.segments.q);
    const hide = () => {
      if (document.visibilityState === "hidden") queueRef.current?.stop();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", hide);
      queueRef.current?.stop();
    };
  }, [question.id, audio?.segments.q]);

  const listenAll = useCallback(() => {
    const steps = buildReadingPlan({
      gameType: question.gameType,
      audio,
      layout: layoutRef.current,
      imageShown: Boolean(question.imageUrl),
    });
    queueRef.current?.play(steps);
  }, [audio, question.gameType, question.imageUrl]);

  const playOne = useCallback(
    (id: string) => {
      const url = id.startsWith("sys:") ? audio?.system[id.slice(4)] : audio?.segments[id];
      if (url) queueRef.current?.play([{ id, url }]);
    },
    [audio],
  );

  const playUrl = useCallback((id: string, url: string) => queueRef.current?.play([{ id, url }]), []);

  const hasClip = useCallback(
    (id: string) => Boolean(id.startsWith("sys:") ? audio?.system[id.slice(4)] : audio?.segments[id]),
    [audio],
  );

  const value = useMemo<QuestionAudioContextValue>(
    () => ({
      available: Boolean(audio),
      snapshot,
      layoutRef,
      listenAll,
      stop: () => queueRef.current?.stop(),
      playOne,
      hasClip,
      playUrl,
    }),
    [audio, snapshot, listenAll, playOne, hasClip, playUrl],
  );

  return <QuestionAudioContext.Provider value={value}>{children}</QuestionAudioContext.Provider>;
}

/** Silences the player whenever `token` changes (e.g. the answer is submitted and feedback appears). */
export function StopAudioOnChange({ token }: { token: unknown }) {
  const { stop } = useQuestionAudio();
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return null;
}

export function useQuestionAudio(): QuestionAudioContextValue {
  return useContext(QuestionAudioContext);
}

/**
 * Called by each question body with the items it is showing right now, in
 * screen order. Stored in a ref (no re-render) and read when the student taps.
 */
export function useReadingLayout(items: ReadItem[]) {
  const { layoutRef } = useQuestionAudio();
  useEffect(() => {
    layoutRef.current = items;
  });
}

/** `(id) => boolean`: does this item have a clip? Lets a body reserve room for the speaker button only when it will show. */
export function useItemListen(): (id: string) => boolean {
  const { available, hasClip } = useQuestionAudio();
  return (id: string) => available && hasClip(id);
}

function SpeakerIcon({ playing }: { playing?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" className={playing ? "animate-pulse" : undefined} />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" className={playing ? "animate-pulse" : undefined} />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

/** «استمع إلى السؤال والخيارات» with stop and replay. Hidden when the question has no audio. */
export function QuestionAudioBar() {
  const t = useTranslations("lesson");
  const { available, snapshot, listenAll, stop } = useQuestionAudio();
  const [started, setStarted] = useState(false);
  if (!available) return null;
  const playing = snapshot.state === "playing";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2" data-question-audio>
      <button
        type="button"
        onClick={() => {
          if (playing) {
            stop();
          } else {
            setStarted(true);
            listenAll();
          }
        }}
        aria-pressed={playing}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-base font-black text-white shadow-[0_6px_0_0_rgba(3,105,161,0.35)] transition active:translate-y-[2px] active:shadow-[0_3px_0_0_rgba(3,105,161,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
      >
        {playing ? <StopIcon /> : <SpeakerIcon />}
        <span>{playing ? t("listenStop") : t("listenAll")}</span>
      </button>
      {started || playing ? (
        <button
          type="button"
          onClick={listenAll}
          aria-label={t("listenReplay")}
          title={t("listenReplay")}
          className="inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full border-[3px] border-sky-200 bg-white px-4 text-sky-700 transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        >
          <ReplayIcon />
          <span className="text-sm font-extrabold">{t("listenReplay")}</span>
        </button>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {playing ? t("listenPlaying") : snapshot.state === "error" ? t("listenError") : ""}
      </span>
      {snapshot.state === "error" ? (
        <p className="w-full text-center text-sm font-bold text-rose-600">{t("listenError")}</p>
      ) : null}
    </div>
  );
}

/**
 * Small speaker button that replays ONE item. Sits beside (never inside) the
 * item's own button so tapping it never selects or moves the item.
 * `id` is a segment key ("opt:3") or a fixed phrase ("sys:true").
 */
export function ListenItem({ id, label, className = "" }: { id: string; label: string; className?: string }) {
  const t = useTranslations("lesson");
  const { available, hasClip, playOne, stop, snapshot } = useQuestionAudio();
  if (!available || !hasClip(id)) return null;
  const playing = snapshot.state === "playing" && snapshot.currentId === id;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (playing) stop();
        else playOne(id);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={t("listenItem", { label })}
      aria-pressed={playing}
      title={t("listenItem", { label })}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-sky-200 bg-white/95 text-sky-700 shadow-sm transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
        playing ? "bg-sky-100" : ""
      } ${className}`}
    >
      <SpeakerIcon playing={playing} />
    </button>
  );
}

/** «استمع إلى الشرح»: plays the pre-generated explanation clip that arrived with the answer feedback. */
export function ExplanationListen({ url }: { url: string | null }) {
  const t = useTranslations("lesson");
  const { snapshot, playUrl, stop } = useQuestionAudio();
  if (!url) return null;
  const playing = snapshot.state === "playing" && snapshot.currentId === "expl";

  return (
    <button
      type="button"
      onClick={() => (playing ? stop() : playUrl("expl", url))}
      aria-pressed={playing}
      className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-sky-200 bg-white px-4 py-2 text-sm font-extrabold text-sky-700 transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
    >
      {playing ? <StopIcon /> : <SpeakerIcon />}
      {playing ? t("listenStop") : t("listenExplanation")}
    </button>
  );
}
