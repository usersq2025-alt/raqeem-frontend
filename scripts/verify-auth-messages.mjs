import fs from "node:fs";

// Every translation key used by the auth screens must exist in both languages.
const ar = JSON.parse(fs.readFileSync("messages/ar.json", "utf8"));
const en = JSON.parse(fs.readFileSync("messages/en.json", "utf8"));
const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
const files = [
  "src/components/forms/SmsPhoneLoginForm.tsx",
  "src/components/forms/RegisterForm.tsx",
  "src/components/forms/LoginForm.tsx",
  "src/components/forms/VerifyOtpForm.tsx",
  "src/components/AccountSuccessView.tsx",
];
let missing = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  // A file may bind the same name (t) to different namespaces in different components.
  const hooks = {};
  for (const m of source.matchAll(/const (\w+) = useTranslations\("([^"]+)"\)/g)) (hooks[m[1]] ??= []).push(m[2]);
  for (const match of source.matchAll(/\b(\w+)\("([A-Za-z]+(?:\.[A-Za-z]+)*)"/g)) {
    const namespaces = hooks[match[1]];
    if (!namespaces) continue;
    for (const [language, messages] of [["ar", ar], ["en", en]]) {
      if (!namespaces.some((namespace) => get(messages, `${namespace}.${match[2]}`) !== undefined)) { console.log(`MISSING ${language} ${file}: ${match[2]}`); missing += 1; }
    }
  }
  // dynamic keys: t(`notice.${transient}.title`) etc.
}
for (const kind of ["unavailable", "network", "unknown"]) {
  for (const messages of [ar, en]) if (!get(messages, `phoneAuth.notice.${kind}.title`)) { console.log("MISSING notice", kind); missing += 1; }
}
for (const option of ["phone", "email"]) for (const messages of [ar, en]) if (!get(messages, `phoneAuth.registerMethod.${option}`)) missing += 1;
for (const option of ["phone", "password"]) for (const messages of [ar, en]) if (!get(messages, `phoneAuth.loginMethod.${option}`)) missing += 1;
console.log(missing ? `${missing} missing` : "auth messages: all keys present in ar and en");
process.exit(missing ? 1 : 0);
