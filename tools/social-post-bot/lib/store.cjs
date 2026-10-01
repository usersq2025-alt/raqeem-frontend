const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const ID_PATTERN = /^[a-f0-9]{24,32}$/;
const MEDIA_TTL_MS = 2 * 60 * 60 * 1000;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const newId = () => crypto.randomBytes(12).toString('hex');
const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const dayKey = (date = new Date()) => {
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// تخزين محلي بسيط: ملفات JSON تُكتب ذريًا، وكل ملف له طابور كتابة لتفادي التداخل.
function createStore(dataDir, getConfig) {
  const dirs = {
    images: path.join(dataDir, 'images'),
    thumbs: path.join(dataDir, 'thumbs'),
    cache: path.join(dataDir, 'ai-cache'),
    media: path.join(dataDir, 'media'),
  };
  const files = {
    history: path.join(dataDir, 'history.json'),
    queue: path.join(dataDir, 'queue.json'),
    usage: path.join(dataDir, 'usage.json'),
  };
  const locks = new Map();
  let ready;

  function init() {
    if (!ready) ready = Promise.all(Object.values(dirs).map(dir => fs.mkdir(dir, { recursive: true })));
    return ready;
  }

  async function readJson(file, fallback) {
    await init();
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return fallback;
      if (error instanceof SyntaxError) {
        // ملف تالف: نحتفظ بنسخة منه ونبدأ من جديد بدل إيقاف البوت.
        await fs.rename(file, `${file}.corrupt-${Date.now()}`).catch(() => {});
        return fallback;
      }
      throw error;
    }
  }

  async function writeJson(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, file);
  }

  // يشغّل fn بعد انتهاء كل العمليات السابقة على الملف نفسه.
  function withLock(file, task) {
    const previous = locks.get(file) || Promise.resolve();
    const run = previous.catch(() => {}).then(task);
    locks.set(file, run.catch(() => {}));
    return run;
  }

  async function update(file, fallback, mutate) {
    return withLock(file, async () => {
      const current = await readJson(file, fallback);
      const result = await mutate(current);
      await writeJson(file, current);
      return result;
    });
  }

  /* ---------- السجل ---------- */
  const imagePath = id => path.join(dirs.images, `${id}.png`);
  const thumbPath = id => path.join(dirs.thumbs, `${id}.webp`);
  const assertId = id => { if (!ID_PATTERN.test(String(id))) throw fail(400, 'معرّف غير صالح.'); return id; };

  async function addHistory(fields, png) {
    await init();
    const hash = sha256(png);
    const meta = await sharp(png).metadata();
    const existing = await withLock(files.history, async () => {
      const list = await readJson(files.history, []);
      const hit = list.find(item => item.sha === hash);
      if (hit) Object.assign(hit, cleanFields(fields), { updatedAt: new Date().toISOString() });
      if (hit) await writeJson(files.history, list);
      return hit;
    });
    if (existing) return existing;

    const id = newId();
    await fs.writeFile(imagePath(id), png);
    await sharp(png).resize({ width: 360 }).webp({ quality: 78 }).toFile(thumbPath(id));
    const item = {
      id, sha: hash,
      kind: fields.kind === 'text' ? 'text' : 'photo',
      width: meta.width, height: meta.height, bytes: png.length,
      status: 'draft',
      createdAt: new Date().toISOString(),
      ...cleanFields(fields),
    };
    await update(files.history, [], async list => { list.unshift(item); });
    await prune();
    return item;
  }

  function cleanFields(fields) {
    const out = {};
    if (fields.title !== undefined) out.title = String(fields.title).slice(0, 200);
    if (fields.caption !== undefined) out.caption = String(fields.caption).slice(0, 2200);
    if (Array.isArray(fields.hashtags)) out.hashtags = fields.hashtags.map(String).slice(0, 30);
    if (fields.meta && typeof fields.meta === 'object') out.meta = JSON.parse(JSON.stringify(fields.meta).slice(0, 20000));
    if (fields.groupId) out.groupId = String(fields.groupId).slice(0, 40);
    if (Number.isInteger(fields.slideIndex)) out.slideIndex = fields.slideIndex;
    return out;
  }

  async function listHistory({ q = '', kind = '', status = '', limit = 60, offset = 0 } = {}) {
    const list = await readJson(files.history, []);
    const needle = String(q).trim().toLowerCase();
    const filtered = list.filter(item =>
      (!kind || item.kind === kind)
      && (!status || item.status === status)
      && (!needle || `${item.title || ''} ${item.caption || ''}`.toLowerCase().includes(needle)));
    return {
      total: filtered.length,
      items: filtered.slice(offset, offset + Math.min(200, limit)).map(({ sha, ...rest }) => rest),
    };
  }

  async function getHistory(id) {
    assertId(id);
    const item = (await readJson(files.history, [])).find(entry => entry.id === id);
    if (!item) throw fail(404, 'العنصر غير موجود في السجل.');
    return item;
  }

  async function readImage(id) {
    await getHistory(id);
    try { return await fs.readFile(imagePath(id)); } catch { throw fail(404, 'ملف الصورة مفقود من مجلد البيانات.'); }
  }

  async function readThumb(id) {
    await getHistory(id);
    try { return await fs.readFile(thumbPath(id)); } catch { throw fail(404, 'المعاينة مفقودة.'); }
  }

  async function patchHistory(id, patch) {
    assertId(id);
    return update(files.history, [], async list => {
      const item = list.find(entry => entry.id === id);
      if (!item) throw fail(404, 'العنصر غير موجود في السجل.');
      const fields = cleanFields(patch);
      Object.assign(item, fields, { updatedAt: new Date().toISOString() });
      if (['draft', 'scheduled', 'published'].includes(patch.status)) item.status = patch.status;
      if (patch.publishedAt) item.publishedAt = patch.publishedAt;
      return item;
    });
  }

  async function deleteHistory(id) {
    assertId(id);
    await update(files.history, [], async list => {
      const index = list.findIndex(entry => entry.id === id);
      if (index < 0) throw fail(404, 'العنصر غير موجود في السجل.');
      list.splice(index, 1);
    });
    await fs.rm(imagePath(id), { force: true });
    await fs.rm(thumbPath(id), { force: true });
  }

  async function prune() {
    const max = getConfig().limits?.historyMax || 500;
    const queue = await readJson(files.queue, []);
    const pinned = new Set(queue.filter(item => ['approved', 'publishing', 'draft'].includes(item.status)).flatMap(item => item.historyIds));
    const removed = [];
    await update(files.history, [], async list => {
      while (list.length > max) {
        const index = [...list.keys()].reverse().find(i => !pinned.has(list[i].id));
        if (index === undefined) break;
        removed.push(list.splice(index, 1)[0].id);
      }
    });
    for (const id of removed) {
      await fs.rm(imagePath(id), { force: true });
      await fs.rm(thumbPath(id), { force: true });
    }
  }

  /* ---------- الطابور ---------- */
  const listQueue = () => readJson(files.queue, []);

  async function getQueue(id) {
    assertId(id);
    const item = (await listQueue()).find(entry => entry.id === id);
    if (!item) throw fail(404, 'عنصر الجدولة غير موجود.');
    return item;
  }

  async function addQueue(fields) {
    const item = {
      id: newId(), status: 'draft', attempts: 0, results: {}, createdAt: new Date().toISOString(), ...fields,
    };
    await update(files.queue, [], async list => { list.push(item); });
    return item;
  }

  // mutate يستلم العنصر ويعدّله (أو يرمي خطأ). يعيد العنصر بعد الحفظ.
  async function updateQueue(id, mutate) {
    assertId(id);
    return update(files.queue, [], async list => {
      const item = list.find(entry => entry.id === id);
      if (!item) throw fail(404, 'عنصر الجدولة غير موجود.');
      await mutate(item);
      item.updatedAt = new Date().toISOString();
      return { ...item };
    });
  }

  async function deleteQueue(id) {
    assertId(id);
    await update(files.queue, [], async list => {
      const index = list.findIndex(entry => entry.id === id);
      if (index < 0) throw fail(404, 'عنصر الجدولة غير موجود.');
      list.splice(index, 1);
    });
  }

  /* ---------- الاستهلاك والتكلفة ---------- */
  const costKey = kind => {
    const map = {
      'image-edit:medium': 'imageEditMedium', 'image-edit:high': 'imageEditHigh',
      'illustration:medium': 'illustrationMedium', 'illustration:high': 'illustrationHigh',
      text: 'text', caption: 'caption',
    };
    return map[kind];
  };
  const costOf = kind => Number(getConfig().costsUsd?.[costKey(kind)] || 0);

  async function usageSummary(now = new Date()) {
    const usage = await readJson(files.usage, { days: {} });
    const today = usage.days[dayKey(now)] || { calls: 0, cost: 0 };
    const month = dayKey(now).slice(0, 7);
    const monthCost = Object.entries(usage.days)
      .filter(([key]) => key.startsWith(month))
      .reduce((sum, [, day]) => sum + day.cost, 0);
    const limits = getConfig().limits || {};
    return {
      today: { calls: today.calls, cost: Number(today.cost.toFixed(2)) },
      monthCost: Number(monthCost.toFixed(2)),
      dailyAiCalls: limits.dailyAiCalls, monthlyBudgetUsd: limits.monthlyBudgetUsd,
      costsUsd: getConfig().costsUsd,
    };
  }

  async function usageCheck(kind, now = new Date()) {
    const summary = await usageSummary(now);
    if (summary.today.calls >= summary.dailyAiCalls) {
      throw fail(429, `وصلت إلى الحد اليومي لطلبات الذكاء الاصطناعي (${summary.dailyAiCalls}). يمكنك رفعه من «الإعدادات» أو المتابعة غدًا.`);
    }
    if (summary.monthCost + costOf(kind) > summary.monthlyBudgetUsd) {
      throw fail(429, `هذا الطلب سيتجاوز ميزانية الشهر (${summary.monthlyBudgetUsd}$). عدّل الميزانية من «الإعدادات» إن رغبت.`);
    }
  }

  async function usageRecord(kind, now = new Date()) {
    await update(files.usage, { days: {} }, async usage => {
      const key = dayKey(now);
      const day = usage.days[key] || { calls: 0, cost: 0, byKind: {} };
      day.calls += 1;
      day.cost += costOf(kind);
      day.byKind = day.byKind || {};
      day.byKind[kind] = (day.byKind[kind] || 0) + 1;
      usage.days[key] = day;
      // نحتفظ بآخر 90 يومًا فقط.
      for (const old of Object.keys(usage.days).sort().slice(0, -90)) delete usage.days[old];
    });
  }

  /* ---------- ذاكرة نتائج الذكاء الاصطناعي ---------- */
  // تسمح بتغيير القص/العرض دون دفع تكلفة التوليد مرة ثانية.
  async function pruneDir(dir, keep, maxAgeMs) {
    const names = await fs.readdir(dir).catch(() => []);
    const stats = [];
    for (const name of names) {
      const stat = await fs.stat(path.join(dir, name)).catch(() => null);
      if (stat) stats.push({ name, time: stat.mtimeMs });
    }
    stats.sort((a, b) => b.time - a.time);
    for (const [index, entry] of stats.entries()) {
      if (index >= keep || (maxAgeMs && Date.now() - entry.time > maxAgeMs)) {
        await fs.rm(path.join(dir, entry.name), { force: true });
      }
    }
  }

  async function cachePut(id, buffer) {
    await init();
    await fs.writeFile(path.join(dirs.cache, `${assertId(id)}.png`), buffer);
    await pruneDir(dirs.cache, 40);
  }

  async function cacheGet(id) {
    await init();
    try { return await fs.readFile(path.join(dirs.cache, `${assertId(id)}.png`)); } catch { return null; }
  }

  /* ---------- ملفات عامة مؤقتة (لازمة لنشر إنستغرام عبر رابط) ---------- */
  async function mediaPut(jpeg) {
    await init();
    const token = crypto.randomBytes(24).toString('hex');
    await fs.writeFile(path.join(dirs.media, `${token}.jpg`), jpeg);
    await pruneDir(dirs.media, 100, MEDIA_TTL_MS);
    return token;
  }

  async function mediaGet(token) {
    if (!/^[a-f0-9]{48}$/.test(token)) return null;
    const file = path.join(dirs.media, `${token}.jpg`);
    try {
      const stat = await fs.stat(file);
      if (Date.now() - stat.mtimeMs > MEDIA_TTL_MS) return null;
      return await fs.readFile(file);
    } catch { return null; }
  }

  async function mediaRemove(token) {
    if (/^[a-f0-9]{48}$/.test(token)) await fs.rm(path.join(dirs.media, `${token}.jpg`), { force: true });
  }

  async function diskInfo() {
    let bytes = 0;
    for (const dir of [dirs.images, dirs.thumbs, dirs.cache]) {
      for (const name of await fs.readdir(dir).catch(() => [])) {
        bytes += (await fs.stat(path.join(dir, name)).catch(() => ({ size: 0 }))).size;
      }
    }
    return { dataDir, bytes };
  }

  return {
    dataDir, dirs, init, newId, sha256, fail, readJson, writeJson, update,
    addHistory, listHistory, getHistory, readImage, readThumb, patchHistory, deleteHistory,
    listQueue, getQueue, addQueue, updateQueue, deleteQueue,
    usageSummary, usageCheck, usageRecord,
    cachePut, cacheGet, mediaPut, mediaGet, mediaRemove, diskInfo,
  };
}

module.exports = { createStore, fail, sha256, dayKey };
