import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_EXPERIENCE_PREFS,
  EXPERIENCE_PREFS_STORAGE_KEY,
  readExperiencePrefs,
  writeExperiencePrefs,
} from "../src/lib/experience/experiencePrefs";

const root = path.join(process.cwd(), "src");

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

const studentNav = read("components/StudentNav.tsx");
assert(studentNav.includes('"preferences"'), "StudentNav uses preferences nav key");
assert(studentNav.includes("parentGate"), "StudentNav references parent gate labels");
assert(studentNav.includes("md:hidden"), "StudentNav keeps desktop sidebar hidden on mobile");
assert(fs.existsSync(path.join(root, "components/family/ParentGateModal.tsx")), "ParentGateModal exists");

const studentShell = read("components/StudentShell.tsx");
assert(studentShell.includes("max-w-full"), "StudentShell uses max-w-full for content");
assert(studentShell.includes("min-w-0"), "StudentShell uses min-w-0 to prevent sidebar bleed");
assert(studentShell.includes("overflow-x-hidden"), "StudentShell prevents horizontal page scroll");
assert(!studentShell.includes("max-w-lg"), "StudentShell no longer clamps mobile content to max-w-lg");

const familySettings = read("components/family/FamilySettingsExperience.tsx");
assert(familySettings.includes("loadAccount"), "Family settings loads account independently");
assert(familySettings.includes("loadChildren"), "Family settings loads children independently");
assert(familySettings.includes("/family/help#faq"), "Family help uses real anchors");
assert(!/\bPromise\.all\b/.test(familySettings), "Family settings does not fail-all via Promise.all");

assert(fs.existsSync(path.join(root, "app/[locale]/family/help/page.tsx")), "Family help page exists");

const experienceSource = read("components/experience/ExperiencePreferencesExperience.tsx");
assert(!/email/i.test(experienceSource), "ExperiencePreferences has no account email fields");
assert(!/phone/i.test(experienceSource), "ExperiencePreferences has no phone fields");
assert(experienceSource.includes('role="radiogroup"'), "ExperiencePreferences uses radiogroup for size/contrast");
assert(experienceSource.includes("aria-checked"), "ExperiencePreferences exposes aria-checked");

const languageSwitcher = read("components/LanguageSwitcher.tsx");
assert(!languageSwitcher.includes(">AR<") && !languageSwitcher.includes(">EN<"), "LanguageSwitcher does not use AR/EN abbreviations");
assert(languageSwitcher.includes('t("langAr")') && languageSwitcher.includes('t("langEn")'), "LanguageSwitcher uses full language names");

const enMessages = fs.readFileSync(path.join(process.cwd(), "messages/en.json"), "utf8");
assert(enMessages.includes('"preferences"'), "en.json student nav preferences label");
assert(enMessages.includes('"savedChanges"'), "en.json has savedChanges copy");
assert(enMessages.includes("Preference saved on this device"), "en.json device preference flash copy");
assert(enMessages.includes('"familyHelp"'), "en.json has familyHelp section");

const arMessages = fs.readFileSync(path.join(process.cwd(), "messages/ar.json"), "utf8");
assert(arMessages.includes("تم حفظ التفضيل على هذا الجهاز"), "ar.json device preference flash copy");
assert(arMessages.includes('"retry"'), "ar.json has retry label in family settings");

// localStorage roundtrip (in-memory stub)
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  key: () => null,
  length: 0,
};

const sample = { ...DEFAULT_EXPERIENCE_PREFS, sfx: false, textSize: "large" as const };
writeExperiencePrefs(sample);
const roundtrip = readExperiencePrefs();
assert(roundtrip.sfx === false && roundtrip.textSize === "large", "experience prefs localStorage roundtrip");
assert(store.has(EXPERIENCE_PREFS_STORAGE_KEY), "experience prefs uses raqeem:experience-prefs key");

if (failed > 0) {
  process.exit(1);
}

console.log("All settings-separation checks passed.");
