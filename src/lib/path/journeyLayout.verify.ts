/**
 * Unit Learning Journey layout/status verification.
 * Run: npx tsx src/lib/path/journeyLayout.verify.ts
 */

import assert from "node:assert/strict";
import {
  bindLessonIds,
  completedPathRatio,
  computeJourneyLayout,
  resolveLabelSide,
  smoothJourneyPath,
} from "./journeyLayout";
import {
  countCompleted,
  findFocusStationIndex,
  resolveJourneyStatuses,
  reviewStationStatus,
} from "./journeyStatus";
import type { PathStation } from "@/lib/api/units";
import { getLessonPathTheme, journeyVisualStage } from "@/lib/config/lessonPathThemes";

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

function station(
  lessonId: number,
  status: PathStation["status"],
  sortOrder: number,
  isFinale = false
): PathStation {
  return {
    lessonId,
    title: `L${lessonId}`,
    sortOrder,
    status,
    stars: status === "completed" ? 2 : null,
    isFinale,
  };
}

console.log("\nUnit Learning Journey\n");

check("first lesson is lower on the map than the last", () => {
  const layout = computeJourneyLayout(4, 390);
  const lessons = layout.nodes.filter((n) => n.kind === "lesson");
  assert.equal(lessons.length, 4);
  assert.ok((lessons[0]?.yPx ?? 0) > (lessons[3]?.yPx ?? 0));
});

check("review station sits above lessons", () => {
  const layout = computeJourneyLayout(3, 800);
  const review = layout.nodes.find((n) => n.kind === "review");
  const lastLesson = layout.nodes.filter((n) => n.kind === "lesson").at(-1);
  assert.ok(review && lastLesson);
  assert.ok(review.yPx < lastLesson.yPx);
});

check("lesson order is preserved when binding ids", () => {
  const layout = bindLessonIds(computeJourneyLayout(3, 400), [10, 20, 30]);
  const ids = layout.nodes.filter((n) => n.kind === "lesson").map((n) => n.lessonId);
  assert.deepEqual(ids, [10, 20, 30]);
});

check("statuses: completed / current / available / locked", () => {
  const stations = [
    station(1, "completed", 1),
    station(2, "available", 2),
    station(3, "available", 3),
    station(4, "locked", 4),
  ];
  assert.deepEqual(resolveJourneyStatuses(stations), ["completed", "current", "available", "locked"]);
});

check("focus picks current lesson", () => {
  const stations = [station(1, "completed", 1), station(2, "available", 2), station(3, "locked", 3)];
  const statuses = resolveJourneyStatuses(stations);
  assert.equal(findFocusStationIndex(stations, statuses), 1);
});

check("focus moves to review when all lessons completed", () => {
  const stations = [station(1, "completed", 1), station(2, "completed", 2)];
  const statuses = resolveJourneyStatuses(stations);
  assert.equal(findFocusStationIndex(stations, statuses), 2);
});

check("review stays locked until all lessons done", () => {
  const stations = [station(1, "completed", 1), station(2, "available", 2)];
  assert.equal(reviewStationStatus(stations), "locked");
  assert.equal(reviewStationStatus([station(1, "completed", 1), station(2, "completed", 2)]), "available");
});

check("frontend never invents points — countCompleted only reflects backend statuses", () => {
  const stations = [station(1, "completed", 1), station(2, "locked", 2)];
  assert.equal(countCompleted(stations), 1);
});

check("SVG path is a smooth curve string", () => {
  const layout = computeJourneyLayout(5, 390);
  const d = smoothJourneyPath(layout.pathPoints);
  assert.ok(d.startsWith("M "));
  assert.ok(d.includes(" C "));
});

check("completed path ratio is within 0–1", () => {
  assert.equal(completedPathRatio(0, 4), 0);
  assert.ok(completedPathRatio(4, 4) <= 1);
  assert.ok(completedPathRatio(2, 4) > 0);
});

check("visual stage does not affect lock logic", () => {
  assert.equal(journeyVisualStage(0, 6), "starting");
  assert.equal(journeyVisualStage(3, 6), "progressing");
  assert.equal(journeyVisualStage(5, 6), "near_completion");
  assert.equal(journeyVisualStage(6, 6), "completed");
});

check("theme lookup does not throw for any subject id", () => {
  for (let id = 1; id <= 7; id++) {
    const theme = getLessonPathTheme(id);
    assert.ok(theme.softGradient.includes("linear-gradient"));
    assert.ok(theme.accentColor.startsWith("#"));
  }
});

check("mobile pattern keeps nodes inside horizontal bounds", () => {
  const layout = computeJourneyLayout(8, 360);
  for (const node of layout.nodes) {
    assert.ok(node.xPct >= 28 && node.xPct <= 72);
  }
});

check("start marker sits below first lesson", () => {
  const layout = computeJourneyLayout(8, 390);
  const start = layout.nodes.find((n) => n.kind === "start");
  const first = layout.nodes.find((n) => n.kind === "lesson" && n.lessonIndex === 0);
  assert.ok(start && first);
  assert.ok(start.yPx > first.yPx);
});

check("review node sits above last lesson with clearance", () => {
  const layout = computeJourneyLayout(8, 390);
  const review = layout.nodes.find((n) => n.kind === "review");
  const last = layout.nodes.filter((n) => n.kind === "lesson").at(-1);
  assert.ok(review && last);
  assert.ok(review.yPx < last.yPx - 20);
});

check("label side prefers room away from path edges", () => {
  assert.equal(resolveLabelSide(66), "left");
  assert.equal(resolveLabelSide(34), "right");
});

check("vertical step stays within balanced bounds for 8–15 lessons", () => {
  const eight = computeJourneyLayout(8, 390);
  const fifteen = computeJourneyLayout(15, 390);
  assert.ok(eight.verticalStep >= 145 && eight.verticalStep <= 165);
  assert.ok(fifteen.verticalStep >= 145 && fifteen.verticalStep <= 165);
});

console.log(`\n${passed} checks passed.\n`);
