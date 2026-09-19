/**
 * Shared HQ asset placement helpers (catalog-driven naming).
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  HEADQUARTERS_STAGES_BY_PROFESSION,
  type HeadquartersStageDefinition,
} from "../src/lib/config/headquartersStages.catalog";
import type { ProfessionCode } from "../src/lib/config/professions";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PUBLIC_DIR = path.join(ROOT, "public");

/** Display-only prices (authoritative source is StoreItem / seeder). */
export const DOCTOR_STAGE_PRICES: Record<number, number> = {
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
};

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

export function listPlaceableStages(
  profession: ProfessionCode = "doctor"
): Array<
  HeadquartersStageDefinition & {
    pricePoints: number | null;
    itemOnDisk: boolean;
    stageOnDisk: boolean;
    ready: boolean;
  }
> {
  const stages = HEADQUARTERS_STAGES_BY_PROFESSION[profession] ?? [];
  return stages
    .filter((s) => s.stage > 0 && s.itemSlug && s.storeSlotKey)
    .map((s) => {
      const itemOnDisk = diskExists(s.itemImage);
      const stageOnDisk = diskExists(s.stageImage);
      return {
        ...s,
        pricePoints: profession === "doctor" ? (DOCTOR_STAGE_PRICES[s.stage] ?? null) : null,
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
  return (
    (HEADQUARTERS_STAGES_BY_PROFESSION[profession] ?? []).find((s) => s.stage === stage) ?? null
  );
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
  if (!def || !def.itemSlug || !def.itemImage || !def.stageImage) {
    throw new Error(`لا توجد مرحلة قابلة للوضع: ${profession} #${stage}`);
  }

  const wantItem = kind === "item" || kind === "both";
  const wantStage = kind === "stage" || kind === "both";
  const written: string[] = [];
  const skipped: string[] = [];

  if (wantItem) {
    const dest = urlToDisk(def.itemImage);
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

  let readyAfterSync = diskExists(def.itemImage) && diskExists(def.stageImage);
  if (sync) {
    runSyncHq();
    readyAfterSync = diskExists(def.itemImage) && diskExists(def.stageImage);
  }

  return {
    profession,
    stage,
    nameAr: def.nameAr,
    pricePoints: profession === "doctor" ? (DOCTOR_STAGE_PRICES[stage] ?? null) : null,
    written,
    skipped,
    readyAfterSync,
  };
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
  // Non-interactive path: commit HQ assets only, push, SSH deploy.
  // Important: shell:false so -m messages with spaces are not split on Windows.
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
