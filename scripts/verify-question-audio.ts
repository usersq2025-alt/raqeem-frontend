import assert from "node:assert/strict";
import {
  buildReadingPlan,
  createAudioQueue,
  mapAudioManifest,
  mapExplanationAudio,
  type AudioLike,
  type QueueSnapshot,
} from "../src/lib/speech/questionAudio";

// --- manifest mapping -------------------------------------------------------
assert.equal(mapAudioManifest(null), null);
assert.equal(mapAudioManifest({ segments: { "opt:1": "/storage/a.mp3" } }), null, "a manifest without the stem clip is unusable");
assert.equal(mapAudioManifest({ segments: { q: "javascript:alert(1)" } }), null, "non-http(s)/relative URLs are dropped");
assert.equal(mapAudioManifest({ segments: { q: "//evil.example/x.mp3" } }), null, "protocol-relative URLs are dropped");
const audio = mapAudioManifest({
  version: "v1",
  segments: {
    q: "/storage/q.mp3", alt: "/storage/alt.mp3",
    "opt:1": "/storage/o1.mp3", "opt:2": "/storage/o2.mp3", "opt:3": "/storage/o3.mp3",
    "left:l0": "/storage/l0.mp3", "left:l1": "/storage/l1.mp3", "right:r0": "/storage/r0.mp3", "right:r1": "/storage/r1.mp3",
    "tok:1": "/storage/t1.mp3", "tok:2": "/storage/t2.mp3",
    "clue:1": "/storage/c1.mp3",
  },
  system: {
    options: "/s/options.mp3", option_1: "/s/o1.mp3", option_2: "/s/o2.mp3", option_3: "/s/o3.mp3", picture: "/s/pic.mp3",
    col_first: "/s/c1.mp3", col_second: "/s/c2.mp3", ordering_bank: "/s/bank.mp3", tf_choices: "/s/tf.mp3", clue_1: "/s/cl1.mp3",
  },
})!;
assert.ok(audio);
const ids = (steps: { id: string }[]) => steps.map((s) => s.id);

// --- reading order follows the SCREEN order (options are shuffled on screen) --
const shuffled = [
  { key: "opt:3", group: "options" as const },
  { key: "opt:1", group: "options" as const },
  { key: "opt:2", group: "options" as const },
];
assert.deepEqual(
  ids(buildReadingPlan({ gameType: "mcq", audio, layout: shuffled, imageShown: false })),
  ["q", "sys:options", "sys:option_1", "opt:3", "sys:option_2", "opt:1", "sys:option_3", "opt:2"],
);

// Image description is read only when the picture is actually shown.
assert.deepEqual(ids(buildReadingPlan({ gameType: "mcq", audio, layout: [], imageShown: true })), ["q", "alt"]);
assert.deepEqual(ids(buildReadingPlan({ gameType: "mcq", audio, layout: [], imageShown: false })), ["q"]);

// True/false reads the stem and the fixed "true or false" prompt.
assert.deepEqual(ids(buildReadingPlan({ gameType: "true_false", audio, layout: [], imageShown: false })), ["q", "sys:tf_choices"]);

// Matching: first column then second column, each in on-screen order.
assert.deepEqual(
  ids(buildReadingPlan({
    gameType: "matching_pairs", audio, imageShown: false,
    layout: [
      { key: "left:l0", group: "left" }, { key: "left:l1", group: "left" },
      { key: "right:r1", group: "right" }, { key: "right:r0", group: "right" },
    ],
  })),
  ["q", "sys:col_first", "left:l0", "left:l1", "sys:col_second", "right:r1", "right:r0"],
);

// Ordering: only the tokens still in the bank, in bank order.
assert.deepEqual(
  ids(buildReadingPlan({ gameType: "ordering", audio, imageShown: false, layout: [{ key: "tok:2", group: "tokens" }] })),
  ["q", "sys:ordering_bank", "tok:2"],
);

// Crossword: numbered clues.
assert.deepEqual(
  ids(buildReadingPlan({ gameType: "crossword", audio, imageShown: false, layout: [{ key: "clue:1", group: "clues" }] })),
  ["q", "sys:clue_1", "clue:1"],
);

// A picture-only option has no clip: say "picture" instead of staying silent.
assert.deepEqual(
  ids(buildReadingPlan({ gameType: "mcq", audio, imageShown: false, layout: [{ key: "opt:9", group: "options", pictureOnly: true }] })),
  ["q", "sys:options", "sys:option_1", "sys:picture"],
);

// No manifest -> nothing to play.
assert.deepEqual(buildReadingPlan({ gameType: "mcq", audio: null, layout: shuffled, imageShown: true }), []);

// The explanation clip comes only from the answer feedback.
assert.equal(mapExplanationAudio({}), null);
assert.equal(mapExplanationAudio({ explanation_audio_url: "/storage/e.mp3" }), "/storage/e.mp3");
assert.equal(mapExplanationAudio({ explanation_audio_url: "javascript:1" }), null);

// --- queue: sequencing, stopping, skipping, and no autoplay -----------------
class FakeAudio implements AudioLike {
  static instances: FakeAudio[] = [];
  src = "";
  preload = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  played: string[] = [];
  paused = 0;
  constructor() { FakeAudio.instances.push(this); }
  play() { this.played.push(this.src); return Promise.resolve(); }
  pause() { this.paused += 1; }
}

async function tick(ms = 5) { await new Promise((resolve) => setTimeout(resolve, ms)); }

(async () => {
  const snapshots: QueueSnapshot[] = [];
  const queue = createAudioQueue({ createAudio: () => new FakeAudio(), onChange: (s) => snapshots.push(s), gapMs: 1 });

  assert.equal(FakeAudio.instances.length, 0, "creating the queue must not create or start any audio");

  queue.play([{ id: "a", url: "/a.mp3" }, { id: "b", url: "/b.mp3" }, { id: "c", url: "/c.mp3" }]);
  const player = FakeAudio.instances[0]!;
  assert.deepEqual(player.played, ["/a.mp3"]);
  player.onended?.(); await tick();
  assert.deepEqual(player.played, ["/a.mp3", "/b.mp3"], "next clip starts after the previous one ends, on the same element");
  assert.equal(FakeAudio.instances.length, 1, "one element is reused for the whole sequence");

  // Stop mid-way: nothing further plays, and a late 'ended' is ignored.
  const lateEnd = player.onended;
  queue.stop();
  lateEnd?.(); await tick();
  assert.deepEqual(player.played, ["/a.mp3", "/b.mp3"]);
  assert.deepEqual(snapshots.at(-1), { state: "idle", currentId: null });

  // A new question's reading replaces whatever was playing.
  queue.play([{ id: "x", url: "/x.mp3" }, { id: "y", url: "/y.mp3" }]);
  assert.equal(player.played.at(-1), "/x.mp3");
  queue.play([{ id: "z", url: "/z.mp3" }]);
  assert.equal(player.played.at(-1), "/z.mp3");
  player.onended?.(); await tick();
  assert.equal(snapshots.at(-1)?.state, "idle", "finishing the last clip returns to idle");
  assert.ok(!player.played.includes("/y.mp3"), "the replaced sequence never continues");

  // A broken clip is skipped, not fatal.
  queue.play([{ id: "bad", url: "/bad.mp3" }, { id: "ok", url: "/ok.mp3" }]);
  player.onerror?.(); await tick();
  assert.equal(player.played.at(-1), "/ok.mp3");

  // Autoplay blocked by the browser -> error state, not a crash.
  const blocked = createAudioQueue({
    createAudio: () => Object.assign(new FakeAudio(), { play: () => Promise.reject(new Error("NotAllowedError")) }),
    onChange: (s) => snapshots.push(s),
    gapMs: 1,
  });
  blocked.play([{ id: "q", url: "/q.mp3" }]);
  await tick();
  assert.equal(snapshots.at(-1)?.state, "error");

  console.log("Question audio: reading order (shuffled MCQ, matching columns, ordering bank, crosswords, picture-only), URL hygiene, queue sequencing/stop/skip/blocked-autoplay passed.");
})();
