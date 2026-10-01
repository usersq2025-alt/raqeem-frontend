const http = require('node:http');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');

// تحميل ملف .env (اختياري) دون أي اعتماديات إضافية.
function loadEnv() {
  try {
    const text = fsSync.readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || line.trim().startsWith('#')) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(match[1] in process.env)) process.env[match[1]] = value;
    }
  } catch { /* لا يوجد ملف .env */ }
}
loadEnv();

const sharp = require('sharp');
const { renderPost } = require('./render.cjs');

const HOST = '127.0.0.1';
const PORT = Number(process.env.RAQEEM_SOCIAL_BOT_PORT || 4567);
const MAX_BYTES = 20 * 1024 * 1024;
const publicDir = path.join(__dirname, 'public');
const assetsDir = path.join(__dirname, 'assets');
const position = value => Math.max(0, Math.min(1, Number(value) || 0));
const QUALITIES = new Set(['medium', 'high']);

const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const allowedOrigins = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function send(res, status, body, contentType, extra = {}) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extra,
  });
  res.end(body);
}

// يمنع أي موقع آخر مفتوح في المتصفح من استدعاء البوت (CSRF / DNS rebinding)
// واستهلاك مفتاح OpenAI المخزَّن في .env.
function guard(req) {
  if (!allowedHosts.has(req.headers.host || '')) throw fail(403, 'طلب مرفوض: عنوان غير مسموح.');
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) throw fail(403, 'طلب مرفوض: مصدر غير مسموح.');
  const site = req.headers['sec-fetch-site'];
  if (site && !['same-origin', 'none'].includes(site)) throw fail(403, 'طلب مرفوض: مصدر غير مسموح.');
  if (req.method === 'POST' && req.headers['x-raqeem-bot'] !== '1') throw fail(403, 'طلب مرفوض.');
}

async function readBody(req) {
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > MAX_BYTES) throw fail(413, 'حجم الصورة يتجاوز 20 ميغابايت.');
    parts.push(part);
  }
  if (!size) throw fail(400, 'اختر صورة أولًا.');
  return Buffer.concat(parts);
}

async function aiStudioEdit(imageBytes, apiKey, quality) {
  if (!apiKey) {
    throw fail(503, 'مفتاح OpenAI غير موجود. ضعه في ملف .env (OPENAI_API_KEY) أو الصقه في الصفحة.');
  }
  let normalized;
  try {
    normalized = await sharp(imageBytes).rotate().resize({
      width: 2048,
      height: 2048,
      fit: 'inside',
      withoutEnlargement: true,
    }).png().toBuffer();
  } catch {
    throw fail(415, 'تعذرت قراءة الصورة. استخدم JPG أو PNG أو WebP (صور HEIC من الآيفون تحتاج تصديرًا إلى JPG).');
  }
  const form = new FormData();
  form.append('model', 'gpt-image-2.5-sunburst');
  form.append('image', new Blob([normalized], { type: 'image/png' }), 'photo.png');
  form.append('size', '1088x1360');
  form.append('quality', quality);
  form.append('output_format', 'png');
  form.append('prompt', [
    'Create a premium 4:5 vertical editorial photograph from this exact real input photo,',
    'as though it were carefully shot with professional studio lighting and a high-end camera.',
    'Improve exposure, natural soft key lighting, white balance, realistic detail, noise,',
    'lens perspective, and composition. Outpaint only where needed to achieve the vertical frame.',
    'Make the main subject clearly prominent while preserving its real identity, geometry, and context.',
    'Preserve the number and identity of people, the actual location, all products,',
    'screens, lettering, logos, and Arabic text. Do not invent or replace any factual content.',
    'Photorealistic, refined and natural. No branding overlays, no borders, no captions.',
  ].join(' '));
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(180_000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError') throw fail(504, 'انتهت مهلة OpenAI (3 دقائق). جرّب مرة أخرى أو اختر جودة متوسطة.');
    throw fail(502, 'تعذر الاتصال بخدمة OpenAI. تحقق من الإنترنت.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw fail(502, result?.error?.message || `تعذر تحسين الصورة بالذكاء الاصطناعي (رمز ${response.status}).`);
  }
  const encoded = result?.data?.[0]?.b64_json;
  if (!encoded) throw fail(502, 'لم تُرجع خدمة تحسين الصور نتيجة.');
  return Buffer.from(encoded, 'base64');
}

const staticFiles = {
  '/text-template.png': [path.join(assetsDir, 'text-template.png'), 'image/png'],
  '/template': [path.join(assetsDir, 'approved-template.png'), 'image/png'],
};

const server = http.createServer(async (req, res) => {
  try {
    guard(req);
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (req.method === 'GET' && url.pathname === '/') {
      return send(res, 200, await fs.readFile(path.join(publicDir, 'index.html')), 'text/html; charset=utf-8', {
        'Content-Security-Policy': "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'",
      });
    }
    if (req.method === 'GET' && url.pathname === '/status') {
      return send(res, 200, JSON.stringify({ aiAvailable: Boolean(process.env.OPENAI_API_KEY) }), 'application/json; charset=utf-8');
    }
    if (req.method === 'GET' && staticFiles[url.pathname]) {
      const [file, type] = staticFiles[url.pathname];
      return send(res, 200, await fs.readFile(file), type);
    }
    if (req.method === 'GET' && url.pathname === '/fonts/fonts.css') {
      return send(res, 200, await fs.readFile(path.join(publicDir, 'fonts', 'fonts.css')), 'text/css; charset=utf-8');
    }
    if (req.method === 'GET' && /^\/fonts\/[\w-]+\.woff2$/.test(url.pathname)) {
      return send(res, 200, await fs.readFile(path.join(publicDir, 'fonts', path.basename(url.pathname))), 'font/woff2');
    }
    if (req.method === 'POST' && url.pathname === '/render') {
      const original = await readBody(req);
      const mode = req.headers['x-enhancement'] === 'safe' ? 'safe' : 'ai';
      const fit = req.headers['x-fit'] === 'contain' ? 'contain' : 'cover';
      const quality = QUALITIES.has(req.headers['x-quality']) ? req.headers['x-quality'] : 'high';
      const suppliedKey = typeof req.headers['x-openai-key'] === 'string' ? req.headers['x-openai-key'].trim() : '';
      const photo = mode === 'ai'
        ? await aiStudioEdit(original, suppliedKey || process.env.OPENAI_API_KEY, quality)
        : original;
      const image = await renderPost(photo, {
        fit,
        cropX: position(req.headers['x-crop-x'] ?? 0.7),
        cropY: position(req.headers['x-crop-y'] ?? 0.5),
      });
      return send(res, 200, image, 'image/png');
    }
    return send(res, 404, JSON.stringify({ error: 'الصفحة غير موجودة.' }), 'application/json; charset=utf-8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return send(res, 404, JSON.stringify({ error: 'ملف مفقود في مجلد البوت.' }), 'application/json; charset=utf-8');
    }
    const status = Number(error.status) || 400;
    return send(res, status, JSON.stringify({ error: error.message || 'تعذرت معالجة الطلب.' }), 'application/json; charset=utf-8');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Raqeem social post bot: http://${HOST}:${PORT}`);
  console.log(process.env.OPENAI_API_KEY ? 'OpenAI key: loaded' : 'OpenAI key: not set (paste it in the page or add it to .env)');
});
