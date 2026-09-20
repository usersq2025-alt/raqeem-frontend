/**
 * Dup Bot — comprehensive code-duplication scanner with a simple Arabic report.
 *
 *   npm run dup:bot                 → scan local frontend + ../raqeem (backend)
 *   npm run dup:bot -- --frontend   → frontend only
 *   npm run dup:bot -- --backend    → backend only
 *   npm run dup:bot -- --server     → scan code on the VPS (source trees)
 *   npm run dup:bot -- --min-lines 8
 *   npm run dup:bot -- --json out/dup-report.json
 *
 * Uses jscpd under the hood (npx, no permanent install required).
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(SCRIPT_DIR, "..");
const BACKEND_ROOT_DEFAULT = path.resolve(FRONTEND_ROOT, "..", "raqeem");

const DEFAULT_SSH_HOST = "raqeem@vps.molhamyic.cloud";
const DEFAULT_SSH_KEY = path.join(os.homedir(), ".ssh", "raqeem_deploy");
const REMOTE_FRONTEND = "/home/raqeem/source-frontend";
const REMOTE_BACKEND = "/home/raqeem/source/raqeem-api";

type CliArgs = {
  frontend: boolean;
  backend: boolean;
  server: boolean;
  minLines: number;
  minTokens: number;
  jsonOut: string | null;
  sshHost: string;
  sshKey: string;
};

type JscpdFileRef = {
  name?: string;
  start?: number;
  end?: number;
  startLoc?: { line?: number; column?: number };
  endLoc?: { line?: number; column?: number };
};

type JscpdClone = {
  format?: string;
  lines?: number;
  tokens?: number;
  firstFile?: JscpdFileRef;
  secondFile?: JscpdFileRef;
  // Older jscpd shape (kept for compatibility)
  sources?: Record<string, JscpdFileRef>;
};

type JscpdReport = {
  duplicates?: JscpdClone[];
  statistics?: {
    total?: {
      percentage?: number;
      lines?: number;
      sources?: number;
      duplicatedLines?: number;
      duplicatedSources?: number;
      clones?: number;
    };
  };
};

function parseArgs(argv: string[]): CliArgs {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }

  const wantFrontend = Boolean(out.frontend);
  const wantBackend = Boolean(out.backend);
  const both = !wantFrontend && !wantBackend;

  return {
    frontend: both || wantFrontend,
    backend: both || wantBackend,
    server: Boolean(out.server),
    minLines: Math.max(5, Number(out["min-lines"] ?? out.minLines ?? 8) || 8),
    minTokens: Math.max(20, Number(out["min-tokens"] ?? out.minTokens ?? 50) || 50),
    jsonOut: typeof out.json === "string" ? out.json : null,
    sshHost: typeof out.host === "string" ? out.host : DEFAULT_SSH_HOST,
    sshKey: typeof out.key === "string" ? out.key : DEFAULT_SSH_KEY,
  };
}

function ignoreCsv(): string {
  return [
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/.git/**",
    "**/vendor/**",
    "**/storage/**",
    "**/bootstrap/cache/**",
    "**/public/build/**",
    "**/*.min.js",
    "**/*.min.css",
    "**/package-lock.json",
    "**/composer.lock",
    "**/messages/*.json",
    "**/src/lib/config/generated/**",
    "**/scripts/hq-bot-ui.html",
  ].join(",");
}

function findReportJson(reportDir: string): string | null {
  const preferred = path.join(reportDir, "jscpd-report.json");
  if (existsSync(preferred)) return preferred;

  const walk = (dir: string, depth: number): string | null => {
    if (depth > 4 || !existsSync(dir)) return null;
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isFile() && name === "jscpd-report.json") return full;
      if (st.isDirectory()) {
        const hit = walk(full, depth + 1);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(reportDir, 0);
}

function absolutizeClonePaths(report: JscpdReport, root: string): void {
  for (const clone of report.duplicates ?? []) {
    if (clone.firstFile?.name && !path.isAbsolute(clone.firstFile.name)) {
      clone.firstFile.name = path.resolve(root, clone.firstFile.name);
    }
    if (clone.secondFile?.name && !path.isAbsolute(clone.secondFile.name)) {
      clone.secondFile.name = path.resolve(root, clone.secondFile.name);
    }
    if (clone.sources) {
      const next: NonNullable<JscpdClone["sources"]> = {};
      for (const [name, meta] of Object.entries(clone.sources)) {
        const abs = path.isAbsolute(name) ? name : path.resolve(root, name);
        next[abs] = meta;
      }
      clone.sources = next;
    }
  }
}

function readReport(reportDir: string): JscpdReport {
  const found = findReportJson(reportDir);
  if (!found) {
    throw new Error(`لم يُحفظ تقرير jscpd داخل: ${reportDir}`);
  }
  return JSON.parse(readFileSync(found, "utf8")) as JscpdReport;
}

function runJscpdCli(scanRoots: string[], outputDir: string, args: CliArgs, cwd: string): void {
  mkdirSync(outputDir, { recursive: true });

  // Prefer paths relative to cwd — absolute Windows paths often make jscpd scan nothing.
  const relativeRoots = scanRoots.map((root) => {
    const rel = path.relative(cwd, root);
    if (!rel || rel === "") return ".";
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) return rel || ".";
    return root;
  });

  const cliArgs = [
    "--yes",
    "jscpd@4.0.5",
    ...relativeRoots,
    "--min-lines",
    String(args.minLines),
    "--min-tokens",
    String(args.minTokens),
    "--reporters",
    "json",
    "--output",
    outputDir,
    "--gitignore",
    "--ignore",
    ignoreCsv(),
  ];

  const result = spawnSync("npx", cliArgs, {
    cwd,
    encoding: "utf8",
    shell: true,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  if (result.error) {
    throw result.error;
  }
  // jscpd may exit non-zero when clones exist — still OK if report exists.
  if (!findReportJson(outputDir)) {
    const tail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().slice(-2500);
    throw new Error(`فشل jscpd بدون تقرير.\n${tail}`);
  }
}

function relPath(file: string, roots: string[]): string {
  const normalized = file.replace(/\\/g, "/");
  for (const root of roots) {
    const rootNorm = root.replace(/\\/g, "/").replace(/\/$/, "");
    if (normalized.toLowerCase().startsWith(rootNorm.toLowerCase() + "/")) {
      const base = path.basename(rootNorm);
      return `${base}/${normalized.slice(rootNorm.length + 1)}`;
    }
  }
  // Prefer path relative to known project names
  const markers = ["raqeem-frontend/", "raqeem-api/", "/raqeem/", "source-frontend/", "source/raqeem-api/"];
  for (const m of markers) {
    const idx = normalized.toLowerCase().indexOf(m);
    if (idx >= 0) return normalized.slice(idx);
  }
  return normalized;
}

function projectLabel(file: string): "الفرونت" | "الباك" | "مشروع" {
  const n = file.replace(/\\/g, "/").toLowerCase();
  if (n.includes("raqeem-frontend") || n.includes("source-frontend") || n.includes("app-frontend")) {
    return "الفرونت";
  }
  if (n.includes("raqeem-api") || n.includes("/raqeem/") || /[/\\]raqeem[/\\]app[/\\]/.test(n)) {
    return "الباك";
  }
  return "مشروع";
}

function clonePair(clone: JscpdClone): Array<{ path: string; meta: JscpdFileRef }> {
  if (clone.firstFile?.name && clone.secondFile?.name) {
    return [
      { path: clone.firstFile.name, meta: clone.firstFile },
      { path: clone.secondFile.name, meta: clone.secondFile },
    ];
  }
  return Object.entries(clone.sources ?? {}).map(([pathName, meta]) => ({
    path: pathName,
    meta,
  }));
}

function formatCloneArabic(clone: JscpdClone, index: number, roots: string[]): string {
  const sources = clonePair(clone);
  if (sources.length < 2) return "";

  const a = sources[0];
  const b = sources[1];
  const aStart = a.meta.startLoc?.line ?? a.meta.start ?? "?";
  const aEnd = a.meta.endLoc?.line ?? a.meta.end ?? "?";
  const bStart = b.meta.startLoc?.line ?? b.meta.start ?? "?";
  const bEnd = b.meta.endLoc?.line ?? b.meta.end ?? "?";
  const lines = clone.lines ?? 0;
  const aPath = path.isAbsolute(a.path) ? a.path : path.resolve(roots[0] ?? process.cwd(), a.path);
  const bPath = path.isAbsolute(b.path) ? b.path : path.resolve(roots[0] ?? process.cwd(), b.path);
  const aRel = relPath(aPath, roots);
  const bRel = relPath(bPath, roots);
  const aProj = projectLabel(aPath);
  const bProj = projectLabel(bPath);
  const sameFile = aPath.replace(/\\/g, "/").toLowerCase() === bPath.replace(/\\/g, "/").toLowerCase();

  const where = sameFile
    ? `نفس الملف مكرر في مكانين:\n   • ${aRel} (أسطر ${aStart}–${aEnd})\n   • ونفس الملف مرة ثانية (أسطر ${bStart}–${bEnd})`
    : aProj === bProj
      ? `مكرر داخل ${aProj}:\n   • ${aRel} (أسطر ${aStart}–${aEnd})\n   • ${bRel} (أسطر ${bStart}–${bEnd})`
      : `مكرر بين ${aProj} و${bProj}:\n   • ${aRel} (أسطر ${aStart}–${aEnd})\n   • ${bRel} (أسطر ${bStart}–${bEnd})`;

  return `${index}) ${where}\n   ≈ ${lines} سطر متشابه (${clone.format ?? "كود"})`;
}

function buildArabicReport(report: JscpdReport, roots: string[], scopeLabel: string): string {
  const duplicates = [...(report.duplicates ?? [])].sort(
    (a, b) => (b.lines ?? 0) - (a.lines ?? 0)
  );
  const stats = report.statistics?.total ?? {};
  const lines: string[] = [];

  lines.push("══════════════════════════════════════");
  lines.push("  بوت فحص التكرار — تقرير بسيط");
  lines.push("══════════════════════════════════════");
  lines.push(`النطاق: ${scopeLabel}`);
  lines.push(`وقت الفحص: ${new Date().toLocaleString("ar-EG")}`);
  lines.push("");

  if (duplicates.length === 0) {
    lines.push("✅ النتيجة: لا يوجد تكرار مهم في الكود المفحوص.");
    lines.push("يمكنك الاطمئنان — الفحص الشامل لم يجد نسخاً مكررة فوق الحد الأدنى.");
    return lines.join("\n");
  }

  lines.push(`⚠️ النتيجة: وُجد ${duplicates.length} موضع تكرار.`);
  if (typeof stats.percentage === "number") {
    lines.push(`نسبة التكرار التقريبية من إجمالي الأسطر: ${stats.percentage.toFixed(1)}٪`);
  }
  if (typeof stats.duplicatedLines === "number") {
    lines.push(`عدد الأسطر المكررة تقريباً: ${stats.duplicatedLines}`);
  }
  lines.push("");
  lines.push("التفاصيل (الأكبر أولاً):");
  lines.push("--------------------------------------");

  const top = duplicates.slice(0, 40);
  let n = 1;
  for (const clone of top) {
    const block = formatCloneArabic(clone, n, roots);
    if (!block) continue;
    lines.push(block);
    lines.push("");
    n++;
  }

  if (duplicates.length > top.length) {
    lines.push(`… و${duplicates.length - top.length} تكراراً إضافياً أصغر لم تُعرض هنا.`);
    lines.push("");
  }

  lines.push("ماذا تعني؟");
  lines.push("كل بند يعني أن قطعة كود متشابهة جداً ظهرت في أكثر من مكان.");
  lines.push("يفضّل عادةً توحيدها في دالة/مكوّن واحد بدل نسخها.");
  lines.push("══════════════════════════════════════");

  return lines.join("\n");
}

function resolveLocalRoots(args: CliArgs): string[] {
  const roots: string[] = [];
  if (args.frontend) roots.push(FRONTEND_ROOT);
  if (args.backend) {
    if (!existsSync(BACKEND_ROOT_DEFAULT)) {
      console.error(`⚠️ مجلد الباك غير موجود: ${BACKEND_ROOT_DEFAULT}`);
    } else {
      roots.push(BACKEND_ROOT_DEFAULT);
    }
  }
  return roots;
}

function saveReports(arabic: string, report: JscpdReport, args: CliArgs, txtName: string): void {
  const txtOut = path.join(FRONTEND_ROOT, "reports", txtName);
  mkdirSync(path.dirname(txtOut), { recursive: true });
  writeFileSync(txtOut, arabic, "utf8");
  console.log(`📄 حفظ التقرير العربي: ${txtOut}`);

  if (args.jsonOut) {
    const outPath = path.isAbsolute(args.jsonOut)
      ? args.jsonOut
      : path.join(FRONTEND_ROOT, args.jsonOut);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`📄 حفظ التقرير الخام: ${outPath}`);
  }
}

function runLocalScan(args: CliArgs): number {
  const roots = resolveLocalRoots(args);
  if (roots.length === 0) {
    console.error("لا توجد مسارات للفحص.");
    return 1;
  }

  const tmp = mkdtempSync(path.join(os.tmpdir(), "raqeem-dup-"));

  console.log("🔍 بدء الفحص الشامل محلياً...");
  for (const root of roots) console.log(`   • ${root}`);
  console.log(`   الحد الأدنى: ${args.minLines} أسطر / ${args.minTokens} رمز`);

  try {
    const merged: JscpdReport = { duplicates: [], statistics: { total: {} } };
    const labelRoots: string[] = [];

    for (const root of roots) {
      const outDir = path.join(tmp, path.basename(root) || "scan", "out");
      runJscpdCli([root], outDir, args, root);
      const part = readReport(outDir);
      absolutizeClonePaths(part, root);
      merged.duplicates!.push(...(part.duplicates ?? []));
      labelRoots.push(root);

      const t = part.statistics?.total;
      const m = merged.statistics!.total!;
      if (t) {
        m.clones = (m.clones ?? 0) + (t.clones ?? part.duplicates?.length ?? 0);
        m.duplicatedLines = (m.duplicatedLines ?? 0) + (t.duplicatedLines ?? 0);
        m.lines = (m.lines ?? 0) + (t.lines ?? 0);
        m.sources = (m.sources ?? 0) + (t.sources ?? 0);
      }
    }

    if ((merged.statistics?.total?.lines ?? 0) > 0) {
      const dup = merged.statistics!.total!.duplicatedLines ?? 0;
      const total = merged.statistics!.total!.lines ?? 1;
      merged.statistics!.total!.percentage = (dup / total) * 100;
    }

    const scope =
      args.frontend && args.backend
        ? "الفرونت + الباك (محلي)"
        : args.frontend
          ? "الفرونت فقط (محلي)"
          : "الباك فقط (محلي)";
    const arabic = buildArabicReport(merged, labelRoots, scope);
    console.log("\n" + arabic);
    saveReports(arabic, merged, args, "dup-latest.txt");
    return (merged.duplicates?.length ?? 0) > 0 ? 2 : 0;
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function runServerScan(args: CliArgs): number {
  if (!existsSync(args.sshKey)) {
    console.error(`مفتاح SSH غير موجود: ${args.sshKey}`);
    return 1;
  }

  const targets: string[] = [];
  if (args.frontend) targets.push(REMOTE_FRONTEND);
  if (args.backend) targets.push(REMOTE_BACKEND);
  if (targets.length === 0) {
    console.error("حدّد --frontend أو --backend أو كليهما.");
    return 1;
  }

  console.log("🔍 بدء الفحص الشامل على السيرفر...");
  for (const t of targets) console.log(`   • ${args.sshHost}:${t}`);

  const quotedPaths = targets.map((p) => `'${p.replace(/'/g, `'\\''`)}'`).join(" ");
  const remoteScript = `
set -euo pipefail
TMP=$(mktemp -d /tmp/raqeem-dup-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
for p in ${quotedPaths}; do
  if [ ! -d "$p" ]; then
    echo "MISSING:$p" >&2
    exit 4
  fi
done
mkdir -p "$TMP/out"
npx --yes jscpd@4.0.5 ${quotedPaths} \\
  --min-lines ${args.minLines} \\
  --min-tokens ${args.minTokens} \\
  --reporters json \\
  --output "$TMP/out" \\
  --gitignore \\
  --ignore '${ignoreCsv()}' || true
REPORT=$(find "$TMP/out" -name jscpd-report.json | head -n 1)
if [ -z "$REPORT" ]; then
  echo "NO_REPORT"
  exit 3
fi
echo "REPORT_PATH=$REPORT"
cat "$REPORT"
`.trim();

  const result = spawnSync(
    "ssh",
    ["-i", args.sshKey, "-o", "BatchMode=yes", args.sshHost, "bash -s"],
    {
      input: remoteScript + "\n",
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      shell: false,
    }
  );

  if (result.status !== 0 && !result.stdout?.includes("REPORT_PATH=")) {
    console.error("فشل الفحص على السيرفر.");
    console.error((result.stderr || result.stdout || "").slice(-3000));
    return 1;
  }

  const stdout = result.stdout || "";
  const marker = "REPORT_PATH=";
  const markerAt = stdout.indexOf(marker);
  const afterMarker = markerAt >= 0 ? stdout.slice(markerAt) : stdout;
  const jsonStart = afterMarker.indexOf("{");
  if (jsonStart < 0) {
    console.error("لم يُرجع السيرفر تقرير JSON.");
    console.error(stdout.slice(-2000));
    return 1;
  }

  let report: JscpdReport;
  try {
    report = JSON.parse(afterMarker.slice(jsonStart)) as JscpdReport;
  } catch {
    console.error("تعذّر قراءة JSON من السيرفر.");
    return 1;
  }

  const scope =
    args.frontend && args.backend
      ? "الفرونت + الباك (سيرفر)"
      : args.frontend
        ? "الفرونت فقط (سيرفر)"
        : "الباك فقط (سيرفر)";
  const arabic = buildArabicReport(report, targets, scope);
  console.log("\n" + arabic);
  saveReports(arabic, report, args, "dup-server-latest.txt");
  return (report.duplicates?.length ?? 0) > 0 ? 2 : 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`بوت فحص التكرار

الاستخدام:
  npm run dup:bot                 فحص محلي (فرونت + باك)
  npm run dup:bot -- --frontend   فرونت فقط
  npm run dup:bot -- --backend    باك فقط
  npm run dup:bot -- --server     فحص الكود على السيرفر
  npm run dup:bot -- --min-lines 12
  npm run dup:bot -- --json reports/dup.json
`);
    process.exit(0);
  }

  const code = args.server ? runServerScan(args) : runLocalScan(args);
  process.exit(code);
}

main();
