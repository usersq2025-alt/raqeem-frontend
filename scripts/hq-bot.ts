/**
 * Local HQ assets bot — multi-profession protocol, multi-select upload, place + sync (+ optional deploy).
 *
 *   npm run hq:bot              → interactive CLI
 *   npm run hq:bot -- --ui      → browser UI at http://127.0.0.1:3921
 *   npm run hq:place -- --profession doctor --stage 2 --item path --room path
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import type { ProfessionCode } from "../src/lib/config/professions";
import {
  getEmptyRoomInfo,
  listPlaceableStages,
  listProfessions,
  placeEmptyRoom,
  placeHqAssets,
  startFrontendDeploy,
} from "./hq-place-lib";
import { listCatalogTools, readPathsData, saveProfessionTools } from "./hq-catalog-lib";

const UI_PORT = 3921;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const UI_HTML_PATH = path.join(SCRIPT_DIR, "hq-bot-ui.html");

function parseArgs(argv: string[]) {
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
  return out;
}

async function windowsPickPng(title: string): Promise<string | null> {
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.OpenFileDialog
$d.Filter = 'PNG|*.png|All|*.*'
$d.Title = '${title.replace(/'/g, "''")}'
$d.Multiselect = $false
if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.FileName }
`;
  const r = spawnSync("powershell", ["-NoProfile", "-STA", "-Command", ps], { encoding: "utf8" });
  const file = (r.stdout ?? "").trim();
  return file || null;
}

async function runCliPlace(args: Record<string, string | boolean>) {
  const profession = String(args.profession ?? "doctor") as ProfessionCode;
  const stage = Number(args.stage);
  if (!Number.isFinite(stage) || stage < 1) {
    throw new Error("استخدم --stage برقم مرحلة صحيح");
  }
  const item = args.item ? String(args.item) : null;
  const room = args.room ? String(args.room) : args.stageImg ? String(args.stageImg) : null;
  if (!item || !room) {
    throw new Error("مطلوب --item و --room (مسارات ملفات PNG)");
  }

  const result = placeHqAssets({
    profession,
    stage,
    itemSourcePath: item,
    stageSourcePath: room,
    overwrite: args["no-overwrite"] ? false : true,
    sync: true,
  });

  printResult(result);

  if (args.deploy) {
    const msg = String(args.message ?? `hq: place ${profession} stage ${stage}`);
    console.log("\nبدء النشر…");
    startFrontendDeploy(msg);
    console.log("اكتمل النشر.");
  }
}

function printResult(result: ReturnType<typeof placeHqAssets>) {
  console.log("\n=== نتيجة الوضع ===");
  console.log(`المهنة: ${result.profession}`);
  console.log(`المرحلة: ${result.stage} — ${result.nameAr ?? ""}`);
  if (result.pricePoints != null) {
    console.log(`السعر (مرجع): ${result.pricePoints} نقطة`);
  }
  if (result.written.length) {
    console.log("كُتب:");
    for (const w of result.written) console.log(`  + ${w}`);
  }
  if (result.skipped.length) {
    console.log("تخطي:");
    for (const s of result.skipped) console.log(`  ~ ${s}`);
  }
  console.log(result.readyAfterSync ? "جاهزية sync:hq: نعم" : "جاهزية sync:hq: لا");
}

async function runInteractive() {
  const rl = readline.createInterface({ input, output });
  const professions = listProfessions();
  console.log("========================================");
  console.log("  بوت المقر المحلي");
  console.log("========================================\n");
  for (const p of professions) {
    console.log(`  ${p.code}  ${p.labelAr}  (${p.stageCount})`);
  }
  const professionRaw = (await rl.question("\nرمز المهنة [doctor]: ")).trim() || "doctor";
  const profession = professionRaw as ProfessionCode;
  const stages = listPlaceableStages(profession);
  if (stages.length === 0) {
    rl.close();
    throw new Error(`لا مراحل للمهنة: ${profession}`);
  }

  console.log("\nالمراحل:\n");
  for (const s of stages) {
    const mark = s.ready ? "✓" : "·";
    console.log(`  ${mark} ${String(s.stage).padStart(2, "0")}  ${s.nameAr}`);
  }

  const stageRaw = (await rl.question("\nرقم المرحلة (أو q): ")).trim();
  if (stageRaw.toLowerCase() === "q" || stageRaw === "") {
    rl.close();
    return;
  }
  const stage = Number(stageRaw);
  const def = stages.find((s) => s.stage === stage);
  if (!def) {
    rl.close();
    throw new Error(`مرحلة غير معروفة: ${stageRaw}`);
  }

  let itemPath = await windowsPickPng(`صورة الأداة — ${def.nameAr}`);
  if (!itemPath) {
    itemPath = (await rl.question("مسار صورة الأداة: ")).trim().replace(/^"|"$/g, "");
  }
  let roomPath = await windowsPickPng(`صورة المقر — ${def.nameAr}`);
  if (!roomPath) {
    roomPath = (await rl.question("مسار صورة المقر: ")).trim().replace(/^"|"$/g, "");
  }

  const result = placeHqAssets({
    profession,
    stage,
    itemSourcePath: itemPath,
    stageSourcePath: roomPath,
    overwrite: true,
    sync: true,
  });
  printResult(result);

  const deployAns = (await rl.question("\nنشر الآن؟ (y/N): ")).trim().toLowerCase();
  rl.close();
  if (deployAns === "y" || deployAns === "yes" || deployAns === "ن") {
    startFrontendDeploy(`hq: place ${profession} stage ${stage}`);
    console.log("اكتمل النشر.");
  }
}

function startUiServer() {
  let deployState: { status: "idle" | "running" | "ok" | "error"; error?: string } = {
    status: "idle",
  };

  const runDeployBackground = (message: string) => {
    if (deployState.status === "running") {
      throw new Error("نشر آخر ما زال جاريًا");
    }
    deployState = { status: "running" };
    console.log("[deploy] starting:", message);
    setImmediate(() => {
      try {
        startFrontendDeploy(message);
        deployState = { status: "ok" };
        console.log("[deploy] OK");
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        deployState = { status: "error", error };
        console.error("[deploy] FAIL:", error);
      }
    });
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${UI_PORT}`);

    const sendJson = (status: number, body: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(body));
    };

    const readBody = async (): Promise<string> => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks).toString("utf8");
    };

    try {
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const html = readFileSync(UI_HTML_PATH, "utf8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(200, { ok: true, port: UI_PORT });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/deploy-status") {
        sendJson(200, deployState);
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/professions") {
        sendJson(200, { professions: listProfessions() });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/stages") {
        const profession = (url.searchParams.get("profession") || "doctor") as ProfessionCode;
        sendJson(200, {
          stages: listPlaceableStages(profession),
          emptyRoom: getEmptyRoomInfo(profession),
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/place-empty") {
        const body = JSON.parse(await readBody()) as {
          profession?: ProfessionCode;
          stageBase64?: string;
          deploy?: boolean;
        };
        const profession = (body.profession || "doctor") as ProfessionCode;
        if (!body.stageBase64) {
          sendJson(400, { error: "صورة المقر الفارغ مطلوبة" });
          return;
        }
        const result = placeEmptyRoom({
          profession,
          stageBytes: Buffer.from(body.stageBase64, "base64"),
          overwrite: true,
          sync: true,
        });
        let deploy: { started?: boolean; error?: string } | null = null;
        if (body.deploy) {
          try {
            runDeployBackground(`hq: empty room ${profession}`);
            deploy = { started: true };
          } catch (e) {
            deploy = { error: e instanceof Error ? e.message : String(e) };
          }
        }
        sendJson(200, { ok: true, result, deploy });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/deploy") {
        const raw = await readBody();
        const body = (raw ? JSON.parse(raw) : {}) as { message?: string };
        try {
          runDeployBackground(body.message || "hq: deploy current headquarters assets");
          sendJson(200, { ok: true, deploy: { started: true } });
        } catch (e) {
          sendJson(500, { ok: false, error: e instanceof Error ? e.message : String(e) });
        }
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/catalog") {
        const profession = (url.searchParams.get("profession") || "doctor") as ProfessionCode;
        const data = readPathsData();
        sendJson(200, {
          profession,
          labelAr: data.labelsAr[profession] ?? profession,
          tools: listCatalogTools(profession),
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/catalog") {
        const body = JSON.parse(await readBody()) as {
          profession?: ProfessionCode;
          labelAr?: string;
          tools?: Array<{ slug: string; nameAr: string; descriptionAr: string; slot?: string }>;
        };
        const profession = (body.profession || "doctor") as ProfessionCode;
        if (!Array.isArray(body.tools)) {
          sendJson(400, { error: "tools مطلوبة" });
          return;
        }
        const result = saveProfessionTools({
          profession,
          labelAr: body.labelAr,
          tools: body.tools,
        });
        sendJson(200, { ok: true, ...result });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/place") {
        const body = JSON.parse(await readBody()) as {
          profession?: ProfessionCode;
          stage?: number;
          deploy?: boolean;
          kind?: "item" | "stage" | "both";
          itemBase64?: string;
          stageBase64?: string;
        };
        const profession = (body.profession || "doctor") as ProfessionCode;
        const stage = Number(body.stage);
        const kind = body.kind || "both";
        if (!Number.isFinite(stage)) {
          sendJson(400, { error: "stage مطلوب" });
          return;
        }
        if ((kind === "item" || kind === "both") && !body.itemBase64) {
          sendJson(400, { error: "صورة الأداة مطلوبة" });
          return;
        }
        if ((kind === "stage" || kind === "both") && !body.stageBase64) {
          sendJson(400, { error: "صورة المقر مطلوبة" });
          return;
        }
        const result = placeHqAssets({
          profession,
          stage,
          kind,
          itemBytes: body.itemBase64 ? Buffer.from(body.itemBase64, "base64") : null,
          stageBytes: body.stageBase64 ? Buffer.from(body.stageBase64, "base64") : null,
          overwrite: true,
          sync: true,
        });
        let deploy: { started?: boolean; error?: string } | null = null;
        if (body.deploy) {
          try {
            runDeployBackground(`hq: place ${profession} stage ${stage}`);
            deploy = { started: true };
          } catch (e) {
            deploy = { error: e instanceof Error ? e.message : String(e) };
          }
        }
        sendJson(200, { ok: true, result, deploy });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/place-batch") {
        const body = JSON.parse(await readBody()) as {
          deploy?: boolean;
          jobs?: Array<{
            profession: ProfessionCode;
            stage: number;
            kind?: "item" | "stage" | "both";
            itemBase64?: string;
            stageBase64?: string;
          }>;
        };
        const jobs = body.jobs ?? [];
        if (jobs.length === 0) {
          sendJson(400, { error: "لا توجد أدوات للوضع" });
          return;
        }

        const results: ReturnType<typeof placeHqAssets>[] = [];
        for (let i = 0; i < jobs.length; i++) {
          const job = jobs[i];
          const kind = job.kind || "both";
          if ((kind === "item" || kind === "both") && !job.itemBase64) {
            sendJson(400, { error: `المرحلة ${job.stage}: صورة الأداة مطلوبة` });
            return;
          }
          if ((kind === "stage" || kind === "both") && !job.stageBase64) {
            sendJson(400, { error: `المرحلة ${job.stage}: صورة المقر مطلوبة` });
            return;
          }
          const sync = i === jobs.length - 1;
          results.push(
            placeHqAssets({
              profession: job.profession,
              stage: Number(job.stage),
              kind,
              itemBytes: job.itemBase64 ? Buffer.from(job.itemBase64, "base64") : null,
              stageBytes: job.stageBase64 ? Buffer.from(job.stageBase64, "base64") : null,
              overwrite: true,
              sync,
            })
          );
        }

        let deploy: { started?: boolean; error?: string } | null = null;
        if (body.deploy) {
          try {
            const codes = [...new Set(jobs.map((j) => `${j.profession}:${j.stage}`))];
            runDeployBackground(`hq: place batch ${codes.join(",")}`);
            deploy = { started: true };
          } catch (e) {
            deploy = { error: e instanceof Error ? e.message : String(e) };
          }
        }

        sendJson(200, { ok: true, count: results.length, results, deploy });
        return;
      }

      sendJson(404, { error: "not found" });
    } catch (e) {
      sendJson(500, { error: e instanceof Error ? e.message : String(e) });
    }
  });

  server.requestTimeout = 0;
  server.headersTimeout = 0;
  server.listen(UI_PORT, "127.0.0.1", () => {
    const href = `http://127.0.0.1:${UI_PORT}`;
    console.log(`بوت المقر يعمل: ${href}`);
    console.log("اترك هذه النافذة مفتوحة أثناء الاستخدام.");
    spawnSync("cmd", ["/c", "start", "", href], { shell: true });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.ui) {
    startUiServer();
    return;
  }

  if (args.stage && (args.item || args.room || args.stageImg)) {
    await runCliPlace(args);
    return;
  }

  if (args.help) {
    console.log(`Usage:
  npm run hq:bot
  npm run hq:bot -- --ui
  npm run hq:place -- --profession engineer --stage 1 --item .\\a.png --room .\\b.png [--deploy]
`);
    return;
  }

  await runInteractive();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
