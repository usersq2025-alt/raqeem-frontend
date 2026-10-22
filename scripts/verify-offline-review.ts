/**
 * Self-running verification for src/lib/offline/reviewOffline.ts - bundle download,
 * the retry-until-correct local progress model (a wrong answer leaves the same
 * question "current", a correct one removes it), markReviewQuestionResolved keeping a
 * cached bundle in sync with real online answers, and the sync handler's cleanup.
 * Uses fake-indexeddb (Dexie needs a real IndexedDB) and stubs navigator/fetch, since
 * none of these exist in a plain Node process.
 * Run: npx tsx scripts/verify-offline-review.ts
 */
import "fake-indexeddb/auto";

Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });

import assert from "node:assert/strict";
import { db } from "../src/lib/offline/db";
import {
  downloadReviewBundle,
  getCachedReviewBundle,
  getOrStartLocalReviewProgress,
  currentLocalReviewQuestion,
  submitLocalReviewAnswer,
  markReviewQuestionResolved,
  queueReviewSync,
} from "../src/lib/offline/reviewOffline";
import { drainOutbox } from "../src/lib/offline/syncEngine";

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

function mockBundleFetch(sessionId: number, unitId: number, ids: number[]) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ session_id: sessionId, unit_id: unitId, questions: ids.map((id) => makeQuestion(id)) }))) as typeof fetch;
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

async function waitForOutboxToSettle(maxMs = 2000) {
  const start = Date.now();
  while ((await db.outbox.toArray()).length > 0) {
    if (Date.now() - start > maxMs) throw new Error("outbox never drained within the timeout");
    await new Promise((r) => setTimeout(r, 10));
  }
}

async function main() {
  console.log("Offline unit review (reviewOffline.ts)");

  await check("downloadReviewBundle fetches and caches the not-yet-correct questions", async () => {
    mockBundleFetch(11, 1, [1, 2, 3, 4]);
    const bundle = await downloadReviewBundle(11, 1, 1);
    assert.equal(bundle.questions.length, 4);
    assert.ok(await getCachedReviewBundle(11));
  });

  await check("fresh progress presents the lowest-id question first", async () => {
    const bundle = (await getCachedReviewBundle(11))!;
    const progress = await getOrStartLocalReviewProgress(bundle);
    assert.deepEqual(progress.remainingIds, [1, 2, 3, 4]);
    const q = currentLocalReviewQuestion(bundle, progress);
    assert.equal(q?.id, 1);
  });

  await check("a wrong answer leaves the same question current (retry-until-correct)", async () => {
    const bundle = (await getCachedReviewBundle(11))!;
    const progress = await getOrStartLocalReviewProgress(bundle);
    const result = await submitLocalReviewAnswer(bundle, progress, { selected_option_id: "b" });
    assert.equal(result.isCorrect, false);
    assert.deepEqual(result.progress.remainingIds, [1, 2, 3, 4], "id 1 stays at the front, not removed");
    const q = currentLocalReviewQuestion(bundle, result.progress);
    assert.equal(q?.id, 1, "same question presented again next");
  });

  await check("a correct answer removes the question and advances to the next one", async () => {
    const bundle = (await getCachedReviewBundle(11))!;
    const progress = (await db.reviewProgress.get(11))!;
    const result = await submitLocalReviewAnswer(bundle, progress, { selected_option_id: "a" });
    assert.equal(result.isCorrect, true);
    assert.deepEqual(result.progress.remainingIds, [2, 3, 4]);
    assert.equal(result.progress.correctCount, 1);
  });

  await check("markReviewQuestionResolved keeps the cached bundle in sync with real online answers", async () => {
    // Simulates question 2 being answered correctly for real, online, before
    // connectivity drops - without this, the local fallback would re-serve a question
    // the server already considers resolved, and later resync it too.
    await markReviewQuestionResolved(11, 2);
    await db.reviewProgress.delete(11); // simulate "no local progress yet" (first local fallback)
    const bundle = (await getCachedReviewBundle(11))!;
    assert.equal(bundle.questions.length, 3, "resolved question removed from the bundle");
    const progress = await getOrStartLocalReviewProgress(bundle);
    assert.deepEqual(progress.remainingIds, [1, 3, 4], "id 2 never appears - it was already resolved online");
  });

  await check("finishing every remaining question marks the session completed", async () => {
    const bundle = (await getCachedReviewBundle(11))!;
    let progress = (await db.reviewProgress.get(11))!;
    for (const id of [...progress.remainingIds]) {
      const q = currentLocalReviewQuestion(bundle, progress)!;
      assert.equal(q.id, id);
      const result = await submitLocalReviewAnswer(bundle, progress, { selected_option_id: "a" });
      progress = result.progress;
    }
    assert.equal(progress.status, "completed");
    assert.equal(progress.remainingIds.length, 0);
  });

  await check("queueReviewSync enqueues, and the background drain cleans up on success", async () => {
    let sentBody: { answers: unknown[] } | null = null;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    const progress = (await db.reviewProgress.get(11))!;
    await queueReviewSync(progress);
    await waitForOutboxToSettle();

    assert.ok(sentBody, "sync handler should have called fetch");
    assert.equal((sentBody as { answers: unknown[] }).answers.length, 3, "one answer per remaining question (1, 3, 4) - 2 was already resolved online");
    assert.equal(await db.reviewBundles.get(11), undefined, "bundle cleaned up after sync");
    assert.equal(await db.reviewProgress.get(11), undefined, "local progress cleaned up after sync");
  });

  console.log(`\n${passed} checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
