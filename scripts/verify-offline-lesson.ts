/**
 * Self-running verification for src/lib/offline/lessonOffline.ts - bundle download,
 * local progress bootstrapping/resuming, local grading via submitLocalAnswer (battery
 * depletion, star calculation), and the sync handler's fetch call + cleanup on success.
 * Uses fake-indexeddb (Dexie needs a real IndexedDB) and stubs navigator/fetch, since
 * none of these exist in a plain Node process.
 * Run: npx tsx scripts/verify-offline-lesson.ts
 */
import "fake-indexeddb/auto";

// Dexie/syncEngine read navigator.onLine - Node has no such property on its built-in
// navigator, so stub one before any of this session's modules run (none of them touch
// navigator at module-evaluation time, only inside functions, so import order here is
// safe regardless - this just has to happen before drainOutbox() is first called).
Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });

import assert from "node:assert/strict";
import { db } from "../src/lib/offline/db";
import {
  downloadLessonBundle,
  getCachedLessonBundle,
  getOrStartLocalProgress,
  submitLocalAnswer,
  batterySegmentsRemaining,
  calculateLocalStars,
  queueLessonSync,
  updateBundleStartPosition,
} from "../src/lib/offline/lessonOffline";
import { drainOutbox } from "../src/lib/offline/syncEngine";

const GAME_RULES = {
  battery: {
    segment_1_lost_at_wrong_ratio: 0.1,
    segment_2_lost_at_wrong_ratio: 0.25,
    depleted_at_wrong_ratio: 0.5,
    total_segments: 3,
    recharge_minutes: 15,
  },
  stars: { three_star_min_ratio: 0.9, two_star_min_ratio: 0.7 },
  max_questions_per_attempt: 8,
  points: { per_correct_answer: 1 },
};

function makeQuestion(id: number, correctOptionId = "a") {
  return {
    id,
    game_id: 1,
    game_type: "mcq",
    question_text: `Question ${id}`,
    image_url: null,
    image_alt: null,
    difficulty: "medium",
    payload: { options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] },
    answer_key: { correct_option_id: correctOptionId },
  };
}

let passed = 0;
async function check(label: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (error) {
    console.error(`  ✗ ${label}`);
    throw error;
  }
}

async function main() {
  console.log("Offline lesson play (lessonOffline.ts)");

  await check("downloadLessonBundle fetches and caches the bundle", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          attempt_id: 101,
          lesson_id: 7,
          questions: [1, 2, 3, 4, 5, 6].map((id) => makeQuestion(id)),
          rules: GAME_RULES,
        })
      )) as typeof fetch;

    const bundle = await downloadLessonBundle(101, 1, { answeredCount: 0, correctCount: 0, wrongCount: 0 });
    assert.equal(bundle.questions.length, 6);
    const cached = await getCachedLessonBundle(101);
    assert.ok(cached, "bundle should be cached");
  });

  await check("fresh local progress starts at the bundle's start position", async () => {
    const bundle = await getCachedLessonBundle(101);
    assert.ok(bundle);
    const progress = await getOrStartLocalProgress(bundle!);
    assert.equal(progress.currentIndex, 0);
    assert.equal(progress.status, "in_progress");
  });

  await check("submitLocalAnswer grades correctly and advances the index", async () => {
    const bundle = (await getCachedLessonBundle(101))!;
    const progress = await getOrStartLocalProgress(bundle);
    const result = await submitLocalAnswer(bundle, progress, { selected_option_id: "a" });
    assert.equal(result.isCorrect, true);
    assert.equal(result.progress.currentIndex, 1);
    assert.equal(result.progress.correctCount, 1);
  });

  await check("updateBundleStartPosition keeps the resume point live after a real online answer", async () => {
    // Simulates the fix for the double-counting bug: 2 real online answers already
    // happened (outside this bundle's own local-progress tracking) before connectivity
    // drops - the bundle's snapshot must move forward so local play resumes at index 2,
    // not replay questions 1-2.
    await updateBundleStartPosition(101, { answeredCount: 2, correctCount: 2, wrongCount: 0 });
    await db.lessonProgress.delete(101); // simulate "no local progress yet" (first local fallback)
    const bundle = (await getCachedLessonBundle(101))!;
    const progress = await getOrStartLocalProgress(bundle);
    assert.equal(progress.currentIndex, 2, "should resume from the live snapshot, not index 0");
    assert.equal(progress.correctCount, 2);
  });

  await check("finishing the remaining questions (resumed from the live snapshot) marks all_answered", async () => {
    const bundle = (await getCachedLessonBundle(101))!;
    let progress = await getOrStartLocalProgress(bundle);
    // Walk through the remaining 4 questions (index 2..5), answering all correctly - combined
    // with the 2 already reflected in the snapshot, that is 6/6 correct overall.
    for (let i = 0; i < 4; i++) {
      const r = await submitLocalAnswer(bundle, progress, { selected_option_id: "a" });
      progress = r.progress;
    }
    assert.equal(progress.status, "all_answered");
    assert.equal(progress.correctCount, 6);
    assert.equal(batterySegmentsRemaining(bundle, progress), 3, "no wrong answers - full battery");
    assert.equal(calculateLocalStars(bundle, progress), 3, "6/6 correct clears the three-star ratio");
  });

  await check("wrong answers deplete the battery and lower the star rating", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          attempt_id: 303,
          lesson_id: 9,
          questions: [1, 2, 3, 4, 5, 6].map((id) => makeQuestion(id)),
          rules: GAME_RULES,
        })
      )) as typeof fetch;
    const bundle = await downloadLessonBundle(303, 1, { answeredCount: 0, correctCount: 0, wrongCount: 0 });
    let progress = await getOrStartLocalProgress(bundle);

    // 1 wrong out of 6 so far (ratio 0.167) - past the first threshold (0.10), short of the
    // second (0.25): exactly one segment lost.
    const wrong = await submitLocalAnswer(bundle, progress, { selected_option_id: "b" });
    progress = wrong.progress;
    assert.equal(wrong.isCorrect, false);
    assert.equal(batterySegmentsRemaining(bundle, progress), 2);

    // 2 wrong out of 6 so far (ratio 0.333) - past the second threshold (0.25): two lost.
    const wrong2 = await submitLocalAnswer(bundle, progress, { selected_option_id: "b" });
    progress = wrong2.progress;
    assert.equal(batterySegmentsRemaining(bundle, progress), 1);

    // 3 wrong out of 6 (ratio 0.5) hits depleted_at_wrong_ratio exactly: battery depleted.
    const wrong3 = await submitLocalAnswer(bundle, progress, { selected_option_id: "b" });
    progress = wrong3.progress;
    assert.equal(progress.status, "battery_depleted");
    assert.equal(batterySegmentsRemaining(bundle, progress), 0);
    assert.equal(calculateLocalStars(bundle, progress), 1, "0/3 correct so far stays at the 1-star floor");
  });

  // enqueue() (called by queueLessonSync) fires its own background drainOutbox() as
  // fire-and-forget - callers never block on sync completing. drainOutbox() also
  // guards against re-entrancy with a module-level flag, so calling it again
  // explicitly right after can be a same-tick no-op. Poll briefly instead of racing it.
  async function waitForOutboxToSettle(maxMs = 2000) {
    const start = Date.now();
    while ((await db.outbox.toArray()).length > 0) {
      if (Date.now() - start > maxMs) throw new Error("outbox never drained within the timeout");
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  await check("queueLessonSync enqueues, and the background drain cleans up on success", async () => {
    let sentBody: { answers: unknown[] } | null = null;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    const progress = (await db.lessonProgress.get(101))!;
    await queueLessonSync(progress);
    await waitForOutboxToSettle();

    assert.ok(sentBody, "sync handler should have called fetch");
    assert.equal((sentBody as { answers: unknown[] }).answers.length, 4, "only the 4 locally-answered questions, not the 2 pre-existing ones");
    assert.equal(await db.lessonBundles.get(101), undefined, "bundle cleaned up after sync");
    assert.equal(await db.lessonProgress.get(101), undefined, "local progress cleaned up after sync");
  });

  await check("a failed sync keeps the item queued with an incremented attempt count", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          attempt_id: 202,
          lesson_id: 11,
          questions: [1, 2, 3, 4, 5, 6].map((id) => makeQuestion(id)),
          rules: GAME_RULES,
        })
      )) as typeof fetch;
    const bundle = await downloadLessonBundle(202, 1, { answeredCount: 0, correctCount: 0, wrongCount: 0 });
    const progress = await getOrStartLocalProgress(bundle);
    const result = await submitLocalAnswer(bundle, progress, { selected_option_id: "a" });

    // Only now does the backend become unreachable - this is what the sync batch hits.
    globalThis.fetch = (async () => new Response(JSON.stringify({ message: "NETWORK" }), { status: 503 })) as typeof fetch;
    await queueLessonSync(result.progress);

    // The failing handler's own first attempt already ran as part of enqueue()'s
    // fire-and-forget drain - wait briefly for that attempt to be recorded, then make
    // sure a direct drainOutbox() call (as a reconnect retry would trigger) doesn't
    // succeed either, and the item stays queued rather than being silently dropped.
    await new Promise((r) => setTimeout(r, 50));
    await drainOutbox();
    const items = await db.outbox.toArray();
    assert.equal(items.length, 1, "item stays queued after a failed sync");
    assert.ok(items[0].attempts >= 1);
    assert.match(items[0].lastError ?? "", /503/);
  });

  console.log(`\n${passed} checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
