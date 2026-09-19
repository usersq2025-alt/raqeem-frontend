/**
 * Headquarters stage selectors — catalog + asset readiness + ownership resolution.
 */

import {
  DOCTOR_ROOM_NUMBER,
  DOCTOR_STAGES,
  HEADQUARTERS_STAGES_BY_PROFESSION,
  HQ_STAGE_HEIGHT,
  HQ_STAGE_WIDTH,
  itemPath,
  makeItemKey,
  stagePath,
  type HeadquartersItemKey,
  type HeadquartersStageDefinition,
} from "@/lib/config/headquartersStages.catalog";
import {
  HQ_READY_ASSET_KEYS,
  isHqAssetReady,
} from "@/lib/config/generated/hqAssets.generated";
import {
  PROFESSION_CODES,
  type ProfessionCode,
  isProfessionCode,
} from "@/lib/config/professions";

export {
  DOCTOR_ROOM_NUMBER,
  DOCTOR_STAGES,
  HEADQUARTERS_STAGES_BY_PROFESSION,
  HQ_STAGE_HEIGHT,
  HQ_STAGE_WIDTH,
  itemPath,
  makeItemKey,
  stagePath,
  HQ_READY_ASSET_KEYS,
  isHqAssetReady,
  PROFESSION_CODES,
  isProfessionCode,
};
export type { HeadquartersItemKey, HeadquartersStageDefinition, ProfessionCode };

export type ResolvedHeadquartersStage = {
  profession: ProfessionCode;
  roomNumber: number;
  currentStage: number;
  maxReadyStage: number;
  progressLabel: { current: number; total: number };
  stage: HeadquartersStageDefinition;
  nextRequiredStoreSlotKey: string | null;
  nextStage: HeadquartersStageDefinition | null;
  /** True when the sequential next stage exists but assets are not ready yet. */
  nextStagePendingAssets: boolean;
  ownedPathSlotKeys: string[];
};

export function getStagesForProfession(
  profession: string | null | undefined
): HeadquartersStageDefinition[] {
  if (!isProfessionCode(profession)) return [];
  return HEADQUARTERS_STAGES_BY_PROFESSION[profession] ?? [];
}

export function findStageByNumber(
  profession: string | null | undefined,
  stageNumber: number
): HeadquartersStageDefinition | null {
  return getStagesForProfession(profession).find((s) => s.stage === stageNumber) ?? null;
}

export function stageHasAssets(stage: HeadquartersStageDefinition): boolean {
  return isHqAssetReady(stage.profession, stage.stage);
}

export function getStorePathForProfession(profession: string | null | undefined): string[] {
  return getStagesForProfession(profession)
    .filter((s) => s.stage > 0 && s.storeSlotKey)
    .sort((a, b) => a.stage - b.stage)
    .map((s) => s.storeSlotKey as string);
}

export function getCurrentStageNumber(
  ownedStoreSlotKeys: Iterable<string>,
  profession: string | null | undefined
): number {
  return resolveHeadquartersStage(ownedStoreSlotKeys, profession).currentStage;
}

export function getNextStage(
  ownedStoreSlotKeys: Iterable<string>,
  profession: string | null | undefined
): HeadquartersStageDefinition | null {
  return resolveHeadquartersStage(ownedStoreSlotKeys, profession).nextStage;
}

export function getNextRequiredItem(
  ownedStoreSlotKeys: Iterable<string>,
  profession: string | null | undefined
): string | null {
  return resolveHeadquartersStage(ownedStoreSlotKeys, profession).nextRequiredStoreSlotKey;
}

export function getHeadquartersStageImage(
  ownedStoreSlotKeys: Iterable<string>,
  profession: string | null | undefined
): string | null {
  const resolved = resolveHeadquartersStage(ownedStoreSlotKeys, profession);
  if (!resolved.stage) return null;
  return pickStageImageWithFallback(resolved.stage, getStagesForProfession(profession));
}

export function pickStageImageWithFallback(
  stage: HeadquartersStageDefinition,
  allStages: HeadquartersStageDefinition[]
): string {
  return getFallbackStageImage(stage.stage, allStages) ?? stage.stageImage;
}

export function getFallbackStageImage(
  stageNumber: number,
  allStages: HeadquartersStageDefinition[]
): string | null {
  for (let n = stageNumber; n >= 0; n--) {
    const found = allStages.find((s) => s.stage === n);
    if (found?.stageImage) return found.stageImage;
  }
  return null;
}

export function resolveHeadquartersStage(
  ownedStoreSlotKeys: Iterable<string>,
  profession: string | null | undefined
): ResolvedHeadquartersStage {
  const stages = getStagesForProfession(profession);
  const code = isProfessionCode(profession) ? profession : ("doctor" as ProfessionCode);
  const owned = new Set(
    [...ownedStoreSlotKeys].filter((key): key is string => typeof key === "string" && key.length > 0)
  );

  const ordered = [...stages].sort((a, b) => a.stage - b.stage);
  let currentStage = 0;

  for (const entry of ordered) {
    if (entry.stage === 0) continue;
    if (!entry.storeSlotKey) break;
    if (!owned.has(entry.storeSlotKey)) break;
    currentStage = entry.stage;
  }

  const stage =
    ordered.find((s) => s.stage === currentStage) ??
    ordered[0] ??
    ({
      profession: code,
      roomNumber: DOCTOR_ROOM_NUMBER,
      stage: 0,
      itemKey: null,
      itemSlug: null,
      storeSlotKey: null,
      nameAr: null,
      descriptionAr: null,
      itemImage: null,
      stageImage: stagePath(code, 0, null),
      width: HQ_STAGE_WIDTH,
      height: HQ_STAGE_HEIGHT,
    } satisfies HeadquartersStageDefinition);

  const candidateNext =
    ordered.find((s) => s.stage === currentStage + 1 && Boolean(s.storeSlotKey)) ?? null;
  const assetsReady = candidateNext ? stageHasAssets(candidateNext) : false;
  const nextStage = candidateNext && assetsReady ? candidateNext : null;

  const readyWithItems = ordered.filter((s) => s.stage > 0 && s.storeSlotKey && stageHasAssets(s));
  const maxReadyStage =
    readyWithItems.length > 0 ? Math.max(...readyWithItems.map((s) => s.stage)) : 0;

  const pathKeys = ordered
    .filter((s) => s.stage > 0 && s.storeSlotKey)
    .map((s) => s.storeSlotKey as string);

  return {
    profession: code,
    roomNumber: stage.roomNumber ?? DOCTOR_ROOM_NUMBER,
    currentStage,
    maxReadyStage,
    progressLabel: {
      current: currentStage,
      total: Math.max(maxReadyStage, pathKeys.length || 1),
    },
    stage,
    nextRequiredStoreSlotKey: nextStage?.storeSlotKey ?? null,
    nextStage,
    nextStagePendingAssets: Boolean(candidateNext && !assetsReady),
    ownedPathSlotKeys: pathKeys.filter((key) => owned.has(key)),
  };
}

export function validateHeadquartersStages(
  stagesByProfession: Record<
    ProfessionCode,
    HeadquartersStageDefinition[]
  > = HEADQUARTERS_STAGES_BY_PROFESSION
): string[] {
  const issues: string[] = [];
  const seenItemKeys = new Set<string>();
  const seenStoreSlots = new Set<string>();

  for (const profession of PROFESSION_CODES) {
    const stages = [...(stagesByProfession[profession] ?? [])].sort((a, b) => a.stage - b.stage);
    if (stages.length === 0) continue;

    const stageNumbers = new Set<number>();
    for (const s of stages) {
      if (stageNumbers.has(s.stage)) {
        issues.push(`${profession}: duplicate stage ${s.stage}`);
      }
      stageNumbers.add(s.stage);

      if (s.profession !== profession) {
        issues.push(`${profession}: stage ${s.stage} has mismatched profession`);
      }

      if (s.stage === 0) {
        if (s.itemKey || s.storeSlotKey) {
          issues.push(`${profession}: stage 0 must not have an item`);
        }
        continue;
      }

      if (!s.itemKey || !s.itemSlug || !s.storeSlotKey) {
        issues.push(`${profession}: stage ${s.stage} missing itemKey/itemSlug/storeSlotKey`);
      }

      if (s.itemKey) {
        if (seenItemKeys.has(s.itemKey)) {
          issues.push(`duplicate itemKey ${s.itemKey}`);
        }
        seenItemKeys.add(s.itemKey);
      }

      if (s.storeSlotKey) {
        if (seenStoreSlots.has(s.storeSlotKey)) {
          issues.push(`duplicate storeSlotKey ${s.storeSlotKey}`);
        }
        seenStoreSlots.add(s.storeSlotKey);
      }
    }

    const nums = stages.map((s) => s.stage).sort((a, b) => a - b);
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] !== nums[i - 1] + 1) {
        issues.push(`${profession}: stage gap between ${nums[i - 1]} and ${nums[i]}`);
      }
    }
  }

  return issues;
}

/** @deprecated */
export function isDoctorProfession(code: string | null | undefined): boolean {
  return code === "doctor";
}

/** @deprecated */
export function resolveDoctorHeadquartersStage(
  ownedSlotKeys: Iterable<string>
): ResolvedHeadquartersStage {
  return resolveHeadquartersStage(ownedSlotKeys, "doctor");
}

/** @deprecated */
export const DOCTOR_HEADQUARTERS_STAGES = DOCTOR_STAGES;

export const DOCTOR_HEARTBEAT_RUG_FALLBACK_PRICE = 6;
