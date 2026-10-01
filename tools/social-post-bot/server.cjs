const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const { ROOT, loadEnv, loadConfig, saveSettings, defaultDataDir } = require('./lib/config.cjs');
const { createLogger } = require('./lib/logger.cjs');
const { createStore } = require('./lib/store.cjs');
const { createOpenAI } = require('./lib/openai.cjs');
const { createMeta } = require('./lib/meta.cjs');
const { createScheduler } = require('./lib/scheduler.cjs');
const { FORMATS, exportFormat } = require('./lib/formats.cjs');
const { createZip } = require('./lib/zip.cjs');
const { buildLocalCaption } = require('./lib/caption.cjs');
const { runHealthCheck } = require('./lib/health.cjs');
const { fail, send, sendJson, createGuard, readBody, readJson } = require('./lib/http.cjs');
const { renderPost } = require('./render.cjs');

const VERSION = '2.0.0';
const publicDir = path.join(ROOT, 'public');
const assetsDir = path.join(ROOT, 'assets');
const position = value => Math.max(0, Math.min(1, Number(value) || 0));
const QUALITIES = new Set(['medium', 'high']);
const CSP = "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'";

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp',
};

const STATIC_ROUTES = new Map([
  ['/', ['public', 'index.html']], ['/app.css', ['public', 'app.css']], ['/app.js', ['public', 'app.js']],
  ['/favicon.svg', ['public', 'favicon.svg']], ['/fonts/fonts.css', ['public', 'fonts/fonts.css']],
  ['/text-template.png', ['assets', 'text-template.png']], ['/template', ['assets', 'approved-template.png']],
  ['/logo.png', ['assets', 'logo.png']],
]);

const safeName = value => encodeURIComponent(String(value || '').replace(/[\\/:*?"<>|\r\n]/g, ' ').trim().slice(0, 60) || 'post');

function createApp(options = {}) {
  const dataDir = options.dataDir || defaultDataDir();
  let config = loadConfig(dataDir);
  const getConfig = () => config;
  const logger = options.logger || createLogger(options.logDir || path.join(ROOT, '..', '..', 'logs'), { echo: options.echo !== false });
  const store = createStore(dataDir, getConfig);
  const openai = options.openai || createOpenAI({
    getConfig, logger, getKey: options.getKey || (() => process.env.OPENAI_API_KEY), fetchImpl: options.fetchImpl,
  });
  const meta = options.meta || createMeta({ store, getConfig, logger, env: options.env || process.env, fetchImpl: options.fetchImpl, sleep: options.sleep });
  const scheduler = createScheduler({ store, meta, getConfig, logger });

  let boundPort = config.port;
  const guard = createGuard(() => boundPort);
  const maxBytes = () => (getConfig().limits?.maxUploadMb || 20) * 1024 * 1024;

  async function serveStatic([root, file], res) {
    const base = root === 'public' ? publicDir : assetsDir;
    const full = path.join(base, file);
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const extra = file === 'index.html' ? { 'Content-Security-Policy': CSP } : {};
    if (path.extname(file) === '.png' || path.extname(file) === '.woff2') extra['Cache-Control'] = 'public, max-age=3600';
    send(res, 200, await fs.readFile(full), type, extra);
  }

  /* ---------- مسار تصميم الصورة ---------- */
  async function handleRender(req, res, signal) {
    const mode = req.headers['x-enhancement'] === 'safe' ? 'safe' : 'ai';
    const fit = req.headers['x-fit'] === 'contain' ? 'contain' : 'cover';
    const quality = QUALITIES.has(req.headers['x-quality']) ? req.headers['x-quality'] : 'high';
    const cacheId = typeof req.headers['x-cache-id'] === 'string' ? req.headers['x-cache-id'] : '';
    const extra = {};
    let photo;

    if (mode === 'ai') {
      if (!openai.hasKey()) throw fail(503, 'مفتاح OpenAI غير موجود. ضعه في ملف .env (OPENAI_API_KEY) ثم أعد تشغيل البوت.');
      if (cacheId) {
        req.resume();
        photo = await store.cacheGet(cacheId);
        if (!photo) throw fail(410, 'انتهت صلاحية نتيجة الذكاء الاصطناعي المحفوظة. أعد التوليد.');
        extra['X-Photo-Id'] = cacheId;
      } else {
        const original = await readBody(req, maxBytes(), 'اختر صورة أولًا.');
        const id = store.sha256(Buffer.concat([original, Buffer.from(`|${quality}|${getConfig().models.imageEdit.join(',')}`)])).slice(0, 32);
        // «أعد التوليد» يتجاوز الذاكرة ليحصل المستخدم على نتيجة جديدة.
        photo = req.headers['x-regenerate'] === '1' ? null : await store.cacheGet(id);
        if (photo) {
          extra['X-Photo-Id'] = id;
          extra['X-From-Cache'] = '1';
        } else {
          await store.usageCheck(`image-edit:${quality}`);
          try {
            const result = await openai.editImage(original, quality, { signal });
            photo = result.buffer;
            await store.cachePut(id, photo);
            await store.usageRecord(`image-edit:${quality}`);
            extra['X-Photo-Id'] = id;
            logger.info('تحسين صورة بالذكاء الاصطناعي', { model: result.model, quality });
          } catch (error) {
            if ([499, 415].includes(error.status)) throw error;
            // الخدمة الذكية فشلت: لا نترك المستخدم بلا نتيجة، نعطيه التحسين المحلي مع تنبيه.
            logger.warn('رجوع إلى التحسين المحلي', error.message);
            photo = original;
            extra['X-Fallback'] = 'ai-failed';
            extra['X-Fallback-Reason'] = encodeURIComponent(error.message);
          }
        }
      }
    } else {
      photo = await readBody(req, maxBytes(), 'اختر صورة أولًا.');
    }
    const image = await renderPost(photo, {
      fit, cropX: position(req.headers['x-crop-x'] ?? 0.7), cropY: position(req.headers['x-crop-y'] ?? 0.5),
    });
    send(res, 200, image, 'image/png', extra);
  }

  async function imageFor(id, format) {
    const png = await store.readImage(id);
    return exportFormat(png, FORMATS[format] ? format : 'feed45');
  }

  /* ---------- الجدول ---------- */
  const routes = [];
  const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

  route('GET', /^\/status$/, async (req, res) => {
    sendJson(res, {
      aiAvailable: openai.hasKey(), version: VERSION,
      meta: await meta.status(), usage: await store.usageSummary(),
    });
  });
  route('GET', /^\/api\/health$/, async (req, res) => sendJson(res, await runHealthCheck({ dataDir, config })));
  route('GET', /^\/api\/logs$/, async (req, res, ctx) => sendJson(res, { lines: logger.tail(Math.min(300, Number(ctx.url.searchParams.get('n')) || 100)) }));
  route('GET', /^\/api\/usage$/, async (req, res) => sendJson(res, { ...(await store.usageSummary()), disk: await store.diskInfo() }));
  route('GET', /^\/api\/formats$/, async (req, res) => sendJson(res, FORMATS));

  route('GET', /^\/api\/settings$/, async (req, res) => sendJson(res, {
    brand: config.brand, limits: config.limits, models: config.models, port: config.port,
    schedule: config.schedule, version: VERSION,
  }));
  route('POST', /^\/api\/settings$/, async (req, res) => {
    config = await saveSettings(dataDir, await readJson(req));
    sendJson(res, { brand: config.brand, limits: config.limits });
  });

  route('POST', /^\/render$/, (req, res, ctx) => handleRender(req, res, ctx.signal));

  route('POST', /^\/ai\/text$/, async (req, res, ctx) => {
    const { idea } = await readJson(req);
    if (!String(idea || '').trim()) throw fail(400, 'اكتب فكرة المنشور أولًا.');
    await store.usageCheck('text');
    const post = await openai.writePost(String(idea).slice(0, 1500), { signal: ctx.signal });
    await store.usageRecord('text');
    sendJson(res, post);
  });

  route('POST', /^\/ai\/illustration$/, async (req, res, ctx) => {
    const { scene, quality } = await readJson(req);
    if (!String(scene || '').trim()) throw fail(400, 'اكتب وصف الرسمة أولًا.');
    const level = QUALITIES.has(quality) ? quality : 'medium';
    await store.usageCheck(`illustration:${level}`);
    const result = await openai.illustrate(String(scene).slice(0, 400), level, { signal: ctx.signal });
    await store.usageRecord(`illustration:${level}`);
    send(res, 200, result.buffer, 'image/png');
  });

  route('POST', /^\/ai\/caption$/, async (req, res, ctx) => {
    const input = await readJson(req);
    const payload = {
      title: String(input.title || '').slice(0, 200), body: String(input.body || '').slice(0, 1500),
      idea: String(input.idea || '').slice(0, 1500), brand: getConfig().brand,
    };
    if (!payload.title && !payload.body && !payload.idea) throw fail(400, 'أضف عنوانًا أو نصًا أولًا ليُكتب له كابشن.');
    if (openai.hasKey() && !input.local) {
      try {
        await store.usageCheck('caption');
        const result = await openai.writeCaption(payload, { signal: ctx.signal });
        await store.usageRecord('caption');
        const hashtags = [...new Set([...result.hashtags, ...(getConfig().brand.hashtags || [])])].slice(0, 12);
        return sendJson(res, { source: 'ai', caption: result.caption, hashtags });
      } catch (error) {
        if (error.status === 499) throw error;
        logger.warn('كابشن محلي بدل الذكاء الاصطناعي', error.message);
        return sendJson(res, { source: 'local', warning: error.message, ...buildLocalCaption(payload) });
      }
    }
    sendJson(res, { source: 'local', ...buildLocalCaption(payload) });
  });

  /* ---------- السجل ---------- */
  route('GET', /^\/api\/history$/, async (req, res, ctx) => {
    const q = ctx.url.searchParams;
    sendJson(res, await store.listHistory({
      q: q.get('q') || '', kind: q.get('kind') || '', status: q.get('status') || '',
      limit: Number(q.get('limit')) || 60, offset: Number(q.get('offset')) || 0,
    }));
  });
  route('POST', /^\/api\/history$/, async (req, res) => {
    const png = await readBody(req, maxBytes(), 'لا توجد صورة للحفظ.');
    try { await sharp(png).metadata(); } catch { throw fail(415, 'الملف المرسل ليس صورة صالحة.'); }
    let fields = {};
    try { fields = JSON.parse(decodeURIComponent(req.headers['x-meta'] || '{}')); } catch { throw fail(400, 'بيانات المنشور غير صالحة.'); }
    sendJson(res, await store.addHistory(fields, png), 201);
  });
  route('GET', /^\/api\/history\/([a-f0-9]+)$/, async (req, res, ctx) => sendJson(res, await store.getHistory(ctx.match[1])));
  route('GET', /^\/api\/history\/([a-f0-9]+)\/image$/, async (req, res, ctx) => {
    const format = ctx.url.searchParams.get('format') || 'feed45';
    const item = await store.getHistory(ctx.match[1]);
    const png = await imageFor(ctx.match[1], format);
    const suffix = (FORMATS[format] || FORMATS.feed45).suffix;
    const headers = ctx.url.searchParams.get('download')
      ? { 'Content-Disposition': `attachment; filename*=UTF-8''raqeem-${safeName(item.title)}-${suffix}.png` } : {};
    send(res, 200, png, 'image/png', headers);
  });
  route('GET', /^\/api\/history\/([a-f0-9]+)\/thumb$/, async (req, res, ctx) => send(res, 200, await store.readThumb(ctx.match[1]), 'image/webp', { 'Cache-Control': 'private, max-age=300' }));
  route('PATCH', /^\/api\/history\/([a-f0-9]+)$/, async (req, res, ctx) => sendJson(res, await store.patchHistory(ctx.match[1], await readJson(req))));
  route('DELETE', /^\/api\/history\/([a-f0-9]+)$/, async (req, res, ctx) => {
    const active = (await store.listQueue()).find(item => ['approved', 'publishing'].includes(item.status) && item.historyIds.includes(ctx.match[1]));
    if (active) throw fail(409, 'هذا المنشور مجدول للنشر. ألغِ جدولته أولًا.');
    await store.deleteHistory(ctx.match[1]);
    sendJson(res, { ok: true });
  });

  route('POST', /^\/api\/export$/, async (req, res, ctx) => {
    const png = await readBody(req, maxBytes(), 'لا توجد صورة.');
    const format = ctx.url.searchParams.get('format') || 'feed45';
    send(res, 200, await exportFormat(png, format), 'image/png');
  });

  route('POST', /^\/api\/zip$/, async (req, res) => {
    const { ids, formats } = await readJson(req);
    if (!Array.isArray(ids) || !ids.length || ids.length > 50) throw fail(400, 'اختر من 1 إلى 50 عنصرًا.');
    const keys = formats === 'all' ? Object.keys(FORMATS)
      : (Array.isArray(formats) && formats.length ? formats.filter(key => FORMATS[key]) : ['feed45']);
    const entries = [];
    for (const [index, id] of ids.entries()) {
      const item = await store.getHistory(id);
      const png = await store.readImage(id);
      for (const key of keys) {
        const data = await exportFormat(png, key);
        const name = `${String(index + 1).padStart(2, '0')}-${(item.title || 'post').replace(/[\\/:*?"<>|\r\n]/g, ' ').trim().slice(0, 40)}-${FORMATS[key].suffix}.png`;
        entries.push({ name: keys.length > 1 ? `${key}/${name}` : name, data });
      }
    }
    send(res, 200, createZip(entries), 'application/zip', { 'Content-Disposition': 'attachment; filename="raqeem-posts.zip"' });
  });

  /* ---------- الجدولة والنشر ---------- */
  route('GET', /^\/api\/queue$/, async (req, res) => sendJson(res, { items: await store.listQueue() }));
  route('POST', /^\/api\/queue$/, async (req, res) => {
    const input = await readJson(req);
    const item = await scheduler.create(input);
    if (!input.approve) return sendJson(res, item, 201);
    try {
      const approved = await scheduler.approve(item.id, input.scheduledAt || new Date().toISOString());
      if (!input.scheduledAt) scheduler.tick();
      sendJson(res, approved, 201);
    } catch (error) {
      await store.deleteQueue(item.id).catch(() => {});
      throw error;
    }
  });
  route('POST', /^\/api\/queue\/([a-f0-9]+)\/approve$/, async (req, res, ctx) => {
    const body = await readJson(req).catch(() => ({}));
    sendJson(res, await scheduler.approve(ctx.match[1], body.scheduledAt));
  });
  route('POST', /^\/api\/queue\/([a-f0-9]+)\/publish-now$/, async (req, res, ctx) => {
    const item = await scheduler.approve(ctx.match[1], new Date().toISOString());
    scheduler.tick();
    sendJson(res, item);
  });
  route('POST', /^\/api\/queue\/([a-f0-9]+)\/retry$/, async (req, res, ctx) => {
    const item = await scheduler.retry(ctx.match[1]);
    scheduler.tick();
    sendJson(res, item);
  });
  route('POST', /^\/api\/queue\/([a-f0-9]+)\/cancel$/, async (req, res, ctx) => sendJson(res, await scheduler.cancel(ctx.match[1])));
  route('PATCH', /^\/api\/queue\/([a-f0-9]+)$/, async (req, res, ctx) => sendJson(res, await scheduler.update(ctx.match[1], await readJson(req))));
  route('DELETE', /^\/api\/queue\/([a-f0-9]+)$/, async (req, res, ctx) => {
    const item = await store.getQueue(ctx.match[1]);
    if (['approved', 'publishing'].includes(item.status)) throw fail(409, 'ألغِ الجدولة أولًا ثم احذف.');
    await store.deleteQueue(ctx.match[1]);
    sendJson(res, { ok: true });
  });

  route('GET', /^\/api\/meta\/status$/, async (req, res) => sendJson(res, await meta.status()));
  route('POST', /^\/api\/meta\/refresh$/, async (req, res) => sendJson(res, await meta.refreshToken()));

  /* ---------- الخادم ---------- */
  const server = http.createServer(async (req, res) => {
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      const url = new URL(req.url, 'http://local');
      // الملفات العامة المؤقتة لإنستغرام: رمز عشوائي طويل، قراءة فقط، تنتهي بعد ساعتين.
      const media = req.method === 'GET' && url.pathname.match(/^\/media\/([a-f0-9]{48})\.jpg$/);
      if (media) {
        const file = await store.mediaGet(media[1]);
        if (!file) return send(res, 404, 'not found', 'text/plain');
        return send(res, 200, file, 'image/jpeg');
      }
      guard(req);
      if (req.method === 'GET' && STATIC_ROUTES.has(url.pathname)) return await serveStatic(STATIC_ROUTES.get(url.pathname), res);
      if (req.method === 'GET' && /^\/js\/[\w-]+\.js$/.test(url.pathname)) return await serveStatic(['public', `js/${path.basename(url.pathname)}`], res);
      if (req.method === 'GET' && /^\/fonts\/[\w-]+\.woff2$/.test(url.pathname)) return await serveStatic(['public', `fonts/${path.basename(url.pathname)}`], res);
      for (const entry of routes) {
        if (entry.method !== req.method) continue;
        const match = url.pathname.match(entry.pattern);
        if (match) return await entry.handler(req, res, { url, match, signal: controller.signal });
      }
      return sendJson(res, { error: 'الصفحة غير موجودة.' }, 404);
    } catch (error) {
      if (res.headersSent) return res.end();
      if (error.code === 'ENOENT') return sendJson(res, { error: 'ملف مفقود في مجلد البوت.' }, 404);
      const status = Number(error.status) || 500;
      if (status >= 500) logger.error(`${req.method} ${req.url}`, error);
      return sendJson(res, { error: error.message || 'تعذرت معالجة الطلب.' }, status);
    }
  });

  server.on('listening', () => { boundPort = server.address().port; });
  return { server, store, scheduler, meta, openai, logger, getConfig, dataDir };
}

function start() {
  loadEnv();
  const app = createApp();
  const { server, scheduler, logger, getConfig } = app;
  const HOST = '127.0.0.1';
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`المنفذ ${getConfig().port} مستخدم. ربما البوت يعمل بالفعل: http://${HOST}:${getConfig().port}`);
    } else {
      logger.error('تعذر تشغيل الخادم', error);
    }
    process.exit(1);
  });
  server.listen(getConfig().port, HOST, async () => {
    logger.info(`Raqeem social post bot v${VERSION}: http://${HOST}:${getConfig().port}`);
    logger.info(process.env.OPENAI_API_KEY ? 'OpenAI key: loaded' : 'OpenAI key: not set (add OPENAI_API_KEY to .env)');
    await scheduler.start();
  });
  process.on('unhandledRejection', reason => logger.error('unhandledRejection', reason instanceof Error ? reason : String(reason)));
  process.on('uncaughtException', error => logger.error('uncaughtException', error));
  const shutdown = () => { scheduler.stop(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) start();

module.exports = { createApp, start, VERSION };
