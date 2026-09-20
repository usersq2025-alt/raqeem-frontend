/**
 * HQ catalog read/write for the local bot (JSON source of truth).
 */
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProfessionCode } from "../src/lib/config/professions";
import { PROFESSION_CODES } from "../src/lib/config/professions";
import {
  itemPath,
  stagePath,
  type HeadquartersPathData,
  type HeadquartersToolRow,
} from "../src/lib/config/headquartersStages.catalog";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const HQ_PATHS_JSON = path.join(
  ROOT,
  "src",
  "lib",
  "config",
  "headquartersPaths.data.json"
);

const BACKEND_ROOT = path.resolve(ROOT, "..", "raqeem");
const STORE_PROGRESSION_PHP = path.join(BACKEND_ROOT, "app", "Support", "StoreProgression.php");

function urlToDisk(urlPath: string): string {
  return path.join(ROOT, "public", urlPath.replace(/^\//, "").replace(/\//g, path.sep));
}

export function readPathsData(): HeadquartersPathData {
  return JSON.parse(readFileSync(HQ_PATHS_JSON, "utf8")) as HeadquartersPathData;
}

export function writePathsData(data: HeadquartersPathData): void {
  writeFileSync(HQ_PATHS_JSON, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function assertSlug(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) {
    throw new Error("الـ slug يجب أن يكون لاتينيًا صغيرًا مع شرطات فقط (مثل drafting-table)");
  }
  return s;
}

function slugToSlot(slug: string): string {
  return slug.replace(/-/g, "_");
}

export type CatalogToolView = HeadquartersToolRow & {
  stage: number;
  itemImage: string;
  stageImage: string;
};

export function listCatalogTools(profession: ProfessionCode): CatalogToolView[] {
  const data = readPathsData();
  const tools = data.paths[profession]?.tools ?? [];
  return tools.map((tool, i) => {
    const stage = i + 1;
    return {
      ...tool,
      stage,
      itemImage: itemPath(profession, stage, tool.slug),
      stageImage: stagePath(profession, stage, tool.slug),
    };
  });
}

export function saveProfessionTools(input: {
  profession: ProfessionCode;
  tools: Array<{ slug: string; nameAr: string; descriptionAr: string; slot?: string }>;
  labelAr?: string;
}): { tools: CatalogToolView[]; backendSynced: boolean; warnings: string[] } {
  const profession = input.profession;
  if (!PROFESSION_CODES.includes(profession)) {
    throw new Error(`مهنة غير معروفة: ${profession}`);
  }

  const data = readPathsData();
  const prev = data.paths[profession]?.tools ?? [];
  const roomNumber = data.paths[profession]?.roomNumber ?? 1;

  const nextTools: HeadquartersToolRow[] = input.tools.map((t) => {
    const slug = assertSlug(t.slug);
    const nameAr = t.nameAr.trim();
    const descriptionAr = t.descriptionAr.trim();
    if (!nameAr) throw new Error(`اسم عربي مطلوب للأداة: ${slug}`);
    return {
      slug,
      slot: t.slot?.trim() ? t.slot.trim() : slugToSlot(slug),
      nameAr,
      descriptionAr: descriptionAr || nameAr,
    };
  });

  // unique slugs/slots
  const slugSet = new Set<string>();
  const slotSet = new Set<string>();
  for (const t of nextTools) {
    if (slugSet.has(t.slug)) throw new Error(`slug مكرر: ${t.slug}`);
    if (slotSet.has(t.slot)) throw new Error(`slot مكرر: ${t.slot}`);
    slugSet.add(t.slug);
    slotSet.add(t.slot);
  }

  const warnings: string[] = [];
  // Rename asset files when slug/order changes for matching previous tools by slot
  const prevBySlot = new Map(prev.map((t, i) => [t.slot, { ...t, stage: i + 1 }]));
  nextTools.forEach((tool, i) => {
    const stage = i + 1;
    const old = prevBySlot.get(tool.slot);
    if (!old) return;
    if (old.slug === tool.slug && old.stage === stage) return;
    tryRenameAsset(
      itemPath(profession, old.stage, old.slug),
      itemPath(profession, stage, tool.slug),
      warnings
    );
    tryRenameAsset(
      stagePath(profession, old.stage, old.slug),
      stagePath(profession, stage, tool.slug),
      warnings
    );
  });

  // Delete assets for removed slots
  const nextSlots = new Set(nextTools.map((t) => t.slot));
  for (const [slot, old] of prevBySlot) {
    if (nextSlots.has(slot)) continue;
    tryDeleteAsset(itemPath(profession, old.stage, old.slug), warnings);
    tryDeleteAsset(stagePath(profession, old.stage, old.slug), warnings);
  }

  data.paths[profession] = { roomNumber, tools: nextTools };
  if (input.labelAr?.trim()) {
    data.labelsAr[profession] = input.labelAr.trim();
  }
  writePathsData(data);

  const backendSynced = syncBackendPaths(data);
  return {
    tools: listCatalogTools(profession),
    backendSynced,
    warnings,
  };
}

function tryRenameAsset(fromUrl: string, toUrl: string, warnings: string[]) {
  if (fromUrl === toUrl) return;
  const from = urlToDisk(fromUrl);
  const to = urlToDisk(toUrl);
  if (!existsSync(from)) return;
  if (existsSync(to)) {
    warnings.push(`تخطي إعادة التسمية (الهدف موجود): ${toUrl}`);
    return;
  }
  try {
    renameSync(from, to);
  } catch (e) {
    warnings.push(`فشل إعادة تسمية ${fromUrl}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function tryDeleteAsset(urlPath: string, warnings: string[]) {
  const disk = urlToDisk(urlPath);
  if (!existsSync(disk)) return;
  try {
    unlinkSync(disk);
  } catch (e) {
    warnings.push(`فشل حذف ${urlPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Best-effort sync of Laravel StoreProgression + seeder for non-doctor paths. */
export function syncBackendPaths(data: HeadquartersPathData = readPathsData()): boolean {
  if (!existsSync(STORE_PROGRESSION_PHP)) {
    return false;
  }

  let php = readFileSync(STORE_PROGRESSION_PHP, "utf8");
  for (const code of PROFESSION_CODES) {
    if (code === "doctor") continue; // keep doctor path hand-maintained unless needed
    const tools = data.paths[code]?.tools ?? [];
    const body = tools.map((t) => `                '${t.slot}',`).join("\n");
    const block = `            '${code}' => [\n${body}\n            ],`;
    const re = new RegExp(`'${code}'\\s*=>\\s*\\[[\\s\\S]*?\\],`, "m");
    if (re.test(php)) {
      php = php.replace(re, block);
    }
  }
  writeFileSync(STORE_PROGRESSION_PHP, php, "utf8");
  return true;
}
