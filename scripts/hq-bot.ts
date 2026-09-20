/**
 * Local HQ assets bot — pick a protocol tool, drop PNGs, place + sync (+ optional deploy).
 *
 *   npm run hq:bot              → interactive CLI (file dialogs on Windows)
 *   npm run hq:bot -- --ui      → browser UI at http://127.0.0.1:3921
 *   npm run hq:place -- --profession doctor --stage 2 --item path --room path
 */
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ProfessionCode } from "../src/lib/config/professions";
import {
  listPlaceableStages,
  placeHqAssets,
  startFrontendDeploy,
} from "./hq-place-lib";

const UI_PORT = 3921;

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
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-STA", "-Command", ps],
    { encoding: "utf8" }
  );
  const file = (r.stdout ?? "").trim();
  return file || null;
}

async function runCliPlace(args: Record<string, string | boolean>) {
  const profession = String(args.profession ?? "doctor") as ProfessionCode;
  const stage = Number(args.stage);
  if (!Number.isFinite(stage) || stage < 1) {
    throw new Error("استخدم --stage برقم مرحلة صحيح (1–12)");
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
    console.log(`السعر (مرجع): ${result.pricePoints} نقطة — من المتجر، لا يُدخل يدويًا`);
  }
  if (result.written.length) {
    console.log("كُتب:");
    for (const w of result.written) console.log(`  + ${w}`);
  }
  if (result.skipped.length) {
    console.log("تخطي (موجود مسبقًا):");
    for (const s of result.skipped) console.log(`  ~ ${s}`);
  }
  console.log(
    result.readyAfterSync
      ? "جاهزية sync:hq: نعم — المرحلة مفعّلة للشراء بعد النشر/التحديث."
      : "جاهزية sync:hq: لا — تأكد من وجود صورتي الأداة والمقر."
  );
}

async function runInteractive() {
  const rl = readline.createInterface({ input, output });
  const profession: ProfessionCode = "doctor";
  const stages = listPlaceableStages(profession);

  console.log("========================================");
  console.log("  بوت المقر المحلي — عيادة الطبيب");
  console.log("========================================\n");
  console.log("المراحل من البروتوكول (السعر جاهز في المتجر):\n");

  for (const s of stages) {
    const mark = s.ready ? "✓" : s.itemOnDisk || s.stageOnDisk ? "…" : "·";
    const price = s.pricePoints != null ? `${s.pricePoints} نقطة` : "—";
    const disk = s.ready
      ? "جاهز"
      : `أداة=${s.itemOnDisk ? "✓" : "✗"} مقر=${s.stageOnDisk ? "✓" : "✗"}`;
    console.log(
      `  ${mark} ${String(s.stage).padStart(2, "0")}  ${s.nameAr}  |  ${price}  |  ${disk}`
    );
  }

  console.log("");
  const stageRaw = (await rl.question("رقم المرحلة (أو q للخروج): ")).trim();
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

  console.log(`\nاخترت: ${def.nameAr} (${def.storeSlotKey}) — سعر ${def.pricePoints} نقطة`);
  console.log("افتح نافذة اختيار صورة الأداة (PNG بخلفية شفافة)…");
  let itemPath = await windowsPickPng(`صورة الأداة — ${def.nameAr}`);
  if (!itemPath) {
    itemPath = (await rl.question("مسار صورة الأداة يدويًا: ")).trim().replace(/^"|"$/g, "");
  }
  console.log("افتح نافذة اختيار صورة المقر التراكمية…");
  let roomPath = await windowsPickPng(`صورة المقر — مرحلة ${def.stage}`);
  if (!roomPath) {
    roomPath = (await rl.question("مسار صورة المقر يدويًا: ")).trim().replace(/^"|"$/g, "");
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

  const deployAns = (await rl.question("\nنشر إلى السيرفر الآن؟ (y/N): ")).trim().toLowerCase();
  rl.close();
  if (deployAns === "y" || deployAns === "yes" || deployAns === "ن") {
    startFrontendDeploy(`hq: place ${profession} stage ${stage} (${def.itemSlug})`);
    console.log("اكتمل النشر.");
  } else {
    console.log("تم محليًا فقط. للتجربة: npm run dev — وللنشر لاحقًا: push-and-deploy.bat");
  }
}

function uiHtml(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>بوت المقر — رقيم</title>
  <style>
    :root {
      --bg: #faf6ec;
      --ink: #1a2a4a;
      --muted: #5a6a84;
      --card: #fffdf7;
      --accent: #2dbea1;
      --accent-ink: #0f3d34;
      --line: rgba(26,42,74,.12);
      --warn: #c45c26;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh;
      font-family: "Segoe UI", Tahoma, sans-serif;
      color: var(--ink);
      background:
        radial-gradient(ellipse 60% 40% at 100% 0%, rgba(45,190,161,.14), transparent 55%),
        radial-gradient(ellipse 50% 35% at 0% 100%, rgba(248,200,48,.14), transparent 50%),
        var(--bg);
      padding: 2rem 1.25rem 3rem;
    }
    main {
      max-width: 640px; margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 1.5rem 1.35rem 1.75rem;
      box-shadow: 0 12px 40px rgba(26,42,74,.06);
    }
    h1 { margin: 0 0 .35rem; font-size: 1.45rem; }
    p.lead { margin: 0 0 1.25rem; color: var(--muted); line-height: 1.55; }
    label { display: block; font-weight: 700; margin: 1rem 0 .4rem; font-size: .92rem; }
    select, input[type=file] {
      width: 100%; padding: .65rem .75rem;
      border: 1px solid var(--line); border-radius: 10px;
      background: #fff; color: var(--ink); font: inherit;
    }
    .meta {
      margin-top: .55rem; padding: .65rem .75rem;
      background: rgba(45,190,161,.08); border-radius: 10px;
      font-size: .9rem; color: var(--accent-ink); line-height: 1.5;
    }
    .row { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; margin-top: 1rem; }
    .row label { margin: 0; font-weight: 600; display: flex; gap: .4rem; align-items: center; }
    button {
      margin-top: 1.25rem; width: 100%;
      border: 0; border-radius: 12px; padding: .85rem 1rem;
      background: var(--accent); color: #05352c;
      font-weight: 800; font-size: 1rem; cursor: pointer;
    }
    button:disabled { opacity: .55; cursor: wait; }
    #log {
      margin-top: 1.1rem; white-space: pre-wrap; direction: ltr; text-align: left;
      font-family: ui-monospace, Consolas, monospace; font-size: .82rem;
      background: #0f1a2e; color: #d7e6ff; padding: .85rem 1rem; border-radius: 12px;
      min-height: 4.5rem; max-height: 240px; overflow: auto;
    }
    .hint { font-size: .82rem; color: var(--muted); margin-top: .35rem; }
    .warn { color: var(--warn); font-size: .85rem; margin-top: .5rem; }
  </style>
</head>
<body>
  <main>
    <h1>بوت المقر المحلي</h1>
    <p class="lead">اختر الأداة من البروتوكول، ارفع صورة الأداة وصورة المقر، والبوت يسميها ويضعها ويشغّل المزامنة. السعر جاهز من المتجر.</p>
    <p id="serverStatus" class="warn" style="margin-top:0">جاري التحقق من السيرفر المحلي…</p>

    <label for="stage">الأداة / المرحلة</label>
    <select id="stage"></select>
    <div class="meta" id="meta">—</div>

    <label for="item">صورة الأداة (PNG شفاف)</label>
    <input id="item" type="file" accept="image/png,.png" />

    <label for="room">صورة المقر التراكمية (PNG)</label>
    <input id="room" type="file" accept="image/png,.png" />
    <p class="hint">أبعاد المقر المتوقعة: 1024×682</p>

    <div class="row">
      <label><input id="deploy" type="checkbox" /> نشر إلى السيرفر بعد الوضع</label>
    </div>
    <p class="warn">النشر يدفع GitHub ثم يشغّل deploy-frontend على VPS.</p>

    <button id="go" type="button">وضع الصور + مزامنة</button>
    <button id="deployOnly" type="button" style="margin-top:.6rem;background:#1a2a4a;color:#fff">نشر الملفات الحالية فقط (بدون رفع جديد)</button>
    <div id="log">جاهز.</div>
  </main>
  <script>
    const logEl = document.getElementById('log');
    const stageEl = document.getElementById('stage');
    const metaEl = document.getElementById('meta');
    const statusEl = document.getElementById('serverStatus');
    let stages = [];
    let deployPoll = null;

    function log(msg) {
      logEl.textContent = (logEl.textContent === 'جاهز.' ? '' : logEl.textContent + '\\n') + msg;
      logEl.scrollTop = logEl.scrollHeight;
    }

    function explainFetchError(e) {
      const msg = e && e.message ? e.message : String(e);
      if (msg === 'Failed to fetch' || msg === 'NetworkError when attempting to fetch resource.') {
        return 'Failed to fetch — السيرفر المحلي متوقف أو أُغلق. شغّل HQ-BOT-UI.bat واترك نافذة CMD مفتوحة، ثم أعد تحميل هذه الصفحة.';
      }
      return msg;
    }

    async function pingServer() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!res.ok) throw new Error('bad status');
        statusEl.style.color = '#0f3d34';
        statusEl.textContent = 'السيرفر المحلي يعمل على http://127.0.0.1:3921 — اترك نافذة CMD مفتوحة.';
        return true;
      } catch {
        statusEl.style.color = 'var(--warn)';
        statusEl.textContent = 'السيرفر المحلي غير متصل. شغّل HQ-BOT-UI.bat واترك النافذة مفتوحة.';
        return false;
      }
    }

    async function waitDeploy() {
      log('النشر يعمل في الخلفية (قد يستغرق 1–3 دقائق)… راقب نافذة CMD أيضًا.');
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const res = await fetch('/api/deploy-status', { cache: 'no-store' });
          const data = await res.json();
          if (data.status === 'running') {
            if (i % 5 === 0) log('… ما زال النشر جاريًا');
            continue;
          }
          if (data.status === 'ok') {
            log('اكتمل النشر بنجاح.');
            return;
          }
          if (data.status === 'error') {
            throw new Error(data.error || 'فشل النشر');
          }
          // idle with no recent run
          if (i > 2) return;
        } catch (e) {
          throw e;
        }
      }
      throw new Error('انتهت مهلة انتظار النشر — تحقق من نافذة CMD');
    }

    function refreshMeta() {
      const s = stages.find(x => String(x.stage) === stageEl.value);
      if (!s) { metaEl.textContent = '—'; return; }
      const disk = s.ready ? 'الصور موجودة ✓' : ('أداة ' + (s.itemOnDisk?'✓':'✗') + ' / مقر ' + (s.stageOnDisk?'✓':'✗'));
      metaEl.innerHTML =
        '<strong>' + s.nameAr + '</strong><br>' +
        'المفتاح: ' + s.storeSlotKey + ' · slug: ' + s.itemSlug + '<br>' +
        'السعر: ' + (s.pricePoints ?? '—') + ' نقطة (من المتجر)<br>' +
        'على القرص: ' + disk + '<br>' +
        'مسار الأداة: ' + s.itemImage + '<br>' +
        'مسار المقر: ' + s.stageImage;
    }

    async function loadStages() {
      const res = await fetch('/api/stages?profession=doctor');
      const data = await res.json();
      stages = data.stages || [];
      stageEl.innerHTML = stages.map(s => {
        const mark = s.ready ? '✓' : '·';
        return '<option value="' + s.stage + '">' + mark + ' ' + String(s.stage).padStart(2,'0') + ' — ' + s.nameAr + ' (' + s.pricePoints + ' نقطة)</option>';
      }).join('');
      const firstMissing = stages.find(s => !s.ready);
      if (firstMissing) stageEl.value = String(firstMissing.stage);
      refreshMeta();
    }

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = String(r.result || '');
          const i = s.indexOf(',');
          resolve(i >= 0 ? s.slice(i + 1) : s);
        };
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }

    stageEl.addEventListener('change', refreshMeta);

    document.getElementById('go').addEventListener('click', async () => {
      const item = document.getElementById('item').files[0];
      const room = document.getElementById('room').files[0];
      const deploy = document.getElementById('deploy').checked;
      const stage = Number(stageEl.value);
      if (!item || !room) { alert('اختر صورتي الأداة والمقر'); return; }
      const btn = document.getElementById('go');
      btn.disabled = true;
      logEl.textContent = '';
      log('رفع ومعالجة…');
      try {
        if (!(await pingServer())) throw new Error('Failed to fetch');
        const body = {
          profession: 'doctor',
          stage,
          deploy,
          itemBase64: await fileToBase64(item),
          stageBase64: await fileToBase64(room),
        };
        const res = await fetch('/api/place', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل');
        log(JSON.stringify({ ok: data.ok, result: data.result, deploy: data.deploy }, null, 2));
        await loadStages();
        if (deploy && data.deploy && data.deploy.started) {
          await waitDeploy();
        }
      } catch (e) {
        log('ERROR: ' + explainFetchError(e));
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('deployOnly').addEventListener('click', async () => {
      const btn = document.getElementById('deployOnly');
      btn.disabled = true;
      logEl.textContent = '';
      log('طلب النشر…');
      try {
        if (!(await pingServer())) throw new Error('Failed to fetch');
        const res = await fetch('/api/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'hq: deploy current headquarters assets' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل النشر');
        log(JSON.stringify(data, null, 2));
        if (data.deploy && data.deploy.started) await waitDeploy();
      } catch (e) {
        log('ERROR: ' + explainFetchError(e));
      } finally {
        btn.disabled = false;
      }
    });

    pingServer();
    setInterval(() => { void pingServer(); }, 8000);
    loadStages().catch(e => log('فشل تحميل المراحل: ' + explainFetchError(e)));
  </script>
</body>
</html>`;
}

function startUiServer() {
  let deployState: { status: "idle" | "running" | "ok" | "error"; error?: string } = {
    status: "idle",
  };

  const runDeployBackground = (message: string) => {
    if (deployState.status === "running") {
      throw new Error("نشر آخر ما زال جاريًا — انتظر حتى ينتهي");
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

    try {
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(uiHtml());
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

      if (req.method === "GET" && url.pathname === "/api/stages") {
        const profession = (url.searchParams.get("profession") || "doctor") as ProfessionCode;
        sendJson(200, { stages: listPlaceableStages(profession) });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/deploy") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = (raw ? JSON.parse(raw) : {}) as { message?: string };
        try {
          runDeployBackground(body.message || "hq: deploy current headquarters assets");
          sendJson(200, { ok: true, deploy: { started: true } });
        } catch (e) {
          sendJson(500, {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/place") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = JSON.parse(raw) as {
          profession?: ProfessionCode;
          stage?: number;
          deploy?: boolean;
          itemBase64?: string;
          stageBase64?: string;
        };

        const profession = (body.profession || "doctor") as ProfessionCode;
        const stage = Number(body.stage);
        if (!Number.isFinite(stage)) {
          sendJson(400, { error: "stage مطلوب" });
          return;
        }
        if (!body.itemBase64 || !body.stageBase64) {
          sendJson(400, { error: "الصورتان مطلوبتان" });
          return;
        }

        const result = placeHqAssets({
          profession,
          stage,
          itemBytes: Buffer.from(body.itemBase64, "base64"),
          stageBytes: Buffer.from(body.stageBase64, "base64"),
          overwrite: true,
          sync: true,
        });

        // Respond immediately — never block the browser on long VPS deploy.
        let deploy: { started?: boolean; ok?: boolean; error?: string } | null = null;
        if (body.deploy) {
          try {
            runDeployBackground(`hq: place ${profession} stage ${stage}`);
            deploy = { started: true };
          } catch (e) {
            deploy = { ok: false, error: e instanceof Error ? e.message : String(e) };
          }
        }

        sendJson(200, { ok: true, result, deploy });
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
  npm run hq:place -- --profession doctor --stage 2 --item .\\tool.png --room .\\room.png [--deploy]
`);
    return;
  }

  await runInteractive();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
