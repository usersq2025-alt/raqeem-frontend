import assert from "node:assert/strict";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const route = "src/app/[locale]/ux-qa";
await assert.rejects(fs.access(`${route}/page.tsx`), { code: "ENOENT" });
await fs.mkdir(route, { recursive: true });
await fs.copyFile("scripts/qa/ux-fixture.tsx", `${route}/page.tsx`);

let browser;
try {
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/ar/ux-qa?childId=1&mode=matching_shared", { waitUntil: "networkidle0", timeout: 90000 });
  await page.waitForSelector('[data-match-right="external"]');
  await page.click('[data-match-right="external"]');
  await page.click('[data-match-left="clam"]');
  await page.click('[data-match-left="spider"]');
  await page.waitForFunction(() => {
    const matches = JSON.parse(document.querySelector('[data-qa-answer]').textContent)?.matches;
    return matches?.clam === "external" && matches?.spider === "external";
  });
  assert.equal(await page.$eval('[data-match-right="external"] > span:last-child', (el) => el.textContent), "2");
  await page.click('[data-match-right="internal"]');
  await page.click('[data-match-left="bird"]');
  const matches = await page.$eval('[data-qa-answer]', (el) => JSON.parse(el.textContent).matches);
  assert.deepEqual(matches, { clam: "external", spider: "external", bird: "internal" });
  assert.equal(await page.$eval('[data-qa-submit]', (el) => el.disabled), false);
  console.log("Shared matching passed: two items connected to one answer and submission enabled.");
} finally {
  await browser?.close();
  await fs.rm(route, { recursive: true, force: true });
}
