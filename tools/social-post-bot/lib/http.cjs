function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function send(res, status, body, contentType, extra = {}) {
  res.writeHead(status, { 'Content-Type': contentType, ...SECURITY_HEADERS, ...extra });
  res.end(body);
}

const sendJson = (res, data, status = 200) => send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');

// يمنع أي موقع آخر مفتوح في المتصفح من استدعاء البوت (CSRF / DNS rebinding)
// واستهلاك مفتاح OpenAI المخزَّن في .env.
function createGuard(getPort) {
  return function guard(req) {
    const port = getPort();
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    const origins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
    if (!hosts.includes(req.headers.host || '')) throw fail(403, 'طلب مرفوض: عنوان غير مسموح.');
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) throw fail(403, 'طلب مرفوض: مصدر غير مسموح.');
    const site = req.headers['sec-fetch-site'];
    if (site && !['same-origin', 'none'].includes(site)) throw fail(403, 'طلب مرفوض: مصدر غير مسموح.');
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-raqeem-bot'] !== '1') throw fail(403, 'طلب مرفوض.');
  };
}

async function readBody(req, limitBytes, emptyMessage = 'الطلب فارغ.') {
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > limitBytes) throw fail(413, `الحجم يتجاوز ${Math.round(limitBytes / 1024 / 1024)} ميغابايت.`);
    parts.push(part);
  }
  if (!size) throw fail(400, emptyMessage);
  return Buffer.concat(parts);
}

async function readJson(req, limitBytes = 1024 * 1024) {
  const raw = await readBody(req, limitBytes, 'الطلب فارغ.');
  try { return JSON.parse(raw.toString('utf8')); } catch { throw fail(400, 'صيغة الطلب غير صحيحة.'); }
}

module.exports = { fail, send, sendJson, createGuard, readBody, readJson };
