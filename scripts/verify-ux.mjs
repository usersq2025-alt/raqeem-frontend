import assert from "node:assert/strict";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

// Run against a local Next dev server only. The fixture route is temporary;
// it imports production components and never sends writes to the backend.
const base = process.env.UX_QA_URL ?? "http://localhost:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const route = "src/app/[locale]/ux-qa";
await assert.rejects(fs.access(`${route}/page.tsx`), { code: "ENOENT" });
await fs.mkdir(route, { recursive: true });
await fs.copyFile("scripts/qa/ux-fixture.tsx", `${route}/page.tsx`);
await fs.mkdir("reports/ux", { recursive: true });
let browser;
const results = [];
try {
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    const attempt = { id: 11, lesson_id: 1, status: "in_progress", total_questions: 2, answered_count: 0, current_question_id: 1, battery_segments_remaining: 1, battery_segments_total: 3, points_earned: 0 };
    if (pathname === "/api/lessons/1/attempts/start") {
      if (request.frame().url().includes("mode=lesson-recharge")) {
        request.respond({ status: 423, contentType: "application/json", body: JSON.stringify({ retry_after_seconds: 1 }) });
      } else {
        request.respond({ status: 200, contentType: "application/json", body: JSON.stringify(attempt) });
      }
    } else if (pathname === "/api/attempts/11/current-question") {
      request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ id: 1, game_type: "mcq", question_text: "أي إجابة صحيحة؟", payload: fixturesForLesson }) });
    } else if (pathname === "/api/attempts/11/answer") {
      request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ attempt: { ...attempt, status: "battery_depleted", answered_count: 1, battery_segments_remaining: 0, recharge_ends_at: new Date(Date.now() + 600000).toISOString() }, is_correct: false, feedback: { correct_option_id: "b", explanation: "الإجابة الثانية تحقق القاعدة." } }) });
    } else if (pathname.startsWith("/api/")) {
      const child = { id: 1, full_name: "طالب التجربة", grade_id: 4, points_balance: 120, profession_code: "doctor", gender: "male" };
      request.respond({ status: 200, contentType: "application/json", body: JSON.stringify(request.url().includes("children") ? [child] : { current_streak: 3 }) });
    } else request.continue();
  });
  const fixturesForLesson = { options: [{ id: "a", text: "الإجابة الأولى" }, { id: "b", text: "الإجابة الثانية" }] };
  const open = async (mode, locale = "ar") => {
    await page.goto(`${base}/${locale}/ux-qa?childId=1&mode=${mode}`, { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForSelector(mode === "store" ? ".store-card" : mode === "headquarters" ? ".hq-stage-card" : mode === "settings" ? "h1" : mode === "subjects" ? ".subject-card" : mode === "journey" ? ".student-journey-dashboard" : "[data-qa-answer]", { timeout: 30000 });
  };
  const clickText = async (text) => {
    const button = await page.evaluateHandle((text) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === text), text);
    assert(await button.asElement(), `Missing button ${text}`);
    await button.asElement().click();
    await button.dispose();
  };
  const answer = () => page.$eval("[data-qa-answer]", (el) => JSON.parse(el.textContent));
  const fit = async (label) => {
    const overflow = await page.evaluate(() => [...document.querySelectorAll("main, .store-card, [data-play-question-pill], .play-bin, [data-match-left], [data-match-right]")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width && (r.left < -1 || r.right > innerWidth + 1);
    }).map((el) => el.tagName + "." + el.className));
    assert.deepEqual(overflow, [], `${label}: clipped content`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal overflow`);
  };
  for (const [width, height] of [[1920,1080],[1366,768],[1024,600],[768,1024],[390,844],[320,568],[1280,420]]) {
    await page.setViewport({ width, height });
    for (const mode of ["journey","subjects","store","headquarters","mcq","true_false","matching_pairs","drag_classify","ordering","crossword"]) {
      await open(mode);
      await fit(`${mode} ${width}x${height}`);
      if (mode === "subjects") {
        assert.equal(await page.$$eval(".subject-card:disabled", (els) => els.length), 6);
        assert(await page.$eval(".subject-card:not(:disabled)", (el) => el.textContent.includes("العلوم")));
        assert(await page.$eval(".subject-card:disabled", (el) => el.textContent.includes("قريبًا")));
      }
      if (mode === "store" && width >= 768) {
        const sidebar = await page.$eval("aside[aria-label]", (el) => ({ height: el.getBoundingClientRect().height, top: el.getBoundingClientRect().top }));
        assert.equal(sidebar.height, height);
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        assert.equal(await page.$eval("aside[aria-label]", (el) => el.getBoundingClientRect().top), 0);
        await page.evaluate(() => scrollTo(0, 0));
      }
      if ([390,1366,768].includes(width)) await page.screenshot({ path: `reports/ux/${mode}-${width}.png`, fullPage: false });
      results.push(`${mode} ${width}x${height}: passed`);
    }
  }
  await page.setViewport({ width: 390, height: 844 });
  await open("ordering");
  for (const token of ["A","B","C","D","E"]) await clickText(token);
  assert.deepEqual((await answer()).order, ["A","B","C","D","E"]);
  await clickText("C");
  assert.deepEqual((await answer()).order, ["A","B"]);
  for (const token of ["E","D","C"]) await clickText(token);
  assert.deepEqual((await answer()).order, ["A","B","E","D","C"]);
  await clickText("A");
  assert.deepEqual((await answer()).order, []);
  results.push("Ordering: suffix returns together and rebuilds: passed");
  await open("mcq");
  await page.click(".play-choice-tile");
  await page.click("[data-qa-submit]");
  assert.equal(await page.$$eval(".play-choice-tile:disabled", (els) => els.length), 2);
  assert.equal(await page.$$eval(".play-choice-tile.border-emerald-400", (els) => els.length), 1);
  await page.screenshot({ path: "reports/ux/mcq-feedback.png" });
  results.push("MCQ: correct choice revealed, inputs locked: passed");
  await open("true_false");
  await page.click(".play-tf-flat:nth-child(2)");
  await page.click("[data-qa-submit]");
  assert.equal(await page.$$eval(".play-tf-flat.border-emerald-400", (els) => els.length), 1);
  results.push("True/false: correct choice revealed after wrong answer: passed");
  await open("crossword");
  const crosswordInputs = await page.$$("input");
  await crosswordInputs[0].type("كلب");
  await crosswordInputs[1].type("قمر");
  await page.click("[data-qa-submit]");
  assert(await page.evaluate(() => document.body.innerText.includes("قطة")));
  assert.equal(await page.$$eval("input:disabled", (els) => els.length), 2);
  results.push("Crossword: wrong word shows expected answer in place: passed");
  await open("drag_classify");
  await clickText("تفاح");
  await page.click('[data-drop-zone="b"] > button');
  assert.equal((await answer()).assignments.x, "b");
  await clickText("جزر");
  await page.click('[data-drop-zone="a"] > button');
  await page.click("[data-qa-submit]");
  assert(await page.$eval('[data-drop-zone="b"] .play-drag-card', (el) => el.textContent.includes("الفاكهة")));
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.screenshot({ path: "reports/ux/classification-feedback.png" });
  results.push("Classification: tap fallback and correct destination label: passed");
  await open("matching_pairs");
  await page.click('[data-match-left="a"]'); await page.click('[data-match-right="x"]');
  await page.waitForFunction(() => JSON.parse(document.querySelector('[data-qa-answer]').textContent)?.matches?.a === "x");
  await page.click('[data-match-left="b"]'); await page.click('[data-match-right="y"]');
  await page.waitForFunction(() => JSON.parse(document.querySelector('[data-qa-answer]').textContent)?.matches?.b === "y");
  await page.click("[data-qa-submit]");
  const badges = await page.evaluate(() => ['[data-match-left="a"]','[data-match-right="y"]'].map((s) => document.querySelector(s).querySelector('span').textContent));
  assert.equal(badges[0], badges[1]);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.screenshot({ path: "reports/ux/matching-feedback.png" });
  results.push("Matching: correct pair has same symbol: passed");
  await open("settings");
  assert(!await page.evaluate(() => document.body.innerText.includes("تقليل الحركة")));
  await open("store");
  await page.click(".store-card button:not(:disabled)");
  await page.waitForSelector('[role="dialog"]');
  assert(await page.$eval('[role="dialog"]', (el) => el.textContent.includes("سجادة نبض")));
  await clickText("إلغاء");
  assert.equal(await page.$$eval('[role="dialog"]', (els) => els.length), 0);
  results.push("Store: purchase confirmation shows item and can be canceled: passed");
  await page.goto(`${base}/ar/ux-qa?childId=1&mode=lesson-flow`, { waitUntil: "networkidle0", timeout: 90000 });
  await page.waitForSelector(".play-choice-tile");
  await page.evaluate(() => [...document.querySelectorAll(".play-choice-tile")].find((el) => el.textContent.includes("الإجابة الأولى")).click());
  await clickText("تحقق");
  await page.waitForSelector(".play-feedback-banner");
  assert(await page.evaluate(() => document.body.innerText.includes("الإجابة الثانية")));
  assert(await page.evaluate(() => document.body.innerText.includes("الإجابة الثانية تحقق القاعدة.")));
  await new Promise((resolve) => setTimeout(resolve, 4100));
  assert(await page.$(".play-feedback-banner"), "Wrong-answer feedback should remain visible");
  assert(!await page.evaluate(() => document.body.innerText.includes("خذ استراحة قصيرة!")));
  await clickText("فهمت الإجابة، خذ استراحة");
  await page.waitForFunction(() => document.body.innerText.includes("خذ استراحة قصيرة!"));
  results.push("Lesson flow: wrong answer remains until acknowledged, then recharge: passed");
  await page.goto(`${base}/ar/ux-qa?childId=1&mode=lesson-recharge`, { waitUntil: "networkidle0", timeout: 90000 });
  await page.waitForFunction(() => document.body.innerText.includes("خذ استراحة قصيرة!"));
  await page.waitForFunction(() => document.body.innerText.includes("انتهت الاستراحة، أكمل الدرس"));
  results.push("Lesson entry: active recharge is visible and offers resume after timer: passed");
  await page.setViewport({ width: 1366, height: 768 });
  await open("store", "en"); await fit("English LTR store");
  assert.deepEqual(errors, [], "Browser runtime errors");
  await fs.writeFile("reports/ux/results.json", JSON.stringify(results, null, 2));
  console.log(results.join("\n"));
} finally {
  if (browser) await browser.close();
  await fs.unlink(`${route}/page.tsx`);
  await fs.rmdir(route);
}
