import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const base = process.env.OTP_QA_URL ?? "http://localhost:3107";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/verify-otp")) {
      return request.respond({ status: 422, contentType: "application/json", body: JSON.stringify({ message: "OTP_INVALID" }) });
    }
    return request.continue();
  });
  await page.goto(`${base}/ar/verify-otp?parentId=999999&email=test%40example.com`, { waitUntil: "networkidle0" });
  const input = "input[name=otp]";
  await page.waitForSelector(input);
  const displayed = () => page.$$eval("input[name=otp] + div span", (boxes) => boxes.map((box) => box.textContent));
  const clear = async () => {
    await page.click(input);
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
  };

  await page.type(input, "123");
  assert.equal(await page.$eval(input, (element) => element.value), "123");
  assert.deepEqual(await displayed(), ["1", "2", "3", ""]);
  await page.type(input, "4");
  assert.deepEqual(await displayed(), ["1", "2", "3", "4"]);
  await page.waitForFunction(() => !document.querySelector("input[name=otp]").disabled);

  await clear();
  await page.type(input, "١٢٣");
  assert.equal(await page.$eval(input, (element) => element.value), "123");
  assert.deepEqual(await displayed(), ["1", "2", "3", ""]);

  await clear();
  await page.type(input, "۱۲۳");
  assert.equal(await page.$eval(input, (element) => element.value), "123");
  assert.deepEqual(await displayed(), ["1", "2", "3", ""]);

  await clear();
  await page.$eval(input, (element) => {
    const transfer = new DataTransfer();
    transfer.setData("text/plain", "1 ٢-۳ 4");
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
  });
  await page.waitForFunction(() => document.querySelector("input[name=otp]").value === "1234");
  assert.deepEqual(await displayed(), ["1", "2", "3", "4"]);
  console.log("OTP keyboard, Arabic numerals, Persian numerals, visual order and paste: passed");
} finally {
  await browser.close();
}
