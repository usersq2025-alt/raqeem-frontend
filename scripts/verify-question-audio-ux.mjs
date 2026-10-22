import assert from "node:assert/strict";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

// Browser check of the read-aloud controls on the production components.
// Runs against a local Next dev server only. A temporary fixture route is copied in and removed afterwards.
// Audio files are synthesized tones served by request interception: no speech provider is ever called.
const base = process.env.UX_QA_URL ?? "http://localhost:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const route = "src/app/[locale]/ux-qa";
await assert.rejects(fs.access(`${route}/page.tsx`), { code: "ENOENT" });
await fs.mkdir(route, { recursive: true });
await fs.copyFile("scripts/qa/audio-fixture.tsx", `${route}/page.tsx`);
await fs.mkdir("reports/ux", { recursive: true });

function wav(seconds, hz) {
  const rate = 8000, n = Math.floor(rate * seconds), data = Buffer.alloc(44 + n * 2);
  data.write("RIFF", 0); data.writeUInt32LE(36 + n * 2, 4); data.write("WAVEfmt ", 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write("data", 36); data.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 8000), 44 + i * 2);
  return data;
}
const PIC = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#9cf"/></svg>';

const results = [];
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--autoplay-policy=document-user-activation-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  const requested = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());
    requested.push(url);
    if (url.pathname.startsWith("/qa-audio/") && url.pathname.endsWith(".wav")) {
      request.respond({ status: 200, contentType: "audio/wav", body: wav(url.pathname.includes("q.wav") ? 0.5 : 0.35, 300 + (url.pathname.length % 7) * 60) });
    } else if (url.pathname === "/qa-audio/pic.svg") {
      request.respond({ status: 200, contentType: "image/svg+xml", body: PIC });
    } else if (url.pathname.startsWith("/api/")) {
      request.respond({ status: 200, contentType: "application/json", body: "{}" });
    } else request.continue();
  });
  await page.evaluateOnNewDocument(() => {
    window.__plays = [];
    window.__pauses = 0;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.__plays.push({ path: new URL(this.src, location.href).pathname, t: performance.now() });
      return play.call(this);
    };
    const pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function () { window.__pauses += 1; return pause.call(this); };
  });

  const plays = () => page.evaluate(() => window.__plays.map((p) => p.path.replace("/qa-audio/", "").replace(".wav", "")));
  const settle = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitPlays = (count) => page.waitForFunction((count) => window.__plays.length >= count, { timeout: 15000 }, count);
  const waitIdle = async () => {
    await page.waitForFunction(() => !document.querySelector("[data-question-audio] button[aria-pressed='true']"), { timeout: 20000 });
  };
  const bodyReady = { mcq: ".play-choice-tile", "mcq-image": ".play-choice-tile", true_false: ".play-tf-flat", matching_pairs: "[data-match-left]", drag_classify: "[data-drop-zone]", ordering: "ol li", crossword: "label input" };
  const open = async (mode) => {
    await page.goto(`${base}/ar/ux-qa?mode=${mode}`, { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForSelector(bodyReady[mode], { timeout: 30000 });
    await page.waitForSelector("[data-question-audio] button");
    await settle(300);
  };
  const clickMain = () => page.evaluate(() => { window.__clickT = performance.now(); document.querySelector("[data-question-audio] button").click(); });
  const fit = async (label) => {
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal overflow`);
    const bad = await page.$$eval("button[aria-label^='استمع']", (els) => els.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width < 38 || r.height < 38 || r.left < -1 || r.right > innerWidth + 1;
    }).map((el) => el.getAttribute("aria-label") + " " + el.getBoundingClientRect().width));
    assert.deepEqual(bad, [], `${label}: speaker buttons too small or off screen`);
  };

  // What the student sees, mapped to segment keys, so the expected reading order comes from the real screen.
  const screenOrder = {
    mcq: () => page.$$eval(".play-choice-tile", (tiles) => tiles.map((t) => ({ "قطة": "a", "كلب": "b", "أرنب": "c" })[["قطة", "كلب", "أرنب"].find((x) => t.textContent.includes(x))])),
    matching_pairs: async () => ({
      left: await page.$$eval("[data-match-left]", (els) => els.map((e) => e.dataset.matchLeft)),
      right: await page.$$eval("[data-match-right]", (els) => els.map((e) => e.dataset.matchRight)),
    }),
    drag_classify: async () => ({
      tray: await page.$$eval('[data-drop-zone="tray"] .play-drag-card', (els) => els.map((e) => ({ "تفاح": "x", "جزر": "y" })[e.textContent.trim()])),
      cats: await page.$$eval("[data-drop-zone]:not([data-drop-zone='tray'])", (els) => els.map((e) => e.dataset.dropZone)),
    }),
    ordering: () => page.$$eval("button", (els) => els.filter((b) => !b.closest("ol")).map((b) => ({ "الولد": "t2", "ذهب": "t1", "المدرسة": "t3" })[b.textContent.trim()]).filter(Boolean)),
    crossword: () => page.$$eval("label", (els) => els.map((l) => (l.textContent.includes("أليف") ? "w1" : "w2"))),
  };
  const expectedReading = async (mode) => {
    if (mode === "mcq") return ["q", "sys_options", ...(await screenOrder.mcq()).flatMap((id, i) => [`sys_option_${i + 1}`, `opt_${id}`])];
    if (mode === "mcq-image") {
      // Options are shuffled on screen: the text option has a clip, the picture-only one says "picture".
      const tiles = await page.$$eval(".play-choice-tile", (els) => els.map((t) => t.textContent.includes("قطة")));
      return ["q", "alt", "sys_options", ...tiles.flatMap((isText, i) => [`sys_option_${i + 1}`, isText ? "opt_a" : "sys_picture"])];
    }
    if (mode === "true_false") return ["q", "sys_tf_choices"];
    if (mode === "matching_pairs") { const o = await screenOrder.matching_pairs(); return ["q", "sys_col_first", ...o.left.map((id) => `left_${id}`), "sys_col_second", ...o.right.map((id) => `right_${id}`)]; }
    if (mode === "drag_classify") { const o = await screenOrder.drag_classify(); return ["q", "sys_tray", ...o.tray.map((id) => `item_${id}`), "sys_categories", ...o.cats.map((id) => `cat_${id}`)]; }
    if (mode === "ordering") return ["q", "sys_ordering_bank", ...(await screenOrder.ordering()).map((id) => `tok_${id}`)];
    if (mode === "crossword") return ["q", ...(await screenOrder.crossword()).flatMap((id, i) => [`sys_clue_${i + 1}`, `clue_${id}`])];
  };

  for (const [width, height] of [[390, 844], [320, 568], [1366, 768]]) {
    await page.setViewport({ width, height, isMobile: width < 700, hasTouch: width < 700 });
    for (const mode of Object.keys(bodyReady)) {
      const before = requested.length;
      await open(mode);
      assert.deepEqual(await plays(), [], `${mode}: nothing may play before a tap (no autoplay)`);
      const audioRequests = requested.slice(before).filter((u) => u.pathname.startsWith("/qa-audio/") && u.pathname.endsWith(".wav"));
      // The stem clip may be requested (warm-up; dev mode can repeat it). No other clip may load before a tap.
      assert(audioRequests.every((u) => u.pathname === "/qa-audio/q.wav"), `${mode}: only the stem clip may be preloaded, saw ${audioRequests.map((u) => u.pathname)}`);
      assert.equal(requested.slice(before).filter((u) => !["localhost", "127.0.0.1"].includes(u.hostname)).length, 0, `${mode}: no external requests`);
      await fit(`${mode} ${width}x${height}`);

      await clickMain();
      const expected = await expectedReading(mode);
      await waitPlays(expected.length);
      await waitIdle();
      assert.deepEqual(await plays(), expected, `${mode} ${width}: reading order must match the screen`);
      const latency = await page.evaluate(() => window.__plays[0].t - window.__clickT);
      assert(latency < 150, `${mode}: playback must start immediately from stored audio (${latency.toFixed(0)}ms)`);
      if (width === 390) await page.screenshot({ path: `reports/ux/audio-${mode}-390.png` });
      results.push(`${mode} ${width}x${height}: no autoplay, screen-order reading, start in ${latency.toFixed(0)}ms, controls fit: passed`);
    }
  }

  // ---- one item at a time, stop, replay, question change, feedback ----------
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await open("mcq");
  const itemButtons = await page.$$("button[aria-label^='استمع إلى الخيار']");
  assert.equal(itemButtons.length, 3, "one speaker per option");
  const tileOrder = await screenOrder.mcq();
  await itemButtons[1].click();
  await waitPlays(1);
  assert.deepEqual(await plays(), [`opt_${tileOrder[1]}`], "an item button plays only its own clip");
  await waitIdle();
  assert.equal(await page.$$eval(".play-choice-tile:disabled", (e) => e.length), 0, "listening never selects an option");
  results.push("Per-option replay plays only that option and never selects it: passed");

  await open("mcq");
  await clickMain();
  await waitPlays(2);
  const pausesBefore = await page.evaluate(() => window.__pauses);
  await page.evaluate(() => document.querySelector("[data-question-audio] button").click()); // now "stop"
  await settle(1200);
  const afterStop = await plays();
  await settle(900);
  assert.deepEqual(await plays(), afterStop, "nothing plays after stop");
  assert((await page.evaluate(() => window.__pauses)) > pausesBefore);
  const replayButton = await page.$("[data-question-audio] button[aria-label='إعادة الاستماع']");
  assert(replayButton, "replay button appears after the first listen");
  await page.evaluate(() => { window.__plays.length = 0; });
  await replayButton.click();
  await waitPlays(1);
  assert.equal((await plays())[0], "q", "replay starts again from the question");
  results.push("Stop silences immediately; replay restarts from the question: passed");

  await page.evaluate(() => document.querySelector("[data-qa-next]").click());
  await settle(300);
  const afterNext = await plays();
  await settle(1200);
  assert.deepEqual(await plays(), afterNext, "moving to another question stops the audio and starts nothing");
  assert.equal(await page.$("[data-question-audio] button[aria-pressed='true']"), null);
  results.push("Changing question stops audio and starts nothing: passed");

  await open("mcq");
  assert.equal(await page.evaluate(() => document.body.innerText.includes("استمع إلى الشرح")), false, "no explanation audio before answering");
  await clickMain();
  await waitPlays(2);
  await page.evaluate(() => document.querySelector("[data-qa-lock]").click());
  await page.waitForFunction(() => document.body.innerText.includes("استمع إلى الشرح"));
  await settle(300);
  const afterLock = await plays();
  await settle(900);
  assert.deepEqual(await plays(), afterLock, "submitting the answer stops the question audio");
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("استمع إلى الشرح")).click());
  await waitPlays(afterLock.length + 1);
  assert.equal((await plays()).at(-1), "expl");
  results.push("Explanation audio appears only after answering and plays on tap: passed");

  // ---- keyboard only ---------------------------------------------------------
  await page.setViewport({ width: 1366, height: 768 });
  await open("mcq");
  await page.evaluate(() => { document.body.focus(); });
  let reached = false;
  for (let i = 0; i < 14 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.closest("[data-question-audio]") !== null && document.activeElement?.tagName === "BUTTON");
  }
  assert(reached, "the listen button is reachable with Tab");
  await page.keyboard.press("Enter");
  await waitPlays(1);
  await page.keyboard.press("Enter"); // stop
  await settle(500);
  let speaker = false;
  for (let i = 0; i < 12 && !speaker; i++) {
    await page.keyboard.press("Tab");
    speaker = await page.evaluate(() => document.activeElement?.getAttribute("aria-label")?.startsWith("استمع إلى الخيار"));
  }
  assert(speaker, "each option's speaker button is reachable with Tab");
  await page.evaluate(() => { window.__plays.length = 0; });
  await page.keyboard.press("Space");
  await waitPlays(1);
  assert.match((await plays())[0], /^opt_/);
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, "none", "keyboard focus is visible on the speaker button");
  results.push("Keyboard: Tab reaches the listen button and each option speaker; Enter/Space work; focus ring visible: passed");

  assert.deepEqual(errors, [], "Browser runtime errors");
  await fs.writeFile("reports/ux/audio-results.json", JSON.stringify(results, null, 2));
  console.log(results.join("\n"));
} finally {
  if (browser) await browser.close();
  await fs.unlink(`${route}/page.tsx`).catch(() => {});
  await fs.rmdir(route).catch(() => {});
}
