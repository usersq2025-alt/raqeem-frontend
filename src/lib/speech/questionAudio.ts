/**
 * Read-aloud for questions.
 *
 * The server pre-generates one short clip per piece of a question (stem, image
 * description, each option / card / clue). The browser only plays static files:
 * it never calls a speech provider. Reading order is built here from the order
 * the student actually sees, because options are shuffled on screen.
 */

export type AudioManifest = {
  version: string;
  /** Segment key ("q", "alt", "opt:3", "left:l0", ...) -> clip URL. */
  segments: Record<string, string>;
  /** Fixed phrases ("option_1", "true", ...) -> clip URL. */
  system: Record<string, string>;
};

export type ReadGroup = "options" | "left" | "right" | "categories" | "tray" | "tokens" | "clues";

/** One item currently on screen, in screen order. */
export type ReadItem = {
  /** Segment key of the item's clip, e.g. "opt:3". */
  key: string;
  group: ReadGroup;
  /** The item shows only a picture (no text): say "picture" instead of silence. */
  pictureOnly?: boolean;
};

export type PlayStep = { id: string; url: string };

function cleanUrlMap(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && /^(https?:\/\/|\/)/i.test(value) && !value.startsWith("//")) out[key] = value;
  }
  return out;
}

export function mapAudioManifest(raw: unknown): AudioManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const segments = cleanUrlMap(row.segments);
  if (!segments.q) return null;
  return {
    version: typeof row.version === "string" ? row.version : "",
    segments,
    system: cleanUrlMap(row.system),
  };
}

export function mapExplanationAudio(feedback: Record<string, unknown> | null | undefined): string | null {
  const url = feedback?.explanation_audio_url;
  return typeof url === "string" && /^(https?:\/\/|\/)/i.test(url) && !url.startsWith("//") ? url : null;
}

const GROUP_HEAD: Partial<Record<ReadGroup, string>> = {
  options: "options",
  left: "col_first",
  right: "col_second",
  categories: "categories",
  tray: "tray",
  tokens: "ordering_bank",
};

/**
 * The full "listen to the question and choices" sequence, in on-screen order:
 * stem, image description, then each visible item (with its spoken label).
 */
export function buildReadingPlan(input: {
  gameType: string;
  audio: AudioManifest | null;
  layout: ReadItem[];
  imageShown: boolean;
}): PlayStep[] {
  const { audio, layout, gameType } = input;
  if (!audio) return [];
  const steps: PlayStep[] = [];
  const clip = (id: string, url: string | undefined) => {
    if (url) steps.push({ id, url });
  };
  const system = (name: string) => clip(`sys:${name}`, audio.system[name]);

  clip("q", audio.segments.q);
  if (input.imageShown) clip("alt", audio.segments.alt);

  if (gameType === "true_false") {
    system("tf_choices");
    return steps;
  }

  const seen = new Set<ReadGroup>();
  const counters: Partial<Record<ReadGroup, number>> = {};
  for (const item of layout) {
    const group = item.group;
    const n = (counters[group] = (counters[group] ?? 0) + 1);
    if (!seen.has(group)) {
      seen.add(group);
      const head = GROUP_HEAD[group];
      if (head) system(head);
    }
    if (group === "options") system(`option_${n}`);
    if (group === "clues") system(`clue_${n}`);

    const url = audio.segments[item.key];
    if (url) clip(item.key, url);
    else if (item.pictureOnly) system("picture");
  }
  return steps;
}

export type QueueSnapshot = { state: "idle" | "playing" | "error"; currentId: string | null };

/** The subset of HTMLAudioElement the queue needs (lets tests run without a browser). */
export interface AudioLike {
  src: string;
  preload: string;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  play(): Promise<void>;
  pause(): void;
}

export type AudioQueue = {
  play(steps: PlayStep[]): void;
  stop(): void;
  preload(url: string | undefined): void;
};

/**
 * Plays steps one after another on ONE audio element. Reusing a single element
 * matters on iPhones: only an element started by a tap may keep playing the
 * next clip without another tap.
 */
export function createAudioQueue(opts: {
  createAudio: () => AudioLike;
  onChange: (snapshot: QueueSnapshot) => void;
  gapMs?: number;
}): AudioQueue {
  let element: AudioLike | null = null;
  let token = 0;
  let gapTimer: ReturnType<typeof setTimeout> | null = null;
  const gap = opts.gapMs ?? 180;

  function release() {
    if (gapTimer) clearTimeout(gapTimer);
    gapTimer = null;
    if (element) {
      element.onended = null;
      element.onerror = null;
      element.pause();
    }
  }

  function stop() {
    token += 1;
    release();
    opts.onChange({ state: "idle", currentId: null });
  }

  function play(steps: PlayStep[]) {
    token += 1;
    const mine = token;
    release();
    if (steps.length === 0) {
      opts.onChange({ state: "idle", currentId: null });
      return;
    }
    element ??= opts.createAudio();
    const audio = element;
    let index = 0;

    const next = () => {
      if (mine !== token) return;
      const step = steps[index];
      if (!step) {
        opts.onChange({ state: "idle", currentId: null });
        return;
      }
      index += 1;
      audio.src = step.url;
      audio.onended = () => {
        if (mine !== token) return;
        gapTimer = setTimeout(next, gap);
      };
      // A broken clip is skipped so one bad file never silences the rest.
      audio.onerror = () => {
        if (mine !== token) return;
        next();
      };
      opts.onChange({ state: "playing", currentId: step.id });
      audio.play().catch(() => {
        if (mine !== token) return;
        token += 1;
        opts.onChange({ state: "error", currentId: null });
      });
    };
    next();
  }

  function preload(url: string | undefined) {
    if (!url || typeof window === "undefined") return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const probe = opts.createAudio();
    probe.preload = "auto";
    probe.src = url;
  }

  return { play, stop, preload };
}
