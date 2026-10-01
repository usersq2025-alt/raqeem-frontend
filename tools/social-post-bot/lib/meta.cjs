const path = require('node:path');
const fs = require('node:fs/promises');
const { toJpeg } = require('./formats.cjs');

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const sleepDefault = ms => new Promise(resolve => setTimeout(resolve, ms));

// النشر المباشر عبر Meta Graph API (صفحة فيسبوك + حساب إنستغرام للأعمال).
function createMeta({ store, getConfig, env = process.env, fetchImpl = (...args) => fetch(...args), logger, sleep = sleepDefault }) {
  const tokenFile = path.join(store.dataDir, 'meta-token.json');
  const version = () => getConfig().meta?.graphVersion || 'v21.0';
  const base = () => `https://graph.facebook.com/${version()}`;
  const dryRun = () => env.RAQEEM_META_DRY_RUN === '1';

  async function savedToken() {
    return store.readJson(tokenFile, {});
  }

  const settings = async () => {
    const saved = await savedToken();
    return {
      pageId: env.META_PAGE_ID || '',
      igId: env.META_IG_USER_ID || '',
      pageToken: saved.pageToken || env.META_PAGE_TOKEN || '',
      userToken: saved.userToken || env.META_USER_TOKEN || '',
      appId: env.META_APP_ID || '',
      appSecret: env.META_APP_SECRET || '',
      publicBase: String(env.RAQEEM_PUBLIC_BASE_URL || '').replace(/\/+$/, ''),
      saved,
    };
  };

  async function graph(urlPath, { method = 'GET', params, form, token, timeoutMs = 60_000 } = {}) {
    const url = new URL(`${base()}${urlPath}`);
    let init = { method, signal: AbortSignal.timeout(timeoutMs) };
    if (method === 'GET') {
      for (const [key, value] of Object.entries({ ...params, ...(token ? { access_token: token } : {}) })) url.searchParams.set(key, value);
    } else if (form) {
      if (token) form.append('access_token', token);
      init.body = form;
    } else {
      init.body = new URLSearchParams({ ...params, ...(token ? { access_token: token } : {}) });
    }
    let response;
    try {
      response = await fetchImpl(url, init);
    } catch (error) {
      throw fail(502, error.name === 'TimeoutError' ? 'انتهت مهلة Meta.' : 'تعذر الاتصال بخدمة Meta. تحقق من الإنترنت.');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      const code = body?.error?.code;
      const message = body?.error?.message || `رفضت Meta الطلب (رمز ${response.status}).`;
      if (code === 190) throw fail(401, 'انتهت صلاحية توكن Meta. جدّده من الإعدادات أو من لوحة المطورين.');
      if (code === 10 || code === 200) throw fail(403, `صلاحيات Meta غير كافية: ${message}`);
      if (code === 4 || code === 17 || code === 32) throw fail(429, `وصلت لحد طلبات Meta: ${message}`);
      throw fail(502, message);
    }
    return body;
  }

  /* ---------- الحالة ---------- */
  async function status() {
    const cfg = await settings();
    const hasPage = Boolean(cfg.pageId && cfg.pageToken);
    const hasIg = Boolean(cfg.igId && cfg.pageToken);
    const igPublic = Boolean(cfg.publicBase);
    const expiresAt = cfg.saved.expiresAt || null;
    const daysLeft = expiresAt ? Math.floor((Date.parse(expiresAt) - Date.now()) / 86_400_000) : null;
    return {
      dryRun: dryRun(),
      configured: dryRun() || hasPage || hasIg,
      facebook: {
        ready: dryRun() || hasPage,
        reason: hasPage || dryRun() ? '' : 'أضف META_PAGE_ID و META_PAGE_TOKEN في ملف .env.',
      },
      instagram: {
        ready: dryRun() || (hasIg && igPublic),
        reason: dryRun() || (hasIg && igPublic) ? ''
          : !hasIg ? 'أضف META_IG_USER_ID و META_PAGE_TOKEN في ملف .env.'
            : 'إنستغرام يحتاج رابطًا عامًا للصورة: ضع RAQEEM_PUBLIC_BASE_URL (نفق مثل Cloudflare Tunnel يشير إلى هذا البوت).',
      },
      token: { expiresAt, daysLeft, canRefresh: Boolean(cfg.userToken && cfg.appId && cfg.appSecret), refreshedAt: cfg.saved.refreshedAt || null },
      needsRefresh: daysLeft !== null && daysLeft <= 10,
    };
  }

  /* ---------- تجديد التوكن ---------- */
  async function inspectToken(input, cfg) {
    const body = await graph('/debug_token', { params: { input_token: input }, token: `${cfg.appId}|${cfg.appSecret}` });
    const expires = Number(body?.data?.expires_at || 0);
    return { valid: Boolean(body?.data?.is_valid), expiresAt: expires ? new Date(expires * 1000).toISOString() : null };
  }

  async function refreshToken() {
    const cfg = await settings();
    if (!(cfg.userToken && cfg.appId && cfg.appSecret)) {
      throw fail(400, 'التجديد التلقائي يحتاج META_USER_TOKEN و META_APP_ID و META_APP_SECRET في ملف .env.');
    }
    const exchanged = await graph('/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: cfg.appId, client_secret: cfg.appSecret, fb_exchange_token: cfg.userToken },
    });
    const userToken = exchanged.access_token;
    if (!userToken) throw fail(502, 'لم ترجع Meta توكنًا جديدًا.');
    const accounts = await graph('/me/accounts', { token: userToken, params: { fields: 'id,access_token' } });
    const page = (accounts.data || []).find(entry => entry.id === cfg.pageId);
    if (!page?.access_token) throw fail(403, 'لم أجد الصفحة ضمن حسابات هذا التوكن. تأكد من META_PAGE_ID ومن صلاحيات المدير.');
    // توكن الصفحة المشتق من توكن مستخدم طويل الأجل لا ينتهي عادة؛ نسجل انتهاء توكن المستخدم للتنبيه.
    const info = await inspectToken(userToken, cfg).catch(() => ({ expiresAt: null }));
    const saved = { pageToken: page.access_token, userToken, expiresAt: info.expiresAt, refreshedAt: new Date().toISOString() };
    await store.writeJson(tokenFile, saved);
    logger?.info('جُدّد توكن Meta', { expiresAt: info.expiresAt });
    return status();
  }

  async function maybeRefresh() {
    const current = await status();
    if (!current.token.canRefresh) return null;
    const stale = current.needsRefresh
      || !current.token.refreshedAt
      || Date.now() - Date.parse(current.token.refreshedAt) > 30 * 86_400_000;
    return stale ? refreshToken().catch(error => { logger?.error('فشل تجديد توكن Meta', error); return null; }) : null;
  }

  /* ---------- النشر ---------- */
  async function publishFacebook(cfg, caption, pngs) {
    const upload = async (png, published) => {
      const form = new FormData();
      form.append('source', new Blob([png], { type: 'image/png' }), 'post.png');
      form.append('published', String(published));
      if (published) form.append('caption', caption);
      return graph(`/${cfg.pageId}/photos`, { method: 'POST', form, token: cfg.pageToken, timeoutMs: 120_000 });
    };
    if (pngs.length === 1) {
      const result = await upload(pngs[0], true);
      return { id: result.post_id || result.id };
    }
    const ids = [];
    for (const png of pngs) ids.push((await upload(png, false)).id);
    const params = { message: caption };
    ids.forEach((id, index) => { params[`attached_media[${index}]`] = JSON.stringify({ media_fbid: id }); });
    const result = await graph(`/${cfg.pageId}/feed`, { method: 'POST', params, token: cfg.pageToken });
    return { id: result.id };
  }

  async function waitContainer(cfg, containerId) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const info = await graph(`/${containerId}`, { params: { fields: 'status_code' }, token: cfg.pageToken });
      if (info.status_code === 'FINISHED') return;
      if (info.status_code === 'ERROR' || info.status_code === 'EXPIRED') throw fail(502, 'رفض إنستغرام معالجة الصورة. تأكد أن الرابط العام يعمل وأن المقاس مدعوم.');
      await sleep(3000);
    }
    throw fail(504, 'تأخرت معالجة إنستغرام للصورة. أعد المحاولة بعد قليل.');
  }

  async function publishInstagram(cfg, caption, pngs) {
    const tokens = [];
    try {
      const urlFor = async png => {
        const token = await store.mediaPut(await toJpeg(png));
        tokens.push(token);
        return `${cfg.publicBase}/media/${token}.jpg`;
      };
      let containerId;
      if (pngs.length === 1) {
        const container = await graph(`/${cfg.igId}/media`, { method: 'POST', params: { image_url: await urlFor(pngs[0]), caption }, token: cfg.pageToken });
        containerId = container.id;
      } else {
        const children = [];
        for (const png of pngs) {
          const child = await graph(`/${cfg.igId}/media`, { method: 'POST', params: { image_url: await urlFor(png), is_carousel_item: 'true' }, token: cfg.pageToken });
          await waitContainer(cfg, child.id);
          children.push(child.id);
        }
        const parent = await graph(`/${cfg.igId}/media`, { method: 'POST', params: { media_type: 'CAROUSEL', children: children.join(','), caption }, token: cfg.pageToken });
        containerId = parent.id;
      }
      await waitContainer(cfg, containerId);
      const published = await graph(`/${cfg.igId}/media_publish`, { method: 'POST', params: { creation_id: containerId }, token: cfg.pageToken });
      return { id: published.id };
    } finally {
      for (const token of tokens) await store.mediaRemove(token);
    }
  }

  // يعيد نتيجة لكل منصة: {ok, id} أو {ok:false, error}. المنصات المنجزة سابقًا تُتخطّى.
  async function publish({ targets, caption, pngs, done = {} }) {
    const cfg = await settings();
    const results = {};
    for (const target of targets) {
      if (done[target]?.ok) { results[target] = done[target]; continue; }
      try {
        if (dryRun()) {
          results[target] = { ok: true, id: `dry-run-${target}-${Date.now()}`, dryRun: true };
        } else if (target === 'facebook') {
          if (!(cfg.pageId && cfg.pageToken)) throw fail(400, 'فيسبوك غير مضبوط في ملف .env.');
          results[target] = { ok: true, ...(await publishFacebook(cfg, caption, pngs)) };
        } else if (target === 'instagram') {
          if (!(cfg.igId && cfg.pageToken && cfg.publicBase)) throw fail(400, 'إنستغرام غير مضبوط: يحتاج META_IG_USER_ID و RAQEEM_PUBLIC_BASE_URL.');
          results[target] = { ok: true, ...(await publishInstagram(cfg, caption, pngs)) };
        } else {
          throw fail(400, 'منصة غير معروفة.');
        }
      } catch (error) {
        logger?.error(`فشل النشر على ${target}`, error);
        results[target] = { ok: false, error: error.message, status: error.status };
      }
    }
    return results;
  }

  return { status, publish, refreshToken, maybeRefresh };
}

module.exports = { createMeta };
