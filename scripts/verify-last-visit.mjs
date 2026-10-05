import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

// Run a local Next server with NEXT_PUBLIC_USE_MOCK_AUTH=true.
const base = process.env.UX_QA_URL ?? "http://localhost:3010";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const key = "raqeem:last-visit";
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror",error => errors.push(error.message));
  let verifications = 0;
  let locks = 0;
  await page.setRequestInterception(true);
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    const reply = body => request.respond({status:200,contentType:"application/json",body:JSON.stringify(body)});
    if (path === "/api/parent/guardian-mode/lock") { locks++; return reply({unlocked:false}); }
    if (path === "/api/parent/guardian-mode") return reply({unlocked:true,pin_set:false,pin_locked:false});
    if (path === "/api/parent/guardian-mode/verify-password") { verifications++; return reply({unlocked:true}); }
    if (request.method() !== "GET" && path !== "/api/auth/session") return request.abort();
    return request.continue();
  });
  const setAccount = id => page.setCookie({name:"raqeem_session",value:encodeURIComponent(JSON.stringify({token:"test-only",parent:{id,full_name:"رقيم"}})),url:base,httpOnly:true});
  await setAccount(1);
  await page.goto(`${base}/ar/settings?childId=11`,{waitUntil:"networkidle0"});
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.href === "/settings?childId=11",{},key);
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).parentId,key),1);
  await page.goto(`${base}/ar`,{waitUntil:"networkidle0"});
  await page.waitForFunction(() => location.pathname === "/ar/settings" && location.search === "?childId=11");
  assert.equal(verifications,0,"Student resume must not request parent verification");
  console.log("PASS student page and child restored");

  await page.goto(`${base}/ar/family/help`,{waitUntil:"networkidle0"});
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.href === "/family/help",{},key);
  const locksBefore = locks;
  await page.goto(`${base}/ar`,{waitUntil:"networkidle0"});
  await page.waitForSelector('#family-gate-password');
  assert.equal(new URL(page.url()).pathname,"/ar","Parent page must wait for verification even when status says unlocked");
  assert(locks > locksBefore,"Parent resume must relock guardian mode");
  await page.type('#family-gate-password',"test-password");
  await page.click('[role=dialog] button[type=submit]');
  await page.waitForFunction(() => location.pathname === "/ar/family/help");
  assert.equal(verifications,1);
  console.log("PASS parent page restored only after verification");

  await setAccount(2);
  await page.goto(`${base}/ar`,{waitUntil:"networkidle0"});
  await page.waitForSelector('#family-gate-password');
  await page.type('#family-gate-password',"test-password");
  await page.click('[role=dialog] button[type=submit]');
  await page.waitForFunction(() => location.pathname === "/ar/children");
  console.log("PASS another account cannot resume the previous account's page");

  for (const href of ["https://example.com", "//example.com", "/settings?childId=0", "/login", "/api/children"]) {
    await page.evaluate(({key,href}) => localStorage.setItem(key,JSON.stringify({parentId:2,href,area:"student"})),{key,href});
    await page.goto(`${base}/ar`,{waitUntil:"networkidle0"});
    await page.waitForSelector('#family-gate-password');
    assert.equal(new URL(page.url()).pathname,"/ar");
  }
  console.log("PASS invalid and external destinations rejected");
  await page.click('[role=dialog] > button');
  await page.waitForFunction(() => location.pathname === "/ar/login");
  assert.equal(await page.evaluate(key => localStorage.getItem(key),key),null,"Logout must clear remembered location");
  assert.equal((await page.cookies()).some(cookie => cookie.name === "raqeem_session"),false);
  console.log("PASS logout clears remembered location and session");
  assert.deepEqual(errors,[]);
} finally {
  await browser.close();
}
