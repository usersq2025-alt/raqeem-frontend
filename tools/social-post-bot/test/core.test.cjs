const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { loadConfig } = require('../lib/config.cjs');
const { createStore } = require('../lib/store.cjs');
const { createScheduler } = require('../lib/scheduler.cjs');
const { normalizeHashtags, buildLocalCaption, composeCaption, validateForTargets } = require('../lib/caption.cjs');
const { createLogger, redact } = require('../lib/logger.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'raqeem-test-'));
const png = (color = '#ff0000') => sharp({ create: { width: 200, height: 250, channels: 3, background: color } }).png().toBuffer();

function setup(overrides = {}) {
  const dir = tmp();
  const config = { ...loadConfig(dir), ...overrides };
  const store = createStore(dir, () => config);
  return { dir, config, store };
}

/* ---------- السجل ---------- */
test('السجل: الحفظ، منع التكرار بالمحتوى، البحث، الحذف', async () => {
  const { store } = setup();
  const image = await png();
  const first = await store.addHistory({ kind: 'photo', title: 'أول' }, image);
  const again = await store.addHistory({ kind: 'photo', title: 'أول (معدّل)' }, image);
  assert.equal(first.id, again.id);
  await store.addHistory({ kind: 'text', title: 'ثانٍ' }, await png('#00ff00'));
  const all = await store.listHistory();
  assert.equal(all.total, 2);
  assert.equal((await store.listHistory({ q: 'ثانٍ' })).total, 1);
  assert.equal((await store.listHistory({ kind: 'text' })).total, 1);
  assert.ok((await store.readThumb(first.id)).length > 0);
  await store.deleteHistory(first.id);
  assert.equal((await store.listHistory()).total, 1);
  await assert.rejects(store.getHistory(first.id), error => error.status === 404);
  await assert.rejects(store.getHistory('../../etc/passwd'), error => error.status === 400);
});

test('السجل: التقليم عند تجاوز الحد الأقصى', async () => {
  const { store } = setup({ limits: { historyMax: 2, dailyAiCalls: 40, monthlyBudgetUsd: 30 } });
  for (const color of ['#111111', '#222222', '#333333']) await store.addHistory({ title: color }, await png(color));
  assert.equal((await store.listHistory()).total, 2);
});

test('التخزين: ملف JSON تالف لا يوقف البوت', async () => {
  const { store, dir } = setup();
  fs.writeFileSync(path.join(dir, 'history.json'), '{ not json');
  assert.deepEqual((await store.listHistory()).items, []);
  assert.ok(fs.readdirSync(dir).some(name => name.startsWith('history.json.corrupt-')));
});

test('التخزين: الكتابات المتزامنة لا تضيع', async () => {
  const { store } = setup();
  await Promise.all(Array.from({ length: 12 }, async (_, i) => store.addHistory({ title: `n${i}` }, await png(`#${String(i).padStart(2, '0')}0000`))));
  assert.equal((await store.listHistory({ limit: 100 })).total, 12);
});

/* ---------- الاستهلاك ---------- */
test('الاستهلاك: الحد اليومي والميزانية الشهرية يمنعان الطلب', async () => {
  const { store } = setup({ limits: { dailyAiCalls: 2, monthlyBudgetUsd: 0.12, historyMax: 10 } });
  await store.usageCheck('text');
  await store.usageRecord('text');
  await store.usageRecord('text');
  await assert.rejects(store.usageCheck('text'), error => error.status === 429 && /الحد اليومي/.test(error.message));
  const budget = setup({ limits: { dailyAiCalls: 50, monthlyBudgetUsd: 0.1, historyMax: 10 } });
  await assert.rejects(budget.store.usageCheck('image-edit:high'), error => error.status === 429 && /الميزانية/.test(error.message));
  const summary = await store.usageSummary();
  assert.equal(summary.today.calls, 2);
});

test('الاستهلاك: ذاكرة نتائج الذكاء الاصطناعي ورموز الوسائط المؤقتة', async () => {
  const { store } = setup();
  const id = 'a'.repeat(32);
  assert.equal(await store.cacheGet(id), null);
  await store.cachePut(id, Buffer.from('x'));
  assert.equal((await store.cacheGet(id)).toString(), 'x');
  await assert.rejects(store.cachePut('../bad', Buffer.from('x')), error => error.status === 400);
  const token = await store.mediaPut(Buffer.from('jpg'));
  assert.equal((await store.mediaGet(token)).toString(), 'jpg');
  await store.mediaRemove(token);
  assert.equal(await store.mediaGet(token), null);
  assert.equal(await store.mediaGet('../../x'), null);
});

/* ---------- الإعدادات والكابشن والسجل ---------- */
test('الإعدادات: دمج config.json مع متغيرات البيئة', () => {
  process.env.RAQEEM_TEXT_MODEL = 'custom-text';
  const config = loadConfig(tmp());
  delete process.env.RAQEEM_TEXT_MODEL;
  assert.equal(config.models.text[0], 'custom-text');
  assert.ok(config.models.text.length >= 2);
  assert.ok(config.models.imageEdit.length >= 2);
});

test('الكابشن: تطبيع الوسوم والتحقق من حدود إنستغرام', () => {
  assert.deepEqual(normalizeHashtags(['رقيم', '#تعليم الأطفال', '#رقيم', 'a-b!']), ['#رقيم', '#تعليم_الأطفال', '#ab']);
  const local = buildLocalCaption({ title: 'عنوان', body: 'سطر\nآخر', brand: { hashtags: ['#رقيم'], cta: 'سجّل' } });
  assert.match(local.caption, /عنوان/);
  assert.match(local.caption, /سجّل/);
  assert.deepEqual(local.hashtags, ['#رقيم']);
  assert.ok(validateForTargets('x'.repeat(2300), ['instagram']).length);
  assert.equal(validateForTargets('x'.repeat(2300), ['facebook']).length, 0);
  assert.equal(composeCaption('نص', ['#أ']), 'نص\n\n#أ');
});

test('السجل: حجب المفاتيح والتوكنات وتدوير الملف', () => {
  assert.ok(!redact('key sk-abcdefghijklmnop and access_token=EAAB123').includes('abcdefghij'));
  assert.ok(!redact('access_token=SECRETVALUE&x=1').includes('SECRETVALUE'));
  const dir = tmp();
  const logger = createLogger(dir, { echo: false });
  logger.info('مرحبا', { a: 1 });
  assert.match(logger.tail(5).join('\n'), /مرحبا/);
});

/* ---------- الجدولة ---------- */
function fakeMeta(results) {
  const calls = [];
  const ready = { ready: true, reason: '' };
  return {
    calls,
    status: async () => ({ configured: true, facebook: ready, instagram: ready, token: {}, needsRefresh: false }),
    publish: async args => { calls.push(args); return typeof results === 'function' ? results(args, calls.length) : results; },
    maybeRefresh: async () => null,
  };
}

async function queueSetup(metaResults, nowRef = { t: Date.parse('2026-10-01T10:00:00Z') }) {
  const { store, config } = setup();
  const item = await store.addHistory({ title: 'p' }, await png());
  const meta = fakeMeta(metaResults);
  const scheduler = createScheduler({ store, meta, getConfig: () => config, now: () => nowRef.t, logger: null });
  return { store, meta, scheduler, item, nowRef };
}

test('الجدولة: لا نشر قبل الموافقة، والمسودة لا تُنشر أبدًا', async () => {
  const { scheduler, store, item, meta } = await queueSetup({ facebook: { ok: true, id: '1' } });
  const queued = await scheduler.create({ historyIds: [item.id], targets: ['facebook'], caption: 'نص', scheduledAt: '2026-10-01T09:00:00Z' });
  await scheduler.tick();
  assert.equal(meta.calls.length, 0);
  assert.equal((await store.getQueue(queued.id)).status, 'draft');
});

test('الجدولة: نشر ناجح عند الموعد ويعلّم السجل بأنه منشور', async () => {
  const { scheduler, store, item, meta, nowRef } = await queueSetup({ facebook: { ok: true, id: '1' } });
  const queued = await scheduler.create({ historyIds: [item.id], targets: ['facebook'], caption: 'نص', hashtags: ['#رقيم'] });
  await scheduler.approve(queued.id, '2026-10-01T10:30:00Z');
  await scheduler.tick();
  assert.equal(meta.calls.length, 0, 'قبل الموعد');
  nowRef.t = Date.parse('2026-10-01T10:31:00Z');
  await scheduler.tick();
  assert.equal(meta.calls.length, 1);
  assert.equal(meta.calls[0].caption, 'نص\n\n#رقيم');
  assert.equal((await store.getQueue(queued.id)).status, 'published');
  assert.equal((await store.getHistory(item.id)).status, 'published');
  await scheduler.tick();
  assert.equal(meta.calls.length, 1, 'لا يُنشر مرتين');
});

test('الجدولة: فشل جزئي يعيد المنصة الفاشلة فقط ثم يفشل نهائيًا بعد المحاولات', async () => {
  let attempt = 0;
  const { scheduler, store, item, meta, nowRef } = await queueSetup(({ done }) => {
    attempt++;
    return { facebook: done.facebook?.ok ? done.facebook : { ok: true, id: 'fb' }, instagram: { ok: false, error: 'boom', status: 502 } };
  });
  const queued = await scheduler.create({ historyIds: [item.id], targets: ['facebook', 'instagram'], caption: 'x' });
  await scheduler.approve(queued.id);
  await scheduler.tick();
  let current = await store.getQueue(queued.id);
  assert.equal(current.status, 'approved');
  assert.equal(current.attempts, 1);
  assert.ok(Date.parse(current.nextAttemptAt) > nowRef.t, 'تأجيل المحاولة التالية');
  await scheduler.tick();
  assert.equal(attempt, 1, 'لم يحن موعد المحاولة التالية');
  for (let i = 0; i < 4; i++) { nowRef.t += 60 * 60_000; await scheduler.tick(); }
  current = await store.getQueue(queued.id);
  assert.equal(current.status, 'failed');
  assert.match(current.lastError, /boom/);
  assert.equal(meta.calls[1].done.facebook.ok, true, 'فيسبوك لم يُعَد نشره');
});

test('الجدولة: خطأ توكن (401) يوقف المحاولات فورًا', async () => {
  const { scheduler, store, item } = await queueSetup({ facebook: { ok: false, error: 'انتهت صلاحية التوكن', status: 401 } });
  const queued = await scheduler.create({ historyIds: [item.id], targets: ['facebook'], caption: 'x' });
  await scheduler.approve(queued.id);
  await scheduler.tick();
  assert.equal((await store.getQueue(queued.id)).status, 'failed');
});

test('الجدولة: ما فات موعده بعد مهلة السماح يُعلَّم "فاته الموعد" ولا يُنشر', async () => {
  const { scheduler, store, item, meta, nowRef } = await queueSetup({ facebook: { ok: true, id: '1' } });
  const queued = await scheduler.create({ historyIds: [item.id], targets: ['facebook'], caption: 'x', scheduledAt: '2026-10-01T10:05:00Z' });
  await scheduler.approve(queued.id, '2026-10-01T10:05:00Z');
  nowRef.t = Date.parse('2026-10-01T20:00:00Z');
  await scheduler.tick();
  assert.equal((await store.getQueue(queued.id)).status, 'missed');
  assert.equal(meta.calls.length, 0);
});

test('الجدولة: استرجاع ما انقطع أثناء النشر يمنع النشر المزدوج', async () => {
  const { scheduler, store, item } = await queueSetup({ facebook: { ok: true, id: '1' } });
  const queued = await scheduler.create({ historyIds: [item.id], targets: ['facebook'], caption: 'x' });
  await store.updateQueue(queued.id, entry => { entry.status = 'publishing'; });
  await scheduler.recover();
  const current = await store.getQueue(queued.id);
  assert.equal(current.status, 'failed');
  assert.match(current.lastError, /تحقق من صفحتك/);
});

test('الجدولة: التحقق من المدخلات (منصة، كابشن طويل، وقت في الماضي، منصة غير جاهزة)', async () => {
  const { scheduler, item } = await queueSetup({});
  await assert.rejects(scheduler.create({ historyIds: [item.id], targets: [], caption: '' }), /منصة/);
  await assert.rejects(scheduler.create({ historyIds: [], targets: ['facebook'] }), /صور/);
  await assert.rejects(scheduler.create({ historyIds: [item.id], targets: ['instagram'], caption: 'x'.repeat(2300) }), /2200/);
  const queued = await scheduler.create({ historyIds: [item.id], targets: ['facebook'], caption: 'x' });
  await assert.rejects(scheduler.approve(queued.id, '2020-01-01T00:00:00Z'), /الماضي/);
});
