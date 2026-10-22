const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { loadConfig } = require('../lib/config.cjs');
const { createStore } = require('../lib/store.cjs');
const { createOpenAI } = require('../lib/openai.cjs');
const { createMeta } = require('../lib/meta.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'raqeem-int-'));
const res = (status, body, headers = {}) => ({ ok: status < 400, status, headers: { get: key => headers[key.toLowerCase()] }, json: async () => body });
const realPng = () => sharp({ create: { width: 400, height: 500, channels: 3, background: '#336699' } }).png().toBuffer();

function makeOpenAI(sequence, { key = 'sk-test' } = {}) {
  const config = loadConfig(tmp());
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    const next = typeof sequence === 'function' ? sequence(calls.length, String(url), init) : sequence[Math.min(calls.length - 1, sequence.length - 1)];
    return next;
  };
  return { calls, client: createOpenAI({ getConfig: () => config, getKey: () => key, fetchImpl, sleepImpl: async () => {}, logger: null }) };
}

const chat = content => res(200, { choices: [{ message: { content: JSON.stringify(content) } }] });

/* ---------- OpenAI ---------- */
test('OpenAI: إعادة المحاولة عند 429 ثم النجاح', async () => {
  const { client, calls } = makeOpenAI([res(429, { error: { message: 'slow down' } }, { 'retry-after': '1' }), chat({ title: 'ت', body: 'ن', footer: '', illustration: 'x' })]);
  const post = await client.writePost('فكرة');
  assert.equal(post.title, 'ت');
  assert.equal(calls.length, 2);
});

test('OpenAI: المفتاح الخاطئ (401) يتوقف فورًا برسالة واضحة', async () => {
  const { client, calls } = makeOpenAI([res(401, { error: { message: 'bad key' } })]);
  await assert.rejects(client.writePost('فكرة'), error => error.status === 401 && /مفتاح/.test(error.message));
  assert.equal(calls.length, 1);
});

test('OpenAI: لا مفتاح = خطأ 503 دون أي اتصال', async () => {
  const { client, calls } = makeOpenAI([], { key: '' });
  await assert.rejects(client.writePost('فكرة'), error => error.status === 503);
  assert.equal(calls.length, 0);
});

test('OpenAI: نموذج الصور الأول مرفوض فيُجرَّب البديل', async () => {
  const png = await realPng();
  const { client, calls } = makeOpenAI(call => (call === 1 ? res(404, { error: { message: 'model not found' } }) : res(200, { data: [{ b64_json: png.toString('base64') }] })));
  const result = await client.editImage(png, 'medium');
  assert.equal(result.model, 'gpt-image-1');
  assert.equal(calls.length, 2);
  assert.ok(result.buffer.length > 0);
});

test('OpenAI: الرسمة تُعاد دون الخلفية الشفافة عند الرفض بـ 400', async () => {
  const png = await realPng();
  const { client, calls } = makeOpenAI(call => (call === 1 ? res(400, { error: { message: 'transparent unsupported' } }) : res(200, { data: [{ b64_json: png.toString('base64') }] })));
  await client.illustrate('a cat', 'medium');
  assert.match(calls[0].init.body, /"background":"transparent"/);
  assert.doesNotMatch(calls[1].init.body, /"background":"transparent"/);
  assert.match(calls[1].init.body, /white background/);
});

test('OpenAI: الإلغاء من المتصفح يوقف الطلب', async () => {
  const controller = new AbortController();
  controller.abort();
  const { client } = makeOpenAI([chat({})]);
  await assert.rejects(client.writePost('x', { signal: controller.signal }), error => error.status === 499);
});

test('OpenAI: رد غير JSON يعطي رسالة مفهومة', async () => {
  const { client } = makeOpenAI([res(200, { choices: [{ message: { content: 'ليس JSON' } }] })]);
  await assert.rejects(client.writePost('x'), /تعذر فهم رد/);
});

/* ---------- Meta ---------- */
function makeMeta(env, handler) {
  const dir = tmp();
  const config = loadConfig(dir);
  const store = createStore(dir, () => config);
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const call = { url: new URL(String(url)), method: init.method || 'GET', body: init.body };
    calls.push(call);
    return handler(call, calls.length);
  };
  const meta = createMeta({ store, getConfig: () => config, env, fetchImpl, sleep: async () => {}, logger: null });
  return { meta, calls, store, dir };
}

test('Meta: الحالة تشرح ما ينقص بدقة', async () => {
  const { meta } = makeMeta({}, () => res(200, {}));
  const status = await meta.status();
  assert.equal(status.configured, false);
  assert.match(status.facebook.reason, /META_PAGE_ID/);
  const partial = await makeMeta({ META_PAGE_ID: '1', META_PAGE_TOKEN: 't', META_IG_USER_ID: '2' }, () => res(200, {})).meta.status();
  assert.equal(partial.facebook.ready, true);
  assert.equal(partial.instagram.ready, false);
  assert.match(partial.instagram.reason, /RAQEEM_PUBLIC_BASE_URL/);
});

test('Meta: نشر صورة على الصفحة يرسل الملف مع الكابشن', async () => {
  const { meta, calls } = makeMeta({ META_PAGE_ID: 'PAGE', META_PAGE_TOKEN: 'tok' }, () => res(200, { id: 'photo1', post_id: 'PAGE_post1' }));
  const out = await meta.publish({ targets: ['facebook'], caption: 'مرحبا', pngs: [await realPng()] });
  assert.deepEqual(out.facebook, { ok: true, id: 'PAGE_post1' });
  assert.equal(calls[0].url.pathname, '/v21.0/PAGE/photos');
  assert.ok(calls[0].body instanceof FormData && calls[0].body.has('source'));
  assert.equal(calls[0].body.get('caption'), 'مرحبا');
  assert.equal(calls[0].body.get('access_token'), 'tok');
});

test('Meta: ألبوم فيسبوك يرفع الصور غير منشورة ثم ينشرها معًا', async () => {
  const { meta, calls } = makeMeta({ META_PAGE_ID: 'PAGE', META_PAGE_TOKEN: 'tok' }, call => res(200, call.url.pathname.endsWith('/feed') ? { id: 'feed1' } : { id: `p${call.url.pathname.length}${Math.random()}` }));
  const png = await realPng();
  const out = await meta.publish({ targets: ['facebook'], caption: 'ألبوم', pngs: [png, png] });
  assert.equal(out.facebook.id, 'feed1');
  assert.equal(calls.length, 3);
  assert.equal(calls[0].body.get('published'), 'false');
  assert.match(calls[2].body.get('attached_media[0]'), /media_fbid/);
});

test('Meta: إنستغرام — حاوية ثم انتظار الجاهزية ثم نشر، ثم تنظيف الرابط المؤقت', async () => {
  const seen = [];
  const { meta, calls, store } = makeMeta(
    { META_PAGE_ID: 'P', META_PAGE_TOKEN: 'tok', META_IG_USER_ID: 'IG', RAQEEM_PUBLIC_BASE_URL: 'https://tunnel.example/' },
    (call, n) => {
      seen.push(`${call.method} ${call.url.pathname}`);
      if (call.url.pathname === '/v21.0/IG/media') return res(200, { id: 'container1' });
      if (call.url.pathname === '/v21.0/container1') return res(200, { status_code: n < 4 ? 'IN_PROGRESS' : 'FINISHED' });
      if (call.url.pathname === '/v21.0/IG/media_publish') return res(200, { id: 'ig-post' });
      return res(404, {});
    },
  );
  const out = await meta.publish({ targets: ['instagram'], caption: 'كابشن', pngs: [await realPng()] });
  assert.deepEqual(out.instagram, { ok: true, id: 'ig-post' });
  const container = calls[0].body;
  assert.match(container.get('image_url'), /^https:\/\/tunnel\.example\/media\/[a-f0-9]{48}\.jpg$/);
  assert.equal(container.get('caption'), 'كابشن');
  assert.deepEqual(seen.slice(-1), ['POST /v21.0/IG/media_publish']);
  const token = container.get('image_url').match(/media\/([a-f0-9]{48})\.jpg/)[1];
  assert.equal(await store.mediaGet(token), null, 'الملف المؤقت حُذف بعد النشر');
});

test('Meta: توكن منتهي (190) يعطي رسالة واضحة وحالة 401', async () => {
  const { meta } = makeMeta({ META_PAGE_ID: 'P', META_PAGE_TOKEN: 'old' }, () => res(400, { error: { code: 190, message: 'Error validating access token' } }));
  const out = await meta.publish({ targets: ['facebook'], caption: 'x', pngs: [await realPng()] });
  assert.equal(out.facebook.ok, false);
  assert.equal(out.facebook.status, 401);
  assert.match(out.facebook.error, /انتهت صلاحية/);
});

test('Meta: المنصة المنجزة سابقًا لا تُنشر مرة ثانية', async () => {
  const { meta, calls } = makeMeta({ META_PAGE_ID: 'P', META_PAGE_TOKEN: 't' }, () => res(200, { id: '1' }));
  const out = await meta.publish({ targets: ['facebook'], caption: 'x', pngs: [await realPng()], done: { facebook: { ok: true, id: 'old' } } });
  assert.equal(out.facebook.id, 'old');
  assert.equal(calls.length, 0);
});

test('Meta: الوضع التجريبي لا يتصل بالشبكة إطلاقًا', async () => {
  const { meta, calls } = makeMeta({ RAQEEM_META_DRY_RUN: '1' }, () => res(500, {}));
  const out = await meta.publish({ targets: ['facebook', 'instagram'], caption: 'x', pngs: [await realPng()] });
  assert.ok(out.facebook.ok && out.instagram.ok && out.facebook.dryRun);
  assert.equal(calls.length, 0);
});

test('Meta: تجديد التوكن يحفظ توكن الصفحة الجديد ويسجل الانتهاء', async () => {
  const expires = Math.floor(Date.now() / 1000) + 50 * 86400;
  const { meta, store, dir } = makeMeta(
    { META_PAGE_ID: 'PAGE', META_PAGE_TOKEN: 'old', META_USER_TOKEN: 'u0', META_APP_ID: 'app', META_APP_SECRET: 'sec' },
    call => {
      if (call.url.pathname.endsWith('/oauth/access_token')) return res(200, { access_token: 'user-long' });
      if (call.url.pathname.endsWith('/me/accounts')) return res(200, { data: [{ id: 'OTHER', access_token: 'x' }, { id: 'PAGE', access_token: 'page-new' }] });
      if (call.url.pathname.endsWith('/debug_token')) return res(200, { data: { is_valid: true, expires_at: expires } });
      return res(404, {});
    },
  );
  const status = await meta.refreshToken();
  assert.equal(status.token.daysLeft, 49);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'meta-token.json'), 'utf8'));
  assert.equal(saved.pageToken, 'page-new');
  assert.equal(saved.userToken, 'user-long');
  await assert.rejects(makeMeta({}, () => res(200, {})).meta.refreshToken(), /META_USER_TOKEN/);
});
