import assert from "node:assert/strict";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const base = process.env.UX_QA_URL ?? "http://localhost:3010";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const route = "src/app/[locale]/add-child-qa";
await fs.mkdir(route);
await fs.writeFile(`${route}/page.tsx`, `"use client";
import { useState } from "react";
import { AddChildForm } from "@/components/forms/AddChildForm";
export default function Fixture() {
 const [saved, setSaved] = useState("");
 return <main style={{maxWidth:420,margin:"20px auto"}}><AddChildForm onSaved={setSaved} /><output id="saved">{saved}</output></main>;
}`);
let browser;
try {
  browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror",error => errors.push(error.message));
  let unlocked = false;
  let rejectSave = false;
  let pinSet = false;
  let writes = 0;
  let lastBody;
  await page.setRequestInterception(true);
  page.on("request",request => {
    const path = new URL(request.url()).pathname;
    const respond = (body,status=200) => request.respond({status,contentType:"application/json",body:JSON.stringify(body)});
    if (path === "/api/parent/guardian-mode") return respond({unlocked,pin_set:pinSet,pin_locked:false,unlock_ttl_minutes:15});
    if (path.endsWith("/verify-password") || path.endsWith("/verify-pin")) {
      unlocked = true;
      return respond({unlocked:true,suggest_pin_setup:true});
    }
    if (path === "/api/children" && request.method() === "POST") {
      writes++;
      lastBody = JSON.parse(request.postData());
      if (rejectSave) {
        rejectSave = false;
        unlocked = false;
        return respond({code:"GUARDIAN_LOCKED",message:"GUARDIAN_LOCKED"},403);
      }
      return respond({id:44,fullName:lastBody.fullName},201);
    }
    // No test writes are sent to any real account or backend.
    if (request.method() !== "GET") return request.abort();
    return request.continue();
  });
  const pause = () => new Promise(resolve => setTimeout(resolve,650));
  const pickDate = async text => {
    await page.evaluate(text => [...document.querySelectorAll('[role=option]')].find(el => el.textContent === text).focus(),text);
    await page.keyboard.press("Enter");
    await pause();
    await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent.startsWith("تأكيد")).click());
    await pause();
  };
  for (const race of [false,true]) {
    unlocked = race;
    rejectSave = race;
    pinSet = race;
    writes = 0;
    await page.goto(`${base}/ar/add-child-qa`,{waitUntil:"networkidle0"});
    await page.type('input[name=fullName]',"سارة أحمد");
    await pickDate("2016");
    await pickDate("فبراير (2)");
    await pickDate("15");
    await page.click('[aria-haspopup=listbox]');
    await page.click('ul[role=listbox] [role=option]');
    await page.click('[role=radio]');
    await page.click('form > div button[type=submit]');
    await page.waitForSelector('[role=dialog]');
    assert.equal(writes,race ? 1 : 0,"Locked guardian must not submit a new child");
    const authField = race ? '#parent-gate-pin' : '#parent-gate-password';
    await page.waitForSelector(authField);
    await page.type(authField,race ? "1234" : "test-password");
    await page.click('[role=dialog] button[type=submit]');
    await page.waitForFunction(() => !document.querySelector('[role=dialog]'));
    assert.equal(new URL(page.url()).pathname,"/ar/add-child-qa","Unlock must stay on the form");
    assert.equal(await page.$eval('input[name=fullName]',el => el.value),"سارة أحمد");
    assert((await page.$eval('form',el => el.textContent)).includes("15 فبراير 2016"),"Birth date must survive unlock");
    assert.equal(await page.$eval('[role=radio]',el => el.getAttribute('aria-checked')),"true");
    await page.click('form > div button[type=submit]');
    await page.waitForFunction(() => document.querySelector('#saved').textContent === "سارة");
    assert.deepEqual(lastBody,{fullName:"سارة أحمد",birthDate:"2016-02-15",gradeId:1,gender:"female"});
    assert.equal(writes,race ? 2 : 1,"Only the explicit save retry creates the child");
    console.log(`PASS ${race ? "expiry during save and PIN recovery" : "expired guardian and password recovery"}`);
  }
  assert.deepEqual(errors,[]);
} finally {
  await browser?.close();
  await fs.rm(`${route}/page.tsx`);
  await fs.rmdir(route);
}
