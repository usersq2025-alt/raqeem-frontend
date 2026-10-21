import Dexie, { type EntityTable } from "dexie";

/**
 * A pending write waiting to reach the server. `id` is the coalescing key: for a
 * "whole value overwrite" mutation (like saving the HQ layout), callers pass a stable
 * id (e.g. `hq3d-state:${childId}`) so repeated local edits replace the same row
 * instead of piling up a queue - only the latest local state is kept, matching how the
 * server itself already treats these writes (last one to arrive wins).
 */
export interface OutboxItem {
  id: string;
  kind: string;
  childId: number;
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface HqStateCache {
  childId: number;
  pointsBalance: number;
  prices: Record<string, number>;
  owned: Record<string, number>;
  state: Record<string, unknown> | null;
  updatedAt: number;
}

/** Small key/value bookkeeping table - e.g. "which content version is currently
 * precached under this key", so a version bump can be detected and evicted. */
export interface MetaRow {
  key: string;
  value: string;
}

export interface OfflineBundleQuestion {
  id: number;
  game_id: number;
  game_type: string;
  question_text: string;
  image_url: string | null;
  image_alt: string | null;
  difficulty: string;
  payload: Record<string, unknown>;
  answer_key: Record<string, unknown>;
}

export interface GameRules {
  battery: {
    segment_1_lost_at_wrong_ratio: number;
    segment_2_lost_at_wrong_ratio: number;
    depleted_at_wrong_ratio: number;
    total_segments: number;
    recharge_minutes: number;
  };
  stars: { three_star_min_ratio: number; two_star_min_ratio: number };
  max_questions_per_attempt: number;
  points: Record<string, number>;
}

/** Downloaded once per attempt (GET .../offline-bundle), kept until the attempt is
 * synced/completed. Keyed by attemptId, which is already globally unique server-side.
 * startIndex/startCorrectCount/startWrongCount mirror the real attempt's position at
 * download time (0 for a brand new attempt, >0 when resuming one with prior online
 * progress) - the only hint available to bootstrap local progress correctly if
 * connectivity drops before any question-specific call (which would otherwise let the
 * question_id itself locate the right index - see lessonOffline.ts). */
export interface LessonBundleCache {
  attemptId: number;
  lessonId: number;
  childId: number;
  questions: OfflineBundleQuestion[];
  rules: GameRules;
  cachedAt: number;
  startIndex: number;
  startCorrectCount: number;
  startWrongCount: number;
}

/** Locally-computed progress through a bundle - lets a child close the app mid-lesson
 * while offline and resume exactly where they left off. */
export interface LocalAttemptProgress {
  attemptId: number;
  lessonId: number;
  childId: number;
  currentIndex: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  status: "in_progress" | "battery_depleted" | "all_answered";
  answers: { questionId: number; selectedAnswer: unknown }[];
  updatedAt: number;
}

class RaqeemOfflineDB extends Dexie {
  outbox!: EntityTable<OutboxItem, "id">;
  hqState!: EntityTable<HqStateCache, "childId">;
  meta!: EntityTable<MetaRow, "key">;
  lessonBundles!: EntityTable<LessonBundleCache, "attemptId">;
  lessonProgress!: EntityTable<LocalAttemptProgress, "attemptId">;

  constructor() {
    super("raqeem-offline");
    this.version(1).stores({
      outbox: "id, kind, childId",
      hqState: "childId",
      meta: "key",
      lessonBundles: "attemptId, lessonId, childId",
      lessonProgress: "attemptId, lessonId, childId",
    });
  }
}

export const db = new RaqeemOfflineDB();
