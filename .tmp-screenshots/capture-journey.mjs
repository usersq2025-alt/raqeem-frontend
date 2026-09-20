import puppeteer from "puppeteer-core";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});

async function shot(width, height, file) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/ar", { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => {
    document.getElementById("how")?.scrollIntoView({ block: "start" });
  });
  await new Promise((r) => setTimeout(r, 600));
  const el = await page.$("#how");
  if (el) {
    await el.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file });
  }
  await page.close();
  console.log("saved", file);
}

await shot(1366, 900, ".tmp-screenshots/journey-1366.png");
await shot(390, 900, ".tmp-screenshots/journey-390.png");
await browser.close();
