/**
 * Static HQ stage catalog (no asset-readiness imports).
 * Editable source of truth: headquartersPaths.data.json (bot can update it).
 * Prices live in StoreItem; readiness comes from sync:hq.
 */

import { type ProfessionCode } from "@/lib/config/professions";
import pathsData from "@/lib/config/headquartersPaths.data.json";

export const HQ_STAGE_WIDTH = 1024;
export const HQ_STAGE_HEIGHT = 682;
export const DOCTOR_ROOM_NUMBER = 1;

export type HeadquartersItemKey = string;

export type HeadquartersToolRow = {
  slug: string;
  slot: string;
  nameAr: string;
  descriptionAr: string;
};

export type HeadquartersPathData = {
  labelsAr: Record<string, string>;
  paths: Record<
    string,
    {
      roomNumber: number;
      tools: HeadquartersToolRow[];
    }
  >;
};

export type HeadquartersStageDefinition = {
  profession: ProfessionCode;
  roomNumber: number;
  stage: number;
  itemKey: HeadquartersItemKey | null;
  itemSlug: string | null;
  storeSlotKey: string | null;
  nameAr: string | null;
  descriptionAr: string | null;
  itemImage: string | null;
  stageImage: string;
  width: number;
  height: number;
};

export const HQ_PATHS_DATA = pathsData as HeadquartersPathData;

export const PROFESSION_LABELS_AR: Record<ProfessionCode, string> = {
  doctor: HQ_PATHS_DATA.labelsAr.doctor,
  engineer: HQ_PATHS_DATA.labelsAr.engineer,
  teacher: HQ_PATHS_DATA.labelsAr.teacher,
  chef: HQ_PATHS_DATA.labelsAr.chef,
  astronaut: HQ_PATHS_DATA.labelsAr.astronaut,
  soldier: HQ_PATHS_DATA.labelsAr.soldier,
};

function padStage(stage: number): string {
  return String(stage).padStart(2, "0");
}

export function stagePath(
  profession: ProfessionCode,
  stage: number,
  itemSlug: string | null
): string {
  const n = padStage(stage);
  if (stage === 0 || !itemSlug) {
    return `/images/headquarters/${profession}/stages/stage-${n}-empty.png`;
  }
  return `/images/headquarters/${profession}/stages/stage-${n}-${itemSlug}.png`;
}

export function itemPath(profession: ProfessionCode, stage: number, itemSlug: string): string {
  return `/images/headquarters/${profession}/items/item-${padStage(stage)}-${itemSlug}.png`;
}

export function makeItemKey(profession: ProfessionCode, itemSlug: string): HeadquartersItemKey {
  return `${profession}_${itemSlug.replace(/-/g, "_")}`;
}

function stageDef(
  profession: ProfessionCode,
  roomNumber: number,
  stage: number,
  itemSlug: string | null,
  storeSlotKey: string | null,
  nameAr: string | null,
  descriptionAr: string | null
): HeadquartersStageDefinition {
  return {
    profession,
    roomNumber,
    stage,
    itemKey: itemSlug ? makeItemKey(profession, itemSlug) : null,
    itemSlug,
    storeSlotKey,
    nameAr,
    descriptionAr,
    itemImage: itemSlug ? itemPath(profession, stage, itemSlug) : null,
    stageImage: stagePath(profession, stage, itemSlug),
    width: HQ_STAGE_WIDTH,
    height: HQ_STAGE_HEIGHT,
  };
}

export function buildStagesForProfession(
  profession: ProfessionCode,
  data: HeadquartersPathData = HQ_PATHS_DATA
): HeadquartersStageDefinition[] {
  const path = data.paths[profession];
  if (!path) return [];
  const roomNumber = path.roomNumber || 1;
  const rows: HeadquartersStageDefinition[] = [
    stageDef(profession, roomNumber, 0, null, null, null, null),
  ];
  path.tools.forEach((tool, index) => {
    const stage = index + 1;
    rows.push(
      stageDef(
        profession,
        roomNumber,
        stage,
        tool.slug,
        tool.slot,
        tool.nameAr,
        tool.descriptionAr
      )
    );
  });
  return rows;
}

export const DOCTOR_STAGES = buildStagesForProfession("doctor");
export const ENGINEER_STAGES = buildStagesForProfession("engineer");
export const TEACHER_STAGES = buildStagesForProfession("teacher");
export const CHEF_STAGES = buildStagesForProfession("chef");
export const ASTRONAUT_STAGES = buildStagesForProfession("astronaut");
export const SOLDIER_STAGES = buildStagesForProfession("soldier");

export const HEADQUARTERS_STAGES_BY_PROFESSION: Record<
  ProfessionCode,
  HeadquartersStageDefinition[]
> = {
  doctor: DOCTOR_STAGES,
  engineer: ENGINEER_STAGES,
  teacher: TEACHER_STAGES,
  chef: CHEF_STAGES,
  astronaut: ASTRONAUT_STAGES,
  soldier: SOLDIER_STAGES,
};
