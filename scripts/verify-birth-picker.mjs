import assert from "node:assert/strict";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const base = process.env.UX_QA_URL ?? "http://localhost:3010";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const route = "src/app/[locale]/birth-picker-qa";
await fs.mkdir(route);
await fs.writeFile(`${route}/page.tsx`, `"use client";
import { useState } from "react";
import { BirthDatePicker } from "@/components/forms/BirthDatePicker";
export default function Fixture() {
  const [value, setValue] = useState("");
  return <main style={{maxWidth: 420, margin: "40px auto"}}>
    <BirthDatePicker id="birth" value={value} onChange={setValue} />
    <output id="saved">{value}</output>
  </main>;
}`);
let browser;
try {
  browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true});
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const pause = () => new Promise(resolve => setTimeout(resolve, 900));
  const pick = async (text) => {
    await page.evaluate(text => {
      const item = [...document.querySelectorAll("[role=option]")].find(el => el.textContent === text);
      if (!item || item.disabled) throw new Error(`Unavailable option: ${text}`);
      item.focus();
    }, text);
    await page.keyboard.press("Enter");
    await pause();
  };
  const phase = () => page.$eval("[role=listbox]", el => el.getAttribute("aria-label"));
  const saved = () => page.$eval("#saved", el => el.textContent);
  const confirm = () => page.click("#birth > button");
  const verifyArrows = async () => {
    const current = await page.$eval('[role=option][aria-selected=true]', el => el.textContent);
    for (const side of ["left", "right"]) {
      const target = await page.evaluate(side => {
        const selected = document.querySelector('[role=option][aria-selected=true]');
        const center = selected.getBoundingClientRect().x;
        const candidates = [...document.querySelectorAll('[role=option]:not(:disabled)')]
          .map(el => ({text:el.textContent,x:el.getBoundingClientRect().x}))
          .filter(item => side === "left" ? item.x < center - 1 : item.x > center + 1)
          .sort((a,b) => Math.abs(a.x-center)-Math.abs(b.x-center));
        const arrows = [...document.querySelector('[role=listbox]').parentElement.children].filter(el => el.tagName === "BUTTON")
          .sort((a,b) => a.getBoundingClientRect().x-b.getBoundingClientRect().x);
        const arrow = arrows[side === "left" ? 0 : 1];
        if (!candidates.length) throw new Error("Test needs a neighbour on each side");
        arrow.click();
        return candidates[0].text;
      }, side);
      await pause();
      assert.equal(await page.$eval('[role=option][aria-selected=true]', el => el.textContent),target,`${side} arrow must select the neighbouring option on its side`);
      await pick(current);
    }
  };
  for (const [locale, width, reduced] of [["ar",390,false],["en",1280,false],["ar",390,true]]) {
    await page.setViewport({width,height:844});
    await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:reduced ? "reduce" : "no-preference"}]);
    await page.goto(`${base}/${locale}/birth-picker-qa`, {waitUntil:"networkidle0"});
    await page.waitForSelector("[role=listbox]");
    await pause();
    assert(await page.$eval("#birth > button", el => el.disabled), "Initial year must require selection");
    const yearLabel = await phase();
    await pick("2015");
    await verifyArrows();
    await page.keyboard.press("ArrowLeft");
    await pause();
    assert.equal(await phase(),yearLabel,"Browsing must not advance the year step");
    const wheel = await page.$("[role=listbox]");
    await wheel.hover();
    await page.mouse.wheel({deltaY:80});
    await pause();
    assert.equal(await phase(),yearLabel,"Scrolling must not advance the year step");
    const box = await wheel.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2, {steps:8});
    await page.mouse.up();
    await pause();
    assert.equal(await phase(),yearLabel,"Dragging must not advance the year step");
    assert.equal(await page.$eval("#birth > button", el => el.disabled),false,"Confirmation must recover after dragging");
    await pick("2016");
    assert.equal(await phase(),yearLabel);
    assert.equal(await saved(),"");
    await confirm();
    await pause();
    const monthLabel = await phase();
    assert.notEqual(monthLabel,yearLabel);
    const monthOptions = await page.$$eval('[role=option]', els => els.map(el => el.textContent));
    assert.equal(monthOptions.length,12);
    monthOptions.forEach((label,index) => assert(label.endsWith(`(${index+1})`),`Month ${index+1} must include its number`));
    await pick(locale === "ar" ? "فبراير (2)" : "February (2)");
    await verifyArrows();
    assert.equal(await phase(),monthLabel,"Month requires confirmation");
    await confirm();
    await pause();
    const dayLabel = await phase();
    await pick("15");
    await verifyArrows();
    await pick("29");
    assert.equal(await phase(),dayLabel,"Day requires confirmation");
    assert.equal(await saved(),"","Unconfirmed date must not update the form");
    await confirm();
    assert.equal(await saved(),"2016-02-29");
    assert((await page.$eval('#birth', el => el.textContent)).includes('(2)'),"Confirmed date must include the month number");
    assert.equal(await page.$("[role=listbox]"),null);
    await page.click("#birth");
    await pause();
    await pick("2017");
    await confirm();
    await pause();
    await confirm();
    await pause();
    assert.equal((await page.$$eval("[role=option]", els => els.map(el => el.textContent))).includes("29"),false,"Changing leap year must invalidate the day");
    assert(await page.$eval("#birth > button", el => el.disabled));
    await pick("28");
    await page.click("#birth > div button");
    await pause();
    assert.equal(await phase(),monthLabel,"Back must stay on month until confirmation");
    assert.equal(await saved(),"2016-02-29","Editing must preserve the last confirmed date");
    console.log(`PASS ${locale}, width ${width}, reduced motion ${reduced}`);
  }
  assert.deepEqual(errors,[]);
} finally {
  await browser?.close();
  await fs.rm(`${route}/page.tsx`);
  await fs.rmdir(route);
}
