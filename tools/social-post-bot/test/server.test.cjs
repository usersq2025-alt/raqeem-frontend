const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { startMockOpenAI } = require('./helpers/mock-openai.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'raqeem-srv-'));
const photo = (w = 1200, h = 900) => sharp({ create: { width: w, height: h, channels: 3, background: '#4488cc' } }).jpeg().toBuffer();

async function boot({ mock, env = { RAQEEM_META_DRY_RUN: '1' }, key = 'sk-test' } = {}) {
  if (mock) process.env.OPENAI_BASE_URL = mock.url;
  const { createApp } = require('../server.cjs');
  const app = createApp({ dataDir: tmp(), logDir: tmp(), echo: false, getKey: () => key, env, sleep: async () => {} });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = (url, { method = 'GET', headers = {}, body, json } = {}) => fetch(base + url, {
    method, body: json !== undefined ? JSON.stringify(json) : body,
    headers: { 'X-Raqeem-Bot': '1', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
  });
  return { app, base, call, close: () => { app.scheduler.stop(); return new Promise(resolve => app.server.close(resolve)); } };
}

test('الأمان: يرفض عنوان Host غريبًا وأصلًا غريبًا وغياب الترويسة في الكتابة', async () => {
  const s = await boot();
  try {
    const port = s.app.server.address().port;
    const status = await new Promise(resolve => {
      const request = http.request({ host: '127.0.0.1', port, path: '/status', headers: { Host: 'evil.example.com' } }, response => { response.resume(); resolve(response.statusCode); });
      request.end();
    });
    assert.equal(status, 403);
    assert.equal((await s.call('/status', { headers: { Origin: 'https://evil.example.com' } })).status, 403);
    assert.equal((await s.call('/status', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    assert.equal((await fetch(`${s.base}/api/history`, { method: 'POST', body: Buffer.from('x') })).status, 403);
    assert.equal((await s.call('/status')).status, 200);
  } finally { await s.close(); }
});

test('الواجهة: كل الملفات الثابتة تُخدَم وCSP صارم', async () => {
  const s = await boot();
  try {
    for (const url of ['/', '/app.css', '/app.js', '/favicon.svg', '/fonts/fonts.css', '/fonts/cairo-arabic-500-normal.woff2', '/text-template.png', '/template', '/logo.png',
      ...['util', 'photo', 'text', 'library', 'queue', 'publish', 'dock', 'settings'].map(name => `/js/${name}.js`)]) {
      const response = await s.call(url);
      assert.equal(response.status, 200, url);
    }
    const csp = (await s.call('/')).headers.get('content-security-policy');
    assert.match(csp, /script-src 'self'(?!.*unsafe)/);
    assert.equal((await s.call('/js/../server.cjs')).status, 404);
    assert.equal((await s.call('/..%2f.env')).status, 404);
  } finally { await s.close(); }
});

test('التصميم المحلي: يخرج 1080×1350 دون مفتاح', async () => {
  const s = await boot({ key: '' });
  try {
    const response = await s.call('/render', { method: 'POST', body: await photo(), headers: { 'X-Enhancement': 'safe' } });
    assert.equal(response.status, 200);
    const meta = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    assert.deepEqual([meta.width, meta.height], [1080, 1350]);
    const ai = await s.call('/render', { method: 'POST', body: await photo(), headers: { 'X-Enhancement': 'ai' } });
    assert.equal(ai.status, 503);
  } finally { await s.close(); }
});

test('التصميم الذكي: يُحسب الاستهلاك، وإعادة التركيب بمعرّف الذاكرة مجانية', async () => {
  const mock = await startMockOpenAI();
  const s = await boot({ mock });
  try {
    const body = await photo();
    const first = await s.call('/render', { method: 'POST', body, headers: { 'X-Enhancement': 'ai', 'X-Quality': 'medium' } });
    assert.equal(first.status, 200);
    const id = first.headers.get('x-photo-id');
    assert.match(id, /^[a-f0-9]{32}$/);
    assert.equal(mock.calls.filter(c => c.url === '/images/edits').length, 1);
    const recomposed = await s.call('/render', { method: 'POST', headers: { 'X-Enhancement': 'ai', 'X-Cache-Id': id, 'X-Fit': 'contain' } });
    assert.equal(recomposed.status, 200);
    const same = await s.call('/render', { method: 'POST', body, headers: { 'X-Enhancement': 'ai', 'X-Quality': 'medium' } });
    assert.equal(same.headers.get('x-from-cache'), '1');
    assert.equal(mock.calls.filter(c => c.url === '/images/edits').length, 1, 'لا تكلفة إضافية');
    const regenerate = await s.call('/render', { method: 'POST', body, headers: { 'X-Enhancement': 'ai', 'X-Quality': 'medium', 'X-Regenerate': '1' } });
    assert.equal(regenerate.status, 200);
    assert.equal(mock.calls.filter(c => c.url === '/images/edits').length, 2);
    const usage = await (await s.call('/api/usage')).json();
    assert.equal(usage.today.calls, 2);
    assert.equal((await s.call('/render', { method: 'POST', headers: { 'X-Enhancement': 'ai', 'X-Cache-Id': 'f'.repeat(32) } })).status, 410);
  } finally { await s.close(); await mock.close(); }
});

test('التصميم الذكي: فشل OpenAI يرجع تلقائيًا للتحسين المحلي مع تنبيه', async () => {
  const mock = await startMockOpenAI({ failImageTimes: 99, failStatus: 400 });
  const s = await boot({ mock });
  try {
    const response = await s.call('/render', { method: 'POST', body: await photo(), headers: { 'X-Enhancement': 'ai' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-fallback'), 'ai-failed');
    assert.ok(decodeURIComponent(response.headers.get('x-fallback-reason')).length > 3);
    assert.equal(response.headers.get('x-photo-id'), null);
    assert.equal((await (await s.call('/api/usage')).json()).today.calls, 0, 'الفشل لا يُحتسب');
  } finally { await s.close(); await mock.close(); }
});

test('الحد اليومي: يُرفض الطلب قبل الاتصال بـ OpenAI', async () => {
  const mock = await startMockOpenAI();
  const s = await boot({ mock });
  try {
    await s.call('/api/settings', { method: 'POST', json: { limits: { dailyAiCalls: 1, monthlyBudgetUsd: 100 } } });
    assert.equal((await s.call('/ai/text', { method: 'POST', json: { idea: 'أ' } })).status, 200);
    const blocked = await s.call('/ai/text', { method: 'POST', json: { idea: 'ب' } });
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).error, /الحد اليومي/);
    assert.equal(mock.calls.filter(c => c.url === '/chat/completions').length, 1);
  } finally { await s.close(); await mock.close(); }
});

test('النص والرسمة والكابشن بالذكاء الاصطناعي (مع احتياطي محلي)', async () => {
  const mock = await startMockOpenAI();
  const s = await boot({ mock });
  try {
    const post = await (await s.call('/ai/text', { method: 'POST', json: { idea: 'فكرة' } })).json();
    assert.ok(post.title && post.body && post.illustration);
    const illustration = await s.call('/ai/illustration', { method: 'POST', json: { scene: 'a book', quality: 'medium' } });
    assert.equal(illustration.headers.get('content-type'), 'image/png');
    const caption = await (await s.call('/ai/caption', { method: 'POST', json: { title: 'ع', body: 'ن' } })).json();
    assert.equal(caption.source, 'ai');
    assert.ok(caption.hashtags.includes('#رقيم'));
    const local = await (await s.call('/ai/caption', { method: 'POST', json: { title: 'عنوان', body: 'نص', local: true } })).json();
    assert.equal(local.source, 'local');
    assert.ok(local.caption.includes('عنوان'));
    assert.equal((await s.call('/ai/caption', { method: 'POST', json: {} })).status, 400);
  } finally { await s.close(); await mock.close(); }
});

test('كابشن بلا مفتاح: يعمل محليًا', async () => {
  const s = await boot({ key: '' });
  try {
    const result = await (await s.call('/ai/caption', { method: 'POST', json: { title: 'مرحبا', body: 'نص' } })).json();
    assert.equal(result.source, 'local');
    assert.equal((await s.call('/ai/text', { method: 'POST', json: { idea: 'x' } })).status, 503);
  } finally { await s.close(); }
});

test('المكتبة والتصدير وZIP والجدولة والنشر التجريبي من الطرف إلى الطرف', async () => {
  const s = await boot();
  try {
    const png = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const meta = encodeURIComponent(JSON.stringify({ kind: 'text', title: 'منشور تجريبي', meta: { type: 'text', slides: [{ title: 'a', body: 'b' }] } }));
    const saved = await (await s.call('/api/history', { method: 'POST', body: png, headers: { 'X-Meta': meta } })).json();
    assert.equal(saved.kind, 'text');
    assert.equal((await s.call('/api/history', { method: 'POST', body: Buffer.from('bad'), headers: { 'X-Meta': '{}' } })).status, 415);

    const story = await s.call(`/api/history/${saved.id}/image?format=story`);
    const storyMeta = await sharp(Buffer.from(await story.arrayBuffer())).metadata();
    assert.deepEqual([storyMeta.width, storyMeta.height], [1080, 1920]);
    const download = await s.call(`/api/history/${saved.id}/image?download=1`);
    assert.match(download.headers.get('content-disposition'), /attachment; filename\*=UTF-8''raqeem-/);

    const zip = Buffer.from(await (await s.call('/api/zip', { method: 'POST', json: { ids: [saved.id], formats: 'all' } })).arrayBuffer());
    assert.equal(zip.readUInt16LE(zip.length - 22 + 10), 4, 'أربعة مقاسات داخل الملف');

    const queued = await (await s.call('/api/queue', { method: 'POST', json: { historyIds: [saved.id], targets: ['facebook', 'instagram'], caption: 'نص', hashtags: ['#رقيم'], approve: true } })).json();
    assert.equal(queued.status, 'approved');
    let item;
    for (let i = 0; i < 30; i++) {
      item = (await (await s.call('/api/queue')).json()).items[0];
      if (item.status === 'published') break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(item.status, 'published');
    assert.equal((await (await s.call(`/api/history/${saved.id}`)).json()).status, 'published');

    // المنشور المجدول لا يُحذف من المكتبة وهو قيد الجدولة؛ بعد النشر يمكن حذفه
    const draft = await (await s.call('/api/queue', { method: 'POST', json: { historyIds: [saved.id], targets: ['facebook'], caption: 'مسودة' } })).json();
    assert.equal(draft.status, 'draft');
    const later = new Date(Date.now() + 3_600_000).toISOString();
    await s.call(`/api/queue/${draft.id}/approve`, { method: 'POST', json: { scheduledAt: later } });
    assert.equal((await s.call(`/api/history/${saved.id}`, { method: 'DELETE' })).status, 409);
    assert.equal((await s.call(`/api/queue/${draft.id}/cancel`, { method: 'POST', json: {} })).status, 200);
    assert.equal((await s.call(`/api/history/${saved.id}`, { method: 'DELETE' })).status, 200);
  } finally { await s.close(); }
});

test('الجدولة: الاعتماد مرفوض عندما تكون المنصة غير مضبوطة', async () => {
  const s = await boot({ env: {} });
  try {
    const png = await sharp({ create: { width: 300, height: 375, channels: 3, background: '#fff' } }).png().toBuffer();
    const saved = await (await s.call('/api/history', { method: 'POST', body: png, headers: { 'X-Meta': encodeURIComponent('{"title":"x"}') } })).json();
    const response = await s.call('/api/queue', { method: 'POST', json: { historyIds: [saved.id], targets: ['facebook'], caption: 'x', approve: true } });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /غير جاهز/);
    assert.equal((await (await s.call('/api/queue')).json()).items.length, 0, 'لا يبقى عنصر معلّق');
  } finally { await s.close(); }
});

test('رابط الوسائط العام: رمز عشوائي طويل فقط، ولا يكشف أي مسار آخر', async () => {
  const s = await boot();
  try {
    const token = await s.app.store.mediaPut(Buffer.from('JPEGDATA'));
    const ok = await fetch(`${s.base}/media/${token}.jpg`, { headers: { Host: `127.0.0.1:${s.app.server.address().port}` } });
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), 'JPEGDATA');
    assert.equal((await fetch(`${s.base}/media/${'0'.repeat(48)}.jpg`)).status, 404);
    assert.equal((await fetch(`${s.base}/media/short.jpg`)).status, 404);
    // أي مسار آخر من خارج المضيف المحلي مرفوض حتى لو عُرف الرمز
    const port = s.app.server.address().port;
    const outside = await new Promise(resolve => {
      const request = http.request({ host: '127.0.0.1', port, path: '/api/history', headers: { Host: 'tunnel.example.com' } }, response => { response.resume(); resolve(response.statusCode); });
      request.end();
    });
    assert.equal(outside, 403);
  } finally { await s.close(); }
});

test('الإعدادات: حفظ الهوية والحدود بتحقق من المدخلات', async () => {
  const s = await boot();
  try {
    await s.call('/api/settings', { method: 'POST', json: { brand: { hashtags: ['رقيم', '#تعلم ممتع', '#رقيم'], cta: 'سجل الآن' }, limits: { dailyAiCalls: 9999, monthlyBudgetUsd: -5 } } });
    const settings = await (await s.call('/api/settings')).json();
    assert.deepEqual(settings.brand.hashtags, ['#رقيم', '#تعلم_ممتع']);
    assert.equal(settings.limits.dailyAiCalls, 500);
    assert.equal(settings.limits.monthlyBudgetUsd, 1);
    const health = await (await s.call('/api/health')).json();
    assert.equal(health.ok, true, JSON.stringify(health.checks.filter(c => !c.ok)));
  } finally { await s.close(); }
});
