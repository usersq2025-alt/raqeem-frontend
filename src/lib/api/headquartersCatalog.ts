import { apiClient } from "@/lib/api/client";
import {
  HQ_STAGE_HEIGHT,
  HQ_STAGE_WIDTH,
  makeItemKey,
  type HeadquartersStageDefinition,
} from "@/lib/config/headquartersStages.catalog";
import type { ProfessionCode } from "@/lib/config/professions";
import { isProfessionCode } from "@/lib/config/professions";

export type RemoteHeadquartersStage = {
  stage: number;
  slug: string | null;
  slot_key: string | null;
  name_ar: string | null;
  description_ar: string | null;
  item_image_url: string | null;
  stage_image_url: string | null;
  price_points: number | null;
  ready: boolean;
};

export type RemoteHeadquartersCatalog = {
  profession: string;
  label_ar: string;
  stages: RemoteHeadquartersStage[];
  source: string;
};

const remoteByProfession = new Map<ProfessionCode, HeadquartersStageDefinition[]>();
const remoteReady = new Map<string, boolean>();

function readyKey(profession: ProfessionCode, stage: number): string {
  return `${profession}:${stage}`;
}

export function hasRemoteHeadquartersCatalog(profession: string | null | undefined): boolean {
  return isProfessionCode(profession) && remoteByProfession.has(profession);
}

export function getRemoteHeadquartersStages(
  profession: string | null | undefined
): HeadquartersStageDefinition[] | null {
  if (!isProfessionCode(profession)) return null;
  return remoteByProfession.get(profession) ?? null;
}

export function isRemoteHqAssetReady(profession: ProfessionCode, stage: number): boolean | null {
  if (!remoteByProfession.has(profession)) return null;
  const def = remoteByProfession.get(profession)?.find((s) => s.stage === stage);
  if (!def) return false;
  const urls = [def.stageImage, def.itemImage];
  const usesStorage = urls.some(
    (u) => typeof u === "string" && (u.includes("/storage/") || /^https?:\/\//.test(u))
  );
  // Static /images paths still use sync:hq local readiness.
  if (!usesStorage) return null;
  return remoteReady.get(readyKey(profession, stage)) ?? false;
}

export function applyRemoteHeadquartersCatalog(
  profession: ProfessionCode,
  stages: RemoteHeadquartersStage[]
): void {
  const mapped: HeadquartersStageDefinition[] = stages
    .slice()
    .sort((a, b) => a.stage - b.stage)
    .map((row) => {
      const slug = row.slug;
      remoteReady.set(readyKey(profession, row.stage), Boolean(row.ready));
      return {
        profession,
        roomNumber: 1,
        stage: row.stage,
        itemKey: slug ? makeItemKey(profession, slug) : null,
        itemSlug: slug,
        storeSlotKey: row.slot_key,
        nameAr: row.name_ar,
        descriptionAr: row.description_ar,
        itemImage: row.item_image_url,
        stageImage: row.stage_image_url || `/images/headquarters/${profession}/stages/stage-00-empty.png`,
        width: HQ_STAGE_WIDTH,
        height: HQ_STAGE_HEIGHT,
      } satisfies HeadquartersStageDefinition;
    });

  remoteByProfession.set(profession, mapped);
}

export async function fetchHeadquartersCatalog(
  profession: ProfessionCode
): Promise<RemoteHeadquartersCatalog | null> {
  try {
    const data = await apiClient.get<RemoteHeadquartersCatalog>(
      `/headquarters/catalog/${encodeURIComponent(profession)}`
    );
    if (!data || !Array.isArray(data.stages) || data.stages.length === 0) {
      return null;
    }
    applyRemoteHeadquartersCatalog(profession, data.stages);
    return data;
  } catch {
    return null;
  }
}
