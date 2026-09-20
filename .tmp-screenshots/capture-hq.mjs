import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const chrome = process.env.CHROME;
const outDir = path.resolve(".tmp-screenshots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--window-size=1366,900"],
  defaultViewport: { width: 1366, height: 900 },
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:3012/tmp-hq-prototype-shots.html", { waitUntil: "networkidle0" });
await page.waitForSelector("#before img");
await page.screenshot({ path: path.join(outDir, "hq-01-before.png"), fullPage: true });

await page.evaluate(() => {
  document.getElementById("before").classList.add("hidden");
  document.getElementById("confirm").classList.remove("hidden");
  const wrap = document.createElement("div");
  wrap.id = "confirm-bg";
  wrap.className = "page";
  wrap.style.filter = "blur(1.5px)";
  wrap.style.opacity = "0.55";
  wrap.innerHTML =
    '<div><div class="stage"><img src="/images/headquarters/doctor/stages/clinic-stage-00-empty.png" width="1024" height="682" /></div></div><aside class="card"><p class="muted">شراء وإضافة للمقر</p></aside>';
  document.body.insertBefore(wrap, document.getElementById("confirm"));
});
await page.screenshot({ path: path.join(outDir, "hq-02-confirm.png"), fullPage: true });

await page.evaluate(() => {
  document.getElementById("confirm").classList.add("hidden");
  document.getElementById("confirm-bg")?.remove();
  document.getElementById("after").classList.remove("hidden");
});
await page.screenshot({ path: path.join(outDir, "hq-03-after.png"), fullPage: true });

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.evaluate(() => {
  document.getElementById("after").classList.add("hidden");
  document.getElementById("before").classList.remove("hidden");
});
await page.screenshot({ path: path.join(outDir, "hq-01-before-mobile.png"), fullPage: true });

await browser.close();
console.log("shots ok");
