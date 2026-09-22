import fs from "node:fs";
import path from "node:path";
import {
  mapJourneyDashboard,
  mockJourneyDashboard,
  type DailyGoalTarget,
} from "../src/lib/api/journeyDashboard";

const root = process.cwd();
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

const dash = mockJourneyDashboard(9001);
assert(dash.today.targetLessons === 3, "default mock target is 3");
assert(dash.today.completedLessons === 1, "mock has one completed lesson");
assert(dash.nextLesson?.id === 91004, "mock next lesson present");
assert(dash.suggestedLessons.length === 3, "mock has 3 suggestions");
assert(dash.suggestedLessons.every((s) => s.id !== dash.nextLesson?.id), "suggestions exclude next lesson");
assert(dash.smartReviewAvailable === false, "AI review stays false");
assert(Boolean(dash.nextHeadquartersItem), "mock HQ item present");

const noStore = mapJourneyDashboard({
  ...{
    child: { id: 1, name: "A", points_balance: 0 },
    today: { date: "2026-09-21", target_lessons: 3, completed_lessons: 0, goal_completed: false, exceeded_by: 0 },
    suggested_lessons: [],
    next_headquarters_item: null,
    headquarters_completed: false,
    smart_review_available: false,
  },
});
assert(noStore != null && noStore.nextHeadquartersItem === undefined, "partial store failure maps to missing HQ item");

for (const target of [1, 3, 5, 7] as DailyGoalTarget[]) {
  const mapped = mapJourneyDashboard({
    child: { id: 2, name: "B", points_balance: 1 },
    today: {
      date: "2026-09-21",
      target_lessons: target,
      completed_lessons: 3,
      goal_completed: 3 >= target,
      exceeded_by: Math.max(0, 3 - target),
    },
    suggested_lessons: [],
    headquarters_completed: false,
    smart_review_available: false,
  });
  assert(mapped?.today.targetLessons === target, `maps target ${target}`);
}

const invalid = mapJourneyDashboard({ child: { id: 0 }, today: {} });
assert(invalid === null, "rejects invalid dashboard payload");

const page = fs.readFileSync(path.join(root, "src/app/[locale]/(student)/home/page.tsx"), "utf8");
assert(page.includes("StudentJourneyDashboard"), "home page renders StudentJourneyDashboard");
assert(!page.includes("ComingSoonScreen"), "home page no longer uses ComingSoon");

const nav = fs.readFileSync(path.join(root, "messages/ar.json"), "utf8");
assert(nav.includes('"home": "رحلتي"'), "Arabic nav label is رحلتي");
const en = fs.readFileSync(path.join(root, "messages/en.json"), "utf8");
assert(en.includes('"home": "My Journey"'), "English nav label is My Journey");
assert(en.includes('"journeyDashboard"'), "en messages include journeyDashboard");
assert(nav.includes('"journeyDashboard"'), "ar messages include journeyDashboard");

assert(fs.existsSync(path.join(root, "src/components/journey/StudentJourneyDashboard.tsx")), "dashboard component exists");
assert(fs.existsSync(path.join(root, "src/hooks/useStudentJourneyDashboard.ts")), "dashboard hook exists");
assert(fs.existsSync(path.join(root, "src/app/api/students/[id]/journey-dashboard/route.ts")), "dashboard BFF exists");
assert(fs.existsSync(path.join(root, "src/app/api/students/[id]/daily-goal/route.ts")), "daily-goal BFF exists");

const component = fs.readFileSync(
  path.join(root, "src/components/journey/StudentJourneyDashboard.tsx"),
  "utf8"
);
assert(component.includes("DailyGoalPicker"), "goal picker present");
assert(
  !component.includes('className="journey-dash '),
  "dashboard root does not reuse the non-interactive decorative journey-dash class"
);
assert(component.includes("smartReviewAvailable") === false || !component.includes("AI حلل"), "no fake AI copy");
assert(component.includes("goStore"), "store CTA present");
assert(!component.includes("purchase("), "no purchase action in journey screen");

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll student-journey checks passed.");
