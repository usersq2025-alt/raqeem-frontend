const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// تحميل ملف .env (اختياري) دون اعتماديات إضافية. القيم الموجودة في البيئة لها الأولوية.
function loadEnv(file = path.join(ROOT, '.env')) {
  try {
    const text = fsSync.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue;
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(match[1] in process.env)) process.env[match[1]] = value;
    }
  } catch { /* لا يوجد ملف .env */ }
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function merge(base, extra) {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra || {})) {
    out[key] = isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
}

const asList = value => (Array.isArray(value) ? value : [value]).filter(Boolean);

// الإعداد = config.json ثم data/settings.json (يعدّله المستخدم من الواجهة) ثم متغيرات البيئة.
function loadConfig(dataDir) {
  let config = {};
  try { config = JSON.parse(fsSync.readFileSync(path.join(ROOT, 'config.json'), 'utf8')); } catch { /* الافتراضي */ }
  try { config = merge(config, JSON.parse(fsSync.readFileSync(path.join(dataDir, 'settings.json'), 'utf8'))); } catch { /* لا إعدادات محفوظة */ }
  config.models = config.models || {};
  if (process.env.RAQEEM_TEXT_MODEL) config.models.text = [process.env.RAQEEM_TEXT_MODEL, ...asList(config.models.text)];
  if (process.env.RAQEEM_ILLUSTRATION_MODEL) config.models.illustration = [process.env.RAQEEM_ILLUSTRATION_MODEL, ...asList(config.models.illustration)];
  if (process.env.RAQEEM_IMAGE_EDIT_MODEL) config.models.imageEdit = [process.env.RAQEEM_IMAGE_EDIT_MODEL, ...asList(config.models.imageEdit)];
  for (const key of ['text', 'imageEdit', 'illustration']) config.models[key] = [...new Set(asList(config.models[key]))];
  config.port = Number(process.env.RAQEEM_SOCIAL_BOT_PORT || config.port || 4567);
  return config;
}

const clampInt = (value, min, max, fallback) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};

// يحفظ فقط الحقول القابلة للتعديل من الواجهة، بعد التحقق منها.
async function saveSettings(dataDir, input) {
  const file = path.join(dataDir, 'settings.json');
  let current = {};
  try { current = JSON.parse(await fs.readFile(file, 'utf8')); } catch { /* جديد */ }
  const next = { ...current };
  if (input.brand) {
    const hashtags = (Array.isArray(input.brand.hashtags) ? input.brand.hashtags : [])
      .map(tag => String(tag).trim().replace(/\s+/g, '_').replace(/^#*/, '#'))
      .filter(tag => tag.length > 1 && tag.length <= 60);
    next.brand = {
      hashtags: [...new Set(hashtags)].slice(0, 30),
      cta: String(input.brand.cta || '').slice(0, 200),
    };
  }
  if (input.limits) {
    next.limits = {
      ...(current.limits || {}),
      dailyAiCalls: clampInt(input.limits.dailyAiCalls, 1, 500, 40),
      monthlyBudgetUsd: clampInt(input.limits.monthlyBudgetUsd, 1, 5000, 30),
    };
  }
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(file + '.tmp', JSON.stringify(next, null, 2));
  await fs.rename(file + '.tmp', file);
  return loadConfig(dataDir);
}

function defaultDataDir() {
  return process.env.RAQEEM_SOCIAL_DATA_DIR || path.join(ROOT, 'data');
}

module.exports = { ROOT, loadEnv, loadConfig, saveSettings, defaultDataDir };
