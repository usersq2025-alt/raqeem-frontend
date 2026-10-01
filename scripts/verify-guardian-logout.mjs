import assert from "node:assert/strict";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const base = process.env.UX_QA_URL ?? "http://localhost:3010";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const route = "src/app/[locale]/guardian-logout-qa";
await fs.mkdir(route);
await fs.writeFile(`${route}/page.tsx`, `"use client";
import { useSearchParams } from "next/navigation";
import { FamilyGuardianUnlockPanel } from "@/components/family/FamilyGuardianUnlockPanel";
export default function Fixture() {
 const params = useSearchParams();
 return <FamilyGuardianUnlockPanel seed={{id:1,fullName:"رقيم",email:null}} pinSet={params.has("pin")} pinLocked={params.has("locked")} redirectTo="/children" />;
}`);
let browser;
try {
  browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror",error => errors.push(error.message));
  let verificationRequests = 0;
  let logoutRequests = 0;
  let failNextLogout = false;
  await page.setRequestInterception(true);
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path.includes("/verify-password") || path.includes("/verify-pin")) {
      verificationRequests++;
      return request.abort();
    }
    if (request.method() === "DELETE" && path === "/api/auth/session") {
      logoutRequests++;
      if (failNextLogout) {
        failNextLogout = false;
        return request.respond({status:503,contentType:"application/json",body:'{"message":"NETWORK"}'});
      }
      return request.continue();
    }
    if (request.method() !== "GET") return request.abort();
    return request.continue();
  });
  for (const [locale,query,width] of [["ar","",390],["ar","?pin",1280],["en","?pin&locked",390]]) {
    await page.setViewport({width,height:844});
    await page.setCookie({name:"raqeem_session",value:encodeURIComponent(JSON.stringify({token:"test-only",parent:{id:1}})),url:base,httpOnly:true});
    await page.goto(`${base}/${locale}/guardian-logout-qa${query}`,{waitUntil:"networkidle0"});
    const logoutButton = '[role=dialog] > button';
    await page.waitForSelector(logoutButton);
    assert.equal(await page.$eval('input',el => el.value),"","Logout must not require a password or PIN");
    assert.equal(await page.$eval(logoutButton,el => el.disabled),false,"Logout must be available even when PIN is locked");
    if (query === "") {
      failNextLogout = true;
      await page.click(logoutButton);
      await page.waitForSelector('[role=alert]');
      assert((await page.cookies()).some(cookie => cookie.name === "raqeem_session"),"Failed logout must retain the session and allow retry");
    }
    await page.click(logoutButton);
    await page.waitForFunction(locale => location.pathname === `/${locale}/login`,{},locale);
    assert.equal((await page.cookies()).some(cookie => cookie.name === "raqeem_session"),false,"Real session endpoint must clear the cookie");
    console.log(`PASS ${locale}${query || " password mode and retry"}: logout without verification`);
  }
  assert.equal(verificationRequests,0);
  assert.equal(logoutRequests,4);
  assert.deepEqual(errors,[]);
} finally {
  await browser?.close();
  await fs.rm(`${route}/page.tsx`);
  await fs.rmdir(route);
}
