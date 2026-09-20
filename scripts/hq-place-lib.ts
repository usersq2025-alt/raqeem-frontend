/**
 * Shared HQ asset placement helpers (catalog-driven naming).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  HEADQUARTERS_STAGES_BY_PROFESSION,
  PROFESSION_LABELS_AR,
  buildStagesForProfession,
  type HeadquartersPathData,
  type HeadquartersStageDefinition,
} from "../src/lib/config/headquartersStages.catalog";
import { PROFESSION_CODES, type ProfessionCode } from "../src/lib/config/professions";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PUBLIC_DIR = path.join(ROOT, "public");
const HQ_PATHS_JSON = path.join(ROOT, "src", "lib", "config", "headquartersPaths.data.json");

export { PROFESSION_LABELS_AR, PROFESSION_CODES };

/** Live catalog from JSON (picks up bot edits without restart). */
export function loadLiveStages(profession: ProfessionCode): HeadquartersStageDefinition[] {
  try {
    const data = JSON.parse(readFileSync(HQ_PATHS_JSON, "utf8")) as HeadquartersPathData;
    return buildStagesForProfession(profession, data);
  } catch {
    return HEADQUARTERS_STAGES_BY_PROFESSION[profession] ?? [];
  }
}

export function loadLiveLabels(): Record<ProfessionCode, string> {
  try {
    const data = JSON.parse(readFileSync(HQ_PATHS_JSON, "utf8")) as HeadquartersPathData;
    const out = { ...PROFESSION_LABELS_AR };
    for (const code of PROFESSION_CODES) {
      if (data.labelsAr?.[code]) out[code] = data.labelsAr[code];
    }
    return out;
  } catch {
    return PROFESSION_LABELS_AR;
  }
}

/** Display-only prices (authoritative source is StoreItem / seeder). */
export const STAGE_PRICES_BY_PROFESSION: Record<ProfessionCode, Record<number, number>> = {
  doctor: {
    1: 6,
    2: 12,
    3: 24,
    4: 30,
    5: 36,
    6: 36,
    7: 42,
    8: 42,
    9: 48,
    10: 48,
    11: 54,
    12: 60,
  },
  // Five-stage paths — provisional ladder for first release
  engineer: { 1: 6, 2: 12, 3: 24, 4: 36, 5: 48 },
  teacher: { 1: 6, 2: 12, 3: 24, 4: 36, 5: 48 },
  chef: { 1: 6, 2: 12, 3: 24, 4: 36, 5: 48 },
  astronaut: { 1: 6, 2: 12, 3: 24, 4: 36, 5: 48 },
  soldier: { 1: 6, 2: 12, 3: 24, 4: 36, 5: 48 },
};

/** @deprecated use STAGE_PRICES_BY_PROFESSION.doctor */
export const DOCTOR_STAGE_PRICES = STAGE_PRICES_BY_PROFESSION.doctor;

export type PlaceKind = "item" | "stage" | "both";

export type PlaceResult = {
  profession: ProfessionCode;
  stage: number;
  nameAr: string | null;
  pricePoints: number | null;
  written: string[];
  skipped: string[];
  readyAfterSync: boolean;
};

export type PlaceableStage = HeadquartersStageDefinition & {
  pricePoints: number | null;
  itemOnDisk: boolean;
  stageOnDisk: boolean;
  ready: boolean;
};

export type EmptyRoomInfo = {
  profession: ProfessionCode;
  stageImage: string;
  onDisk: boolean;
};

export function getEmptyRoomInfo(profession: ProfessionCode): EmptyRoomInfo | null {
  const def = getStage(profession, 0);
  if (!def?.stageImage) return null;
  return {
    profession,
    stageImage: def.stageImage,
    onDisk: diskExists(def.stageImage),
  };
}

export function listProfessions(): Array<{
  code: ProfessionCode;
  labelAr: string;
  stageCount: number;
  emptyOnDisk: boolean;
  emptyStageImage: string | null;
}> {
  const labels = loadLiveLabels();
  return PROFESSION_CODES.map((code) => {
    const empty = getEmptyRoomInfo(code);
    return {
      code,
      labelAr: labels[code],
      stageCount: loadLiveStages(code).filter((s) => s.stage > 0).length,
      emptyOnDisk: empty?.onDisk ?? false,
      emptyStageImage: empty?.stageImage ?? null,
    };
  });
}

export function listPlaceableStages(profession: ProfessionCode = "doctor"): PlaceableStage[] {
  const stages = loadLiveStages(profession);
  const prices = STAGE_PRICES_BY_PROFESSION[profession] ?? {};
  return stages
    .filter((s) => s.stage > 0 && s.itemSlug && s.storeSlotKey)
    .map((s) => {
      const itemOnDisk = diskExists(s.itemImage);
      const stageOnDisk = diskExists(s.stageImage);
      return {
        ...s,
        pricePoints: prices[s.stage] ?? defaultStagePrice(s.stage),
        itemOnDisk,
        stageOnDisk,
        ready: itemOnDisk && stageOnDisk,
      };
    });
}

export function getStage(
  profession: ProfessionCode,
  stage: number
): HeadquartersStageDefinition | null {
  return loadLiveStages(profession).find((s) => s.stage === stage) ?? null;
}

function defaultStagePrice(stage: number): number {
  const ladder = [6, 12, 24, 36, 48, 60, 72, 84, 96];
  return ladder[stage - 1] ?? 60 + Math.max(0, stage - 9) * 12;
}

export function urlToDisk(urlPath: string): string {
  return path.join(PUBLIC_DIR, urlPath.replace(/^\//, "").replace(/\//g, path.sep));
}

function diskExists(urlPath: string | null): boolean {
  if (!urlPath) return false;
  return existsSync(urlToDisk(urlPath));
}

function ensurePng(sourcePath: string, label: string): void {
  if (!existsSync(sourcePath)) {
    throw new Error(`${label}: الملف غير موجود — ${sourcePath}`);
  }
  if (!sourcePath.toLowerCase().endsWith(".png")) {
    throw new Error(`${label}: يجب أن يكون الملف PNG — ${sourcePath}`);
  }
}

function writeBinary(destDisk: string, data: Buffer, overwrite: boolean): "written" | "skipped" {
  mkdirSync(path.dirname(destDisk), { recursive: true });
  if (existsSync(destDisk) && !overwrite) {
    return "skipped";
  }
  writeFileSync(destDisk, data);
  return "written";
}

function copyPng(sourcePath: string, destDisk: string, overwrite: boolean): "written" | "skipped" {
  ensurePng(sourcePath, "المصدر");
  mkdirSync(path.dirname(destDisk), { recursive: true });
  if (existsSync(destDisk) && !overwrite) {
    return "skipped";
  }
  copyFileSync(sourcePath, destDisk);
  return "written";
}

export type PlaceInput = {
  profession: ProfessionCode;
  stage: number;
  itemSourcePath?: string | null;
  stageSourcePath?: string | null;
  itemBytes?: Buffer | null;
  stageBytes?: Buffer | null;
  kind?: PlaceKind;
  overwrite?: boolean;
  sync?: boolean;
};

export function placeHqAssets(input: PlaceInput): PlaceResult {
  const {
    profession,
    stage,
    itemSourcePath = null,
    stageSourcePath = null,
    itemBytes = null,
    stageBytes = null,
    kind = "both",
    overwrite = true,
    sync = true,
  } = input;

  const def = getStage(profession, stage);
  if (!def?.stageImage) {
    throw new Error(`لا توجد مرحلة قابلة للوضع: ${profession} #${stage}`);
  }

  const isEmptyRoom = stage === 0;
  if (!isEmptyRoom && (!def.itemSlug || !def.itemImage)) {
    throw new Error(`لا توجد مرحلة قابلة للوضع: ${profession} #${stage}`);
  }

  const wantItem = !isEmptyRoom && (kind === "item" || kind === "both");
  const wantStage = isEmptyRoom || kind === "stage" || kind === "both";
  const written: string[] = [];
  const skipped: string[] = [];

  if (wantItem) {
    const dest = urlToDisk(def.itemImage!);
    const rel = path.relative(ROOT, dest);
    let status: "written" | "skipped";
    if (itemBytes) {
      status = writeBinary(dest, itemBytes, overwrite);
    } else if (itemSourcePath) {
      status = copyPng(itemSourcePath, dest, overwrite);
    } else {
      throw new Error("صورة الأداة مطلوبة (مسار أو بيانات).");
    }
    (status === "written" ? written : skipped).push(rel);
  }

  if (wantStage) {
    const dest = urlToDisk(def.stageImage);
    const rel = path.relative(ROOT, dest);
    let status: "written" | "skipped";
    if (stageBytes) {
      status = writeBinary(dest, stageBytes, overwrite);
    } else if (stageSourcePath) {
      status = copyPng(stageSourcePath, dest, overwrite);
    } else {
      throw new Error("صورة المقر مطلوبة (مسار أو بيانات).");
    }
    (status === "written" ? written : skipped).push(rel);
  }

  let readyAfterSync = isEmptyRoom
    ? diskExists(def.stageImage)
    : diskExists(def.itemImage) && diskExists(def.stageImage);
  if (sync) {
    runSyncHq();
    readyAfterSync = isEmptyRoom
      ? diskExists(def.stageImage)
      : diskExists(def.itemImage) && diskExists(def.stageImage);
  }

  const prices = STAGE_PRICES_BY_PROFESSION[profession] ?? {};
  return {
    profession,
    stage,
    nameAr: isEmptyRoom ? "المقر الفارغ" : def.nameAr,
    pricePoints: isEmptyRoom ? null : (prices[stage] ?? defaultStagePrice(stage)),
    written,
    skipped,
    readyAfterSync,
  };
}

/** Place only the empty HQ room (stage 0) shown before any tool purchase. */
export function placeEmptyRoom(input: {
  profession: ProfessionCode;
  stageSourcePath?: string | null;
  stageBytes?: Buffer | null;
  overwrite?: boolean;
  sync?: boolean;
}): PlaceResult {
  return placeHqAssets({
    profession: input.profession,
    stage: 0,
    stageSourcePath: input.stageSourcePath,
    stageBytes: input.stageBytes,
    kind: "stage",
    overwrite: input.overwrite ?? true,
    sync: input.sync ?? true,
  });
}

export function runSyncHq(): void {
  const r = spawnSync("npx", ["tsx", "scripts/sync-hq-assets.ts"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    throw new Error(`فشل sync:hq (exit ${r.status})`);
  }
}

function resolveGitExe(): string {
  const candidates = [
    "C:\\laragon\\bin\\git\\cmd\\git.exe",
    "C:\\laragon\\bin\\git\\bin\\git.exe",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "git";
}

export function startFrontendDeploy(commitMessage: string): void {
  const relPaths = [
    "public/images/headquarters",
    "src/lib/config/generated/hqAssets.generated.ts",
  ];

  const gitExe = resolveGitExe();
  const gitEnv = {
    ...process.env,
    PATH: `C:\\laragon\\bin\\git\\cmd;C:\\laragon\\bin\\git\\bin;${process.env.PATH ?? ""}`,
  };

  const run = (args: string[], allowFail = false) => {
    const r = spawnSync(gitExe, args, {
      cwd: ROOT,
      encoding: "utf8",
      env: gitEnv,
      shell: false,
      windowsHide: true,
    });
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    if (!allowFail && r.status !== 0) {
      const detail = [r.stderr, r.stdout].filter(Boolean).join("\n").trim();
      throw new Error(
        `git ${args[0] ?? ""} فشل (exit ${r.status})${detail ? `\n${detail}` : ""}`
      );
    }
    return r;
  };

  run(["add", "--", ...relPaths], true);
  const staged = spawnSync(gitExe, ["diff", "--cached", "--quiet"], {
    cwd: ROOT,
    env: gitEnv,
    shell: false,
    windowsHide: true,
  });
  if (staged.status !== 0) {
    run([
      "-c",
      "user.name=User",
      "-c",
      "user.email=usersq2025@gmail.com",
      "commit",
      "-m",
      commitMessage,
    ]);
  } else {
    console.log("لا توجد ملفات جديدة للـ commit — سيتم دفع النسخة الحالية إن لزم.");
  }

  run(["push", "origin", "main"]);

  const key = path.join(process.env.USERPROFILE ?? "", ".ssh", "raqeem_deploy");
  if (!existsSync(key)) {
    throw new Error(`مفتاح SSH غير موجود: ${key}`);
  }

  const ssh = spawnSync(
    "ssh",
    ["-i", key, "raqeem@vps.molhamyic.cloud", "~/deploy-frontend.sh"],
    { cwd: ROOT, encoding: "utf8", shell: false, stdio: "inherit", windowsHide: true }
  );
  if (ssh.status !== 0) {
    throw new Error(`فشل نشر الفرونت (exit ${ssh.status})`);
  }
}
