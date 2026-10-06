/**
 * Self-running verification for headquarters stage selectors (non-doctor professions).
 * The doctor HQ is the 3D clinic and no longer uses stage images.
 * Run: npm run test:hq
 */

import assert from "node:assert/strict";
import {
  DOCTOR_STAGES,
  getNextRequiredItem,
  getStorePathForProfession,
  makeItemKey,
  resolveHeadquartersStage,
  validateHeadquartersStages,
} from "./headquartersStages";

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

console.log("Headquarters stage system");

check("config integrity has no issues", () => {
  assert.deepEqual(validateHeadquartersStages(), []);
});

check("doctor has no legacy stages (3D clinic replaces them)", () => {
  assert.equal(DOCTOR_STAGES.length, 1);
  assert.equal(getStorePathForProfession("doctor").length, 0);
});

check("itemKey helper", () => {
  assert.equal(makeItemKey("engineer", "drafting-table"), "engineer_drafting_table");
});

check("engineer path has five sequential tools", () => {
  const pathKeys = getStorePathForProfession("engineer");
  assert.equal(pathKeys.length, 5);
  assert.equal(pathKeys[0], "drafting_table");
  assert.equal(pathKeys[4], "teaching_robot_arm");
  assert.equal(getNextRequiredItem([], "engineer"), null); // assets not ready yet
});

check("non-path ownership does not advance stage", () => {
  assert.equal(resolveHeadquartersStage(["stethoscope"], "engineer").currentStage, 0);
});

console.log(`\n${passed} checks passed.`);