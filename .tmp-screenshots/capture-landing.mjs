import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const chrome = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outDir = path.resolve(".tmp-screenshots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900 },
});

async function measure(width, height, name) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:3000/ar", { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector("main");
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
  await page.close();
  return docHeight;
}

const desktop = await measure(1440, 900, "landing-desktop-full.png");
const w620 = await measure(620, 900, "landing-620-full.png");
const w390 = await measure(390, 844, "landing-390-full.png");

// interactive crop-ish: desktop mid page
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:3000/ar", { waitUntil: "networkidle0", timeout: 60000 });
await page.evaluate(() => {
  document.getElementById("journey-showcase")?.scrollIntoView({ block: "start" });
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(outDir, "landing-showcase.png") });
await page.close();

await browser.close();
console.log(JSON.stringify({ desktop, w620, w390 }, null, 2));

