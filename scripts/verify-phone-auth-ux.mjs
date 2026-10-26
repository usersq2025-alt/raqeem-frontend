import assert from "node:assert/strict";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

// Browser checks for the sign-up / log-in flow. Every backend call is answered by a
// local stub: no SMS is sent and no real account is read or written.
// Start the app with an EMPTY NEXT_PUBLIC_API_URL so API calls stay on this origin:
//   NEXT_PUBLIC_API_URL= npx next dev -p 3107
const base = process.env.AUTH_QA_URL ?? "http://localhost:3107";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
// When the app under test calls its API on another origin (e.g. a LAN preview), name it here.
const apiOrigin = process.env.AUTH_QA_API_ORIGIN ?? base;
const shots = "reports/phone-auth";
await fs.mkdir(shots, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});

const API = new Set(["/register", "/register/phone", "/register/phone/resend", "/login", "/login/sms/request", "/login/sms/verify", "/verify-otp", "/verify-otp/resend", "/forgot-password", "/reset-password"]);
const CHALLENGE = "11111111-1111-4111-8111-111111111111";
const results = [];
const calls = [];
let stub = {};
let channelDelay = 0;

async function newPage({ width = 390, height = 844, locale = "ar" } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width, height, isMobile: true, hasTouch: true });
  // Lets a test move the page clock forward (e.g. let a code expire) without waiting.
  await page.evaluateOnNewDocument(() => {
    window.__skew = 0;
    const realNow = Date.now.bind(Date);
    Date.now = () => realNow() + window.__skew;
  });
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
  });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.origin !== base && url.origin !== apiOrigin) return request.abort();
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    let pathname = url.pathname;
    if (url.origin !== base) {
      if (request.method() === "OPTIONS") return request.respond({ status: 204, headers: cors });
      pathname = pathname.replace(/^\/api/, "");
    }
    if (url.pathname === "/api/auth/channels" && url.origin === base) {
      if (channelDelay) await new Promise((resolve) => setTimeout(resolve, channelDelay));
      return request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ whatsapp: false, sms: true }) });
    }
    if (request.method() === "POST" && url.pathname === "/api/auth/session" && url.origin === base) {
      // The real route validates the token against the backend; the stub stands in for it.
      const payload = JSON.parse(request.postData());
      await page.setCookie({ name: "raqeem_session", value: encodeURIComponent(JSON.stringify(payload)), url: base });
      return request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    if (request.method() === "POST" && API.has(pathname)) {
      const body = request.postData() ? JSON.parse(request.postData()) : {};
      calls.push({ path: pathname, body });
      const handler = stub[pathname];
      const answer = handler ? await handler(body, calls.filter((c) => c.path === pathname).length) : { status: 500, body: {} };
      if (answer.delay) await new Promise((resolve) => setTimeout(resolve, answer.delay));
      if (answer.abort) return request.abort("failed");
      return request.respond({
        status: answer.status,
        contentType: "application/json",
        headers: { ...cors, ...(answer.headers ?? {}) },
        body: JSON.stringify(answer.body ?? {}),
      });
    }
    return request.continue();
  });
  return { page, context, pageErrors, locale };
}

const sent = (resendAfter = 60, extra = {}) => ({ status: 202, body: { challenge_id: CHALLENGE, expires_in: 300, resend_after: resendAfter, ...extra } });
const text = (page) => page.evaluate(() => document.body.innerText);
const visible = (page, selector) => page.$eval(selector, (el) => el.getClientRects().length > 0).catch(() => false);

async function fill(page, selector, value) {
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  if (value) await page.type(selector, value);
}

async function openPhoneRegister(page, locale = "ar") {
  await page.goto(`${base}/${locale}/register`, { waitUntil: "networkidle0" });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.reload({ waitUntil: "networkidle0" });
  const phoneButton = await page.waitForSelector("input[name=registerMethod]");
  assert(phoneButton);
  await page.evaluate(() => document.querySelector("input[name=registerMethod][value=phone]").click());
  await page.waitForSelector("#sms-phone");
}

async function fillRegister(page, phone, { terms = true } = {}) {
  await fill(page, "#sms-full-name", "أحمد محمد");
  await fill(page, "#sms-phone", phone);
  await fill(page, "#sms-password", "secret12");
  const checked = await page.$eval("#sms-terms", (el) => el.checked);
  if (terms !== checked) await page.click("#sms-terms");
}

const submitButton = (page) => page.$("form button[type=submit]");
const isDisabled = async (page) => (await submitButton(page)).evaluate((el) => el.disabled);
const settle = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

async function check(name, run) {
  const started = Date.now();
  try {
    await run();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`FAIL  ${name}\n      ${error.message.split("\n")[0]}`);
  }
}

try {
  await check("paused number: changing the number clears the stale block without switching method", async () => {
    stub = { "/register/phone": (body) => (body.phone === "+963944000001" ? { status: 423, body: { code: "VERIFICATION_SUPPORT_REQUIRED", support_required: true, support_url: "https://wa.me/963946794390" } } : sent()) };
    const { page, context, pageErrors } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0944000001");
    await page.screenshot({ path: `${shots}/01-register-phone-form.png` });
    await page.click("form button[type=submit]");
    await page.waitForFunction(() => document.body.innerText.includes("توقف إرسال الرموز لهذا الرقم"));
    assert(await isDisabled(page), "send must stop for the paused number");
    const t = await text(page);
    assert(t.includes("التواصل مع الدعم"), "support action must be offered");
    assert(!t.includes("غير موجود"), "must not say anything about the account");
    await page.screenshot({ path: `${shots}/02-paused-number.png` });
    await fill(page, "#sms-phone", "0955000002");
    assert(!(await text(page)).includes("توقف إرسال الرموز لهذا الرقم"), "old block must disappear");
    assert(!(await isDisabled(page)), "send must be enabled for the new number");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    assert((await text(page)).includes("0955000002"));
    assert.deepEqual(pageErrors, []);
    await context.close();
  });

  await check("a late answer for the old number cannot change the new number", async () => {
    stub = { "/register/phone": (body) => (body.phone === "+963944000004" ? { ...sent(), delay: 1500 } : sent()) };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0944000004");
    await page.click("form button[type=submit]");
    await settle(200);
    await fill(page, "#sms-phone", "0955000005");
    await settle(2000);
    assert(!(await visible(page, "input[name=otp]")), "the old request must not open the code step for the new number");
    assert.equal(await page.$eval("#sms-phone", (el) => el.value), "0955000005");
    assert(!(await isDisabled(page)), "new number must be sendable");
    await context.close();
  });

  await check("registered number: clear sign-in action, number carried to log-in without URL leakage", async () => {
    stub = { "/register/phone": () => ({ status: 422, body: { message: "PHONE_TAKEN", code: "PHONE_TAKEN", errors: { phone: ["taken"] } } }) };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0944000003");
    await page.click("form button[type=submit]");
    await page.waitForFunction(() => document.body.innerText.includes("هذا الرقم مسجّل في رقيم."));
    assert((await text(page)).includes("سجّل الدخول إلى حسابك."));
    await page.screenshot({ path: `${shots}/03-number-registered.png` });
    await page.evaluate(() => [...document.querySelectorAll("[role=alert] a")].find((a) => a.getAttribute("href")?.endsWith("/login")).click());
    await page.waitForFunction(() => location.pathname.endsWith("/login"));
    await page.waitForSelector("#sms-phone");
    const url = page.url();
    assert(url.endsWith("/ar/login"), url);
    assert(!url.includes("944000003"), "number must not be in the URL");
    assert((await page.$eval("#sms-phone", (el) => el.value)).endsWith("944000003"));
    await page.screenshot({ path: `${shots}/04-login-phone-prefilled.png` });
    await context.close();
  });

  await check("long resend wait is explained and separate from the 5-minute code validity", async () => {
    stub = { "/register/phone": () => sent(7200) };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000006");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    const t = await text(page);
    assert(t.includes("إعادة الإرسال بعد ساعتين"), `wait must be shown as a readable duration: ${t.replace(/\n+/g, " | ").slice(0, 500)}`);
    assert(!t.includes("7200"), "no raw seconds");
    assert(!t.includes("ينتهي الرمز خلال"), "no permanent validity line in the normal state");
    await page.evaluate(() => [...document.querySelectorAll("summary")].find((s) => s.textContent.includes("لم يصلك الرمز")).click());
    assert((await text(page)).includes("تزداد مدة الانتظار"), "reason for a long wait is one tap away");
    const resendButton = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("إعادة إرسال الرمز")));
    assert(!resendButton, "no resend button during the wait, only the countdown");
    assert(await visible(page, "[role=timer]"), "countdown present")
    await page.screenshot({ path: `${shots}/05-code-step-long-wait.png` });
    await context.close();
  });

  await check("wrong code is reported next to the field and the field is ready again", async () => {
    stub = { "/register/phone": () => sent(), "/login/sms/verify": () => ({ status: 422, body: { message: "x" } }) };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000007");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    await page.type("input[name=otp]", "1234");
    await page.waitForSelector("#sms-code-error");
    assert((await page.$eval("#sms-code-error", (el) => el.getAttribute("role"))) === "alert");
    assert((await text(page)).includes("الرمز غير صحيح أو منتهٍ"));
    assert.equal(await page.$eval("input[name=otp]", (el) => el.value), "");
    await page.screenshot({ path: `${shots}/06-wrong-code.png` });
    await context.close();
  });

  await check("successful phone sign-up reaches the success page with accurate sign-in guidance", async () => {
    stub = {
      "/register/phone": () => sent(),
      "/login/sms/verify": () => ({ status: 200, body: { token: "test-token", parent: { id: 9, public_id: "RQMP-123456", email: null, full_name: "أحمد" } } }),
    };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000008");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    await page.type("input[name=otp]", "4321");
    await page.waitForFunction(() => location.pathname.endsWith("/account-success"), { timeout: 15000 });
    await page.waitForSelector("#sign-in-ways");
    assert(!(await text(page)).includes("RQMP-123456"), "the ID is a secondary section, closed by default");
    await page.evaluate(() => document.querySelector("details summary").click());
    const t = await text(page);
    assert(t.includes("حسابك جاهز!"));
    assert(t.includes("RQMP-123456"));
    assert(t.includes("رقم هاتفك مع رمز SMS"), "phone sign-in must be described");
    const href = await page.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent.includes("إضافة طفلي"))?.getAttribute("href"));
    assert(href?.endsWith("/add-child"), String(href));
    await settle(2500);
    await page.screenshot({ path: `${shots}/07-success-phone.png`, fullPage: true });
    await context.close();
  });

  await check("double press sends one request; network failure keeps the input and can be retried", async () => {
    let attempts = 0;
    stub = { "/register/phone": () => { attempts += 1; return attempts === 1 ? { abort: true } : sent(); } };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000009");
    await page.evaluate(() => { const form = document.querySelector("form"); form.requestSubmit(); form.requestSubmit(); });
    await page.waitForFunction(() => document.body.innerText.includes("لا يوجد اتصال"));
    assert.equal(calls.filter((c) => c.path === "/register/phone" && c.body.phone === "+963955000009").length, 1, "duplicate request");
    assert.equal(await page.$eval("#sms-full-name", (el) => el.value), "أحمد محمد", "input must be kept");
    assert(!(await isDisabled(page)), "retry must be possible");
    await page.screenshot({ path: `${shots}/08-network-error.png` });
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    await context.close();
  });

  await check("rate limit shows a readable countdown and keeps it tied to that number", async () => {
    stub = { "/register/phone": (body) => (body.phone === "+963955000010" ? { status: 429, body: { code: "VERIFICATION_COOLDOWN", retry_after: 65 } } : sent()) };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000010");
    await page.click("form button[type=submit]");
    await page.waitForFunction(() => /المتابعة بعد 1:0\d/.test(document.querySelector("form button[type=submit]").textContent));
    assert(await isDisabled(page), "disabled while waiting, with the countdown on the button itself");
    assert(!(await page.$("[role=alert]")), "a normal wait needs no extra message");
    await fill(page, "#sms-phone", "0955000011");
    assert(!/المتابعة بعد/.test(await page.$eval("form button[type=submit]", (el) => el.textContent)), "other number must not inherit the wait");
    assert(!(await isDisabled(page)));
    await context.close();
  });

  await check("email already registered: login is the primary action and the email is carried over", async () => {
    stub = { "/register": () => ({ status: 422, body: { message: "The email has already been taken.", errors: { email: ["taken"] } } }) };
    const { page, context } = await newPage();
    await page.goto(`${base}/ar/register`, { waitUntil: "networkidle0" });
    await page.waitForSelector("input[name=registerMethod]");
    await page.evaluate(() => document.querySelector("input[name=registerMethod][value=email]").click());
    await page.waitForSelector("#fullName");
    await fill(page, "#fullName", "أحمد محمد");
    await fill(page, "#email", "parent@example.com");
    await page.evaluate(() => document.querySelector("#password")?.focus());
    await page.type("#password", "secret12");
    await page.click("#acceptedTerms", { offset: { x: 1, y: 1 } }).catch(() => {});
    await page.evaluate(() => { const box = document.querySelector("#acceptedTerms"); if (!box.checked) box.click(); });
    await page.click("form button[type=submit]");
    await page.waitForSelector("#email-taken");
    assert((await text(page)).includes("هذا البريد مسجّل في رقيم."));
    await page.screenshot({ path: `${shots}/09-email-registered.png` });
    await page.evaluate(() => document.querySelector("#email-taken a").click());
    await page.waitForSelector("#login");
    assert.equal(await page.$eval("#login", (el) => el.value), "parent@example.com");
    assert(!page.url().includes("parent"), "email must not be in the URL");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "password");
    await context.close();
  });

  await check("login page: both ways of signing in and creating an account are visible; empty submit explains what is missing", async () => {
    const { page, context } = await newPage();
    await page.goto(`${base}/ar/login`, { waitUntil: "networkidle0" });
    await page.waitForSelector("input[name=loginMethod]");
    await page.evaluate(() => document.querySelector("input[name=loginMethod][value=password]").click());
    await page.waitForSelector("#login");
    const t = await text(page);
    assert(t.includes("تسجيل الدخول") && t.includes("إنشاء حساب"));
    await page.evaluate(() => document.querySelector("form button[type=submit]").click());
    await page.waitForSelector("#login-error");
    assert((await page.$eval("#login-error", (el) => el.textContent)).includes("اكتب بريدك"));
    await page.screenshot({ path: `${shots}/10-login-empty-submit.png` });
    await context.close();
  });

  await check("English and LTR render, with no horizontal overflow at 360px", async () => {
    const { page, context } = await newPage({ width: 360, height: 640 });
    for (const [path, expected] of [["/en/register", "Create a parent account"], ["/en/login", "Log in"], ["/ar/register", "إنشاء حساب ولي أمر"]]) {
      await page.goto(`${base}${path}`, { waitUntil: "networkidle0" });
      assert((await text(page)).includes(expected), `${path} title`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(overflow <= 0, `${path} overflows by ${overflow}px`);
    }
    await page.goto(`${base}/en/register`, { waitUntil: "networkidle0" });
    assert.equal(await page.evaluate(() => document.querySelector("main")?.getAttribute("dir")), "ltr");
    await page.evaluate(() => document.querySelector("input[name=registerMethod][value=phone]").click());
    await page.waitForSelector("#sms-phone");
    const overlap = await page.evaluate(() => { const i = document.querySelector("#sms-phone"); const pad = parseFloat(getComputedStyle(i).paddingLeft); return pad; });
    assert(overlap >= 40, `LTR phone field text overlaps its icon (padding-left ${overlap}px)`);
    await page.screenshot({ path: `${shots}/11-register-en-360.png`, fullPage: true });
    await context.close();
  });

  await check("every visible form control has an accessible name and a 16px+ font", async () => {
    stub = { "/register/phone": () => sent() };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000012");
    const bad = await page.evaluate(() => {
      const problems = [];
      for (const el of document.querySelectorAll("form input, form button")) {
        if (!el.getClientRects().length || el.type === "hidden") continue;
        const name = el.getAttribute("aria-label") || el.labels?.[0]?.textContent?.trim() || el.textContent?.trim();
        if (!name) problems.push(`no name: ${el.outerHTML.slice(0, 80)}`);
        if (["text", "tel", "password", "email"].includes(el.type) && parseFloat(getComputedStyle(el).fontSize) < 16) problems.push(`small font: ${el.id}`);
      }
      return problems;
    });
    assert.deepEqual(bad, []);
    await context.close();
  });

  const CONTRAST = () => {
    const lum = ([r, g, b]) => { const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const rgbs = (s) => [...s.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].map((m) => [+m[1], +m[2], +m[3]]);
    return (el) => {
      const s = getComputedStyle(el);
      const brightness = Number(/brightness\(([\d.]+)\)/.exec(s.filter)?.[1] ?? 1);
      const stops = (s.backgroundImage !== "none" ? rgbs(s.backgroundImage) : rgbs(s.backgroundColor)).map((c) => c.map((v) => Math.min(255, v * brightness)));
      const text = rgbs(s.color)[0];
      return Math.min(...stops.map((c) => ratio(text, c)));
    };
  };

  await check("button contrast is at least 4.5:1 normal, hover and disabled; focus indicator is navy", async () => {
    stub = { "/register/phone": () => ({ status: 423, body: { support_required: true } }) };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    const measure = (selector) => page.evaluate((fn, sel) => new Function(`return (${fn})()`)()(document.querySelector(sel)), CONTRAST.toString(), selector);
    await fillRegister(page, "0944000001");
    const sticker = await measure("form button[type=submit]");
    assert(sticker >= 4.5, `sticker ${sticker.toFixed(2)}`);
    await page.hover("form button[type=submit]");
    await settle(400);
    const hover = await measure("form button[type=submit]");
    assert(hover >= 4.5, `hover ${hover.toFixed(2)}`);
    await page.focus("#sms-full-name");
    await page.keyboard.down("Shift"); await page.keyboard.press("Tab"); await page.keyboard.up("Shift");
    await page.keyboard.press("Tab");
    await page.focus("form button[type=submit]");
    const focus = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { tag: document.activeElement.tagName, style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor }; });
    assert(focus.tag === "BUTTON" && focus.style !== "none" && focus.width >= 2, `focus outline ${JSON.stringify(focus)}`);
    assert.equal(focus.color, "rgb(26, 43, 71)", "focus outline must be navy (14:1 on white)");
    await page.click("form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("form button[type=submit]").disabled);
    const disabled = await measure("form button[type=submit]");
    assert(disabled >= 4.5, `disabled ${disabled.toFixed(2)}`);
    // The gradient button of the email form.
    await page.evaluate(() => document.querySelector("input[name=registerMethod][value=email]").click());
    await page.waitForSelector("#fullName");
    const hero = await measure("form button[type=submit]");
    assert(hero >= 4.5, `hero ${hero.toFixed(2)}`);
    await context.close();
  });
  await check("keyboard only: logical tab order, Enter submits, visible focus on every stop", async () => {
    stub = { "/register/phone": () => sent() };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    const order = [];
    await page.focus("#sms-full-name");
    for (let i = 0; i < 4; i++) {
      order.push(await page.evaluate(() => document.activeElement.id || document.activeElement.tagName));
      await page.keyboard.press("Tab");
    }
    assert.deepEqual(order.slice(0, 2), ["sms-full-name", "sms-phone"], order.join(","));
    assert(order.includes("sms-password"), order.join(","));
    const unfocusable = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll("form input:not([type=hidden]), form button, form a")) {
        el.focus();
        const s = getComputedStyle(el);
        const ring = s.outlineStyle !== "none" || s.boxShadow !== "none";
        if (document.activeElement === el && !ring) bad.push(el.id || el.textContent.trim().slice(0, 20));
      }
      return bad;
    });
    assert.deepEqual(unfocusable, [], "focused controls with no visible indicator");
    await fillRegister(page, "0955000013");
    await page.focus("#sms-phone");
    await page.keyboard.press("Enter");
    await page.waitForSelector("input[name=otp]");
    await context.close();
  });

  await check("edit number after the code step keeps other data and focuses the phone; navigating away keeps the draft", async () => {
    stub = { "/register/phone": () => sent() };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000014");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    assert(!(await page.$("input[name=registerMethod]")), "method choice must be hidden while a code is pending");
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("تعديل الرقم")).click());
    await page.waitForSelector("#sms-phone");
    assert.equal(await page.evaluate(() => document.activeElement.id), "sms-phone");
    assert.equal(await page.$eval("#sms-full-name", (el) => el.value), "أحمد محمد");
    assert.equal(await page.$eval("#sms-phone", (el) => el.value), "0955000014");
    assert.equal(await page.$eval("#sms-password", (el) => el.value), "secret12", "in-memory password kept for the retry");
    await fill(page, "#sms-phone", "0955000015");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    assert((await text(page)).includes("0955000015"));
    await page.evaluate(() => { sessionStorage.removeItem("raqeem.register.phoneChallenge.v1"); });
    await page.goto(`${base}/ar/login`, { waitUntil: "networkidle0" });
    await page.goto(`${base}/ar/register`, { waitUntil: "networkidle0" });
    await page.waitForSelector("input[name=registerMethod]");
    await page.evaluate(() => document.querySelector("input[name=registerMethod][value=phone]").click());
    await page.waitForSelector("#sms-full-name");
    assert.equal(await page.$eval("#sms-full-name", (el) => el.value), "أحمد محمد", "name draft should survive navigating away");
    await context.close();
  });

  await check("method choice is a real radio group; space is held while loading (no layout shift); the form fits the first screen", async () => {
    channelDelay = 1200;
    const { page, context } = await newPage();
    await page.goto(`${base}/ar/register`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-auth-skeleton]");
    const titleBefore = await page.$eval("h1", (el) => Math.round(el.getBoundingClientRect().top));
    await page.waitForSelector("input[name=registerMethod]", { timeout: 15000 });
    await settle(600);
    channelDelay = 0;
    const titleAfter = await page.$eval("h1", (el) => Math.round(el.getBoundingClientRect().top));
    assert.equal(titleBefore, titleAfter, "title moved when the methods appeared");
    const cls = await page.evaluate(() => window.__cls);
    assert(cls < 0.05, `layout shift score ${cls}`);
    const group = await page.evaluate(() => {
      const radios = [...document.querySelectorAll("input[name=registerMethod]")];
      const fs = radios[0].closest("fieldset");
      return { n: radios.length, legend: fs?.querySelector("legend")?.textContent, type: radios[0].type, legendHidden: getComputedStyle(fs.querySelector("legend")).position === "absolute" };
    });
    assert.deepEqual([group.n, group.type], [2, "radio"]);
    assert(group.legend && group.legendHidden, "group has a legend for screen readers, not a visible heading");
    assert.equal(await page.$eval("input[name=registerMethod]:checked", (el) => el.value), "phone", "phone is the default when SMS is available");
    await page.focus("input[name=registerMethod]");
    await page.keyboard.press("ArrowLeft");
    assert(["phone", "email"].includes(await page.evaluate(() => document.querySelector("input[name=registerMethod]:checked").value)));
    await page.evaluate(() => document.querySelector("input[name=registerMethod][value=phone]").click());
    await page.waitForSelector("#sms-phone");
    const bottom = await page.$eval("form button[type=submit]", (el) => Math.round(el.getBoundingClientRect().bottom));
    assert(bottom <= 844, `submit button ends at ${bottom}px on an 844px screen`);
    await page.screenshot({ path: `${shots}/12-register-first-screen.png` });
    await context.close();
  });

  await check("phone log-in: one title, one primary action, linking is a help path not a default option", async () => {
    stub = { "/login/sms/request": () => sent() };
    const { page, context } = await newPage();
    await page.goto(`${base}/ar/login`, { waitUntil: "networkidle0" });
    await page.waitForSelector("#sms-phone");
    const t = await text(page);
    assert(!t.includes("سعداء بعودتك"), "no generic welcome line");
    assert.equal(await page.$$eval("h1", (els) => els.length), 1);
    assert.equal(await page.$$eval("ol", (els) => els.length), 0, "no step strip on log-in");
    assert.equal(await page.$$eval("a[href$='/register']", (els) => els.length), 1, "one way to switch to sign-up, not two");
    assert.equal(await page.$$eval("form input[type=checkbox]", (els) => els.length), 0, "no technical checkbox");
    assert.equal(await page.$("#sms-login"), null, "account fields hidden in the normal path");
    assert.equal(await page.$$eval("form button[type=submit]", (els) => els.length), 1, "one primary action");
    assert(!t.includes("اختر طريقة"), "no 'choose a method' heading");
    await page.screenshot({ path: `${shots}/13-login-phone.png` });
    await page.evaluate(() => [...document.querySelectorAll("summary")].find((s) => s.textContent.includes("مشكلة في الدخول بالهاتف")).click());
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("ربط رقمي بحساب موجود")).click());
    await page.waitForSelector("#sms-login");
    assert((await text(page)).includes("ربط رقمك بحسابك"));
    await page.screenshot({ path: `${shots}/14-login-link-number.png` });
    await fill(page, "#sms-phone", "0955000020");
    await fill(page, "#sms-login", "RQMP-123456");
    await fill(page, "#sms-password", "secret12");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    const body = calls.filter((c) => c.path === "/login/sms/request").pop().body;
    assert.deepEqual([body.login, body.password], ["RQMP-123456", "secret12"]);
    await context.close();
  });

  await check("sign-up screen: one title, no steps, no repeated intro, password rule only while typing", async () => {
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    const t = await text(page);
    assert.equal(await page.$$eval("h1", (els) => els.length), 1);
    assert.equal(await page.$$eval("ol", (els) => els.length), 0, "no step strip");
    assert(!t.includes("اختر طريقة") && !t.includes("أنشئ حسابك كولي أمر"), "no repeated intro");
    assert.equal(await page.$$eval("a[href$='/login']", (els) => els.length), 1, "one way to switch to log-in");
    assert(!t.includes("6 أحرف"), "password rule hidden until needed");
    await page.focus("#sms-password");
    assert((await text(page)).includes("6 أحرف على الأقل"), "rule appears on focus");
    await page.type("#sms-password", "abc");
    await page.evaluate(() => document.querySelector("#sms-terms").focus());
    await page.click("form button[type=submit]");
    await page.waitForSelector("#sms-password-error");
    assert.equal(await page.$$eval("[id^=sms-password]", (els) => els.filter((el) => el.tagName === "P").length), 1, "one message for one problem");
    assert.equal(await page.$eval("form button[type=submit]", (el) => el.textContent.trim()), "متابعة");
    await page.screenshot({ path: `${shots}/15-register-errors.png` });
    await context.close();
  });
  await check("code step has one visible title; the sign-up title steps aside", async () => {
    stub = { "/register/phone": () => sent() };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000030");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    const heads = await page.evaluate(() => [...document.querySelectorAll("h1, h2")].filter((h) => { const r = h.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(h).position !== "absolute"; }).map((h) => h.textContent.trim()));
    assert.deepEqual(heads, ["أدخل رمز التحقق"]);
    assert.equal(await page.$$eval("h1", (els) => els.length), 1, "the page still has its h1 for assistive tech");
    await context.close();
  });

  await check("recovery: one 'forgot log-in details' entry that opens both options", async () => {
    const { page, context } = await newPage();
    await page.goto(`${base}/ar/login`, { waitUntil: "networkidle0" });
    await page.waitForSelector("input[name=loginMethod]");
    await page.evaluate(() => document.querySelector("input[name=loginMethod][value=password]").click());
    await page.waitForSelector("#login");
    const hidden = await page.evaluate(() => [...document.querySelectorAll("a")].filter((a) => /forgot/.test(a.getAttribute("href") ?? "") && a.checkVisibility()).length);
    assert.equal(hidden, 0, "recovery links are inside the closed section");
    await page.evaluate(() => [...document.querySelectorAll("summary")].find((s) => s.textContent.includes("نسيت بيانات الدخول")).click());
    const links = await page.evaluate(() => [...document.querySelectorAll("a")].filter((a) => /forgot/.test(a.getAttribute("href") ?? "") && a.checkVisibility()).map((a) => a.textContent.trim()));
    assert.deepEqual(links, ["نسيت كلمة السر؟", "نسيت معرّف الحساب؟"]);
    await page.screenshot({ path: `${shots}/16-login-email-recovery.png` });
    await context.close();
  });

  await check("method default: phone for a new visitor, the last choice for a returning one", async () => {
    const { page, context } = await newPage();
    await page.goto(`${base}/ar/login`, { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("input[name=loginMethod]");
    assert.equal(await page.$eval("input[name=loginMethod]:checked", (el) => el.value), "phone");
    const labels = await page.$$eval("input[name=loginMethod]", (els) => els.map((el) => el.closest("label").textContent.replace("✓", "").trim()));
    assert.deepEqual(labels, ["الهاتف", "البريد أو المعرّف"], "both methods keep a visible label");
    await page.evaluate(() => document.querySelector("input[name=loginMethod][value=password]").click());
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#login");
    assert.equal(await page.$eval("input[name=loginMethod]:checked", (el) => el.value), "password", "returning user keeps the email/ID choice");
    await page.goto(`${base}/ar/register`, { waitUntil: "networkidle0" });
    await page.waitForSelector("input[name=registerMethod]");
    assert.equal(await page.$eval("input[name=registerMethod]:checked", (el) => el.value), "email", "the same remembered choice applies on sign-up");
    await context.close();
  });

  await check("secondary-state action uses the navy variant and keeps contrast", async () => {
    stub = { "/register/phone": () => ({ status: 422, body: { message: "PHONE_TAKEN", code: "PHONE_TAKEN" } }) };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0944000031");
    await page.click("form button[type=submit]");
    await page.waitForSelector("[role=alert] a.btn-sticker-navy");
    const measure = (selector) => page.evaluate((fn, sel) => new Function(`return (${fn})()`)()(document.querySelector(sel)), CONTRAST.toString(), selector);
    const ratio = await measure("[role=alert] a.btn-sticker-navy");
    assert(ratio >= 4.5, `navy variant ${ratio.toFixed(2)}`);
    await context.close();
  });

  for (const [name, viewport, locale] of [["short-ar", { width: 360, height: 640 }, "ar"], ["short-en", { width: 360, height: 640 }, "en"], ["keyboard-open-ar", { width: 360, height: 380 }, "ar"]]) {
    await check(`final review (${name}): code step, errors and long texts stay readable and reachable`, async () => {
      stub = { "/register/phone": (body) => (body.phone === "+963944000032" ? { status: 422, body: { message: "PHONE_TAKEN", code: "PHONE_TAKEN" } } : sent(7200)) };
      const { page, context } = await newPage({ ...viewport });
      const overflow = async (label) => { const px = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(px <= 0, `${label} overflows by ${px}px`); };
      await openPhoneRegister(page, locale);
      await overflow("form");
      // field errors (empty submit)
      await page.click("form button[type=submit]");
      await page.waitForSelector("#sms-full-name-error");
      await overflow("errors");
      if (viewport.height > 500) await page.screenshot({ path: `${shots}/final-${name}-1-errors.png`, fullPage: true });
      // every field can be focused and ends up inside the visible area (keyboard open emulation)
      for (const id of ["#sms-full-name", "#sms-phone", "#sms-password"]) {
        await page.focus(id);
        await settle(150);
        const inView = await page.$eval(id, (el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; });
        assert(inView, `${id} hidden when focused`);
      }
      // registered number notice
      await fillRegister(page, "0944000032");
      await page.click("form button[type=submit]");
      await page.waitForSelector("[role=alert] a.btn-sticker-navy");
      await overflow("taken notice");
      if (viewport.height > 500) await page.screenshot({ path: `${shots}/final-${name}-2-taken.png`, fullPage: true });
      // long wait on the code step
      await fill(page, "#sms-phone", "0955000033");
      await page.click("form button[type=submit]");
      await page.waitForSelector("input[name=otp]");
      await overflow("code step");
      await page.evaluate(() => [...document.querySelectorAll("summary")][0].click());
      await overflow("code step help open");
      const reachable = await page.evaluate(() => [...document.querySelectorAll("form button, form summary, form a")].every((el) => { el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return r.width > 0 && r.height >= 40 || el.tagName === "A" || !el.getClientRects().length; }));
      assert(reachable, "controls smaller than 40px high");
      if (viewport.height > 500) await page.screenshot({ path: `${shots}/final-${name}-3-code.png`, fullPage: true });
      await context.close();
    });
  }
  await check("log-in code step: no method choice and one visible title above the code field", async () => {
    stub = { "/login/sms/request": () => sent() };
    const { page, context } = await newPage();
    await page.goto(`${base}/ar/login`, { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#sms-phone");
    await fill(page, "#sms-phone", "0955000040");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    assert.equal(await page.$("input[name=loginMethod]"), null, "method choice hidden during verification");
    const heads = await page.evaluate(() => [...document.querySelectorAll("h1, h2")].filter((h) => { const r = h.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(h).position !== "absolute"; }).map((h) => h.textContent.trim()));
    assert.deepEqual(heads, ["أدخل رمز التحقق"]);
    await page.screenshot({ path: `${shots}/17-login-code-step.png` });
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("تعديل الرقم")).click());
    await page.waitForSelector("input[name=loginMethod]");
    assert((await text(page)).includes("تسجيل الدخول"), "title and method choice return when editing the number");
    await context.close();
  });
  await check("back to the same number resumes the pending code at once, without sending another", async () => {
    stub = { "/register/phone": () => sent() };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000051");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("تعديل الرقم")).click());
    await page.waitForSelector("#sms-phone");
    const label = await page.$eval("form button[type=submit]", (el) => ({ text: el.textContent.trim(), disabled: el.disabled }));
    assert.deepEqual(label, { text: "متابعة إدخال الرمز", disabled: false });
    const before = calls.filter((c) => c.path === "/register/phone" && c.body.phone === "+963955000051").length;
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    assert.equal(calls.filter((c) => c.path === "/register/phone" && c.body.phone === "+963955000051").length, before, "no new message");
    // a different number is a new request, not a resume
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("تعديل الرقم")).click());
    await page.waitForSelector("#sms-phone");
    await fill(page, "#sms-phone", "0955000052");
    assert.notEqual(await page.$eval("form button[type=submit]", (el) => el.textContent.trim()), "متابعة إدخال الرمز");
    await context.close();
  });

  await check("reload restores the verification step and number for sign-up and for log-in", async () => {
    stub = { "/register/phone": () => sent(), "/login/sms/request": () => sent() };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000053");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("input[name=otp]");
    assert((await text(page)).includes("0955000053"), "number restored");
    assert.equal(await page.$eval("input[name=otp]", (el) => el.disabled), false, "code can still be entered");
    // log-in
    await page.goto(`${base}/ar/login`, { waitUntil: "networkidle0" });
    await page.waitForSelector("#sms-phone");
    await fill(page, "#sms-phone", "0955000054");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("input[name=otp]");
    assert((await text(page)).includes("0955000054"), "log-in number restored");
    await context.close();
  });

  await check("expired code: 'send a new code' is the primary action and confirm is disabled", async () => {
    stub = { "/register/phone": () => sent(), "/register/phone/resend": () => sent() };
    const { page, context } = await newPage();
    await openPhoneRegister(page);
    await fillRegister(page, "0955000055");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    await page.evaluate(() => { window.__skew = 6 * 60 * 1000; });
    await page.waitForFunction(() => document.body.innerText.includes("انتهت صلاحية الرمز"), { timeout: 8000 });
    const state = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("form button")].filter((b) => b.getClientRects().length);
      return { otpDisabled: document.querySelector("input[name=otp]").disabled, labels: buttons.map((b) => `${b.textContent.trim()}|${b.disabled}`) };
    });
    assert(state.otpDisabled, "code field disabled once expired");
    assert.deepEqual(state.labels.filter((l) => !l.startsWith("تعديل")).slice(0, 2), ["إرسال رمز جديد|false", "تأكيد الرمز|true"], state.labels.join(" ; "));
    await page.screenshot({ path: `${shots}/18-code-expired.png` });
    await page.evaluate(() => [...document.querySelectorAll("form button")].find((b) => b.textContent.trim() === "إرسال رمز جديد").click());
    await page.waitForFunction(() => !document.querySelector("input[name=otp]").disabled, { timeout: 8000 });
    await context.close();
  });

  await check("email verification page: expired code makes 'resend' primary and disables confirm", async () => {
    const { page, context } = await newPage();
    await page.goto(`${base}/ar/register`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.setItem("raqeem:otp-issued:9", String(Date.now() - 6 * 60 * 1000)));
    await page.goto(`${base}/ar/verify-otp?parentId=9&email=a%40b.com`, { waitUntil: "networkidle0" });
    await page.waitForSelector("input[name=otp]");
    await page.waitForFunction(() => document.querySelector("input[name=otp]").disabled, { timeout: 8000 });
    const labels = await page.evaluate(() => [...document.querySelectorAll("form button.hero-cta")].map((b) => `${b.textContent.trim()}|${b.disabled}`));
    assert.equal(labels.length, 2, labels.join(" ; "));
    assert(labels[0].endsWith("|false") && labels[1].endsWith("|true"), labels.join(" ; "));
    await page.screenshot({ path: `${shots}/19-email-code-expired.png` });
    await context.close();
  });

  await check("password reset by phone: neutral title and an SMS hint, never 'check your email'", async () => {
    stub = { "/forgot-password": () => ({ status: 200, body: { message: "ok" } }) };
    const { page, context } = await newPage();
    await page.goto(`${base}/ar/forgot-password`, { waitUntil: "networkidle0" });
    await page.waitForSelector("#reset-login");
    await page.type("#reset-login", "0955000056");
    await page.click("form button[type=submit]");
    await page.waitForSelector("input[name=otp]");
    const t = await text(page);
    assert(t.includes("أدخل رمز التحقق"), "neutral title");
    assert(!t.includes("بريدك الإلكتروني"), "must not mention email for a phone");
    assert(t.includes("SMS") && t.includes("0955000056"), "SMS hint with the number");
    await page.screenshot({ path: `${shots}/21-reset-by-phone.png` });
    await context.close();
  });
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
await fs.writeFile(`${shots}/results.json`, JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
if (failed.length) process.exit(1);
