/**
 * Self-running verification for headquarters stage selectors + asset readiness.
 * Run: npm run test:hq
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOCTOR_STAGES,
  getHeadquartersStageImage,
  getNextRequiredItem,
  getNextStage,
  getStorePathForProfession,
  isHqAssetReady,
  makeItemKey,
  resolveHeadquartersStage,
  stageHasAssets,
  validateHeadquartersStages,
} from "./headquartersStages";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const publicDir = path.join(root, "public");

function publicExists(urlPath: string): boolean {
  return existsSync(path.join(publicDir, urlPath.replace(/^\//, "")));
}

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

check("doctor has stages 0–12 contiguous", () => {
  assert.equal(DOCTOR_STAGES.length, 13);
  assert.deepEqual(
    DOCTOR_STAGES.map((s) => s.stage),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  );
});

check("itemKey and storeSlotKey uniqueness", () => {
  assert.equal(makeItemKey("doctor", "heartbeat-rug"), "doctor_heartbeat_rug");
  assert.equal(DOCTOR_STAGES[1].storeSlotKey, "heartbeat_rug");
  assert.notEqual(DOCTOR_STAGES[1].itemKey, DOCTOR_STAGES[1].storeSlotKey);
});

check("stage 0 student sees empty room and rug as next when assets ready", () => {
  assert.ok(isHqAssetReady("doctor", 0));
  assert.ok(isHqAssetReady("doctor", 1));
  const resolved = resolveHeadquartersStage([], "doctor");
  assert.equal(resolved.currentStage, 0);
  assert.equal(resolved.stage.stageImage, "/images/headquarters/doctor/stages/stage-00-empty.png");
  assert.equal(resolved.nextRequiredStoreSlotKey, "heartbeat_rug");
});

check("after owning heartbeat_rug, stage becomes 1", () => {
  const resolved = resolveHeadquartersStage(["heartbeat_rug"], "doctor");
  assert.equal(resolved.currentStage, 1);
  assert.equal(
    getHeadquartersStageImage(["heartbeat_rug"], "doctor"),
    "/images/headquarters/doctor/stages/stage-01-heartbeat-rug.png"
  );
});

check("stage 2 is not offered while assets missing", () => {
  assert.equal(isHqAssetReady("doctor", 2), false);
  const resolved = resolveHeadquartersStage(["heartbeat_rug"], "doctor");
  assert.equal(resolved.nextStage, null);
  assert.equal(resolved.nextRequiredStoreSlotKey, null);
  assert.equal(resolved.nextStagePendingAssets, true);
  assert.equal(getNextRequiredItem(["heartbeat_rug"], "doctor"), null);
});

check("enabled disk assets for stages 0 and 1 exist", () => {
  for (const stage of DOCTOR_STAGES.filter((s) => s.stage <= 1)) {
    assert.ok(publicExists(stage.stageImage), stage.stageImage);
    if (stage.itemImage) assert.ok(publicExists(stage.itemImage), stage.itemImage);
    assert.ok(stageHasAssets(stage));
  }
});

check("doctor store path lists all 12 purchase keys", () => {
  const pathKeys = getStorePathForProfession("doctor");
  assert.equal(pathKeys.length, 12);
  assert.equal(pathKeys[0], "heartbeat_rug");
  assert.equal(pathKeys[1], "doctor_desk");
  assert.equal(pathKeys[11], "achievement_shelf");
});

check("other professions do not expose doctor path", () => {
  assert.deepEqual(getStorePathForProfession("engineer"), []);
  assert.equal(getNextStage([], "engineer"), null);
});

check("non-path ownership does not advance stage", () => {
  assert.equal(resolveHeadquartersStage(["stethoscope"], "doctor").currentStage, 0);
});

check("cannot skip: owning desk without rug stays at 0", () => {
  assert.equal(resolveHeadquartersStage(["doctor_desk"], "doctor").currentStage, 0);
});

check("refresh-safe ownership mapping", () => {
  const a = resolveHeadquartersStage(["heartbeat_rug"], "doctor");
  const b = resolveHeadquartersStage(["heartbeat_rug"], "doctor");
  assert.equal(a.currentStage, b.currentStage);
});

console.log(`\n${passed} checks passed.`);
