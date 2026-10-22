/**
 * Self-running verification for src/lib/offline/answerGrading.ts - the client-side
 * mirror of raqeem-api's 6 PHP answer graders. Exercises every game type with both a
 * correct and a wrong answer, plus the edge cases called out in that file's own doc
 * comment (matching_pairs label equivalence for interchangeable text options, crossword
 * trim-only comparison with no Arabic normalization).
 * Run: npx tsx scripts/verify-offline-grading.ts
 */
import assert from "node:assert/strict";
import { isAnswerCorrect } from "../src/lib/offline/answerGrading";

let passed = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (error) {
    console.error(`  ✗ ${label}`);
    throw error;
  }
}

console.log("Offline answer grading (mirrors the 6 server-side PHP graders)");

check("mcq: correct option id matches, as strings", () => {
  assert.equal(isAnswerCorrect("mcq", {}, { correct_option_id: "a" }, { selected_option_id: "a" }), true);
  assert.equal(isAnswerCorrect("mcq", {}, { correct_option_id: 2 }, { selected_option_id: "2" }), true);
});
check("mcq: wrong option, missing selection, missing key", () => {
  assert.equal(isAnswerCorrect("mcq", {}, { correct_option_id: "a" }, { selected_option_id: "b" }), false);
  assert.equal(isAnswerCorrect("mcq", {}, { correct_option_id: "a" }, {}), false);
  assert.equal(isAnswerCorrect("mcq", {}, {}, { selected_option_id: "a" }), false);
});

check("true_false: exact boolean match only", () => {
  assert.equal(isAnswerCorrect("true_false", {}, { correct_answer: true }, { answer: true }), true);
  assert.equal(isAnswerCorrect("true_false", {}, { correct_answer: false }, { answer: false }), true);
  assert.equal(isAnswerCorrect("true_false", {}, { correct_answer: true }, { answer: false }), false);
});
check("true_false: non-boolean selection never matches, even if truthy", () => {
  assert.equal(isAnswerCorrect("true_false", {}, { correct_answer: true }, { answer: "true" }), false);
  assert.equal(isAnswerCorrect("true_false", {}, { correct_answer: true }, { answer: 1 }), false);
});

const matchingPayload = {
  right_items: [
    { id: "r1", text: "Apple" },
    { id: "r2", text: "Apple" }, // interchangeable with r1 - same trimmed text, no image
    { id: "r3", text: "Banana" },
    { id: "r4", image_url: "/banana.png" }, // image rights are only ever equal to themselves
  ],
};
const matchingAnswerKey = { correct_matches: { l1: "r1", l2: "r3", l3: "r4" } };
check("matching_pairs: exact correct mapping", () => {
  assert.equal(
    isAnswerCorrect("matching_pairs", matchingPayload, matchingAnswerKey, { matches: { l1: "r1", l2: "r3", l3: "r4" } }),
    true
  );
});
check("matching_pairs: a different right id with identical label is still correct", () => {
  // r2 has the same trimmed text as r1 ("Apple") - the grader compares labels, not ids.
  assert.equal(
    isAnswerCorrect("matching_pairs", matchingPayload, matchingAnswerKey, { matches: { l1: "r2", l2: "r3", l3: "r4" } }),
    true
  );
});
check("matching_pairs: image rights never match by label equivalence", () => {
  assert.equal(
    isAnswerCorrect("matching_pairs", matchingPayload, matchingAnswerKey, { matches: { l1: "r1", l2: "r3", l3: "r1" } }),
    false
  );
});
check("matching_pairs: reusing the same right id twice is rejected", () => {
  assert.equal(
    isAnswerCorrect("matching_pairs", matchingPayload, matchingAnswerKey, { matches: { l1: "r1", l2: "r1", l3: "r4" } }),
    false
  );
});
check("matching_pairs: incomplete selection is rejected", () => {
  assert.equal(isAnswerCorrect("matching_pairs", matchingPayload, matchingAnswerKey, { matches: { l1: "r1" } }), false);
});

check("drag_classify: every item assigned to its correct category", () => {
  const key = { correct_assignments: { item1: "cat_a", item2: "cat_b" } };
  assert.equal(isAnswerCorrect("drag_classify", {}, key, { assignments: { item1: "cat_a", item2: "cat_b" } }), true);
  assert.equal(isAnswerCorrect("drag_classify", {}, key, { assignments: { item1: "cat_a", item2: "cat_a" } }), false);
  assert.equal(isAnswerCorrect("drag_classify", {}, key, { assignments: { item1: "cat_a" } }), false);
});

check("crossword: trim-only comparison, no Arabic normalization", () => {
  const key = { correct_answers: { w1: "قطة", w2: "  مدرسة  " } };
  assert.equal(isAnswerCorrect("crossword", {}, key, { answers: { w1: "قطة", w2: "مدرسة" } }), true);
  // Leading/trailing whitespace on the submitted side is also trimmed away.
  assert.equal(isAnswerCorrect("crossword", {}, key, { answers: { w1: "  قطة  ", w2: "مدرسة" } }), true);
  // A diacritic-only variant is NOT normalized away - this must disagree, matching PHP.
  assert.equal(isAnswerCorrect("crossword", {}, key, { answers: { w1: "قطّة", w2: "مدرسة" } }), false);
});

check("ordering: exact sequence, same length, same order", () => {
  const key = { correct_order: [3, 1, 2] };
  assert.equal(isAnswerCorrect("ordering", {}, key, { order: [3, 1, 2] }), true);
  assert.equal(isAnswerCorrect("ordering", {}, key, { order: ["3", "1", "2"] }), true);
  assert.equal(isAnswerCorrect("ordering", {}, key, { order: [1, 3, 2] }), false);
  assert.equal(isAnswerCorrect("ordering", {}, key, { order: [3, 1] }), false);
});

check("unknown game type is always wrong, never throws", () => {
  assert.equal(isAnswerCorrect("unknown_type", {}, {}, {}), false);
});

console.log(`\n${passed} checks passed.`);
