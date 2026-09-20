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
assert(fs.existsSync(path.join(root, "components/family/ParentGateModal.tsx")), "ParentGateModal exists");

const experienceSource = read("components/experience/ExperiencePreferencesExperience.tsx");
assert(!/email/i.test(experienceSource), "ExperiencePreferences has no account email fields");
assert(!/phone/i.test(experienceSource), "ExperiencePreferences has no phone fields");

const enMessages = fs.readFileSync(path.join(process.cwd(), "messages/en.json"), "utf8");
assert(enMessages.includes('"preferences"'), "en.json student nav preferences label");

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
